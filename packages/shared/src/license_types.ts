// License Management System Types

export interface LicenseType {
  id: string;
  name: string;
  description?: string;
  features: LicenseFeature[];
  max_users: number;
  max_api_calls_per_month: number;
  has_personalization: boolean;
  has_byok_support: boolean;
  price_monthly?: number;
  price_annual?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: string;
  license_key: string;
  license_type_id: string;
  tenant_id: string;
  user_id?: string; // null for tenant-wide licenses
  status: LicenseStatus;
  starts_at: string;
  expires_at: string;
  usage_count: number;
  max_usage_count?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserLicense {
  id: string;
  user_id: string;
  license_id: string;
  assigned_at: string;
  assigned_by?: string;
  is_primary: boolean;
}

export interface APIUsage {
  id: string;
  user_id: string;
  license_id?: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  usage_date: string;
  created_at: string;
}

export interface BYOKConfig {
  id: string;
  user_id: string;
  provider: AIProvider;
  api_key_encrypted: string;
  model_preferences?: AIModelPreferences;
  is_active: boolean;
  usage_count: number;
  max_usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationSettings {
  id: string;
  user_id: string;
  preferences: UserPreferences;
  child_profiles: ChildProfile[];
  content_filters: ContentFilters;
  ai_settings: AISettings;
  created_at: string;
  updated_at: string;
}

export interface ContentPermission {
  id: string;
  content_id: string;
  license_type_id: string;
  min_role_level: number;
  access_level: AccessLevel;
  conditions?: Record<string, any>;
  created_at: string;
}

export interface SubscriptionHistory {
  id: string;
  license_id: string;
  action: SubscriptionAction;
  previous_license_type_id?: string;
  new_license_type_id?: string;
  changed_by?: string;
  notes?: string;
  created_at: string;
}

// Enums and Constants
export const LicenseFeatures = {
  BASIC_ACCESS: 'basic_access',
  ROLE_BASED_CONTENT: 'role_based_content',
  PERSONALIZATION: 'personalization',
  BYOK_SUPPORT: 'byok_support',
  API_ACCESS: 'api_access',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  MULTI_LANGUAGE: 'multi_language',
  EXPORT_PDF: 'export_pdf',
  PRIORITY_SUPPORT: 'priority_support',
  CUSTOM_BRANDING: 'custom_branding',
  UNLIMITED_USAGE: 'unlimited_usage',
} as const;

export type LicenseFeature = typeof LicenseFeatures[keyof typeof LicenseFeatures];

export const LicenseStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type LicenseStatus = typeof LicenseStatus[keyof typeof LicenseStatus];

export const AIProvider = {
  GEMINI: 'gemini',
  GROK: 'grok',
  OPENAI: 'openai',
  CLAUDE: 'claude',
} as const;

export type AIProvider = typeof AIProvider[keyof typeof AIProvider];

export const AccessLevel = {
  NONE: 'none',
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
} as const;

export type AccessLevel = typeof AccessLevel[keyof typeof AccessLevel];

export const SubscriptionAction = {
  CREATED: 'created',
  RENEWED: 'renewed',
  UPGRADED: 'upgraded',
  DOWNGRADED: 'downgraded',
  SUSPENDED: 'suspended',
  REACTIVATED: 'reactivated',
  EXPIRED: 'expired',
} as const;

export type SubscriptionAction = typeof SubscriptionAction[keyof typeof SubscriptionAction];

// Complex type definitions
export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    share_data: boolean;
    allow_tracking: boolean;
  };
  accessibility: {
    font_size: 'small' | 'medium' | 'large';
    high_contrast: boolean;
    screen_reader: boolean;
  };
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  conditions: string[];
  medications: string[];
  allergies: string[];
  notes: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentFilters {
  categories: string[];
  age_groups: string[];
  conditions: string[];
  languages: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  content_types: string[];
}

export interface AISettings {
  provider: AIProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt?: string;
  safety_settings: {
    block_none: boolean;
    block_low: boolean;
    block_medium: boolean;
    block_high: boolean;
  };
}

export interface AIModelPreferences {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  top_k: number;
  safety_settings: {
    harm_category: string;
    threshold: string;
  }[];
}

// License validation and checking types
export interface LicenseValidationResult {
  is_valid: boolean;
  status: LicenseStatus;
  license_type?: LicenseType;
  expires_at?: string;
  features: LicenseFeature[];
  usage_stats: {
    current_usage: number;
    max_usage: number;
    remaining_usage: number;
    api_calls_this_month: number;
    max_api_calls: number;
  };
  errors: string[];
}

export interface LicenseCheckOptions {
  required_features?: LicenseFeature[];
  required_roles?: string[];
  check_usage?: boolean;
  check_expiry?: boolean;
}

// API Response types
export interface LicenseResponse {
  success: boolean;
  license?: License;
  license_type?: LicenseType;
  validation?: LicenseValidationResult;
  error?: string;
}

export interface LicenseListResponse {
  success: boolean;
  licenses: License[];
  total: number;
  page: number;
  limit: number;
}

export interface UsageStatsResponse {
  success: boolean;
  usage: {
    api_calls: number;
    max_api_calls: number;
    license_usage: number;
    max_license_usage: number;
    byok_usage: number;
    max_byok_usage: number;
  };
  history: APIUsage[];
}