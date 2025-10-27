import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { licenseMiddleware, trackAPIUsage } from '../middleware/license';
import { LicenseFeatures, UserRole } from '@pedi-psych/shared';
import type { Env } from '../index';

const contentRoutes = new Hono<{ Bindings: Env }>();

// Schema definitions
const SearchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    age_groups: z.array(z.string()).optional(),
    conditions: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }).optional(),
  personalization: z.object({
    child_context: z.object({
      age: z.number().int().min(0).max(18).optional(),
      conditions: z.array(z.string()).optional(),
      medications: z.array(z.string()).optional(),
      allergies: z.array(z.string()).optional(),
    }).optional(),
    role_context: z.enum(['doctor', 'therapist', 'educator', 'parent']).optional(),
    language_preference: z.string().length(2).optional(),
  }).optional(),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
});

const CreateCardSchema = z.object({
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
  category: z.enum(['medical', 'therapeutic', 'educational', 'behavioral', 'developmental']),
  tags: z.array(z.string()).max(20),
  metadata: z.object({
    age_range: z.object({
      min: z.number().int().min(0).max(18),
      max: z.number().int().min(0).max(18),
    }),
    conditions: z.array(z.string()).optional(),
    difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    estimated_reading_time: z.number().int().positive().optional(),
    related_conditions: z.array(z.string()).optional(),
    medical_references: z.array(z.string()).optional(),
  }),
  access_level: z.enum(['public', 'licensed', 'premium']).default('licensed'),
  role_permissions: z.array(z.enum(['doctor', 'therapist', 'educator', 'parent'])).optional(),
  tenant_id: z.number().int().positive(),
});

const UpdateCardSchema = CreateCardSchema.partial();

const PersonalizationRequestSchema = z.object({
  content_id: z.number().int().positive(),
  personalization_type: z.enum(['simplify', 'expand', 'translate', 'role_specific']),
  target_role: z.enum(['doctor', 'therapist', 'educator', 'parent']).optional(),
  target_language: z.string().length(2).optional(),
  child_context: z.object({
    age: z.number().int().min(0).max(18),
    conditions: z.array(z.string()),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
  }).optional(),
  ai_provider: z.enum(['gemini', 'grok', 'openai', 'claude']).optional(),
});

// Content search with personalization
contentRoutes.post('/content/search',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.CONTENT_ACCESS] }),
  zValidator('json', SearchQuerySchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    const license = c.get('license');
    
    // Track API usage
    await trackAPIUsage(c.env.DB, user.id, 'content.search', c.req.url);
    
    // Build base query
    let query = `
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT p.name) as policies,
             COUNT(DISTINCT ch.id) as usage_count,
             AVG(r.rating) as avg_rating
      FROM cards c
      LEFT JOIN content_permissions cp ON c.id = cp.card_id
      LEFT JOIN policies p ON cp.policy_id = p.id
      LEFT JOIN search_history ch ON c.id = ch.card_id AND ch.user_id = ?
      LEFT JOIN ratings r ON c.id = r.card_id
      WHERE c.tenant_id = ?
    `;
    
    const params = [user.id, user.tenant_id];
    
    // Apply role-based filtering
    if (user.role !== 'admin') {
      query += ` AND (c.access_level = 'public' OR c.role_permissions LIKE ?)`;
      params.push(`%${user.role}%`);
    }
    
    // Apply search query
    if (data.query) {
      query += ` AND (
        c.title_en LIKE ? OR c.content_en LIKE ? OR 
        c.title_ar LIKE ? OR c.content_ar LIKE ? OR
        c.title_fr LIKE ? OR c.content_fr LIKE ? OR
        c.title_es LIKE ? OR c.content_es LIKE ? OR
        c.tags LIKE ? OR c.category LIKE ?
      )`;
      const searchTerm = `%${data.query}%`;
      params.push(...Array(10).fill(searchTerm));
    }
    
    // Apply filters
    if (data.filters?.categories?.length) {
      query += ` AND c.category IN (${data.filters.categories.map(() => '?').join(',')})`;
      params.push(...data.filters.categories);
    }
    
    if (data.filters?.age_groups?.length) {
      query += ` AND c.metadata_age_range_min <= ? AND c.metadata_age_range_max >= ?`;
      params.push(
        Math.max(...data.filters.age_groups.map(age => parseInt(age.split('-')[1] || '18'))),
        Math.min(...data.filters.age_groups.map(age => parseInt(age.split('-')[0] || '0')))
      );
    }
    
    if (data.filters?.conditions?.length) {
      query += ` AND c.metadata_conditions LIKE ?`;
      params.push(`%${data.filters.conditions.join('%')}%`);
    }
    
    if (data.filters?.languages?.length) {
      const languageFields = data.filters.languages.map(lang => `c.${lang}_available = 1`);
      query += ` AND (${languageFields.join(' OR ')})`;
    }
    
    if (data.filters?.difficulty_level) {
      query += ` AND c.metadata_difficulty_level = ?`;
      params.push(data.filters.difficulty_level);
    }
    
    // Apply personalization
    if (data.personalization?.child_context) {
      const child = data.personalization.child_context;
      if (child.age !== undefined) {
        query += ` AND c.metadata_age_range_min <= ? AND c.metadata_age_range_max >= ?`;
        params.push(child.age, child.age);
      }
      
      if (child.conditions?.length) {
        query += ` AND c.metadata_conditions LIKE ?`;
        params.push(`%${child.conditions.join('%')}%`);
      }
    }
    
    if (data.personalization?.role_context) {
      query += ` AND (c.role_permissions IS NULL OR c.role_permissions LIKE ?)`;
      params.push(`%${data.personalization.role_context}%`);
    }
    
    // Group by and order
    query += `
      GROUP BY c.id
      ORDER BY 
        CASE WHEN c.category = ? THEN 1 ELSE 2 END,
        usage_count DESC,
        avg_rating DESC,
        c.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(
      data.personalization?.role_context || 'educational',
      data.limit,
      data.offset
    );
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // Record search history
    if (results.length > 0) {
      const searchHistory = {
        user_id: user.id,
        query: data.query,
        filters: JSON.stringify(data.filters || {}),
        personalization: JSON.stringify(data.personalization || {}),
        results_count: results.length,
        created_at: new Date().toISOString(),
      };
      
      await c.env.DB.prepare(`
        INSERT INTO search_history (
          user_id, query, filters, personalization, results_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        searchHistory.user_id,
        searchHistory.query,
        searchHistory.filters,
        searchHistory.personalization,
        searchHistory.results_count,
        searchHistory.created_at
      ).run();
    }
    
    return c.json({
      success: true,
      results: results.map((card: any) => ({
        ...card,
        policies: card.policies ? card.policies.split(',') : [],
        metadata: card.metadata ? JSON.parse(card.metadata) : {},
      })),
      pagination: {
        limit: data.limit,
        offset: data.offset,
        total: results.length,
      }
    });
  }
);

// Get personalized content for user
contentRoutes.get('/content/personalized',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.PERSONALIZATION] }),
  async (c) => {
    const user = c.get('user');
    const limit = Number(c.req.query('limit') || '10');
    
    // Get user's personalization settings
    const { results: settings } = await c.env.DB.prepare(`
      SELECT preferences, child_profiles, content_filters, ai_settings
      FROM personalization_settings
      WHERE user_id = ?
    `).bind(user.id).all();
    
    if (settings.length === 0) {
      return c.json({ success: true, content: [], message: 'No personalization settings found' });
    }
    
    const userSettings = settings[0] as any;
    const preferences = JSON.parse(userSettings.preferences);
    const childProfiles = userSettings.child_profiles ? JSON.parse(userSettings.child_profiles) : [];
    const contentFilters = userSettings.content_filters ? JSON.parse(userSettings.content_filters) : {};
    
    // Build query based on personalization
    let query = `
      SELECT c.*, AVG(r.rating) as avg_rating, COUNT(r.id) as rating_count
      FROM cards c
      LEFT JOIN ratings r ON c.id = r.card_id
      WHERE c.tenant_id = ? AND c.access_level != 'premium'
    `;
    
    const params = [user.tenant_id];
    
    // Apply role-based filtering
    if (user.role !== 'admin') {
      query += ` AND (c.role_permissions IS NULL OR c.role_permissions LIKE ?)`;
      params.push(`%${user.role}%`);
    }
    
    // Apply content filters
    if (contentFilters.categories?.length) {
      query += ` AND c.category IN (${contentFilters.categories.map(() => '?').join(',')})`;
      params.push(...contentFilters.categories);
    }
    
    if (childProfiles.length > 0) {
      const ages = childProfiles.map((child: any) => child.age);
      const minAge = Math.min(...ages);
      const maxAge = Math.max(...ages);
      
      query += ` AND c.metadata_age_range_min <= ? AND c.metadata_age_range_max >= ?`;
      params.push(maxAge, minAge);
      
      // Add condition-based filtering
      const allConditions = childProfiles.flatMap((child: any) => child.conditions || []);
      if (allConditions.length > 0) {
        query += ` AND c.metadata_conditions LIKE ?`;
        params.push(`%${allConditions.join('%')}%`);
      }
    }
    
    // Language preference
    const preferredLanguage = preferences.language || 'en';
    query += ` AND c.${preferredLanguage}_available = 1`;
    
    // Order by relevance and quality
    query += `
      GROUP BY c.id
      ORDER BY 
        avg_rating DESC NULLS LAST,
        rating_count DESC,
        c.created_at DESC
      LIMIT ?
    `;
    
    params.push(limit);
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      success: true,
      content: results.map((card: any) => ({
        ...card,
        metadata: card.metadata ? JSON.parse(card.metadata) : {},
        personalized_reason: 'Based on your child profiles and preferences',
      })),
      personalization_context: {
        child_profiles: childProfiles,
        content_filters: contentFilters,
        language_preference: preferredLanguage,
      }
    });
  }
);

// Content personalization with AI
contentRoutes.post('/content/personalize',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.PERSONALIZATION, LicenseFeatures.BYOK_SUPPORT] }),
  zValidator('json', PersonalizationRequestSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    
    // Get original content
    const { results: contentResults } = await c.env.DB.prepare(`
      SELECT * FROM cards WHERE id = ? AND tenant_id = ?
    `).bind(data.content_id, user.tenant_id).all();
    
    if (contentResults.length === 0) {
      throw new HTTPException(404, { message: 'Content not found' });
    }
    
    const originalContent = contentResults[0] as any;
    
    // Get user's BYOK configuration
    const { results: byokResults } = await c.env.DB.prepare(`
      SELECT * FROM byok_configs 
      WHERE user_id = ? AND provider = ? AND is_active = true
    `).bind(user.id, data.ai_provider || 'gemini').all();
    
    if (byokResults.length === 0) {
      throw new HTTPException(400, { message: 'BYOK configuration not found for selected provider' });
    }
    
    const byokConfig = byokResults[0] as any;
    
    // Check usage limits
    if (byokConfig.max_usage_count && byokConfig.usage_count >= byokConfig.max_usage_count) {
      throw new HTTPException(429, { message: 'BYOK usage limit exceeded' });
    }
    
    // Build personalization prompt
    let prompt = '';
    
    switch (data.personalization_type) {
      case 'simplify':
        prompt = `Simplify this content for a ${data.target_role || 'parent'}:\n\n${originalContent.content_en}`;
        break;
        
      case 'expand':
        prompt = `Expand this content with more detailed information for a ${data.target_role || 'doctor'}:\n\n${originalContent.content_en}`;
        break;
        
      case 'translate':
        if (!data.target_language) {
          throw new HTTPException(400, { message: 'Target language required for translation' });
        }
        prompt = `Translate this content to ${data.target_language}:\n\n${originalContent.content_en}`;
        break;
        
      case 'role_specific':
        const roleContext = {
          doctor: 'Provide medical terminology and clinical insights',
          therapist: 'Focus on therapeutic approaches and psychological aspects',
          educator: 'Include educational strategies and learning objectives',
          parent: 'Use simple, practical language for everyday use'
        };
        
        prompt = `Rewrite this content ${roleContext[data.target_role || 'parent']}:\n\n${originalContent.content_en}`;
        
        if (data.child_context) {
          prompt += `\n\nConsider this child context: Age ${data.child_context.age}, Conditions: ${data.child_context.conditions.join(', ')}`;
        }
        break;
    }
    
    // Here you would integrate with the actual AI provider
    // For now, we'll simulate the response
    const simulatedResponse = {
      personalized_content: `Personalized version of: ${originalContent.title_en}`,
      personalization_type: data.personalization_type,
      target_role: data.target_role,
      target_language: data.target_language,
      child_context: data.child_context,
      confidence: 0.85,
      generated_at: new Date().toISOString(),
    };
    
    // Update BYOK usage
    await c.env.DB.prepare(`
      UPDATE byok_configs 
      SET usage_count = usage_count + 1, updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), byokConfig.id).run();
    
    // Record personalization
    await c.env.DB.prepare(`
      INSERT INTO personalization_history (
        user_id, content_id, personalization_type, target_role,
        target_language, child_context, original_content, 
        personalized_content, ai_provider, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      data.content_id,
      data.personalization_type,
      data.target_role,
      data.target_language,
      JSON.stringify(data.child_context || {}),
      originalContent.content_en,
      JSON.stringify(simulatedResponse),
      data.ai_provider || 'gemini',
      new Date().toISOString()
    ).run();
    
    return c.json({
      success: true,
      personalization: simulatedResponse,
      byok_usage: {
        current: byokConfig.usage_count + 1,
        limit: byokConfig.max_usage_count,
      }
    });
  }
);

// Content management routes (Admin only)
contentRoutes.post('/content/cards',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.CONTENT_MANAGEMENT] }),
  zValidator('json', CreateCardSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');
    
    const card = {
      title_en: data.title.en,
      title_ar: data.title.ar,
      title_fr: data.title.fr,
      title_es: data.title.es,
      content_en: data.content.en,
      content_ar: data.content.ar,
      content_fr: data.content.fr,
      content_es: data.content.es,
      category: data.category,
      tags: JSON.stringify(data.tags),
      metadata: JSON.stringify(data.metadata),
      access_level: data.access_level,
      role_permissions: data.role_permissions ? JSON.stringify(data.role_permissions) : null,
      tenant_id: data.tenant_id,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const result = await c.env.DB.prepare(`
      INSERT INTO cards (
        title_en, title_ar, title_fr, title_es,
        content_en, content_ar, content_fr, content_es,
        category, tags, metadata, access_level, role_permissions,
        tenant_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      card.title_en,
      card.title_ar,
      card.title_fr,
      card.title_es,
      card.content_en,
      card.content_ar,
      card.content_fr,
      card.content_es,
      card.category,
      card.tags,
      card.metadata,
      card.access_level,
      card.role_permissions,
      card.tenant_id,
      card.created_by,
      card.created_at,
      card.updated_at
    ).run();
    
    return c.json({ 
      success: true, 
      card: { ...card, id: result.meta.last_row_id } 
    });
  }
);

contentRoutes.get('/content/cards',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.CONTENT_MANAGEMENT] }),
  async (c) => {
    const user = c.get('user');
    const page = Number(c.req.query('page') || '1');
    const limit = Number(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    
    const { results } = await c.env.DB.prepare(`
      SELECT c.*, u.name as created_by_name
      FROM cards c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.tenant_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.tenant_id, limit, offset).all();
    
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM cards WHERE tenant_id = ?
    `).bind(user.tenant_id).first();
    
    return c.json({
      success: true,
      cards: results.map((card: any) => ({
        ...card,
        tags: card.tags ? JSON.parse(card.tags) : [],
        metadata: card.metadata ? JSON.parse(card.metadata) : {},
        role_permissions: card.role_permissions ? JSON.parse(card.role_permissions) : [],
      })),
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        total_pages: Math.ceil((countResult?.total || 0) / limit)
      }
    });
  }
);

contentRoutes.put('/content/cards/:id',
  licenseMiddleware({ requiredFeatures: [LicenseFeatures.CONTENT_MANAGEMENT] }),
  zValidator('json', UpdateCardSchema),
  async (c) => {
    const cardId = c.req.param('id');
    const data = c.req.valid('json');
    const user = c.get('user');
    
    const updates = [];
    const params = [];
    
    if (data.title?.en) {
      updates.push('title_en = ?');
      params.push(data.title.en);
    }
    
    if (data.content?.en) {
      updates.push('content_en = ?');
      params.push(data.content.en);
    }
    
    if (data.category) {
      updates.push('category = ?');
      params.push(data.category);
    }
    
    if (data.tags) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }
    
    if (data.metadata) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(data.metadata));
    }
    
    if (data.access_level) {
      updates.push('access_level = ?');
      params.push(data.access_level);
    }
    
    if (data.role_permissions) {
      updates.push('role_permissions = ?');
      params.push(JSON.stringify(data.role_permissions));
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    
    params.push(cardId, user.tenant_id);
    
    const result = await c.env.DB.prepare(`
      UPDATE cards 
      SET ${updates.join(', ')}
      WHERE id = ? AND tenant_id = ?
    `).bind(...params).run();
    
    if (result.meta.changes === 0) {
      throw new HTTPException(404, { message: 'Card not found' });
    }
    
    return c.json({ success: true, message: 'Card updated' });
  }
);

export default contentRoutes;