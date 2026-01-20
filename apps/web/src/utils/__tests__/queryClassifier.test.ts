import { describe, it, expect } from 'vitest';
import { classifyQuery } from '../queryClassifier';

describe('queryClassifier', () => {
    describe('SELECT queries', () => {
        it('should classify SELECT as read', () => {
            const result = classifyQuery('SELECT * FROM users');
            expect(result.type).toBe('SELECT');
            expect(result.category).toBe('read');
            expect(result.color).toBe('#06b6d4');
        });

        it('should classify WITH (CTE) as read', () => {
            const result = classifyQuery('WITH cte AS (SELECT * FROM users) SELECT * FROM cte');
            expect(result.type).toBe('SELECT');
            expect(result.category).toBe('read');
        });

        it('should handle lowercase SELECT', () => {
            const result = classifyQuery('select * from users');
            expect(result.type).toBe('SELECT');
            expect(result.category).toBe('read');
        });

        it('should handle SELECT with leading whitespace', () => {
            const result = classifyQuery('   SELECT * FROM users');
            expect(result.type).toBe('SELECT');
            expect(result.category).toBe('read');
        });
    });

    describe('INSERT queries', () => {
        it('should classify INSERT as write', () => {
            const result = classifyQuery("INSERT INTO users (name) VALUES ('John')");
            expect(result.type).toBe('INSERT');
            expect(result.category).toBe('write');
            expect(result.color).toBe('#10b981');
        });

        it('should handle INSERT with multiple rows', () => {
            const result = classifyQuery(
                "INSERT INTO users (name, email) VALUES ('John', 'john@example.com'), ('Jane', 'jane@example.com')"
            );
            expect(result.type).toBe('INSERT');
            expect(result.category).toBe('write');
        });
    });

    describe('UPDATE queries', () => {
        it('should classify UPDATE as write', () => {
            const result = classifyQuery("UPDATE users SET name = 'John' WHERE id = 1");
            expect(result.type).toBe('UPDATE');
            expect(result.category).toBe('write');
            expect(result.color).toBe('#f97316');
        });

        it('should handle UPDATE without WHERE', () => {
            const result = classifyQuery('UPDATE users SET active = true');
            expect(result.type).toBe('UPDATE');
            expect(result.category).toBe('write');
        });
    });

    describe('DELETE queries', () => {
        it('should classify DELETE as write', () => {
            const result = classifyQuery('DELETE FROM users WHERE id = 1');
            expect(result.type).toBe('DELETE');
            expect(result.category).toBe('write');
            expect(result.color).toBe('#f43f5e');
        });

        it('should handle DELETE without WHERE', () => {
            const result = classifyQuery('DELETE FROM users');
            expect(result.type).toBe('DELETE');
            expect(result.category).toBe('write');
        });
    });

    describe('CREATE queries', () => {
        it('should classify CREATE TABLE as DDL', () => {
            const result = classifyQuery(
                'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255))'
            );
            expect(result.type).toBe('CREATE');
            expect(result.category).toBe('ddl');
            expect(result.color).toBe('#22c55e');
        });

        it('should classify CREATE INDEX as DDL', () => {
            const result = classifyQuery('CREATE INDEX idx_users_email ON users(email)');
            expect(result.type).toBe('CREATE');
            expect(result.category).toBe('ddl');
        });

        it('should classify CREATE DATABASE as DDL', () => {
            const result = classifyQuery('CREATE DATABASE mydb');
            expect(result.type).toBe('CREATE');
            expect(result.category).toBe('ddl');
        });
    });

    describe('ALTER queries', () => {
        it('should classify ALTER TABLE as DDL', () => {
            const result = classifyQuery('ALTER TABLE users ADD COLUMN age INTEGER');
            expect(result.type).toBe('ALTER');
            expect(result.category).toBe('ddl');
            expect(result.color).toBe('#f59e0b');
        });

        it('should classify ALTER TABLE DROP COLUMN as DDL', () => {
            const result = classifyQuery('ALTER TABLE users DROP COLUMN age');
            expect(result.type).toBe('ALTER');
            expect(result.category).toBe('ddl');
        });
    });

    describe('DROP queries', () => {
        it('should classify DROP TABLE as DDL', () => {
            const result = classifyQuery('DROP TABLE users');
            expect(result.type).toBe('DROP');
            expect(result.category).toBe('ddl');
            expect(result.color).toBe('#ef4444');
        });

        it('should classify DROP INDEX as DDL', () => {
            const result = classifyQuery('DROP INDEX idx_users_email');
            expect(result.type).toBe('DROP');
            expect(result.category).toBe('ddl');
        });

        it('should classify DROP DATABASE as DDL', () => {
            const result = classifyQuery('DROP DATABASE mydb');
            expect(result.type).toBe('DROP');
            expect(result.category).toBe('ddl');
        });
    });

    describe('TRUNCATE queries', () => {
        it('should classify TRUNCATE as DDL', () => {
            const result = classifyQuery('TRUNCATE TABLE users');
            expect(result.type).toBe('TRUNCATE');
            expect(result.category).toBe('ddl');
            expect(result.color).toBe('#dc2626');
        });

        it('should handle TRUNCATE without TABLE keyword', () => {
            const result = classifyQuery('TRUNCATE users');
            expect(result.type).toBe('TRUNCATE');
            expect(result.category).toBe('ddl');
        });
    });

    describe('MAINTENANCE queries', () => {
        it('should classify VACUUM as maintenance', () => {
            const result = classifyQuery('VACUUM ANALYZE users');
            expect(result.type).toBe('MAINTENANCE');
            expect(result.category).toBe('maintenance');
            expect(result.color).toBe('#8b5cf6');
        });

        it('should classify ANALYZE as maintenance', () => {
            const result = classifyQuery('ANALYZE TABLE users');
            expect(result.type).toBe('MAINTENANCE');
            expect(result.category).toBe('maintenance');
        });

        it('should classify REINDEX as maintenance', () => {
            const result = classifyQuery('REINDEX DATABASE mydb');
            expect(result.type).toBe('MAINTENANCE');
            expect(result.category).toBe('maintenance');
        });

        it('should classify OPTIMIZE as maintenance', () => {
            const result = classifyQuery('OPTIMIZE TABLE users');
            expect(result.type).toBe('MAINTENANCE');
            expect(result.category).toBe('maintenance');
        });

        it('should classify CHECK TABLE as maintenance', () => {
            const result = classifyQuery('CHECK TABLE users');
            expect(result.type).toBe('MAINTENANCE');
            expect(result.category).toBe('maintenance');
        });

        it('should classify REPAIR TABLE as maintenance', () => {
            const result = classifyQuery('REPAIR TABLE users');
            expect(result.type).toBe('MAINTENANCE');
            expect(result.category).toBe('maintenance');
        });
    });

    describe('OTHER queries', () => {
        it('should classify EXPLAIN as other', () => {
            const result = classifyQuery('EXPLAIN SELECT * FROM users');
            expect(result.type).toBe('OTHER');
            expect(result.category).toBe('other');
            expect(result.color).toBe('#6b7280');
        });

        it('should classify SHOW as other', () => {
            const result = classifyQuery('SHOW TABLES');
            expect(result.type).toBe('OTHER');
            expect(result.category).toBe('other');
        });

        it('should classify DESCRIBE as other', () => {
            const result = classifyQuery('DESCRIBE users');
            expect(result.type).toBe('OTHER');
            expect(result.category).toBe('other');
        });

        it('should classify SET as other', () => {
            const result = classifyQuery('SET search_path TO public');
            expect(result.type).toBe('OTHER');
            expect(result.category).toBe('other');
        });

        it('should classify empty string as other', () => {
            const result = classifyQuery('');
            expect(result.type).toBe('OTHER');
            expect(result.category).toBe('other');
        });

        it('should classify whitespace-only string as other', () => {
            const result = classifyQuery('   ');
            expect(result.type).toBe('OTHER');
            expect(result.category).toBe('other');
        });
    });

    describe('edge cases', () => {
        it('should handle SQL comments', () => {
            const result = classifyQuery('-- Comment\nSELECT * FROM users');
            expect(result.type).toBe('OTHER');
            expect(result.category).toBe('other');
        });

        it('should handle multi-line queries', () => {
            const result = classifyQuery(`
                SELECT *
                FROM users
                WHERE id = 1
            `);
            expect(result.type).toBe('SELECT');
            expect(result.category).toBe('read');
        });

        it('should handle mixed case keywords', () => {
            const result = classifyQuery('SeLeCt * FrOm users');
            expect(result.type).toBe('SELECT');
            expect(result.category).toBe('read');
        });
    });
});
