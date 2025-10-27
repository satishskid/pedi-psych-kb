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

const app = new Hono<{ Bindings: Env }>();

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
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
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

  const start = query.offset;
  const end = start + query.limit;
  const paginatedCards = filteredCards.slice(start, end);

  return {
    cards: paginatedCards,
    total: filteredCards.length,
    limit: query.limit,
    offset: query.offset,
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

async function getAllCards(kv: KVNamespace): Promise<Card[]> {
  const cardsData = await kv.get('cards:all');
  
  if (!cardsData) {
    return [];
  }
  
  try {
    const cards = JSON.parse(cardsData);
    return z.array(CardSchema).parse(cards);
  } catch {
    return [];
  }
}

export default app;