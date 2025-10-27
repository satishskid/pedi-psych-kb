import { z } from 'zod';
import { SUPPORTED_LANGUAGES, SUPPORTED_ROLES } from './types.js';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(SUPPORTED_ROLES as [string, ...string[]]),
  tenant_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  region: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CardSchema = z.object({
  id: z.string().uuid(),
  title: z.record(z.string().min(1)),
  description: z.record(z.string().min(1)),
  content: z.record(z.any()),
  category: z.string().min(1),
  tags: z.array(z.string()),
  target_roles: z.array(z.enum(SUPPORTED_ROLES as [string, ...string[]])),
  languages: z.array(z.enum(SUPPORTED_LANGUAGES as [string, ...string[]])),
  rtl_languages: z.array(z.enum(SUPPORTED_LANGUAGES as [string, ...string[]])).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const PolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  effect: z.enum(['allow', 'deny']),
  actions: z.array(z.string().min(1)),
  resources: z.array(z.string().min(1)),
  conditions: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  language: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]),
  role: z.enum(SUPPORTED_ROLES as [string, ...string[]]),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const ExportRequestSchema = z.object({
  card_id: z.string().uuid(),
  language: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]),
  role: z.enum(SUPPORTED_ROLES as [string, ...string[]]),
  city: z.string().min(1),
  format: z.enum(['html', 'pdf']),
  user_id: z.string().uuid(),
});