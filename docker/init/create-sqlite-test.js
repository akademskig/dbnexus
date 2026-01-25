#!/usr/bin/env node
/**
 * Script to create a test SQLite database with sample data
 * Run with: node docker/init/create-sqlite-test.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlinkSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'test.db');

// Remove existing database if it exists
if (existsSync(dbPath)) {
    unlinkSync(dbPath);
    console.log('Removed existing database');
}

// Create database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
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
`);

// Display summary
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get();

console.log('\n✅ SQLite test database created successfully!');
console.log(`📁 Location: ${dbPath}`);
console.log(`\n📊 Summary:`);
console.log(`   Users: ${userCount.count}`);
console.log(`   Posts: ${postCount.count}`);
console.log(`   Comments: ${commentCount.count}`);
console.log(`\n🔗 Connect in DB Nexus with:`);
console.log(`   Engine: SQLite`);
console.log(`   Database: ${dbPath}`);

db.close();
