-- License Management System Schema
-- This extends the existing schema with license and subscription management

-- License types table
CREATE TABLE license_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    features TEXT, -- JSON array of feature flags
    max_users INTEGER DEFAULT 1,
    max_api_calls_per_month INTEGER DEFAULT 1000,
    has_personalization BOOLEAN DEFAULT FALSE,
    has_byok_support BOOLEAN DEFAULT FALSE,
    price_monthly DECIMAL(10,2),
    price_annual DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- License table (individual licenses)
CREATE TABLE licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    license_type_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER, -- NULL for tenant-wide licenses
    status TEXT CHECK(status IN ('active', 'suspended', 'expired', 'revoked')) DEFAULT 'active',
    starts_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    usage_count INTEGER DEFAULT 0,
    max_usage_count INTEGER,
    metadata TEXT, -- JSON for additional license data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_type_id) REFERENCES license_types(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User licenses (many-to-many relationship)
CREATE TABLE user_licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    license_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (license_id) REFERENCES licenses(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE(user_id, license_id)
);

-- API usage tracking
CREATE TABLE api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    license_id INTEGER,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    usage_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (license_id) REFERENCES licenses(id)
);

-- BYOK (Bring Your Own Key) configuration
CREATE TABLE byok_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT CHECK(provider IN ('gemini', 'grok', 'openai', 'claude')) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    model_preferences TEXT, -- JSON configuration
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    max_usage_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Content access permissions
CREATE TABLE content_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    license_type_id INTEGER NOT NULL,
    min_role_level INTEGER NOT NULL,
    access_level TEXT CHECK(access_level IN ('none', 'read', 'write', 'admin')) DEFAULT 'read',
    conditions TEXT, -- JSON conditions for access
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES cards(id),
    FOREIGN KEY (license_type_id) REFERENCES license_types(id)
);

-- Personalized content settings
CREATE TABLE personalization_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preferences TEXT, -- JSON user preferences
    child_profiles TEXT, -- JSON array of child profiles
    content_filters TEXT, -- JSON filtering preferences
    ai_settings TEXT, -- JSON AI model preferences
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Subscription history
CREATE TABLE subscription_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL,
    action TEXT CHECK(action IN ('created', 'renewed', 'upgraded', 'downgraded', 'suspended', 'reactivated', 'expired')) NOT NULL,
    previous_license_type_id INTEGER,
    new_license_type_id INTEGER,
    changed_by INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses(id),
    FOREIGN KEY (previous_license_type_id) REFERENCES license_types(id),
    FOREIGN KEY (new_license_type_id) REFERENCES license_types(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_tenant_id ON licenses(tenant_id);
CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX idx_user_licenses_user_id ON user_licenses(user_id);
CREATE INDEX idx_user_licenses_license_id ON user_licenses(license_id);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_license_id ON api_usage(license_id);
CREATE INDEX idx_api_usage_date ON api_usage(usage_date);
CREATE INDEX idx_byok_configs_user_id ON byok_configs(user_id);
CREATE INDEX idx_content_permissions_content_id ON content_permissions(content_id);
CREATE INDEX idx_content_permissions_license_type_id ON content_permissions(license_type_id);
CREATE INDEX idx_personalization_settings_user_id ON personalization_settings(user_id);