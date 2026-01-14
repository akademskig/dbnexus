// Helper to quote identifiers based on database engine
export const quoteIdentifier = (name: string, engine?: string) => {
    if (engine === 'mysql' || engine === 'mariadb') {
        return `\`${name}\``;
    }
    return `"${name}"`;
};

// Helper to build fully qualified table name
export const buildTableName = (schema: string, table: string, engine?: string) => {
    if (engine === 'sqlite') {
        return quoteIdentifier(table, engine);
    }
    return `${quoteIdentifier(schema, engine)}.${quoteIdentifier(table, engine)}`;
};

// Tab name mapping for URL
export const TAB_NAMES = ['data', 'structure', 'indexes', 'foreignKeys', 'sql'] as const;
export type TabName = (typeof TAB_NAMES)[number];

export const getTabIndex = (name: string | null): number => {
    if (!name) return 0;
    const index = TAB_NAMES.indexOf(name as TabName);
    return index >= 0 ? index : 0;
};

// Format bytes to human readable
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Sidebar width constant
export const SIDEBAR_WIDTH = 280;

// Common data types for create table
export const COMMON_TYPES = {
    postgres: [
        'INTEGER',
        'BIGINT',
        'SERIAL',
        'BIGSERIAL',
        'VARCHAR(255)',
        'TEXT',
        'BOOLEAN',
        'TIMESTAMP',
        'TIMESTAMPTZ',
        'DATE',
        'NUMERIC',
        'REAL',
        'DOUBLE PRECISION',
        'UUID',
        'JSONB',
        'JSON',
    ],
    sqlite: ['INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC'],
    mysql: [
        'INT',
        'BIGINT',
        'VARCHAR(255)',
        'TEXT',
        'BOOLEAN',
        'DATETIME',
        'TIMESTAMP',
        'DATE',
        'DECIMAL',
        'FLOAT',
        'DOUBLE',
        'JSON',
    ],
    mariadb: [
        'INT',
        'BIGINT',
        'VARCHAR(255)',
        'TEXT',
        'BOOLEAN',
        'DATETIME',
        'TIMESTAMP',
        'DATE',
        'DECIMAL',
        'FLOAT',
        'DOUBLE',
        'JSON',
    ],
} as const;

export type ColumnDefinition = {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
};

/**
 * Extract table name from a SQL query
 * Handles: SELECT ... FROM table, INSERT INTO table, UPDATE table, DELETE FROM table
 * Returns { schema, table } or null if not found
 */
export function extractTableFromQuery(sql: string): { schema?: string; table: string } | null {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    // Match patterns like: FROM schema.table, FROM "schema"."table", FROM `schema`.`table`, FROM table
    // Also handles: INSERT INTO, UPDATE, DELETE FROM
    const patterns = [
        /\bFROM\s+(?:["'`]?(\w+)["'`]?\.)?["'`]?(\w+)["'`]?/i,
        /\bINTO\s+(?:["'`]?(\w+)["'`]?\.)?["'`]?(\w+)["'`]?/i,
        /\bUPDATE\s+(?:["'`]?(\w+)["'`]?\.)?["'`]?(\w+)["'`]?/i,
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) {
            const schema = match[1];
            const table = match[2];
            if (table) {
                return schema ? { schema, table } : { table };
            }
        }
    }

    return null;
}
