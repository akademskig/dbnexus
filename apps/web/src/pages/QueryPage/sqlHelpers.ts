import type { TableSchema, QueryResult } from '@dbnexus/shared';

/**
 * Format a value for use in SQL queries
 */
export function formatSqlValue(
    value: unknown,
    colName: string,
    tableSchema: TableSchema | null
): string {
    if (value === null || value === undefined) return 'NULL';

    const col = tableSchema?.columns.find((c) => c.name === colName);
    const dataType = col?.dataType.toLowerCase() || '';

    if (
        dataType.includes('int') ||
        dataType.includes('numeric') ||
        dataType.includes('decimal') ||
        dataType.includes('float') ||
        dataType.includes('double') ||
        dataType.includes('real')
    ) {
        return String(value);
    }

    if (dataType.includes('bool')) {
        return String(value);
    }

    if (dataType.includes('json') || dataType.includes('jsonb')) {
        const jsonStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `'${jsonStr.replaceAll("'", "''")}'`;
    }

    if (typeof value === 'object') {
        const jsonStr = JSON.stringify(value);
        return `'${jsonStr.replaceAll("'", "''")}'`;
    }

    return `'${String(value).replaceAll("'", "''")}'`;
}

/**
 * Extract table name from SQL query (simple regex for SELECT queries)
 */
export function extractTableNameFromQuery(query: string): string | null {
    const match = query.match(/FROM\s+([`"]?[\w.]+[`"]?)/i);
    return match?.[1]?.replace(/[`"]/g, '') ?? null;
}

/**
 * Infer primary keys from result columns (for raw queries without tableSchema)
 */
export function inferPrimaryKeysFromResult(result: QueryResult | null): string[] {
    if (!result) return [];
    return result.columns
        .filter((col) => {
            const name = col.name.toLowerCase();
            return name === 'id' || name === 'version' || name.endsWith('_id');
        })
        .map((col) => col.name);
}

/**
 * Check if a column data type is numeric
 */
export function isNumericType(dataType: string): boolean {
    const type = dataType.toLowerCase();
    return (
        type.includes('int') ||
        type.includes('numeric') ||
        type.includes('decimal') ||
        type.includes('float') ||
        type.includes('double') ||
        type.includes('real')
    );
}
