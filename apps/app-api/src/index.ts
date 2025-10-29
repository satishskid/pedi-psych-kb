import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign } from 'hono/jwt';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { D1Database } from '@cloudflare/workers-types';
import { UserSchema, TenantSchema } from '@pedi-psych/shared';
import type { User, Tenant } from '@pedi-psych/shared';
import licenseRoutes from './routes/licenses';
import contentRoutes from './routes/content';
import adminRoutes from './routes/admin';
import { licenseMiddleware, trackAPIUsage } from './middleware/license';
import { apiUsageMiddleware } from './middleware/api-usage';
import { createClerkClient } from '@clerk/backend'

// Helper function to get database binding
function getDatabase(c: any) {
  const db = c.env.DB || c.env.DB_PROD;
  if (!db) {
    throw new Error('Database binding not found');
  }
  return db;
}

// Google OAuth configuration
const GOOGLE_REDIRECT_URI = 'https://pedi-app-prod.devadmin-27f.workers.dev/api/auth/google/callback';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  REGION_DEFAULT: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
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
    const { email, name, role = 'parent' } = await c.req.json();
    const now = new Date().toISOString();
    const passwordHash = 'demo123'; // This will be stored in the user record
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
      // Verify password (in production, use proper password hashing)
      // For demo purposes, check against stored password hash
      if (password === user.password_hash) {
        
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
      return c.redirect('https://d29ad10a.pedi-psych-kb-frontend.pages.dev/login?error=google_not_configured');
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
        redirect_uri: GOOGLE_REDIRECT_URI,
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
    const frontendUrl = 'https://d29ad10a.pedi-psych-kb-frontend.pages.dev';
    return c.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);

  } catch (error) {
    console.error('Google OAuth error:', error);
    return c.redirect('https://d29ad10a.pedi-psych-kb-frontend.pages.dev/login?error=google_auth_failed');
  }
});

// Apply JWT middleware to all /api/* routes EXCEPT /api/auth/login
app.use('/api/*', async (c, next) => {
  // Skip JWT for login endpoint
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
  // Skip for login endpoint
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
      id: jwtPayload.id, // JWT payload uses 'id' not 'userId'
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
  // Skip for login endpoint
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