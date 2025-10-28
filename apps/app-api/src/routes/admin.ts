import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { licenseMiddleware } from '../middleware/license';
import { LicenseFeatures } from '@pedi-psych/shared';
import type { Env } from '../index';

// Helper function to get database binding
function getDatabase(c: any) {
  const db = c.env.DB || c.env.DB_PROD;
  if (!db) {
    throw new HTTPException(500, { message: 'Database binding not found' });
  }
  return db;
}

// Helper function for password hashing (simplified for demo)
async function hashPassword(password: string): Promise<string> {
  // In production, use proper password hashing like bcrypt
  return btoa(password); // Simple base64 encoding for demo
}

const adminRoutes = new Hono<{ Bindings: Env }>();

// Schema definitions
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'doctor', 'therapist', 'educator', 'parent']),
  tenant_id: z.number().int().positive(),
  password: z.string().min(8).optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'doctor', 'therapist', 'educator', 'parent']).optional(),
  metadata: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

const TenantSettingsSchema = z.object({
  name: z.string().min(1).max(100),
  settings: z.object({
    branding: z.object({
      logo_url: z.string().url().optional(),
      primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      company_name: z.string().min(1).max(100).optional(),
    }).optional(),
    features: z.object({
      enable_personalization: z.boolean().default(true),
      enable_byok: z.boolean().default(false),
      enable_analytics: z.boolean().default(true),
      enable_export: z.boolean().default(true),
    }).optional(),
    limits: z.object({
      max_users: z.number().int().positive().optional(),
      max_api_calls_per_month: z.number().int().positive().optional(),
      max_storage_gb: z.number().positive().optional(),
    }).optional(),
  }),
});

const MarketingContentSchema = z.object({
  type: z.enum(['banner', 'feature', 'testimonial', 'cta']),
  title: z.object({
    en: z.string().min(1).max(200),
    ar: z.string().min(1).max(200).optional(),
    fr: z.string().min(1).max(200).optional(),
    es: z.string().min(1).max(200).optional(),
  }),
  content: z.object({
    en: z.string().min(1),
    ar: z.string().min(1).optional(),
    fr: z.string().min(1).optional(),
    es: z.string().min(1).optional(),
  }),
  metadata: z.object({
    priority: z.number().int().min(1).max(10).default(5),
    target_audience: z.array(z.enum(['doctors', 'therapists', 'educators', 'parents'])).optional(),
    display_conditions: z.object({
      show_on_homepage: z.boolean().default(true),
      show_on_pricing: z.boolean().default(false),
      show_on_features: z.boolean().default(false),
    }).optional(),
    call_to_action: z.object({
      text: z.string().min(1).max(100).optional(),
      url: z.string().url().optional(),
      style: z.enum(['primary', 'secondary', 'outline']).default('primary'),
    }).optional(),
  }),
  is_active: z.boolean().default(true),
  starts_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
});

// User management routes
adminRoutes.get('/admin/users',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  async (c) => {
    const user = c.get('user' as any);
    const page = Number(c.req.query('page') || '1');
    const limit = Number(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const search = c.req.query('search') || '';
    const role = c.req.query('role');
    const is_active = c.req.query('is_active');
    
    const db = getDatabase(c);
    
    let query = `
      SELECT u.*, 
             COUNT(DISTINCT ul.id) as license_count,
             MAX(l.expires_at) as latest_license_expiry,
             COUNT(DISTINCT sh.id) as search_count
      FROM users u
      LEFT JOIN user_licenses ul ON u.id = ul.user_id
      LEFT JOIN licenses l ON ul.license_id = l.id
      LEFT JOIN search_history sh ON u.id = sh.user_id
      WHERE u.tenant_id = ?
    `;
    
    const params = [user.tenant_id || 1]; // Default to tenant_id 1 if undefined
    
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }
    
    if (is_active !== undefined) {
      query += ` AND u.is_active = ?`;
      params.push(is_active === 'true' ? 1 : 0);
    }
    
    query += `
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const { results } = await db.prepare(query).bind(...params).all();
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE u.tenant_id = ?
      ${search ? 'AND (u.name LIKE ? OR u.email LIKE ?)' : ''}
      ${role ? 'AND u.role = ?' : ''}
      ${is_active !== undefined ? 'AND u.is_active = ?' : ''}
    `;
    
    const countParams = [user.tenant_id || 1]; // Default to tenant_id 1 if undefined
    if (search) countParams.push(`%${search}%`, `%${search}%`);
    if (role) countParams.push(role);
    if (is_active !== undefined) countParams.push(is_active === 'true' ? 1 : 0);
    
    const countResult = await db.prepare(countQuery).bind(...countParams).first();
    
    return c.json({
      success: true,
      users: results.map((user: any) => ({
        ...user,
        metadata: user.metadata ? JSON.parse(user.metadata) : {},
      })),
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        total_pages: Math.ceil((Number(countResult?.total) || 0) / limit)
      }
    });
  }
);

adminRoutes.post('/admin/users',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  zValidator('json', CreateUserSchema),
  async (c) => {
    const data = c.req.valid('json');
    const currentUser = c.get('user' as any);
    
    const db = getDatabase(c);
    
    // Check if user already exists
    const existingUser = await db.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(data.email).first();
    
    if (existingUser) {
      throw new HTTPException(400, { message: 'User with this email already exists' });
    }
    
    // Generate password if not provided
    const password = data.password || Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(password);
    
    const user = {
      email: data.email,
      name: data.name,
      role: data.role,
      tenant_id: data.tenant_id,
      password_hash: hashedPassword,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const result = await db.prepare(`
      INSERT INTO users (
        email, name, role, tenant_id, password_hash, metadata,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.email,
      user.name,
      user.role,
      user.tenant_id,
      user.password_hash,
      user.metadata,
      user.is_active,
      user.created_at,
      user.updated_at
    ).run();
    
    return c.json({ 
      success: true, 
      user: { 
        ...user, 
        id: result.meta.last_row_id,
        temporary_password: data.password ? undefined : password
      } 
    });
  }
);

adminRoutes.get('/admin/users/:id',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  async (c) => {
    const userId = c.req.param('id');
    const currentUser = c.get('user' as any);
    
    const db = getDatabase(c);
    
    const { results } = await db.prepare(`
      SELECT u.*, 
             COUNT(DISTINCT ul.id) as license_count,
             COUNT(DISTINCT l.id) as active_licenses,
             COUNT(DISTINCT sh.id) as search_count,
             COUNT(DISTINCT ps.id) as personalization_count,
             MAX(l.expires_at) as latest_license_expiry
      FROM users u
      LEFT JOIN user_licenses ul ON u.id = ul.user_id
      LEFT JOIN licenses l ON ul.license_id = l.id AND l.status = 'active'
      LEFT JOIN search_history sh ON u.id = sh.user_id
      LEFT JOIN personalization_settings ps ON u.id = ps.user_id
      WHERE u.id = ? AND u.tenant_id = ?
      GROUP BY u.id
    `).bind(userId, currentUser.tenant_id).all();
    
    if (results.length === 0) {
      throw new HTTPException(404, { message: 'User not found' });
    }
    
    const user = results[0] as any;
    
    // Get user's licenses
    const { results: licenses } = await db.prepare(`
      SELECT l.*, lt.name as license_type_name, lt.features
      FROM licenses l
      JOIN license_types lt ON l.license_type_id = lt.id
      JOIN user_licenses ul ON l.id = ul.license_id
      WHERE ul.user_id = ?
      ORDER BY l.created_at DESC
    `).bind(userId).all();
    
    // Get recent activity
    const { results: recentActivity } = await db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as activity_count,
        GROUP_CONCAT(DISTINCT query) as search_queries
      FROM search_history
      WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).bind(userId).all();
    
    return c.json({
      success: true,
      user: {
        ...user,
        metadata: user.metadata ? JSON.parse(user.metadata) : {},
        licenses: licenses.map((license: any) => ({
          ...license,
          features: license.features ? JSON.parse(license.features) : [],
        })),
        recent_activity: recentActivity,
      }
    });
  }
);

adminRoutes.put('/admin/users/:id',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  zValidator('json', UpdateUserSchema),
  async (c) => {
    const userId = c.req.param('id');
    const data = c.req.valid('json');
    const currentUser = c.get('user' as any);
    
    const db = getDatabase(c);
    
    const updates = [];
    const params = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    
    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }
    
    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(data.metadata));
    }
    
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active);
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    
    params.push(userId, currentUser.tenant_id);
    
    const result = await db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ? AND tenant_id = ?
    `).bind(...params).run();
    
    if (result.meta.changes === 0) {
      throw new HTTPException(404, { message: 'User not found' });
    }
    
    return c.json({ success: true, message: 'User updated successfully' });
  }
);

// License management
adminRoutes.post('/admin/users/:id/assign-license',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  zValidator('json', z.object({
    license_id: z.number().int().positive(),
    is_primary: z.boolean().default(false),
  })),
  async (c) => {
    const userId = c.req.param('id');
    const data = c.req.valid('json');
    const currentUser = c.get('user' as any);
    
    const db = getDatabase(c);
    
    // Verify license belongs to tenant
    const license = await db.prepare(`
      SELECT id FROM licenses WHERE id = ? AND tenant_id = ?
    `).bind(data.license_id, currentUser.tenant_id).first();
    
    if (!license) {
      throw new HTTPException(404, { message: 'License not found' });
    }
    
    // Check if assignment already exists
    const existingAssignment = await db.prepare(`
      SELECT id FROM user_licenses WHERE user_id = ? AND license_id = ?
    `).bind(userId, data.license_id).first();
    
    if (existingAssignment) {
      throw new HTTPException(400, { message: 'License already assigned to user' });
    }
    
    await db.prepare(`
      INSERT INTO user_licenses (user_id, license_id, assigned_at, assigned_by, is_primary)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      data.license_id,
      new Date().toISOString(),
      currentUser.id,
      data.is_primary
    ).run();
    
    return c.json({ success: true, message: 'License assigned successfully' });
  }
);

// Tenant settings
adminRoutes.get('/admin/tenant',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  async (c) => {
    const user = c.get('user' as any);
    
    const db = getDatabase(c);
    const { results } = await db.prepare(`
      SELECT * FROM tenants WHERE id = ?
    `).bind(user.tenant_id).all();
    
    if (results.length === 0) {
      throw new HTTPException(404, { message: 'Tenant not found' });
    }
    
    const tenant = results[0] as any;
    
    return c.json({
      success: true,
      tenant: {
        ...tenant,
        settings: tenant.settings ? JSON.parse(tenant.settings) : {},
      }
    });
  }
);

adminRoutes.put('/admin/tenant',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  zValidator('json', TenantSettingsSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user' as any);
    
    const db = getDatabase(c);
    
    const result = await db.prepare(`
      UPDATE tenants 
      SET name = ?, settings = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      data.name,
      JSON.stringify(data.settings),
      new Date().toISOString(),
      user.tenant_id
    ).run();
    
    if (result.meta.changes === 0) {
      throw new HTTPException(404, { message: 'Tenant not found' });
    }
    
    return c.json({ success: true, message: 'Tenant settings updated' });
  }
);

// Analytics and reporting
adminRoutes.get('/admin/analytics',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  async (c) => {
    const user = c.get('user' as any);
    const period = c.req.query('period') || '30d';
    
    const db = getDatabase(c);
    
    // Calculate date range
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // User analytics
    const { results: userStats } = await db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'doctor' THEN 1 END) as doctors,
        COUNT(CASE WHEN role = 'therapist' THEN 1 END) as therapists,
        COUNT(CASE WHEN role = 'educator' THEN 1 END) as educators,
        COUNT(CASE WHEN role = 'parent' THEN 1 END) as parents,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_users
      FROM users
      WHERE tenant_id = ?
    `).bind(startDate.toISOString(), user.tenant_id || 1).all();
    
    // License analytics
    const { results: licenseStats } = await db.prepare(`
      SELECT 
        COUNT(*) as total_licenses,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_licenses,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_licenses,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_licenses,
        COUNT(CASE WHEN expires_at < datetime('now') THEN 1 END) as expiring_soon,
        AVG(max_api_calls_per_month) as avg_api_limit
      FROM licenses
      WHERE tenant_id = ?
    `).bind(user.tenant_id).all();
    
    // Content analytics
    const { results: contentStats } = await db.prepare(`
      SELECT 
        COUNT(*) as total_content,
        COUNT(CASE WHEN category = 'medical' THEN 1 END) as medical_content,
        COUNT(CASE WHEN category = 'therapeutic' THEN 1 END) as therapeutic_content,
        COUNT(CASE WHEN category = 'educational' THEN 1 END) as educational_content,
        COUNT(CASE WHEN category = 'behavioral' THEN 1 END) as behavioral_content,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_content
      FROM cards
      WHERE tenant_id = ?
    `).bind(startDate.toISOString(), user.tenant_id).all();
    
    // API usage analytics
    const { results: apiStats } = await db.prepare(`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_calls,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_calls,
        AVG(response_time_ms) as avg_response_time,
        DATE(usage_date) as date
      FROM api_usage
      WHERE tenant_id = ? AND usage_date >= ?
      GROUP BY DATE(usage_date)
      ORDER BY date DESC
    `).bind(user.tenant_id, startDate.toISOString()).all();
    
    return c.json({
      success: true,
      analytics: {
        period,
        date_range: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
        },
        users: userStats[0],
        licenses: licenseStats[0],
        content: contentStats[0],
        api_usage: apiStats,
        summary: {
          total_revenue: 0, // Would integrate with payment system
          churn_rate: 0,    // Would calculate based on license expirations
          satisfaction_score: 4.2, // Would calculate from ratings
        }
      }
    });
  }
);

// Marketing content management
adminRoutes.get('/admin/marketing-content',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  async (c) => {
    const user = c.get('user' as any);
    const type = c.req.query('type');
    const is_active = c.req.query('is_active');
    
    let query = `
      SELECT * FROM marketing_content
      WHERE tenant_id = ?
    `;
    
    const params = [user.tenant_id];
    
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(is_active === 'true' ? 1 : 0);
    }
    
    query += ` ORDER BY metadata_priority DESC, created_at DESC`;
    
    const { results } = await db.prepare(query).bind(...params).all();
    
    return c.json({
      success: true,
      content: results.map((item: any) => ({
        ...item,
        title: item.title ? JSON.parse(item.title) : {},
        content: item.content ? JSON.parse(item.content) : {},
        metadata: item.metadata ? JSON.parse(item.metadata) : {},
      }))
    });
  }
);

adminRoutes.post('/admin/marketing-content',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  zValidator('json', MarketingContentSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user' as any);
    
    const content = {
      type: data.type,
      title_en: data.title.en,
      title_ar: data.title.ar,
      title_fr: data.title.fr,
      title_es: data.title.es,
      content_en: data.content.en,
      content_ar: data.content.ar,
      content_fr: data.content.fr,
      content_es: data.content.es,
      metadata: JSON.stringify(data.metadata),
      is_active: data.is_active,
      starts_at: data.starts_at,
      expires_at: data.expires_at,
      tenant_id: user.tenant_id,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const result = await db.prepare(`
      INSERT INTO marketing_content (
        type, title_en, title_ar, title_fr, title_es,
        content_en, content_ar, content_fr, content_es,
        metadata, is_active, starts_at, expires_at,
        tenant_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      content.type,
      content.title_en,
      content.title_ar,
      content.title_fr,
      content.title_es,
      content.content_en,
      content.content_ar,
      content.content_fr,
      content.content_es,
      content.metadata,
      content.is_active,
      content.starts_at,
      content.expires_at,
      content.tenant_id,
      content.created_by,
      content.created_at,
      content.updated_at
    ).run();
    
    return c.json({ 
      success: true, 
      content: { ...content, id: result.meta.last_row_id } 
    });
  }
);

export default adminRoutes;