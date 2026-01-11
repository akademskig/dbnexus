/**
 * SQL query validator for safety guardrails
 */

import type { QueryValidationResult, DangerousQueryType } from '@dbnexus/shared';

export class QueryValidator {
    /**
     * Validate a SQL query for dangerous operations
     */
    validate(sql: string, isReadOnly: boolean = false): QueryValidationResult {
        const normalizedSql = sql.trim().toUpperCase();

        // Check for UPDATE without WHERE
        if (this.isUpdateWithoutWhere(normalizedSql)) {
            return {
                isValid: !isReadOnly,
                isDangerous: true,
                dangerousType: 'UPDATE_NO_WHERE',
                message: 'UPDATE statement without WHERE clause will affect all rows',
                requiresConfirmation: true,
            };
        }

        // Check for DELETE without WHERE
        if (this.isDeleteWithoutWhere(normalizedSql)) {
            return {
                isValid: !isReadOnly,
                isDangerous: true,
                dangerousType: 'DELETE_NO_WHERE',
                message: 'DELETE statement without WHERE clause will delete all rows',
                requiresConfirmation: true,
            };
        }

        // Check for DROP
        if (this.isDrop(normalizedSql)) {
            return {
                isValid: !isReadOnly,
                isDangerous: true,
                dangerousType: 'DROP',
                message: 'DROP statement will permanently remove database objects',
                requiresConfirmation: true,
            };
        }

        // Check for TRUNCATE
        if (this.isTruncate(normalizedSql)) {
            return {
                isValid: !isReadOnly,
                isDangerous: true,
                dangerousType: 'TRUNCATE',
                message: 'TRUNCATE will delete all rows from the table',
                requiresConfirmation: true,
            };
        }

        // Check if it's a write operation on a read-only connection
        if (isReadOnly && this.isWriteOperation(normalizedSql)) {
            return {
                isValid: false,
                isDangerous: false,
                message: 'Write operations are not allowed on read-only connections',
                requiresConfirmation: false,
            };
        }

        return {
            isValid: true,
            isDangerous: false,
            requiresConfirmation: false,
        };
    }

    /**
     * Check if the query is an UPDATE without WHERE
     */
    private isUpdateWithoutWhere(sql: string): boolean {
        if (!sql.startsWith('UPDATE ')) return false;

        // Simple check: look for WHERE clause
        // This is a basic implementation - a proper SQL parser would be better
        const hasWhere = /\bWHERE\b/.test(sql);
        return !hasWhere;
    }

    /**
     * Check if the query is a DELETE without WHERE
     */
    private isDeleteWithoutWhere(sql: string): boolean {
        if (!sql.startsWith('DELETE ')) return false;

        const hasWhere = /\bWHERE\b/.test(sql);
        return !hasWhere;
    }

    /**
     * Check if the query is a DROP statement
     */
    private isDrop(sql: string): boolean {
        return /^DROP\s+(TABLE|INDEX|VIEW|SCHEMA|DATABASE|SEQUENCE|FUNCTION|TRIGGER)\b/.test(sql);
    }

    /**
     * Check if the query is a TRUNCATE statement
     */
    private isTruncate(sql: string): boolean {
        return sql.startsWith('TRUNCATE ');
    }

    /**
     * Check if the query is a write operation
     */
    private isWriteOperation(sql: string): boolean {
        const writeKeywords = [
            'INSERT',
            'UPDATE',
            'DELETE',
            'DROP',
            'CREATE',
            'ALTER',
            'TRUNCATE',
            'GRANT',
            'REVOKE',
        ];

        return writeKeywords.some((keyword) => sql.startsWith(keyword + ' '));
    }

    /**
     * Get a user-friendly message for a dangerous query type
     */
    static getDangerMessage(type: DangerousQueryType): string {
        const messages: Record<DangerousQueryType, string> = {
            UPDATE_NO_WHERE:
                '⚠️ This UPDATE has no WHERE clause and will modify ALL rows in the table.',
            DELETE_NO_WHERE:
                '⚠️ This DELETE has no WHERE clause and will remove ALL rows from the table.',
            DROP: '⚠️ This DROP statement will permanently remove database objects.',
            TRUNCATE: '⚠️ This TRUNCATE will delete ALL data from the table.',
        };

        return messages[type];
    }
}
