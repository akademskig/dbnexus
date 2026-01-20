/**
 * Classify SQL queries into categories
 */

export type QueryType =
    | 'SELECT'
    | 'INSERT'
    | 'UPDATE'
    | 'DELETE'
    | 'CREATE'
    | 'ALTER'
    | 'DROP'
    | 'TRUNCATE'
    | 'MAINTENANCE'
    | 'OTHER';

export interface QueryClassification {
    type: QueryType;
    category: 'read' | 'write' | 'ddl' | 'maintenance' | 'other';
    color: string;
    icon: string;
}

/**
 * Classify a SQL query by its type
 */
export function classifyQuery(sql: string): QueryClassification {
    const normalized = sql.trim().toUpperCase();

    // Maintenance operations
    if (
        normalized.startsWith('VACUUM') ||
        normalized.startsWith('ANALYZE') ||
        normalized.startsWith('REINDEX') ||
        normalized.startsWith('OPTIMIZE') ||
        normalized.startsWith('CHECK TABLE') ||
        normalized.startsWith('REPAIR TABLE')
    ) {
        return {
            type: 'MAINTENANCE',
            category: 'maintenance',
            color: '#8b5cf6', // purple
            icon: '🔧',
        };
    }

    // DDL operations
    if (normalized.startsWith('CREATE')) {
        return {
            type: 'CREATE',
            category: 'ddl',
            color: '#22c55e', // green
            icon: '➕',
        };
    }

    if (normalized.startsWith('ALTER')) {
        return {
            type: 'ALTER',
            category: 'ddl',
            color: '#f59e0b', // orange
            icon: '✏️',
        };
    }

    if (normalized.startsWith('DROP')) {
        return {
            type: 'DROP',
            category: 'ddl',
            color: '#ef4444', // red
            icon: '🗑️',
        };
    }

    if (normalized.startsWith('TRUNCATE')) {
        return {
            type: 'TRUNCATE',
            category: 'ddl',
            color: '#dc2626', // dark red
            icon: '🧹',
        };
    }

    // DML operations
    if (normalized.startsWith('SELECT') || normalized.startsWith('WITH')) {
        return {
            type: 'SELECT',
            category: 'read',
            color: '#06b6d4', // cyan
            icon: '🔍',
        };
    }

    if (normalized.startsWith('INSERT')) {
        return {
            type: 'INSERT',
            category: 'write',
            color: '#10b981', // emerald
            icon: '➕',
        };
    }

    if (normalized.startsWith('UPDATE')) {
        return {
            type: 'UPDATE',
            category: 'write',
            color: '#f97316', // orange
            icon: '✏️',
        };
    }

    if (normalized.startsWith('DELETE')) {
        return {
            type: 'DELETE',
            category: 'write',
            color: '#f43f5e', // rose
            icon: '❌',
        };
    }

    // Other
    return {
        type: 'OTHER',
        category: 'other',
        color: '#6b7280', // gray
        icon: '❓',
    };
}

/**
 * Get all query types for filtering
 */
export const QUERY_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'read', label: 'Read (SELECT)' },
    { value: 'write', label: 'Write (INSERT/UPDATE/DELETE)' },
    { value: 'ddl', label: 'DDL (CREATE/ALTER/DROP)' },
    { value: 'maintenance', label: 'Maintenance' },
] as const;

export type QueryCategoryFilter = (typeof QUERY_TYPES)[number]['value'];
