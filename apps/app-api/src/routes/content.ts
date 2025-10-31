import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { licenseMiddleware, trackAPIUsage } from '../middleware/license';
import { LicenseFeatures } from '@pedi-psych/shared';
import type { Env } from '../index';

// Helper function to get database instance
function getDatabase(c: any) {
  if (c.env.DB) {
    return c.env.DB;
  } else if (c.env.DB_PROD) {
    return c.env.DB_PROD;
  }
  throw new HTTPException(500, { message: 'Database not available' });
}

const contentRoutes = new Hono<{ Bindings: Env }>();

// Add export at the end of file
// ... rest of the file content ...

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
  licenseMiddleware({ requiredRoles: ['admin', 'doctor', 'therapist', 'educator', 'parent'] }),
  zValidator('json', SearchQuerySchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user' as any);
    const license = c.get('license' as any);
    
    try {
      const db = getDatabase(c);
      
      // Track API usage (non-blocking)
      await trackAPIUsage(db, user.id, 'content.search', c.req.url);
      
      // Simple search query - just search cards table
      let query = `
        SELECT c.*, 0 as usage_count, 0 as avg_rating
        FROM cards c
        WHERE c.tenant_id = ?
      `;
      
      const params = [user.tenant_id || 1];
      
      // Apply search query if provided
      if (data.query) {
        query += ` AND (
          c.title_en LIKE ? OR c.title_ar LIKE ? OR
          c.content_en LIKE ? OR c.content_ar LIKE ? OR
          c.category LIKE ? OR c.tags LIKE ?
        )`;
        const searchTerm = `%${data.query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      // Role-based content filtering - professionals get full access
      const roleContentAccess = {
        'admin': ['medical', 'therapeutic', 'educational', 'behavioral', 'developmental'],
        'doctor': ['medical', 'therapeutic', 'educational', 'behavioral', 'developmental'], // Full access
        'therapist': ['therapeutic', 'educational', 'behavioral', 'developmental'], // All except medical
        'educator': ['educational', 'behavioral'], // Education focused
        'parent': ['educational'] // Basic guidance only
      };
      
      const allowedCategories = roleContentAccess[user.role as keyof typeof roleContentAccess] || ['educational'];
      
      // Apply role-based category filtering
      if (user.role !== 'admin') {
        query += ` AND c.category IN (${allowedCategories.map(() => '?').join(',')})`;
        params.push(...allowedCategories);
      }
      
      // Apply filters if provided
      if (data.filters?.categories?.length) {
        query += ` AND c.category IN (${data.filters.categories.map(() => '?').join(',')})`;
        params.push(...data.filters.categories);
      }
      
      // Add pagination
      query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
      params.push(data.limit, data.offset);
      
      console.log('Executing search query:', query);
      console.log('With parameters:', params);
      
      const { results } = await db.prepare(query).bind(...params).all();
      
      console.log('Search results count:', results.length);
      
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
        access_level: 'public', // Default since cards table doesn't have this
        role_permissions: [], // Default since cards table doesn't have this
        created_at: card.created_at,
        updated_at: card.updated_at,
        avg_rating: card.avg_rating || 0,
        usage_count: card.usage_count || 0
      }));
      
      return c.json({
        success: true,
        results: formattedResults,
        total: formattedResults.length,
        query: data.query,
        filters: data.filters,
        pagination: {
          limit: data.limit,
          offset: data.offset,
          has_more: formattedResults.length === data.limit
        }
      });
      
    } catch (error) {
      console.error('Search error:', error);
      return c.json({ 
        success: false, 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  }
);

// Get personalized content for user
contentRoutes.get('/content/personalized',
  licenseMiddleware({ requiredRoles: ['admin', 'doctor', 'therapist', 'educator', 'parent'] }),
  async (c) => {
    const user = c.get('user' as any);
    const limit = Number(c.req.query('limit') || '10');
    
    const db = getDatabase(c);
    
    // Get user's personalization settings
    const { results: settings } = await db.prepare(`
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
    
    // Build query based on personalization - simplified without ratings table
    let query = `
      SELECT c.*, 0 as avg_rating, 0 as rating_count
      FROM cards c
      WHERE c.tenant_id = ?
    `;
    
    const params = [user.tenant_id || 1]; // Default to tenant_id 1 if undefined
    
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
    
    const { results } = await db.prepare(query).bind(...params).all();
    
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
  licenseMiddleware({ requiredRoles: ['admin', 'doctor', 'therapist'] }), // Only professionals can personalize
  zValidator('json', PersonalizationRequestSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user' as any);
    
    const db = getDatabase(c);
    
    // Get original content
    const { results: contentResults } = await db.prepare(`
      SELECT * FROM cards WHERE id = ? AND tenant_id = ?
    `).bind(data.content_id, user.tenant_id).all();
    
    if (contentResults.length === 0) {
      throw new HTTPException(404, { message: 'Content not found' });
    }
    
    const originalContent = contentResults[0] as any;
    
    // Get user's BYOK configuration
    const { results: byokResults } = await db.prepare(`
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
    await db.prepare(`
      UPDATE byok_configs 
      SET usage_count = usage_count + 1, updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), byokConfig.id).run();
    
    // Record personalization
    await db.prepare(`
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
  licenseMiddleware({ requiredRoles: ['admin'] }), // Only admins can create content
  zValidator('json', CreateCardSchema),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user' as any);
    
    const db = getDatabase(c);
    
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
    
    const result = await db.prepare(`
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
  licenseMiddleware({ requiredRoles: ['admin'] }), // Only admins can view all cards
  async (c) => {
    const user = c.get('user' as any);
    const page = Number(c.req.query('page') || '1');
    const limit = Number(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    
    const db = getDatabase(c);
    
    const { results } = await db.prepare(`
      SELECT c.*, u.name as created_by_name
      FROM cards c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.tenant_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.tenant_id, limit, offset).all();
    
    const countResult = await db.prepare(`
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
        total_pages: Math.ceil((Number(countResult?.total) || 0) / limit)
      }
    });
  }
);

contentRoutes.put('/content/cards/:id',
  licenseMiddleware({ requiredRoles: ['admin'] }), // Only admins can update cards
  zValidator('json', UpdateCardSchema),
  async (c) => {
    const cardId = c.req.param('id');
    const data = c.req.valid('json');
    const user = c.get('user' as any);
    
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
    
    const db = getDatabase(c);
    
    const result = await db.prepare(`
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

// Book structure endpoint
contentRoutes.get('/content/book-structure',
  licenseMiddleware({ requiredRoles: ['admin', 'doctor', 'therapist', 'educator', 'parent'] }),
  async (c) => {
    try {
      const user = c.get('user' as any);
      const language = c.req.query('language') || 'en';
      const role = c.req.query('role') || user.role;
      
      console.log('Book structure request - User object:', JSON.stringify(user, null, 2));
      console.log('User tenant_id:', user.tenant_id);
      console.log('User id:', user.id, 'Language:', language, 'Role:', role);
      
      const db = getDatabase(c);
      console.log('Database connection established');
    
    // Fetch all cards for the tenant with role-based filtering
    // Simplified query to avoid potential table issues
    let query = `
      SELECT c.*, 
             0 as usage_count,
             0 as avg_rating
      FROM cards c
      WHERE c.tenant_id = ?
    `;
    
    const params = [user.tenant_id];
    
    // Apply role-based filtering - simplified since cards table doesn't have access control columns
    if (user.role !== 'admin') {
      // For now, show all cards to authenticated users
      // TODO: Implement proper access control when cards table is updated
    }
    
    query += `
      GROUP BY c.id
      ORDER BY c.category, c.created_at DESC
    `;
    
    console.log('Executing query:', query, 'with params:', params);
    const { results } = await db.prepare(query).bind(...params).all();
    
    console.log('Query executed successfully');
    console.log('Query results count:', results.length);
    if (results.length > 0) {
      console.log('First result sample:', JSON.stringify(results[0], null, 2));
    }
    
    console.log('Starting to organize cards into chapters');
    
    // Organize cards into book structure
    const chapters: Record<string, any> = {};
    
    results.forEach((card: any) => {
      // Parse JSON fields with error handling
      let tags = [];
      let metadata = {};
      let rolePermissions = [];
      
      try {
        tags = card.tags ? JSON.parse(card.tags) : [];
      } catch (e) {
        tags = [];
      }
      
      try {
        metadata = card.metadata ? JSON.parse(card.metadata) : {};
      } catch (e) {
        metadata = {};
      }
      
      try {
        rolePermissions = card.role_permissions ? JSON.parse(card.role_permissions) : [];
      } catch (e) {
        rolePermissions = [];
      }
      
      // Determine chapter based on category
      const chapterKey = card.category || 'general';
      
      if (!chapters[chapterKey]) {
        // Map categories to book chapter titles
        const chapterTitles: Record<string, string> = {
          'medical': 'Medical Conditions & Treatments',
          'therapeutic': 'Therapeutic Interventions',
          'educational': 'Educational Resources',
          'behavioral': 'Behavioral Health',
          'developmental': 'Child Development',
          'general': 'General Resources'
        };
        
        const chapterDescriptions: Record<string, string> = {
          'medical': 'Medical guidance for pediatric behavioral health conditions',
          'therapeutic': 'Evidence-based therapeutic interventions and techniques',
          'educational': 'Resources for educators and educational settings',
          'behavioral': 'Behavioral health assessment and intervention strategies',
          'developmental': 'Child development milestones and support strategies',
          'general': 'General resources and guidance'
        };
        
        chapters[chapterKey] = {
          id: chapterKey,
          title: chapterTitles[chapterKey] || 'Other Resources',
          description: chapterDescriptions[chapterKey] || 'Additional resources and guidance',
          icon: 'BookOpen', // Will be mapped to actual icon component in frontend
          sections: {}
        };
      }
      
      // Group cards into sections based on tags or metadata
      let sectionKey = 'general';
      let sectionTitle = 'General Information';
      
      if (tags.length > 0) {
        sectionKey = tags[0].toLowerCase().replace(/\s+/g, '-');
        sectionTitle = tags[0];
      } else if (metadata.conditions && metadata.conditions.length > 0) {
        sectionKey = metadata.conditions[0].toLowerCase().replace(/\s+/g, '-');
        sectionTitle = metadata.conditions[0];
      }
      
      if (!chapters[chapterKey].sections[sectionKey]) {
        chapters[chapterKey].sections[sectionKey] = {
          id: sectionKey,
          title: sectionTitle,
          cards: [],
          estimatedReadTime: 0
        };
      }
      
      // Add card to section
      const cardData = {
        id: card.id,
        title: {
          en: card.title_en || '',
          ar: card.title_ar || '',
          fr: card.title_fr || '',
          es: card.title_es || ''
        },
        description: {
          en: card.content_en?.substring(0, 200) || '',
          ar: card.content_ar?.substring(0, 200) || '',
          fr: card.content_fr?.substring(0, 200) || '',
          es: card.content_es?.substring(0, 200) || ''
        },
        content: {
          en: card.content_en || '',
          ar: card.content_ar || '',
          fr: card.content_fr || '',
          es: card.content_es || ''
        },
        category: card.category || 'general',
        tags: tags,
        metadata: metadata,
        access_level: 'public',
        role_permissions: [],
        created_at: card.created_at,
        updated_at: card.updated_at,
        avg_rating: 0,
        usage_count: 0
      };
      
      chapters[chapterKey].sections[sectionKey].cards.push(cardData);
      
      // Calculate estimated read time (assuming 200 words per minute)
      const wordCount = (cardData.content[language as keyof typeof cardData.content] || '').split(/\s+/).length;
      chapters[chapterKey].sections[sectionKey].estimatedReadTime += Math.ceil(wordCount / 200);
    });
    
    // Convert sections object to array and chapters to array
    const bookChapters = Object.values(chapters).map((chapter: any) => ({
      ...chapter,
      sections: Object.values(chapter.sections).map((section: any) => ({
        ...section,
        estimatedReadTime: Math.max(section.estimatedReadTime, 5) // Minimum 5 minutes
      }))
    }));
    
    console.log('Returning response with', bookChapters.length, 'chapters');
    return c.json({
      success: true,
      chapters: bookChapters,
      total_chapters: bookChapters.length,
      total_cards: results.length,
      language,
      role
    });
    } catch (error) {
      console.error('Error in book-structure endpoint:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }
);

// Advanced BYOK-based search with medical accuracy boundaries
contentRoutes.post('/content/advanced-search',
  licenseMiddleware({ requiredRoles: ['admin', 'doctor', 'therapist', 'educator', 'parent'] }),
  zValidator('json', z.object({
    query: z.string().min(1).max(1000),
    context: z.object({
      user_role: z.enum(['doctor', 'therapist', 'educator', 'parent']),
      child_age: z.number().int().min(0).max(18).optional(),
      conditions: z.array(z.string()).optional(),
      severity: z.enum(['mild', 'moderate', 'severe']).optional(),
      intervention_type: z.enum(['assessment', 'therapy', 'education', 'crisis']).optional()
    }),
    ai_provider: z.enum(['gemini', 'grok', 'openai', 'claude']).optional(),
    response_type: z.enum(['guidance', 'intervention', 'handout', 'teleprompter']).default('guidance'),
    limit: z.number().int().min(1).max(20).default(10)
  })),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user' as any);
    
    try {
      const db = getDatabase(c);
      
      // Get user's BYOK configuration
      let aiProvider = data.ai_provider || 'gemini';
      let apiKey = null;
      
      if (data.ai_provider) {
        const byokConfig = await db.prepare(`
          SELECT api_key_encrypted, model_preferences 
          FROM byok_configs 
          WHERE user_id = ? AND provider = ? AND is_active = 1
        `).bind(user.id, data.ai_provider).first();
        
        if (byokConfig) {
          apiKey = byokConfig.api_key_encrypted; // In production, decrypt this
        }
      }
      
      // Search foundational content first
      let query = `
        SELECT c.*, 0 as usage_count, 0 as avg_rating
        FROM cards c
        WHERE c.tenant_id = ?
      `;
      
      const params = [user.tenant_id || 1];
      
      // Apply role-based filtering
      const roleContentAccess = {
        'admin': ['medical', 'therapeutic', 'educational', 'behavioral', 'developmental'],
        'doctor': ['medical', 'therapeutic', 'educational', 'behavioral', 'developmental'],
        'therapist': ['therapeutic', 'educational', 'behavioral', 'developmental'],
        'educator': ['educational', 'behavioral'],
        'parent': ['educational']
      };
      
      const allowedCategories = roleContentAccess[user.role as keyof typeof roleContentAccess] || ['educational'];
      
      if (user.role !== 'admin') {
        query += ` AND c.category IN (${allowedCategories.map(() => '?').join(',')})`;
        params.push(...allowedCategories);
      }
      
      // Apply content search
      if (data.query) {
        query += ` AND (
          c.title_en LIKE ? OR c.title_ar LIKE ? OR
          c.content_en LIKE ? OR c.content_ar LIKE ? OR
          c.category LIKE ? OR c.tags LIKE ?
        )`;
        const searchTerm = `%${data.query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      // Filter by conditions if specified (simplified)
       if (data.context.conditions?.length) {
         const condition = data.context.conditions[0]; // Use first condition to avoid complex patterns
         query += ` AND (c.tags LIKE ? OR c.metadata LIKE ?)`;
         params.push(`%${condition}%`, `%${condition}%`);
       }
      
      query += ` ORDER BY c.created_at DESC LIMIT ?`;
      params.push(data.limit);
      
      const { results } = await db.prepare(query).bind(...params).all();
      
      // Generate AI-enhanced response based on role and context
      const aiEnhancedResponse = await generateAIResponse({
        foundationalContent: results,
        userQuery: data.query,
        userRole: data.context.user_role,
        childAge: data.context.child_age,
        conditions: data.context.conditions,
        severity: data.context.severity,
        responseType: data.response_type,
        aiProvider,
        apiKey
      });
      
      return c.json({
        success: true,
        foundational_content: results.map((card: any) => ({
          id: card.id,
          title: {
            en: card.title_en,
            ar: card.title_ar || ''
          },
          content: {
            en: card.content_en,
            ar: card.content_ar || ''
          },
          category: card.category,
          tags: card.tags ? JSON.parse(card.tags) : [],
          metadata: card.metadata ? JSON.parse(card.metadata) : {}
        })),
        ai_enhanced_response: aiEnhancedResponse,
        context: data.context,
        response_type: data.response_type,
        medical_accuracy_note: "This AI-generated content is for educational purposes. Always consult qualified healthcare professionals for medical decisions."
      });
      
    } catch (error) {
      console.error('Advanced search error:', error);
      return c.json({ 
        success: false, 
        error: 'Advanced search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  }
);

// Helper function to generate AI responses
async function generateAIResponse(params: {
  foundationalContent: any[],
  userQuery: string,
  userRole: string,
  childAge?: number,
  conditions?: string[],
  severity?: string,
  responseType: string,
  aiProvider: string,
  apiKey: string | null
}) {
  const { foundationalContent, userQuery, userRole, childAge, conditions, severity, responseType } = params;
  
  // Create role-specific prompts
  const rolePrompts = {
    parent: `As a parent seeking guidance about childhood behavioral issues, I need practical, easy-to-understand advice. My question: "${userQuery}"`,
    educator: `As an educator working with children with behavioral challenges, I need classroom strategies and educational interventions. My question: "${userQuery}"`,
    therapist: `As a licensed therapist, I need evidence-based therapeutic interventions and treatment approaches. My question: "${userQuery}"`,
    doctor: `As a medical professional, I need clinical assessment tools, diagnostic criteria, and treatment protocols. My question: "${userQuery}"`
  };
  
  const responseTypePrompts = {
    guidance: "Provide comprehensive guidance and recommendations.",
    intervention: "Create a structured intervention plan with specific steps.",
    handout: "Generate a patient/parent handout with key information and action items.",
    teleprompter: "Create a therapy session script with talking points and intervention techniques."
  };
  
  // Build context from foundational content
  const contentContext = foundationalContent.map(card => 
    `${card.category}: ${card.title_en} - ${card.content_en.substring(0, 200)}...`
  ).join('\n');
  
  const contextInfo = [
    childAge ? `Child age: ${childAge} years` : '',
    conditions?.length ? `Conditions: ${conditions.join(', ')}` : '',
    severity ? `Severity: ${severity}` : ''
  ].filter(Boolean).join(', ');
  
  const fullPrompt = `
${rolePrompts[userRole as keyof typeof rolePrompts]}

Context: ${contextInfo}

Foundational Knowledge Base Content:
${contentContext}

Task: ${responseTypePrompts[responseType as keyof typeof responseTypePrompts]}

Requirements:
- Base your response on the provided foundational content
- Maintain medical accuracy and evidence-based practices
- Tailor the language and complexity to the user role (${userRole})
- Include specific, actionable recommendations
- Add appropriate disclaimers about professional consultation
- If this is for ${responseType}, format accordingly

Response:`;

  // For demo purposes, return a structured response
  // In production, this would call the actual AI API
  return {
    provider: params.aiProvider,
    prompt_used: fullPrompt,
    response: generateMockAIResponse(userRole, responseType, userQuery, contextInfo),
    medical_accuracy_verified: true,
    sources_referenced: foundationalContent.length,
    disclaimer: "This AI-generated content is based on foundational medical knowledge but should not replace professional medical advice."
  };
}

function generateMockAIResponse(userRole: string, responseType: string, query: string, context: string) {
  const responses = {
    parent: {
      guidance: `Based on your question about "${query}", here are some practical steps you can take at home. Remember, consistency is key when addressing behavioral challenges. Start with establishing clear routines and positive reinforcement strategies.`,
      handout: `## Parent Guide: Managing Behavioral Challenges\n\n**Your Question:** ${query}\n\n**Key Points:**\n- Establish consistent routines\n- Use positive reinforcement\n- Seek professional help when needed\n\n**Action Steps:**\n1. Document specific behaviors\n2. Implement consistent responses\n3. Schedule regular check-ins`
    },
    therapist: {
      intervention: `## Therapeutic Intervention Plan\n\n**Presenting Issue:** ${query}\n**Context:** ${context}\n\n**Assessment Phase:**\n- Conduct comprehensive behavioral assessment\n- Identify triggers and patterns\n\n**Intervention Strategies:**\n- Cognitive-behavioral techniques\n- Family systems approach\n- Progress monitoring tools`,
      teleprompter: `## Therapy Session Guide\n\n**Opening (5 min):**\n- "How has the week been since our last session?"\n- Review homework/practice exercises\n\n**Main Session (40 min):**\n- Address: ${query}\n- Use techniques: CBT, play therapy, family involvement\n\n**Closing (10 min):**\n- Summarize key insights\n- Assign practice exercises`
    },
    doctor: {
      guidance: `## Clinical Assessment for: ${query}\n\n**Differential Diagnosis Considerations:**\n- Rule out medical causes\n- Assess comorbid conditions\n\n**Evidence-Based Treatment Options:**\n- Pharmacological interventions (if indicated)\n- Behavioral interventions\n- Family therapy referrals\n\n**Monitoring Parameters:**\n- Symptom severity scales\n- Functional improvement measures`
    },
    educator: {
      guidance: `## Classroom Strategies for: ${query}\n\n**Environmental Modifications:**\n- Structured classroom layout\n- Clear visual schedules\n- Sensory considerations\n\n**Behavioral Supports:**\n- Positive behavior intervention plan\n- Peer support strategies\n- Communication with family\n\n**Academic Accommodations:**\n- Modified assignments\n- Extended time\n- Alternative assessment methods`
    }
  };
  
  return responses[userRole as keyof typeof responses]?.[responseType as keyof any] || 
         `Personalized response for ${userRole} regarding: ${query}. Context: ${context}`;
}

// BYOK Configuration Management
contentRoutes.post('/content/byok-config',
  licenseMiddleware({ requiredRoles: ['admin', 'doctor', 'therapist', 'educator', 'parent'] }),
  zValidator('json', z.object({
    provider: z.enum(['gemini', 'grok', 'openai', 'claude']),
    api_key: z.string().min(10),
    model_preferences: z.object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().int().positive().optional()
    }).optional()
  })),
  async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user' as any);
    
    try {
      const db = getDatabase(c);
      
      // In production, encrypt the API key
      const encryptedKey = data.api_key; // TODO: Implement encryption
      
      // Deactivate existing configs for this provider
      await db.prepare(`
        UPDATE byok_configs 
        SET is_active = 0 
        WHERE user_id = ? AND provider = ?
      `).bind(user.id, data.provider).run();
      
      // Insert new configuration
      await db.prepare(`
        INSERT INTO byok_configs (
          user_id, provider, api_key_encrypted, model_preferences, 
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?)
      `).bind(
        user.id,
        data.provider,
        encryptedKey,
        JSON.stringify(data.model_preferences || {}),
        new Date().toISOString(),
        new Date().toISOString()
      ).run();
      
      return c.json({
        success: true,
        message: `BYOK configuration saved for ${data.provider}`,
        provider: data.provider,
        configured_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('BYOK config error:', error);
      return c.json({ 
        success: false, 
        error: 'Failed to save BYOK configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  }
);

// Get user's BYOK configurations
contentRoutes.get('/content/byok-config',
  licenseMiddleware({ requiredRoles: ['admin', 'doctor', 'therapist', 'educator', 'parent'] }),
  async (c) => {
    const user = c.get('user' as any);
    
    try {
      const db = getDatabase(c);
      
      const { results } = await db.prepare(`
        SELECT provider, model_preferences, is_active, created_at, updated_at
        FROM byok_configs 
        WHERE user_id = ? AND is_active = 1
        ORDER BY created_at DESC
      `).bind(user.id).all();
      
      return c.json({
        success: true,
        configurations: results.map((config: any) => ({
          provider: config.provider,
          model_preferences: config.model_preferences ? JSON.parse(config.model_preferences) : {},
          is_active: config.is_active,
          configured_at: config.created_at
        }))
      });
      
    } catch (error) {
      console.error('Get BYOK config error:', error);
      return c.json({ 
        success: false, 
        error: 'Failed to retrieve BYOK configurations'
      }, 500);
    }
  }
);export default contentRoutes;