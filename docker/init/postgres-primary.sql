-- PostgreSQL Primary - Sample schema for testing
-- This represents the "source" or "production-like" database
-- Create schemas
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS analytics;
-- Users table
CREATE TABLE app.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- User roles
CREATE TABLE app.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- User-role mapping
CREATE TABLE app.user_roles (
    user_id INTEGER NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES app.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES app.users(id),
    PRIMARY KEY (user_id, role_id)
);
-- Products table
CREATE TABLE app.products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stock_quantity INTEGER DEFAULT 0,
    category_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Categories table
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
-- Orders table
CREATE TABLE app.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app.users(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    shipping_address JSONB,
    billing_address JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Order items
CREATE TABLE app.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES app.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Analytics events
CREATE TABLE analytics.events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(100),
    properties JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Analytics page views
CREATE TABLE analytics.page_views (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    session_id VARCHAR(100),
    page_url TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Indexes
CREATE INDEX idx_users_email ON app.users(email);
CREATE INDEX idx_users_username ON app.users(username);
CREATE INDEX idx_users_created_at ON app.users(created_at);
CREATE INDEX idx_products_sku ON app.products(sku);
CREATE INDEX idx_products_category ON app.products(category_id);
CREATE INDEX idx_products_active ON app.products(is_active)
WHERE is_active = true;
CREATE INDEX idx_orders_user ON app.orders(user_id);
CREATE INDEX idx_orders_status ON app.orders(status);
CREATE INDEX idx_orders_created_at ON app.orders(created_at);
CREATE INDEX idx_events_type ON analytics.events(event_type);
CREATE INDEX idx_events_user ON analytics.events(user_id);
CREATE INDEX idx_events_timestamp ON analytics.events(timestamp);
CREATE INDEX idx_page_views_user ON analytics.page_views(user_id);
CREATE INDEX idx_page_views_timestamp ON analytics.page_views(timestamp);
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
        last_name,
        is_verified
    )
VALUES (
        'admin@example.com',
        'admin',
        '$2b$10$hash1',
        'Admin',
        'User',
        true
    ),
    (
        'john@example.com',
        'johndoe',
        '$2b$10$hash2',
        'John',
        'Doe',
        true
    ),
    (
        'jane@example.com',
        'janedoe',
        '$2b$10$hash3',
        'Jane',
        'Doe',
        true
    ),
    (
        'bob@example.com',
        'bobsmith',
        '$2b$10$hash4',
        'Bob',
        'Smith',
        false
    );
INSERT INTO app.user_roles (user_id, role_id)
VALUES (1, 1),
    -- admin is admin
    (2, 2),
    -- john is editor
    (3, 2),
    -- jane is editor
    (4, 3);
-- bob is viewer
INSERT INTO app.categories (name, slug, description, sort_order)
VALUES (
        'Electronics',
        'electronics',
        'Electronic devices and accessories',
        1
    ),
    (
        'Clothing',
        'clothing',
        'Apparel and fashion items',
        2
    ),
    (
        'Books',
        'books',
        'Physical and digital books',
        3
    ),
    (
        'Home & Garden',
        'home-garden',
        'Home improvement and gardening',
        4
    );
INSERT INTO app.products (
        sku,
        name,
        description,
        price,
        stock_quantity,
        category_id,
        metadata
    )
VALUES (
        'ELEC-001',
        'Wireless Mouse',
        'Ergonomic wireless mouse with USB receiver',
        29.99,
        150,
        1,
        '{"color": "black", "warranty": "1 year"}'
    ),
    (
        'ELEC-002',
        'Mechanical Keyboard',
        'RGB mechanical keyboard with Cherry MX switches',
        89.99,
        75,
        1,
        '{"switches": "Cherry MX Blue", "backlight": "RGB"}'
    ),
    (
        'CLOTH-001',
        'Cotton T-Shirt',
        'Premium cotton t-shirt, various colors',
        24.99,
        500,
        2,
        '{"sizes": ["S", "M", "L", "XL"], "colors": ["white", "black", "navy"]}'
    ),
    (
        'BOOK-001',
        'Database Design Guide',
        'Comprehensive guide to database design patterns',
        49.99,
        200,
        3,
        '{"format": "paperback", "pages": 450}'
    ),
    (
        'HOME-001',
        'LED Desk Lamp',
        'Adjustable LED desk lamp with USB charging',
        39.99,
        100,
        4,
        '{"wattage": 12, "color_temp": "adjustable"}'
    );
INSERT INTO app.orders (user_id, status, total_amount, shipping_address)
VALUES (
        2,
        'completed',
        119.98,
        '{"street": "123 Main St", "city": "New York", "zip": "10001"}'
    ),
    (
        3,
        'pending',
        24.99,
        '{"street": "456 Oak Ave", "city": "Los Angeles", "zip": "90001"}'
    ),
    (
        2,
        'shipped',
        89.99,
        '{"street": "123 Main St", "city": "New York", "zip": "10001"}'
    );
INSERT INTO app.order_items (
        order_id,
        product_id,
        quantity,
        unit_price,
        total_price
    )
VALUES (1, 1, 1, 29.99, 29.99),
    (1, 2, 1, 89.99, 89.99),
    (2, 3, 1, 24.99, 24.99),
    (3, 2, 1, 89.99, 89.99);
INSERT INTO analytics.events (event_type, user_id, session_id, properties)
VALUES (
        'page_view',
        2,
        'sess_001',
        '{"page": "/products"}'
    ),
    (
        'add_to_cart',
        2,
        'sess_001',
        '{"product_id": 1}'
    ),
    ('purchase', 2, 'sess_001', '{"order_id": 1}'),
    ('page_view', 3, 'sess_002', '{"page": "/"}'),
    ('signup', 4, 'sess_003', '{"source": "organic"}');
INSERT INTO analytics.page_views (user_id, session_id, page_url, referrer)
VALUES (2, 'sess_001', '/products', 'https://google.com'),
    (2, 'sess_001', '/products/elec-001', '/products'),
    (2, 'sess_001', '/cart', '/products/elec-001'),
    (3, 'sess_002', '/', NULL),
    (3, 'sess_002', '/categories/clothing', '/');