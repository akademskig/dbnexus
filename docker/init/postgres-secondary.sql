-- PostgreSQL Secondary - Slightly different schema for diff testing
-- This represents a "staging" or "development" database with schema differences
-- Create schemas
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS analytics;
-- Users table (missing some columns compared to primary)
CREATE TABLE app.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    -- MISSING: avatar_url, is_verified
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- User roles (same as primary)
CREATE TABLE app.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- User-role mapping (same as primary)
CREATE TABLE app.user_roles (
    user_id INTEGER NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES app.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES app.users(id),
    PRIMARY KEY (user_id, role_id)
);
-- Products table (different column types and missing columns)
CREATE TABLE app.products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    -- Different length: 200 vs 255
    description TEXT,
    price DECIMAL(8, 2) NOT NULL,
    -- Different precision: 8,2 vs 10,2
    -- MISSING: currency, stock_quantity
    category_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    -- MISSING: metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- MISSING: updated_at
);
-- Categories table (same as primary)
CREATE TABLE app.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES app.categories(id),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Add foreign key to products
ALTER TABLE app.products
ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES app.categories(id) ON DELETE
SET NULL;
-- Orders table (missing some columns)
CREATE TABLE app.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app.users(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    -- MISSING: currency, shipping_address, billing_address, notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- MISSING: updated_at
);
-- Order items (same as primary)
CREATE TABLE app.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES app.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- MISSING TABLE: analytics.events (exists in primary, not here)
-- Analytics page views (different structure)
CREATE TABLE analytics.page_views (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    -- MISSING: session_id
    page_url TEXT NOT NULL,
    referrer TEXT,
    -- MISSING: user_agent, ip_address
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- EXTRA TABLE: Not in primary (for testing table removal)
CREATE TABLE app.audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Indexes (some different, some missing)
CREATE INDEX idx_users_email ON app.users(email);
CREATE INDEX idx_users_username ON app.users(username);
-- MISSING: idx_users_created_at
CREATE INDEX idx_products_sku ON app.products(sku);
CREATE INDEX idx_products_category ON app.products(category_id);
-- MISSING: idx_products_active (partial index)
CREATE INDEX idx_orders_user ON app.orders(user_id);
-- MISSING: idx_orders_status, idx_orders_created_at
-- MISSING: All analytics indexes
CREATE INDEX idx_audit_logs_table ON app.audit_logs(table_name);
-- Extra index
-- Insert sample data
INSERT INTO app.roles (name, description, permissions)
VALUES (
        'admin',
        'Full system access',
        '["read", "write", "delete", "admin"]'
    ),
    (
        'editor',
        'Can edit content',
        '["read", "write"]'
    ),
    ('viewer', 'Read-only access', '["read"]');
INSERT INTO app.users (
        email,
        username,
        password_hash,
        first_name,
        last_name
    )
VALUES (
        'admin@example.com',
        'admin',
        '$2b$10$hash1',
        'Admin',
        'User'
    ),
    (
        'john@example.com',
        'johndoe',
        '$2b$10$hash2',
        'John',
        'Doe'
    );
INSERT INTO app.user_roles (user_id, role_id)
VALUES (1, 1),
    (2, 2);
INSERT INTO app.categories (name, slug, description, sort_order)
VALUES (
        'Electronics',
        'electronics',
        'Electronic devices',
        1
    ),
    ('Clothing', 'clothing', 'Apparel items', 2);
INSERT INTO app.products (sku, name, description, price, category_id)
VALUES (
        'ELEC-001',
        'Wireless Mouse',
        'Ergonomic wireless mouse',
        29.99,
        1
    ),
    (
        'CLOTH-001',
        'Cotton T-Shirt',
        'Premium cotton t-shirt',
        24.99,
        2
    );
INSERT INTO app.orders (user_id, status, total_amount)
VALUES (2, 'completed', 54.98);
INSERT INTO app.order_items (
        order_id,
        product_id,
        quantity,
        unit_price,
        total_price
    )
VALUES (1, 1, 1, 29.99, 29.99),
    (1, 2, 1, 24.99, 24.99);
INSERT INTO analytics.page_views (user_id, page_url, referrer)
VALUES (2, '/products', 'https://google.com'),
    (2, '/cart', '/products');
INSERT INTO app.audit_logs (table_name, record_id, action, user_id)
VALUES ('users', 2, 'INSERT', 1),
    ('orders', 1, 'INSERT', 2);