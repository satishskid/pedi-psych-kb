export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'doctor' | 'psychologist' | 'parent' | 'educator';
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  content: Record<string, any>;
  category: string;
  tags: string[];
  target_roles: string[];
  languages: string[];
  rtl_languages: string[];
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  actions: string[];
  resources: string[];
  conditions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ExportRequest {
  card_id: string;
  language: string;
  role: string;
  city: string;
  format: 'html' | 'pdf';
  user_id: string;
}

export interface SearchQuery {
  q: string;
  language: string;
  role: string;
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  cards: Card[];
  total: number;
  limit: number;
  offset: number;
}

export interface RBACContext {
  user: User;
  action: string;
  resource: string;
  context?: Record<string, any>;
}

export interface LocaleContent {
  [key: string]: {
    [lang: string]: string;
  };
}

export const RTL_LANGUAGES = ['ar'];
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'ar'];
export const SUPPORTED_ROLES = ['admin', 'doctor', 'psychologist', 'parent', 'educator'];

export function isRTLLanguage(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang);
}

export function getTextDirection(lang: string): 'ltr' | 'rtl' {
  return isRTLLanguage(lang) ? 'rtl' : 'ltr';
}