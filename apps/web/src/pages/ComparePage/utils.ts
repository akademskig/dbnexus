import type { ConnectionConfig } from '@dbnexus/shared';

// Get default schema for a connection
export function getDefaultSchema(conn: ConnectionConfig | undefined, schemas: string[]): string {
    if (!conn) return '';
    // For MySQL, prefer the database name as the schema
    if (conn.engine === 'mysql') {
        if (conn.database && schemas.includes(conn.database)) return conn.database;
    }
    if (conn.defaultSchema && schemas.includes(conn.defaultSchema)) return conn.defaultSchema;
    if (schemas.includes('public')) return 'public';
    if (schemas.includes('main')) return 'main';
    if (schemas.includes('dbo')) return 'dbo';
    return schemas[0] || '';
}
