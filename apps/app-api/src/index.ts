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
import { licenseMiddleware } from './middleware/license';
import { apiUsageMiddleware } from './middleware/api-usage';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  REGION_DEFAULT: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// Login endpoint (no JWT required) - place before JWT middleware
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

app.post('/api/auth/login', zValidator('json', LoginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    
    // Admin login (for demo purposes)
    if (email === 'admin@example.com' && password === 'demo123') {
      const adminUser = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
        .bind('admin@example.com')
        .first();
      
      if (adminUser) {
        const token = await sign({
          userId: adminUser.id.toString(),
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          tenantId: adminUser.tenant_id,
          createdAt: adminUser.created_at
        }, c.env.JWT_SECRET);
        
        return c.json({
          token,
          user: adminUser
        });
      }
    }
    
    // Check against stored users (for non-admin users)
    const userResult = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();
    
    if (userResult) {
      const user = userResult as User;
      // In a real app, verify password hash
      if (password === 'demo123') { // Demo password
        const token = await sign({
          userId: user.id.toString(), // Convert to string for consistency
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
          createdAt: user.created_at
        }, c.env.JWT_SECRET);
        
        return c.json({
          token,
          user: user
        });
      }
    }
    
    return c.json({ error: 'Invalid credentials' }, 401);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Apply JWT middleware to all /api/* routes EXCEPT /api/auth/login
app.use('/api/*', async (c, next) => {
  // Skip JWT for login endpoint
  if (c.req.path === '/api/auth/login') {
    return next();
  }
  
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  });
  return jwtMiddleware(c, next);
});

// Convert JWT payload to user object for license middleware
app.use('/api/*', async (c, next) => {
  // Skip for login endpoint
  if (c.req.path === '/api/auth/login') {
    return next();
  }
  
  console.log('=== USER CONVERSION MIDDLEWARE STARTED ===');
  const jwtPayload = c.get('jwtPayload');
  console.log('JWT Payload:', jwtPayload);
  
  if (jwtPayload) {
    // Convert JWT payload to user object format expected by license middleware
    const user = {
      id: parseInt(jwtPayload.userId),
      email: jwtPayload.email,
      name: jwtPayload.name,
      role: jwtPayload.role,
      tenant_id: jwtPayload.tenantId
    };
    console.log('Setting user object:', user);
    c.set('user', user);
  } else {
    console.log('No JWT payload found');
  }
  
  console.log('=== USER CONVERSION MIDDLEWARE COMPLETED ===');
  return next();
});

// Track API usage for all authenticated API calls
app.use('/api/*', apiUsageMiddleware());

// Debug endpoint to test user object
app.get('/api/debug/user', async (c) => {
  const user = c.get('user');
  const jwtPayload = c.get('jwtPayload');
  return c.json({
    user,
    jwtPayload,
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
    const body = await c.req.json();
    const data = CreateTenantSchema.parse(body);

    const tenant: Tenant = {
      id: crypto.randomUUID(),
      name: data.name,
      region: data.region,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await c.env.DB.prepare(`
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
    const { results } = await c.env.DB.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Failed to fetch tenants' }, 500);
  }
});

app.post('/api/users', async (c) => {
  try {
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

    await c.env.DB.prepare(`
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
    const user = c.get('user');
    console.log('Users endpoint - User object:', user);
    const { results } = await c.env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    return c.json(results);
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

app.get('/api/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const { results } = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
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
    const userId = c.get('jwtPayload').sub;
    const { results } = await c.env.DB.prepare(`
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
    const userId = c.get('jwtPayload').sub;
    const body = await c.req.json();
    
    const assessmentId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
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