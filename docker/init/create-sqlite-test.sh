#!/bin/bash
# Script to create a test SQLite database with sample data

DB_FILE="./docker/init/test.db"

# Remove existing database if it exists
rm -f "$DB_FILE"

# Create database and tables
sqlite3 "$DB_FILE" <<EOF
-- Create users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create comments table
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert sample users
INSERT INTO users (username, email) VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com'),
    ('charlie', 'charlie@example.com');

-- Insert sample posts
INSERT INTO posts (user_id, title, content, published) VALUES
    (1, 'Getting Started with SQLite', 'SQLite is a lightweight database...', 1),
    (1, 'Database Design Tips', 'Here are some tips for database design...', 1),
    (2, 'My First Post', 'This is my first blog post!', 1),
    (3, 'Draft Post', 'This is a draft...', 0);

-- Insert sample comments
INSERT INTO comments (post_id, user_id, comment) VALUES
    (1, 2, 'Great article!'),
    (1, 3, 'Very helpful, thanks!'),
    (2, 2, 'Nice tips!'),
    (3, 1, 'Welcome to blogging!');

-- Create indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Display summary
SELECT 'Database created successfully!' as message;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as post_count FROM posts;
SELECT COUNT(*) as comment_count FROM comments;
EOF

echo "SQLite test database created at: $DB_FILE"
echo "You can connect to it in DB Nexus with:"
echo "  Database: $PWD/$DB_FILE"
