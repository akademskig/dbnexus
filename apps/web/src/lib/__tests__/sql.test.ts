import { describe, it, expect } from 'vitest';
import { buildDropTableSql, buildTableName, quoteIdentifier } from '../sql';

describe('sql utilities', () => {
    describe('quoteIdentifier', () => {
        it('quotes identifiers for mysql and mariadb with backticks', () => {
            expect(quoteIdentifier('users', 'mysql')).toBe('`users`');
            expect(quoteIdentifier('users', 'mariadb')).toBe('`users`');
        });

        it('quotes identifiers for postgres and sqlite with double quotes', () => {
            expect(quoteIdentifier('users', 'postgres')).toBe('"users"');
            expect(quoteIdentifier('users', 'sqlite')).toBe('"users"');
        });
    });

    describe('buildTableName', () => {
        it('builds fully qualified names for non-sqlite engines', () => {
            expect(buildTableName('public', 'users', 'postgres')).toBe('"public"."users"');
        });

        it('omits schema for sqlite', () => {
            expect(buildTableName('main', 'users', 'sqlite')).toBe('"users"');
        });
    });

    describe('buildDropTableSql', () => {
        it('uses CASCADE for non-sqlite when enabled', () => {
            expect(buildDropTableSql('public', 'users', 'postgres', true)).toBe(
                'DROP TABLE "public"."users" CASCADE'
            );
        });

        it('omits CASCADE for non-sqlite when disabled', () => {
            expect(buildDropTableSql('public', 'users', 'postgres', false)).toBe(
                'DROP TABLE "public"."users"'
            );
        });

        it('never uses CASCADE for sqlite', () => {
            expect(buildDropTableSql('main', 'users', 'sqlite', true)).toBe('DROP TABLE "users"');
        });
    });
});
