/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { z } from 'zod';
import { CardSchema, SearchQuerySchema } from '@pedi-psych/shared';
import type { Card, SearchResult, SearchQuery } from '@pedi-psych/shared';

export interface Env {
  KB_CACHE: KVNamespace;
  JWT_SECRET: string;
}

type Bindings = {
  KB_CACHE: KVNamespace;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors());

app.use('/api/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  });
  return jwtMiddleware(c, next);
});

const SearchRequestSchema = z.object({
  q: z.string().min(1),
  language: z.enum(['en', 'hi', 'ar']),
  role: z.enum(['admin', 'doctor', 'psychologist', 'parent', 'educator']),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

app.get('/api/kb/search', async (c) => {
  try {
    const query = SearchRequestSchema.parse({
      q: c.req.query('q'),
      language: c.req.query('language'),
      role: c.req.query('role'),
      category: c.req.query('category'),
      tags: c.req.query('tags')?.split(',').filter(Boolean),
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0,
    });

    const cacheKey = `search:${JSON.stringify(query)}`;
    const cached = await c.env.KB_CACHE.get(cacheKey);
    
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const searchResult = await performSearch(c.env.KB_CACHE, query);
    
    await c.env.KB_CACHE.put(cacheKey, JSON.stringify(searchResult), {
      expirationTtl: 300, // 5 minutes
    });

    return c.json(searchResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request parameters', details: error.errors }, 400);
    }
    return c.json({ error: 'Search failed' }, 500);
  }
});

app.get('/api/kb/cards/:id', async (c) => {
  try {
    const cardId = c.req.param('id');
    const language = c.req.query('language') || 'en';
    const role = c.req.query('role');

    if (!role) {
      return c.json({ error: 'Role parameter required' }, 400);
    }

    const cacheKey = `card:${cardId}:${language}:${role}`;
    const cached = await c.env.KB_CACHE.get(cacheKey);
    
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const card = await getCardById(c.env.KB_CACHE, cardId, language, role);
    
    if (!card) {
      return c.json({ error: 'Card not found' }, 404);
    }

    await c.env.KB_CACHE.put(cacheKey, JSON.stringify(card), {
      expirationTtl: 3600, // 1 hour
    });

    return c.json(card);
  } catch (error) {
    return c.json({ error: 'Failed to fetch card' }, 500);
  }
});

async function performSearch(kv: KVNamespace, query: SearchQuery): Promise<SearchResult> {
  const allCards = await getAllCards(kv);
  
  let filteredCards = allCards.filter(card => {
    if (!card.languages.includes(query.language)) return false;
    if (!card.target_roles.includes(query.role)) return false;
    if (query.category && card.category !== query.category) return false;
    if (query.tags && query.tags.length > 0) {
      const hasMatchingTag = query.tags.some(tag => card.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    
    const searchLower = query.q.toLowerCase();
    const titleMatch = card.title[query.language]?.toLowerCase().includes(searchLower);
    const descMatch = card.description[query.language]?.toLowerCase().includes(searchLower);
    const tagMatch = card.tags.some(tag => tag.toLowerCase().includes(searchLower));
    
    return titleMatch || descMatch || tagMatch;
  });

  const start = query.offset || 0;
  const limit = query.limit || 20;
  const end = start + limit;
  const paginatedCards = filteredCards.slice(start, end);

  return {
    cards: paginatedCards,
    total: filteredCards.length,
    limit: limit,
    offset: start,
  };
}

async function getCardById(kv: KVNamespace, id: string, language: string, role: string): Promise<Card | null> {
  const allCards = await getAllCards(kv);
  const card = allCards.find(c => c.id === id);
  
  if (!card || !card.languages.includes(language) || !card.target_roles.includes(role)) {
    return null;
  }
  
  return card;
}

// Deep Dive endpoint: free LLM-powered deeper knowledge
const DeepDiveRequestSchema = z.object({
  condition: z.string().min(1),
  role: z.enum(['admin', 'doctor', 'psychologist', 'parent', 'educator']),
  prompt: z.string().min(1).max(1000),
});

app.post('/api/kb/deepdive', async (c) => {
  try {
    const body = await c.req.json();
    const { condition, role, prompt } = DeepDiveRequestSchema.parse(body);

    // Optional: cache deep-dive responses by condition+role+prompt hash
    const promptHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${condition}:${role}:${prompt}`));
    const cacheKey = `deepdive:${Array.from(new Uint8Array(promptHash)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    const cached = await c.env.KB_CACHE.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    // Build system prompt with pediatric psych context
    const systemPrompt = `You are a pediatric mental-health expert assistant.
- User role: ${role}
- Condition: ${condition}
- Provide concise, evidence-based guidance.
- Always emphasize safety, family-centered care, and cultural sensitivity for India & GCC populations.
- If the question is outside your scope, advise consulting a licensed clinician.`;

    // Call Cloudflare Workers AI (Gemma 2B is free & fast)
    const ai = new (c.env as any).AI(); // Workers AI binding
    const answer = await ai.run('@cf/google/gemma-2b-it-lora', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      stream: false,
    });

    const result = {
      condition,
      role,
      prompt,
      response: answer.response,
      model: '@cf/google/gemma-2b-it-lora',
      cached: false,
      timestamp: new Date().toISOString(),
    };

    // Cache for 1 hour
    await c.env.KB_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 });
    return c.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request body', details: error.errors }, 400);
    }
    console.error('DeepDive error:', error);
    return c.json({ error: 'Deep dive failed' }, 500);
  }
});

async function getAllCards(kv: KVNamespace): Promise<Card[]> {
  const cardsData = await kv.get('cards:all');
  
  if (!cardsData) {
    return [];
  }
  
  try {
    const cards = JSON.parse(cardsData);
    // Parse each card individually to handle optional fields
    return cards.map((card: any) => {
      try {
        return CardSchema.parse(card);
      } catch (error) {
        console.warn('Invalid card data:', error);
        return null;
      }
    }).filter(Boolean) as Card[];
  } catch {
    return [];
  }
}

export default app;