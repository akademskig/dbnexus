-- MySQL - Sample schema for future MySQL support testing
-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Roles table
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- User roles mapping
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    parent_id INT,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stock_quantity INT DEFAULT 0,
    category_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sku (sku),
    INDEX idx_category (category_id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE
    SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Orders table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    shipping_address JSON,
    billing_address JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Order items table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Insert sample data
INSERT INTO roles (name, description, permissions)
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
INSERT INTO users (
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
        TRUE
    ),
    (
        'john@example.com',
        'johndoe',
        '$2b$10$hash2',
        'John',
        'Doe',
        TRUE
    ),
    (
        'jane@example.com',
        'janedoe',
        '$2b$10$hash3',
        'Jane',
        'Doe',
        TRUE
    );
INSERT INTO user_roles (user_id, role_id)
VALUES (1, 1),
    (2, 2),
    (3, 3);
INSERT INTO categories (name, slug, description, sort_order)
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
    );
INSERT INTO products (
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
        '{"color": "black"}'
    ),
    (
        'ELEC-002',
        'Mechanical Keyboard',
        'RGB mechanical keyboard',
        89.99,
        75,
        1,
        '{"switches": "Cherry MX Blue"}'
    ),
    (
        'CLOTH-001',
        'Cotton T-Shirt',
        'Premium cotton t-shirt',
        24.99,
        500,
        2,
        '{"sizes": ["S", "M", "L"]}'
    );
INSERT INTO orders (user_id, status, total_amount, shipping_address)
VALUES (
        2,
        'completed',
        119.98,
        '{"street": "123 Main St", "city": "New York"}'
    ),
    (
        3,
        'pending',
        24.99,
        '{"street": "456 Oak Ave", "city": "Los Angeles"}'
    );
INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        unit_price,
        total_price
    )
VALUES (1, 1, 1, 29.99, 29.99),
    (1, 2, 1, 89.99, 89.99),
    (2, 3, 1, 24.99, 24.99);