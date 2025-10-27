import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { licenseMiddleware, hasLicenseFeature, trackAPIUsage } from '../middleware/license';
import { LicenseFeatures, LicenseStatus } from '@pedi-psych/shared';
import type { Env } from '../index';

const licenseRoutes = new Hono<{ Bindings: Env }>();

// Schema definitions
const CreateLicenseSchema = z.object({
  license_type_id: z.number().int().positive(),
  tenant_id: z.number().int().positive(),
  user_id: z.number().int().positive().optional(),
  starts_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  max_usage_count: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdateLicenseSchema = z.object({
  status: z.nativeEnum(LicenseStatus).optional(),
  max_usage_count: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
});

const LicenseTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  features: z.array(z.string()),
  max_users: z.number().int().positive(),
  max_api_calls_per_month: z.number().int().positive(),
  has_personalization: z.boolean(),
  has_byok_support: z.boolean(),
  price_monthly: z.number().positive().optional(),
  price_annual: z.number().positive().optional(),
  is_active: z.boolean().default(true),
});

const BYOKConfigSchema = z.object({
  provider: z.enum(['gemini', 'grok', 'openai', 'claude']),
  api_key: z.string().min(10),
  model_preferences: z.object({
    model: z.string(),
    max_tokens: z.number().int().positive(),
    temperature: z.number().min(0).max(2),
  }).optional(),
  max_usage_count: z.number().int().positive().optional(),
});

const PersonalizationSettingsSchema = z.object({
  preferences: z.object({
    language: z.string().length(2),
    theme: z.enum(['light', 'dark', 'auto']),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
    }),
  }),
  child_profiles: z.array(z.object({
    name: z.string().min(1),
    age: z.number().int().min(0).max(18),
    gender: z.enum(['male', 'female', 'other']),
    conditions: z.array(z.string()),
    medications: z.array(z.string()),
    allergies: z.array(z.string()),
  })).optional(),
  content_filters: z.object({
    categories: z.array(z.string()),
    age_groups: z.array(z.string()),
    conditions: z.array(z.string()),
    languages: z.array(z.string()),
    difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']),
  }).optional(),
});

// Generate unique license key
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result.match(/.{1,4}/g)!.join('-'); // Format as XXXX-XXXX-XXXX-XXXX
}

// License type management routes
licenseRoutes.get('/license-types', 
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  async (c) => {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM license_types 
      WHERE is_active = true 
      ORDER BY name ASC
    `).all();
    
    return c.json({ success: true, license_types: results });
  }
);

licenseRoutes.post('/license-types',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  zValidator('json', LicenseTypeSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    
    const licenseType = {
      name: data.name,
      description: data.description,
      features: JSON.stringify(data.features),
      max_users: data.max_users,
      max_api_calls_per_month: data.max_api_calls_per_month,
      has_personalization: data.has_personalization,
      has_byok_support: data.has_byok_support,
      price_monthly: data.price_monthly,
      price_annual: data.price_annual,
      is_active: data.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const result = await c.env.DB.prepare(`
      INSERT INTO license_types (
        name, description, features, max_users, max_api_calls_per_month,
        has_personalization, has_byok_support, price_monthly, price_annual,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      licenseType.name,
      licenseType.description,
      licenseType.features,
      licenseType.max_users,
      licenseType.max_api_calls_per_month,
      licenseType.has_personalization,
      licenseType.has_byok_support,
      licenseType.price_monthly,
      licenseType.price_annual,
      licenseType.is_active,
      licenseType.created_at,
      licenseType.updated_at
    ).run();
    
    return c.json({ 
      success: true, 
      license_type: { ...licenseType, id: result.meta.last_row_id } 
    });
  }
);

// License management routes
licenseRoutes.get('/licenses',
  licenseMiddleware(),
  async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') || '1');
    const limit = Number(c.req.query('limit') || '10');
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT l.*, lt.name as license_type_name, lt.features, lt.max_api_calls_per_month
      FROM licenses l
      JOIN license_types lt ON l.license_type_id = lt.id
      WHERE l.tenant_id = ?
    `;
    
    const params = [user.tenant_id];
    
    // Filter by status if provided
    if (c.req.query('status')) {
      query += ' AND l.status = ?';
      params.push(c.req.query('status')!);
    }
    
    // Filter by user_id if provided
    if (c.req.query('user_id')) {
      query += ' AND l.user_id = ?';
      params.push(c.req.query('user_id')!);
    }
    
    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit.toString(), offset.toString());
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // Get total count
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM licenses l
      WHERE l.tenant_id = ?
    `).bind(user.tenant_id).first();
    
    return c.json({
      success: true,
      licenses: results,
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        total_pages: Math.ceil((countResult?.total || 0) / limit)
      }
    });
  }
);

licenseRoutes.post('/licenses',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  zValidator('json', CreateLicenseSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    
    const license = {
      license_key: generateLicenseKey(),
      license_type_id: data.license_type_id,
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      status: LicenseStatus.ACTIVE,
      starts_at: data.starts_at,
      expires_at: data.expires_at,
      max_usage_count: data.max_usage_count,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const result = await c.env.DB.prepare(`
      INSERT INTO licenses (
        license_key, license_type_id, tenant_id, user_id, status,
        starts_at, expires_at, max_usage_count, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      license.license_key,
      license.license_type_id,
      license.tenant_id,
      license.user_id ?? null, // Convert undefined to null for D1
      license.status,
      license.starts_at,
      license.expires_at,
      license.max_usage_count ?? null, // Convert undefined to null for D1
      license.metadata,
      license.created_at,
      license.updated_at
    ).run();
    
    // Create user license assignment if user_id is provided
    if (data.user_id) {
      await c.env.DB.prepare(`
        INSERT INTO user_licenses (user_id, license_id, assigned_at, assigned_by, is_primary)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        data.user_id,
        result.meta.last_row_id,
        new Date().toISOString(),
        user.id,
        true
      ).run();
    }
    
    return c.json({ 
      success: true, 
      license: { ...license, id: result.meta.last_row_id } 
    });
  }
);

licenseRoutes.get('/licenses/:id',
  licenseMiddleware(),
  async (c) => {
    const licenseId = c.req.param('id');
    const user = c.get('user');
    
    const { results } = await c.env.DB.prepare(`
      SELECT l.*, lt.name as license_type_name, lt.features, lt.max_api_calls_per_month
      FROM licenses l
      JOIN license_types lt ON l.license_type_id = lt.id
      WHERE l.id = ? AND l.tenant_id = ?
    `).bind(licenseId, user.tenant_id).all();
    
    if (results.length === 0) {
      throw new HTTPException(404, { message: 'License not found' });
    }
    
    return c.json({ success: true, license: results[0] });
  }
);

licenseRoutes.put('/api/licenses/:id',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.ADVANCED_ANALYTICS] }),
  zValidator('json', UpdateLicenseSchema),
  async (c) => {
    const licenseId = c.req.param('id');
    const data = c.req.valid('json');
    const user = c.get('user');
    
    const updates = [];
    const params = [];
    
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    
    if (data.max_usage_count !== undefined) {
      updates.push('max_usage_count = ?');
      params.push(data.max_usage_count);
    }
    
    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(data.metadata));
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    
    params.push(licenseId, user.tenant_id);
    
    const result = await c.env.DB.prepare(`
      UPDATE licenses 
      SET ${updates.join(', ')}
      WHERE id = ? AND tenant_id = ?
    `).bind(...params).run();
    
    if (result.meta.changes === 0) {
      throw new HTTPException(404, { message: 'License not found' });
    }
    
    // Record in subscription history
    await c.env.DB.prepare(`
      INSERT INTO subscription_history (license_id, action, changed_by, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(licenseId, data.status || 'updated', user.id, new Date().toISOString()).run();
    
    return c.json({ success: true, message: 'License updated' });
  }
);

// BYOK configuration routes
licenseRoutes.post('/byok-config',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.BYOK_SUPPORT] }),
  zValidator('json', BYOKConfigSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    
    // Encrypt API key (in production, use proper encryption)
    const encryptedKey = btoa(data.api_key); // Simple base64 encoding for demo
    
    const config = {
      user_id: user.id,
      provider: data.provider,
      api_key_encrypted: encryptedKey,
      model_preferences: data.model_preferences ? JSON.stringify(data.model_preferences) : null,
      max_usage_count: data.max_usage_count,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const result = await c.env.DB.prepare(`
      INSERT INTO byok_configs (
        user_id, provider, api_key_encrypted, model_preferences,
        max_usage_count, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      config.user_id,
      config.provider,
      config.api_key_encrypted,
      config.model_preferences,
      config.max_usage_count,
      config.is_active,
      config.created_at,
      config.updated_at
    ).run();
    
    return c.json({ 
      success: true, 
      config: { ...config, id: result.meta.last_row_id } 
    });
  }
);

licenseRoutes.get('/byok-config',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.BYOK_SUPPORT] }),
  async (c) => {
    const user = c.get('user');
    
    const { results } = await c.env.DB.prepare(`
      SELECT id, user_id, provider, model_preferences, max_usage_count,
             usage_count, is_active, created_at, updated_at
      FROM byok_configs
      WHERE user_id = ? AND is_active = true
      ORDER BY created_at DESC
    `).bind(user.id).all();
    
    return c.json({ success: true, configs: results });
  }
);

// Personalization settings routes
licenseRoutes.post('/personalization',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.PERSONALIZATION] }),
  zValidator('json', PersonalizationSettingsSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    
    const settings = {
      user_id: user.id,
      preferences: JSON.stringify(data.preferences),
      child_profiles: data.child_profiles ? JSON.stringify(data.child_profiles) : null,
      content_filters: data.content_filters ? JSON.stringify(data.content_filters) : null,
      ai_settings: JSON.stringify({
        provider: 'gemini', // default provider
        model: 'gemini-pro',
        max_tokens: 2048,
        temperature: 0.7,
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Check if settings already exist
    const existing = await c.env.DB.prepare(`
      SELECT id FROM personalization_settings WHERE user_id = ?
    `).bind(user.id).first();
    
    if (existing) {
      // Update existing settings
      await c.env.DB.prepare(`
        UPDATE personalization_settings 
        SET preferences = ?, child_profiles = ?, content_filters = ?, 
            ai_settings = ?, updated_at = ?
        WHERE user_id = ?
      `).bind(
        settings.preferences,
        settings.child_profiles,
        settings.content_filters,
        settings.ai_settings,
        settings.updated_at,
        user.id
      ).run();
      
      return c.json({ success: true, message: 'Personalization settings updated' });
    } else {
      // Create new settings
      const result = await c.env.DB.prepare(`
        INSERT INTO personalization_settings (
          user_id, preferences, child_profiles, content_filters,
          ai_settings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        settings.user_id,
        settings.preferences,
        settings.child_profiles,
        settings.content_filters,
        settings.ai_settings,
        settings.created_at,
        settings.updated_at
      ).run();
      
      return c.json({ 
        success: true, 
        settings: { ...settings, id: result.meta.last_row_id } 
      });
    }
  }
);

licenseRoutes.get('/personalization',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.PERSONALIZATION] }),
  async (c) => {
    const user = c.get('user');
    
    const { results } = await c.env.DB.prepare(`
      SELECT id, user_id, preferences, child_profiles, content_filters,
             ai_settings, created_at, updated_at
      FROM personalization_settings
      WHERE user_id = ?
    `).bind(user.id).all();
    
    if (results.length === 0) {
      return c.json({ success: true, settings: null });
    }
    
    return c.json({ success: true, settings: results[0] });
  }
);

// Usage statistics routes
licenseRoutes.get('/usage-stats',
  licenseMiddleware(),
  async (c) => {
    const user = c.get('user');
    const license = c.get('license');
    
    // Get current month's API usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { results: apiUsageResults } = await c.env.DB.prepare(`
      SELECT COUNT(*) as total_calls,
             COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_calls,
             AVG(response_time_ms) as avg_response_time
      FROM api_usage
      WHERE user_id = ? AND strftime('%Y-%m', usage_date) = ?
    `).bind(user.id, currentMonth).all();
    
    const apiUsage = apiUsageResults[0] as any;
    
    return c.json({
      success: true,
      usage_stats: {
        license_usage: license?.usage_stats || {},
        api_usage: {
          total_calls: apiUsage?.total_calls || 0,
          successful_calls: apiUsage?.successful_calls || 0,
          avg_response_time: Math.round(apiUsage?.avg_response_time || 0),
          monthly_limit: license?.license_type?.max_api_calls_per_month || 0,
        }
      }
    });
  }
);

export default licenseRoutes;