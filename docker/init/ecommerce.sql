-- E-commerce Demo Database
-- Sample data for DB Nexus screenshots

-- Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    category_id INTEGER REFERENCES categories(id),
    sku VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    is_default BOOLEAN DEFAULT false
);

-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    shipping_address_id INTEGER REFERENCES addresses(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Order Items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0
);

-- Reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);

-- Sample Data: Categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets, devices, and electronic accessories'),
('Clothing', 'Fashion and apparel for all ages'),
('Home & Garden', 'Furniture, decor, and gardening supplies'),
('Books', 'Physical and digital books'),
('Sports', 'Sports equipment and outdoor gear');

INSERT INTO categories (name, description, parent_id) VALUES
('Smartphones', 'Mobile phones and accessories', 1),
('Laptops', 'Portable computers', 1),
('Men''s Clothing', 'Fashion for men', 2),
('Women''s Clothing', 'Fashion for women', 2),
('Fiction', 'Novels and fiction books', 4);

-- Sample Data: Products
INSERT INTO products (name, description, price, stock_quantity, category_id, sku) VALUES
('iPhone 15 Pro', '256GB, Titanium Blue', 1199.00, 45, 6, 'APL-IP15P-256-BLU'),
('MacBook Air M3', '13-inch, 8GB RAM, 256GB SSD', 1099.00, 23, 7, 'APL-MBA-M3-256'),
('Samsung Galaxy S24', '128GB, Phantom Black', 899.00, 67, 6, 'SAM-GS24-128-BLK'),
('Dell XPS 15', 'Intel i7, 16GB RAM, 512GB SSD', 1499.00, 12, 7, 'DEL-XPS15-I7-512'),
('Classic Denim Jacket', 'Unisex, Medium wash, S-XL', 79.99, 150, 8, 'CLO-DNM-JKT-001'),
('Running Shoes Pro', 'Lightweight, cushioned sole', 129.99, 89, 5, 'SPT-RUN-PRO-001'),
('The Great Gatsby', 'F. Scott Fitzgerald, Paperback', 14.99, 200, 10, 'BOK-FIC-GGB-001'),
('Wireless Earbuds', 'Noise cancelling, 24hr battery', 149.00, 156, 1, 'ELE-EAR-WLS-001'),
('Yoga Mat Premium', 'Extra thick, non-slip surface', 39.99, 75, 5, 'SPT-YGA-MAT-001'),
('Smart Watch Series 5', 'Health tracking, GPS, waterproof', 349.00, 34, 1, 'ELE-SWT-S5-001');

-- Sample Data: Customers
INSERT INTO customers (email, first_name, last_name, phone) VALUES
('john.doe@email.com', 'John', 'Doe', '+1-555-0101'),
('jane.smith@email.com', 'Jane', 'Smith', '+1-555-0102'),
('mike.johnson@email.com', 'Mike', 'Johnson', '+1-555-0103'),
('sarah.williams@email.com', 'Sarah', 'Williams', '+1-555-0104'),
('david.brown@email.com', 'David', 'Brown', '+1-555-0105'),
('emily.davis@email.com', 'Emily', 'Davis', '+1-555-0106'),
('chris.wilson@email.com', 'Chris', 'Wilson', '+1-555-0107'),
('lisa.anderson@email.com', 'Lisa', 'Anderson', '+1-555-0108');

-- Sample Data: Addresses
INSERT INTO addresses (customer_id, street, city, state, postal_code, is_default) VALUES
(1, '123 Main Street', 'New York', 'NY', '10001', true),
(1, '456 Oak Avenue', 'Brooklyn', 'NY', '11201', false),
(2, '789 Pine Road', 'Los Angeles', 'CA', '90001', true),
(3, '321 Elm Street', 'Chicago', 'IL', '60601', true),
(4, '654 Maple Drive', 'Houston', 'TX', '77001', true),
(5, '987 Cedar Lane', 'Phoenix', 'AZ', '85001', true),
(6, '147 Birch Court', 'Philadelphia', 'PA', '19101', true),
(7, '258 Walnut Way', 'San Antonio', 'TX', '78201', true),
(8, '369 Spruce Path', 'San Diego', 'CA', '92101', true);

-- Sample Data: Orders
INSERT INTO orders (customer_id, shipping_address_id, status, total_amount, created_at) VALUES
(1, 1, 'delivered', 1348.99, '2024-01-15 10:30:00'),
(2, 3, 'delivered', 899.00, '2024-01-16 14:22:00'),
(3, 4, 'shipped', 1629.98, '2024-01-18 09:15:00'),
(1, 1, 'processing', 189.98, '2024-01-20 16:45:00'),
(4, 5, 'delivered', 349.00, '2024-01-22 11:00:00'),
(5, 6, 'pending', 79.99, '2024-01-24 08:30:00'),
(6, 7, 'delivered', 1099.00, '2024-01-25 13:20:00'),
(7, 8, 'shipped', 164.98, '2024-01-26 15:10:00'),
(2, 3, 'processing', 1199.00, '2024-01-27 10:00:00'),
(8, 9, 'pending', 54.98, '2024-01-28 17:30:00');

-- Sample Data: Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 1199.00),
(1, 8, 1, 149.00),
(2, 3, 1, 899.00),
(3, 2, 1, 1099.00),
(3, 6, 1, 129.99),
(3, 9, 1, 39.99),
(4, 5, 1, 79.99),
(4, 7, 2, 14.99),
(5, 10, 1, 349.00),
(6, 5, 1, 79.99),
(7, 2, 1, 1099.00),
(8, 6, 1, 129.99),
(8, 7, 1, 14.99),
(9, 1, 1, 1199.00),
(10, 7, 2, 14.99),
(10, 9, 1, 39.99);

-- Sample Data: Reviews
INSERT INTO reviews (product_id, customer_id, rating, title, comment) VALUES
(1, 1, 5, 'Amazing phone!', 'Best iPhone yet. The camera is incredible and battery life is great.'),
(1, 3, 4, 'Great but expensive', 'Love the features but wish it was more affordable.'),
(2, 6, 5, 'Perfect laptop', 'M3 chip is blazing fast. Perfect for development work.'),
(3, 2, 4, 'Solid Android choice', 'Great display and performance. Samsung did a good job.'),
(6, 4, 5, 'Super comfortable', 'Best running shoes I''ve owned. Great cushioning.'),
(8, 1, 4, 'Good sound quality', 'Noise cancelling works well. Could be more comfortable for long use.'),
(10, 5, 5, 'Love this watch', 'Health tracking is accurate. Battery lasts 2 days easily.');

-- Create a view for order summaries
CREATE VIEW order_summary AS
SELECT 
    o.id as order_id,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email,
    o.status,
    o.total_amount,
    COUNT(oi.id) as item_count,
    o.created_at
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, c.first_name, c.last_name, c.email, o.status, o.total_amount, o.created_at;
