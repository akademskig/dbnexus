-- Blog Demo Database (MySQL)
-- Sample data for DB Nexus screenshots

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    role ENUM('admin', 'editor', 'author', 'subscriber') DEFAULT 'subscriber',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Posts
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content LONGTEXT,
    excerpt TEXT,
    author_id INT NOT NULL,
    category_id INT,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    featured_image VARCHAR(500),
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Tags
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL
);

-- Post-Tag relationship
CREATE TABLE post_tags (
    post_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Comments
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NULL,
    parent_id INT NULL,
    author_name VARCHAR(100),
    author_email VARCHAR(255),
    content TEXT NOT NULL,
    status ENUM('pending', 'approved', 'spam') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Media
CREATE TABLE media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size INT,
    alt_text VARCHAR(255),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published ON posts(published_at);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_status ON comments(status);

-- Sample Data: Users
INSERT INTO users (username, email, password_hash, display_name, bio, role, is_active) VALUES
('admin', 'admin@blog.dev', '$2a$10$hash1', 'Admin User', 'Site administrator', 'admin', TRUE),
('johndoe', 'john@blog.dev', '$2a$10$hash2', 'John Doe', 'Tech enthusiast and writer', 'author', TRUE),
('janesmith', 'jane@blog.dev', '$2a$10$hash3', 'Jane Smith', 'Travel blogger and photographer', 'author', TRUE),
('mikebrown', 'mike@blog.dev', '$2a$10$hash4', 'Mike Brown', 'Food critic and recipe developer', 'editor', TRUE),
('sarahlee', 'sarah@blog.dev', '$2a$10$hash5', 'Sarah Lee', 'Lifestyle and wellness writer', 'author', TRUE);

-- Sample Data: Categories
INSERT INTO categories (name, slug, description) VALUES
('Technology', 'technology', 'Latest tech news and tutorials'),
('Travel', 'travel', 'Travel guides and destination reviews'),
('Food', 'food', 'Recipes and restaurant reviews'),
('Lifestyle', 'lifestyle', 'Health, wellness, and daily life tips'),
('Opinion', 'opinion', 'Editorials and personal perspectives');

INSERT INTO categories (name, slug, description, parent_id) VALUES
('Programming', 'programming', 'Coding tutorials and best practices', 1),
('Gadgets', 'gadgets', 'Product reviews and comparisons', 1),
('Europe', 'europe', 'European travel destinations', 2),
('Asia', 'asia', 'Asian travel destinations', 2);

-- Sample Data: Tags
INSERT INTO tags (name, slug) VALUES
('JavaScript', 'javascript'),
('Python', 'python'),
('Web Development', 'web-development'),
('Tutorial', 'tutorial'),
('Review', 'review'),
('Tips', 'tips'),
('Photography', 'photography'),
('Budget Travel', 'budget-travel'),
('Healthy Eating', 'healthy-eating'),
('Quick Recipes', 'quick-recipes');

-- Sample Data: Posts
INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, view_count, published_at) VALUES
('Getting Started with React 19', 'getting-started-react-19', 
 'React 19 brings exciting new features including improved server components, better hydration, and enhanced concurrent rendering. In this tutorial, we will explore the key changes and how to migrate your existing projects...',
 'Learn about the new features in React 19 and how to get started.',
 2, 6, 'published', 1523, '2024-01-15 10:00:00'),

('10 Must-Visit Places in Japan', 'must-visit-places-japan',
 'Japan offers an incredible mix of ancient temples, modern cities, and natural beauty. From the bustling streets of Tokyo to the serene gardens of Kyoto, here are ten destinations you cannot miss...',
 'Discover the top destinations for your Japan adventure.',
 3, 9, 'published', 2847, '2024-01-18 14:30:00'),

('The Ultimate Guide to Homemade Pasta', 'ultimate-guide-homemade-pasta',
 'Making pasta from scratch is easier than you think. With just flour, eggs, and a little patience, you can create restaurant-quality pasta at home. This guide covers everything from basic dough to filled varieties...',
 'Master the art of making fresh pasta at home.',
 4, 3, 'published', 982, '2024-01-20 09:15:00'),

('Building a REST API with Node.js', 'building-rest-api-nodejs',
 'REST APIs are the backbone of modern web applications. In this comprehensive guide, we will build a production-ready API using Node.js, Express, and PostgreSQL...',
 'Step-by-step guide to creating robust REST APIs.',
 2, 6, 'published', 3156, '2024-01-22 11:00:00'),

('Morning Routines for Productivity', 'morning-routines-productivity',
 'How you start your morning sets the tone for your entire day. Research shows that successful people often follow structured morning routines. Here are science-backed habits to boost your productivity...',
 'Transform your mornings with these productivity tips.',
 5, 4, 'published', 1876, '2024-01-25 07:00:00'),

('Budget Travel Tips for Europe', 'budget-travel-europe',
 'Traveling through Europe does not have to break the bank. With careful planning and insider knowledge, you can experience amazing destinations while staying on budget...',
 'Save money on your European adventure.',
 3, 8, 'draft', 0, NULL),

('Why TypeScript is Worth Learning', 'why-typescript-worth-learning',
 'TypeScript has become an essential skill for modern JavaScript developers. The benefits of static typing go far beyond catching bugs early...',
 'Explore the benefits of adding TypeScript to your toolkit.',
 2, 6, 'published', 2234, '2024-01-28 13:45:00');

-- Sample Data: Post Tags
INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 3), (1, 4),
(2, 7), (2, 8),
(3, 9), (3, 10),
(4, 3), (4, 4),
(5, 6),
(7, 3), (7, 4);

-- Sample Data: Comments
INSERT INTO comments (post_id, user_id, content, status, created_at) VALUES
(1, 3, 'Great tutorial! The server components section was really helpful.', 'approved', '2024-01-16 15:30:00'),
(1, 5, 'Thanks for this! Any plans to cover React Server Actions?', 'approved', '2024-01-17 09:22:00'),
(1, NULL, 'Very informative article. Bookmarked for future reference.', 'approved', '2024-01-18 11:45:00'),
(2, 2, 'Japan is on my bucket list! The photos are stunning.', 'approved', '2024-01-19 16:00:00'),
(2, 4, 'I visited Kyoto last year. Completely agree with your recommendations!', 'approved', '2024-01-20 10:15:00'),
(4, 3, 'This is exactly what I needed for my project. Well explained!', 'approved', '2024-01-23 14:30:00'),
(5, 2, 'Started implementing these tips last week. Already seeing improvements!', 'approved', '2024-01-26 08:00:00'),
(7, 4, 'TypeScript has been a game changer for our team.', 'approved', '2024-01-29 11:20:00');

-- Create a view for post statistics
CREATE VIEW post_stats AS
SELECT 
    p.id,
    p.title,
    u.display_name as author,
    c.name as category,
    p.status,
    p.view_count,
    COUNT(DISTINCT cm.id) as comment_count,
    COUNT(DISTINCT pt.tag_id) as tag_count,
    p.published_at
FROM posts p
LEFT JOIN users u ON p.author_id = u.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN comments cm ON p.id = cm.post_id AND cm.status = 'approved'
LEFT JOIN post_tags pt ON p.id = pt.post_id
GROUP BY p.id, p.title, u.display_name, c.name, p.status, p.view_count, p.published_at;
