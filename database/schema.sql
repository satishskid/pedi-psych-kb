-- Database schema for pediatric psychology knowledge base

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'editor', 'viewer')) NOT NULL DEFAULT 'viewer',
    tenant_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table
CREATE TABLE tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    settings TEXT, -- JSON string for tenant-specific settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cards table (knowledge base content)
CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_en TEXT NOT NULL,
    title_hi TEXT,
    title_ar TEXT,
    content_en TEXT NOT NULL,
    content_hi TEXT,
    content_ar TEXT,
    category TEXT NOT NULL,
    tags TEXT, -- JSON array of tags
    metadata TEXT, -- JSON string for additional metadata
    created_by INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Policies table (RBAC policies)
CREATE TABLE policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    conditions TEXT, -- JSON string for policy conditions
    tenant_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Export requests table
CREATE TABLE export_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_ids TEXT NOT NULL, -- JSON array of card IDs
    format TEXT CHECK(format IN ('html', 'pdf')) NOT NULL DEFAULT 'html',
    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL DEFAULT 'pending',
    result_url TEXT,
    tenant_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Search history table
CREATE TABLE search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    tenant_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_cards_tenant_id ON cards(tenant_id);
CREATE INDEX idx_cards_category ON cards(category);
CREATE INDEX idx_policies_tenant_id ON policies(tenant_id);
CREATE INDEX idx_export_requests_user_id ON export_requests(user_id);
CREATE INDEX idx_export_requests_tenant_id ON export_requests(tenant_id);
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_tenant_id ON search_history(tenant_id);