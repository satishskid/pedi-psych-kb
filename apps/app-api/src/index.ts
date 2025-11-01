import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign } from 'hono/jwt';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { D1Database } from '@cloudflare/workers-types';
import { UserSchema, TenantSchema } from '@pedi-psych/shared';
import type { User, Tenant } from '@pedi-psych/shared';
import licenseRoutes from './routes/licenses';
import contentRoutes from './routes/content';
import adminRoutes from './routes/admin';
import { licenseMiddleware, trackAPIUsage } from './middleware/license';
import { apiUsageMiddleware } from './middleware/api-usage';
import { createClerkClient } from '@clerk/backend'
import { getDatabase } from './db';

// Google OAuth configuration
const GOOGLE_REDIRECT_URI = '/api/auth/google/callback';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  REGION_DEFAULT: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  API_BASE_URL: string;
  FRONTEND_URL: string;
  [key: string]: any; // Index signature for compatibility
}

export type Variables = {
  user: User;
  jwtPayload: any;
  license?: any;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('/*', cors());

// Health check endpoint
app.get('/api/health', async (c) => {
  try {
    const db = getDatabase(c);

    // Test database connection
    const result = await db.prepare('SELECT 1 as test').first();
    
    return c.json({ 
      status: 'healthy', 
      database: result ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({ 
      status: 'unhealthy', 
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Test user creation endpoint (for development only)
app.post('/api/test/create-user', async (c) => {
  try {
    const { email, name, role = 'parent', password = 'demo123' } = await c.req.json();
    const now = new Date().toISOString();
    const passwordHash = password; // This will be stored in the user record
    const tenantId = '1';

    console.log('Creating test user:', { email, name, role });

    const db = getDatabase(c);

    const result = await db.prepare(`
      INSERT INTO users (email, password_hash, name, role, tenant_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(email, passwordHash, name, role, tenantId, now, now).run();

    console.log('Insert result:', result);

    // Get the created user
    const user = await db.prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();

    console.log('Created user:', user);

    return c.json(user);
  } catch (error) {
    console.error('Test user creation error:', error);
    return c.json({ error: 'Failed to create test user', details: error.message }, 500);
  }
});

// Login endpoint (no JWT required) - place before JWT middleware
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

app.post('/api/auth/login', zValidator('json', LoginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    
    // Check against stored users
    const db = getDatabase(c);

    const userResult = await db.prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();
    
    if (userResult) {
      const user = userResult as unknown as User;
      // Verify password using bcrypt for hashed passwords, fallback to plain text for demo
      let isValidPassword = false;
      
      // Check if password looks like a bcrypt hash (starts with $2b$, $2a$, or $2y$)
      if (user.password_hash && user.password_hash.startsWith('$2')) {
        // Use bcrypt for hashed passwords
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } else {
        // Fallback to plain text comparison for demo/test users
        isValidPassword = (password === user.password_hash);
      }
      
      if (isValidPassword) {
        
        // Simple license check - check if user has an active license
        let licenseStatus = 'active'; // Default for demo
        let licenseType = 'basic';
        
        try {
          const licenseResult = await db.prepare(`
            SELECT l.*, lt.name as license_type_name 
            FROM user_licenses ul
            JOIN licenses l ON ul.license_id = l.id  
            JOIN license_types lt ON l.license_type_id = lt.id
            WHERE ul.user_id = ? AND l.status = 'active' AND l.expires_at > datetime('now')
            ORDER BY ul.is_primary DESC
            LIMIT 1
          `).bind(user.id).first();
          
          if (licenseResult) {
            licenseStatus = licenseResult.status as string;
            licenseType = licenseResult.license_type_name as string;
          }
        } catch (licenseError) {
          console.log('License check failed, using defaults:', licenseError);
          // Continue with defaults - don't block login for license issues
        }
        
        const token = await sign({
          userId: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
          createdAt: user.created_at,
          licenseStatus,
          licenseType
        }, c.env.JWT_SECRET);
        
        return c.json({
          token,
          user: {
            ...user,
            license_status: licenseStatus,
            license_type: licenseType
          }
        });
      }
    }
    
    return c.json({ error: 'Invalid credentials' }, 401);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Google OAuth endpoints
app.get('/api/auth/google', async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'Google OAuth not configured' }, 501);
  }
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;
  return c.redirect(googleAuthUrl);
});

app.get('/api/auth/google/callback', async (c) => {
  try {
    const clientId = c.env.GOOGLE_CLIENT_ID;
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return c.redirect(`${c.env.FRONTEND_URL}/login?error=google_not_configured`);
    }

    const code = c.req.query('code');
    if (!code) {
      return c.json({ error: 'No authorization code provided' }, 400);
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${c.env.API_BASE_URL}${GOOGLE_REDIRECT_URI}`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const googleUser = await userResponse.json();
    const email = googleUser.email;
    const name = googleUser.name;

    // Check if user exists in database
    const db = getDatabase(c);
    let user = await db.prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user) {
      // Create new user if doesn't exist
      const now = new Date().toISOString();
      const role = 'parent'; // Default role for Google users
      const tenantId = '1'; // Default tenant
      const passwordHash = 'google_oauth'; // Placeholder for Google users

      await db.prepare(`
        INSERT INTO users (email, password_hash, name, role, tenant_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(email, passwordHash, name, role, tenantId, now, now).run();

      user = await db.prepare('SELECT * FROM users WHERE email = ?')
        .bind(email)
        .first();
    }

    // Generate JWT token
    const token = await sign({
      userId: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      createdAt: user.created_at,
    }, c.env.JWT_SECRET);

    // Redirect back to frontend with token
    return c.redirect(`${c.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);

  } catch (error) {
    console.error('Google OAuth error:', error);
    return c.redirect(`${c.env.FRONTEND_URL}/login?error=google_auth_failed`);
  }
});

// Apply JWT middleware to all /api/* routes EXCEPT /api/auth/login
app.use('/api/*', async (c, next) => {
  // Skip JWT for login endpoint only
  if (c.req.path === '/api/auth/login') {
    await next();
    return;
  }
  
  if (!c.env?.JWT_SECRET) {
    return c.json({ error: 'JWT secret not configured' }, 500);
  }
  
  // Apply JWT middleware
  return jwt({
    secret: c.env.JWT_SECRET,
  })(c, next);
});

// Convert JWT payload to user object for license middleware
app.use('/api/*', async (c, next) => {
  // Skip for login endpoint only
  if (c.req.path === '/api/auth/login') {
    await next();
    return;
  }
  
  console.log('=== USER CONVERSION MIDDLEWARE STARTED ===');
  
  // Get the JWT payload from the context
  const jwtPayload = c.get('jwtPayload' as any);
  console.log('JWT Payload:', jwtPayload);
  
  if (jwtPayload) {
    // Convert JWT payload to user object format expected by license middleware
    const user: User = {
      id: jwtPayload.userId || jwtPayload.id, // Handle both 'userId' and 'id' formats
      email: jwtPayload.email,
      name: jwtPayload.name,
      role: jwtPayload.role,
      tenant_id: jwtPayload.tenantId,
      created_at: jwtPayload.createdAt,
      updated_at: new Date().toISOString()
    };
    console.log('Setting user object:', user);
    c.set('user' as any, user);
  } else {
    console.log('No JWT payload found');
  }
  
  console.log('=== USER CONVERSION MIDDLEWARE COMPLETED ===');
  await next();
});

// Track API usage for all authenticated API calls (simplified)
app.use('/api/*', async (c, next) => {
  // Skip for login endpoint only
  if (c.req.path === '/api/auth/login') {
    await next();
    return;
  }
  
  const user = c.get('user' as any);
  if (user) {
    const startTime = Date.now();
    try {
      await next();
      // Optional: Track successful API calls (non-blocking)
      const responseTime = Date.now() - startTime;
      const db = c.env?.DB || c.env?.DB_PROD;
      if (db) {
        trackAPIUsage(
          db,
          parseInt(user.id) || 0,
          c.req.path,
          c.req.method,
          200,
          responseTime
        ).catch(() => {}); // Ignore tracking errors
      }
    } catch (error) {
      // Don't track errors for now - just pass through
      throw error;
    }
  } else {
    await next();
  }
});

// Debug endpoint to test user object
app.get('/api/debug/user', async (c) => {
  const user = c.get('user' as any);
  let jwtPayload = c.get('jwtPayload' as any);
  
  // Try alternative keys if jwtPayload not found
  if (!jwtPayload) {
    jwtPayload = c.get('jwt' as any);
  }
  
  return c.json({
    user,
    jwtPayload,
    allKeys: {
      jwtPayload: c.get('jwtPayload' as any),
      jwt: c.get('jwt' as any),
      payload: c.get('payload' as any)
    },
    timestamp: new Date().toISOString()
  });
});

// Search endpoint - matches frontend expectation
app.get('/api/search', async (c) => {
  try {
    // Try to get user from JWT, but allow fallback for testing
    let user = c.get('user' as any);
    let role = 'parent'; // Default role for public access
    
    if (!user) {
      // For testing purposes, allow access without authentication
      // In production, this should require authentication
      console.log('Search endpoint accessed without authentication - using default role');
      user = { role: 'parent', id: '0', email: 'guest@example.com' };
      role = 'parent';
    } else {
      role = user.role;
    }

    const query = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    // Role-based content filtering - map actual category names to access levels
    let allowedCategories: string[] = [];
    switch (role) {
      case 'admin':
      case 'doctor':
        allowedCategories = ['ADHD Assessment', 'Anxiety Management', 'Autism Support', 'Behavioral Interventions', 'Crisis Intervention', 'Depression Screening', 'Family Therapy', 'Sleep Hygiene', 'Social Skills'];
        break;
      case 'therapist':
      case 'psychologist':
      case 'educator':
        allowedCategories = ['ADHD Assessment', 'Anxiety Management', 'Autism Support', 'Behavioral Interventions', 'Depression Screening', 'Family Therapy', 'Sleep Hygiene', 'Social Skills'];
        break;
      case 'parent':
        allowedCategories = ['Behavioral Interventions', 'Family Therapy', 'Sleep Hygiene', 'Social Skills'];
        break;
      default:
        allowedCategories = ['Behavioral Interventions', 'Family Therapy', 'Sleep Hygiene', 'Social Skills'];
    }

    const db = getDatabase(c);
    
    // Build search query with role-based filtering
    let sql = `
      SELECT id, title_en as title, content_en as content, category, tags, 
             created_at, updated_at
      FROM cards 
      WHERE category IN (${allowedCategories.map(() => '?').join(',')})
    `;
    
    const params: any[] = [...allowedCategories];
    
    // Add search query if provided
    if (query.trim()) {
      sql += ` AND (
        title_en LIKE ? OR 
        content_en LIKE ? OR 
        category LIKE ? OR 
        EXISTS (
          SELECT 1 FROM json_each(tags) 
          WHERE json_each.value LIKE ?
        )
      )`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const { results } = await db.prepare(sql).bind(...params).all();
    
    // Format results to match expected structure
    const formattedResults = results.map((card: any) => ({
      id: card.id,
      title: card.title,
      content: card.content,
      category: card.category,
      tags: typeof card.tags === 'string' ? JSON.parse(card.tags) : card.tags || [],
      createdAt: card.created_at,
      updatedAt: card.updated_at
    }));
    
    return c.json({
      results: formattedResults,
      total: formattedResults.length,
      query,
      role: role,
      allowedCategories
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'doctor', 'psychologist', 'parent', 'educator']),
  tenant_id: z.string().uuid(),
});

const CreateTenantSchema = z.object({
  name: z.string().min(1),
  region: z.string().min(1),
});

app.post('/api/tenants', async (c) => {
  try {
    // Use the correct database binding based on environment
    const db = c.env.DB || c.env.DB_PROD;
    if (!db) {
      throw new Error('Database binding not found');
    }

    const body = await c.req.json();
    const data = CreateTenantSchema.parse(body);

    const tenant: Tenant = {
      id: crypto.randomUUID(),
      name: data.name,
      region: data.region,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.prepare(`
      INSERT INTO tenants (id, name, region, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      tenant.id,
      tenant.name,
      tenant.region,
      tenant.created_at,
      tenant.updated_at
    ).run();

    return c.json(tenant, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to create tenant' }, 500);
  }
});

app.get('/api/tenants', async (c) => {
  try {
    const db = getDatabase(c);
    const { results } = await db.prepare('SELECT * FROM tenants').all();
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Failed to fetch tenants' }, 500);
  }
});

app.post('/api/users', async (c) => {
  try {
    const db = getDatabase(c);
    const body = await c.req.json();
    const data = CreateUserSchema.parse(body);

    const user: User = {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      role: data.role,
      tenant_id: data.tenant_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.prepare(`
      INSERT INTO users (id, email, name, role, tenant_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      user.email,
      user.name,
      user.role,
      user.tenant_id,
      user.created_at,
      user.updated_at
    ).run();

    return c.json(user, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request', details: error.errors }, 400);
    }
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

app.get('/api/users', async (c) => {
  try {
    const db = getDatabase(c);
    const user = c.get('user');
    console.log('Users endpoint - User object:', user);
    const { results } = await db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    return c.json(results);
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

app.get('/api/users/:id', async (c) => {
  try {
    const db = getDatabase(c);
    const userId = c.req.param('id');
    const { results } = await db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .all();
    
    if (results.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json(results[0]);
  } catch (error) {
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

app.get('/api/assessments', async (c) => {
  try {
    const db = getDatabase(c);
    const jwtPayload = c.get('jwtPayload' as any);
    const userId = jwtPayload?.sub;
    if (!userId) {
      return c.json({ error: 'User ID not found in token' }, 401);
    }
    const { results } = await db.prepare(`
      SELECT a.*, c.title, c.description
      FROM assessments a
      JOIN cards c ON a.card_id = c.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `).bind(userId).all();
    
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Failed to fetch assessments' }, 500);
  }
});

app.post('/api/assessments', async (c) => {
  try {
    const db = getDatabase(c);
    const jwtPayload = c.get('jwtPayload' as any);
    const userId = jwtPayload?.sub;
    if (!userId) {
      return c.json({ error: 'User ID not found in token' }, 401);
    }
    const body = await c.req.json();
    
    const assessmentId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await db.prepare(`
      INSERT INTO assessments (id, user_id, card_id, responses, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      assessmentId,
      userId,
      body.card_id,
      JSON.stringify(body.responses),
      now,
      now
    ).run();
    
    return c.json({ id: assessmentId, message: 'Assessment created' }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create assessment' }, 500);
  }
});

// Simple search endpoint for frontend compatibility
app.get('/api/search', async (c) => {
  try {
    const query = c.req.query('q') || '';
    
    // Try to get user from JWT middleware first
    let user = c.get('user' as any);
    
    // If no user from JWT, try to get from JWT payload directly
    if (!user) {
      const jwtPayload = c.get('jwtPayload' as any);
      if (jwtPayload) {
        user = {
          id: jwtPayload.userId || jwtPayload.id,
          email: jwtPayload.email,
          name: jwtPayload.name,
          role: jwtPayload.role,
          tenant_id: jwtPayload.tenantId,
          created_at: jwtPayload.createdAt
        };
      }
    }
    
    // If still no user, return error
    if (!user) {
      return c.json({ error: 'User not found in token' }, 401);
    }

    const db = getDatabase(c);
    
    // Build search query with role-based filtering
    let sql = `
      SELECT c.*, 0 as usage_count, 0 as avg_rating
      FROM cards c
      WHERE c.tenant_id = ?
    `;
    
    const params = [user.tenant_id || 1];
    
    // Apply search query if provided
    if (query.trim()) {
      sql += ` AND (
        c.title_en LIKE ? OR c.title_ar LIKE ? OR
        c.content_en LIKE ? OR c.content_ar LIKE ? OR
        c.category LIKE ? OR c.tags LIKE ?
      )`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Role-based content filtering - professionals get full access
    const roleContentAccess = {
      'admin': ['medical', 'therapeutic', 'educational', 'behavioral', 'developmental'],
      'doctor': ['medical', 'therapeutic', 'educational', 'behavioral', 'developmental'],
      'therapist': ['therapeutic', 'educational', 'behavioral', 'developmental'],
      'educator': ['educational', 'behavioral'],
      'parent': ['educational']
    };
    
    const allowedCategories = roleContentAccess[user.role as keyof typeof roleContentAccess] || ['educational'];
    
    // Apply role-based category filtering
    if (user.role !== 'admin') {
      sql += ` AND c.category IN (${allowedCategories.map(() => '?').join(',')})`;
      params.push(...allowedCategories);
    }
    
    sql += ` ORDER BY c.created_at DESC LIMIT 50`;
    
    const { results } = await db.prepare(sql).bind(...params).all();
    
    // Format results for response
    const formattedResults = results.map((card: any) => ({
      id: card.id,
      title: {
        en: card.title_en,
        ar: card.title_ar || '',
        fr: card.title_fr || '',
        es: card.title_es || ''
      },
      content: {
        en: card.content_en,
        ar: card.content_ar || '',
        fr: card.content_fr || '',
        es: card.content_es || ''
      },
      category: card.category,
      tags: card.tags ? JSON.parse(card.tags) : [],
      metadata: card.metadata ? JSON.parse(card.metadata) : {},
      access_level: 'public',
      role_permissions: [],
      created_at: card.created_at,
      updated_at: card.updated_at,
      avg_rating: card.avg_rating || 0,
      usage_count: card.usage_count || 0
    }));
    
    return c.json({
      success: true,
      results: formattedResults,
      total: formattedResults.length,
      query: query
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ 
      success: false, 
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Mount route modules
app.route('/api', licenseRoutes);
app.route('/api', contentRoutes);
app.route('/api', adminRoutes);

export default app;

// Clerk token exchange endpoint (before JWT middleware)
app.post('/api/auth/clerk/exchange', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return c.json({ error: 'Missing Clerk token' }, 400)
    }

    const secretKey = c.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return c.json({ error: 'CLERK_SECRET_KEY not configured' }, 500)
    }

    const clerk = createClerkClient({ secretKey })
    const verified = await clerk.verifyToken(token)
    const clerkUserId = verified.sub

    const clerkUser = await clerk.users.getUser(clerkUserId)
    const email = clerkUser?.primaryEmailAddress?.emailAddress || ''
    const name = clerkUser?.fullName || clerkUser?.username || 'User'

    // Determine role: prefer Clerk publicMetadata.role, fallback by email, else parent
    let role = (clerkUser?.publicMetadata as any)?.role as string | undefined
    if (!role && email === 'satish@skids.health') {
      role = 'admin'
    }
    role = role || 'parent'

    const db = getDatabase(c)

    // Upsert user in our DB
    const existingUser = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first()

    let user = existingUser as any
    if (!user) {
      const now = new Date().toISOString()
      const tenantId = '1'
      const passwordHash = 'clerk_oauth'
      await db
        .prepare(
          `INSERT INTO users (email, password_hash, name, role, tenant_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(email, passwordHash, name, role, tenantId, now, now)
        .run()

      user = await db
        .prepare('SELECT * FROM users WHERE email = ?')
        .bind(email)
        .first()
    } else {
      // Ensure role is up to date with Clerk
      if (user.role !== role) {
        await db
          .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
          .bind(role, new Date().toISOString(), user.id)
          .run()
        user.role = role
      }
    }

    const jwtToken = await sign(
      {
        userId: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenant_id,
        createdAt: user.created_at,
      },
      c.env.JWT_SECRET
    )

    return c.json({ token: jwtToken, user })
  } catch (err: any) {
    console.error('Clerk exchange error:', err)
    return c.json({ error: 'Failed to exchange Clerk token', details: err?.message || 'unknown' }, 500)
  }
})