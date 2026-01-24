import type { TableInfo, TableSchema, DatabaseEngine } from '@dbnexus/shared';
import { quoteIdentifier, buildTableName } from './utils';
import { formatSqlValue } from './sqlHelpers';

interface BuildInsertQueryParams {
    table: TableInfo;
    tableSchema: TableSchema;
    values: Record<string, string>;
    engine?: DatabaseEngine;
}

/**
 * Build an INSERT query for adding a new row
 */
export function buildInsertQuery({
    table,
    tableSchema,
    values,
    engine,
}: BuildInsertQueryParams): string {
    const tableName = buildTableName(table.schema, table.name, engine);

    const columns = Object.keys(values).filter((k) => values[k] !== '');
    const vals = columns.map((k) => {
        const col = tableSchema.columns.find((c) => c.name === k);
        const val = values[k] ?? '';
        if (
            col?.dataType.toLowerCase().includes('int') ||
            col?.dataType.toLowerCase().includes('numeric') ||
            col?.dataType.toLowerCase().includes('decimal') ||
            col?.dataType.toLowerCase().includes('float') ||
            col?.dataType.toLowerCase().includes('double') ||
            col?.dataType.toLowerCase().includes('real')
        ) {
            return val;
        }
        return `'${val.replaceAll("'", "''")}'`;
    });

    return `INSERT INTO ${tableName} (${columns.map((c) => quoteIdentifier(c, engine)).join(', ')}) VALUES (${vals.join(', ')});`;
}

interface BuildUpdateQueryParams {
    tableName: string;
    oldRow: Record<string, unknown>;
    newRow: Record<string, unknown>;
    pkColumns: string[];
    tableSchema: TableSchema | null;
    engine?: DatabaseEngine;
}

/**
 * Build an UPDATE query for modifying a row
 */
export function buildUpdateQuery({
    tableName,
    oldRow,
    newRow,
    pkColumns,
    tableSchema,
    engine,
}: BuildUpdateQueryParams): string | null {
    const changes: string[] = [];
    for (const key of Object.keys(newRow)) {
        if (key === '__rowIndex' || key === '__originalRow') continue;
        const oldVal = oldRow[key];
        const newVal = newRow[key];
        const hasChanged =
            typeof oldVal === 'object' || typeof newVal === 'object'
                ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
                : oldVal !== newVal;
        if (hasChanged) {
            changes.push(
                `${quoteIdentifier(key, engine)} = ${formatSqlValue(newVal, key, tableSchema)}`
            );
        }
    }

    if (changes.length === 0) {
        return null;
    }

    const whereConditions = pkColumns.map(
        (pk) => `${quoteIdentifier(pk, engine)} = ${formatSqlValue(oldRow[pk], pk, tableSchema)}`
    );

    return `UPDATE ${tableName} SET ${changes.join(', ')} WHERE ${whereConditions.join(' AND ')};`;
}

interface BuildDeleteQueryParams {
    tableName: string;
    row: Record<string, unknown>;
    pkColumns: string[];
    tableSchema: TableSchema | null;
    engine?: DatabaseEngine;
}

/**
 * Build a DELETE query for removing a single row
 */
export function buildDeleteQuery({
    tableName,
    row,
    pkColumns,
    tableSchema,
    engine,
}: BuildDeleteQueryParams): string {
    const whereConditions = pkColumns.map(
        (pk) => `${quoteIdentifier(pk, engine)} = ${formatSqlValue(row[pk], pk, tableSchema)}`
    );

    return `DELETE FROM ${tableName} WHERE ${whereConditions.join(' AND ')};`;
}

interface BuildDeleteMultipleQueryParams {
    tableName: string;
    rows: Record<string, unknown>[];
    pkColumns: string[];
    tableSchema: TableSchema | null;
    engine?: DatabaseEngine;
}

/**
 * Build a DELETE query for removing multiple rows
 */
export function buildDeleteMultipleQuery({
    tableName,
    rows,
    pkColumns,
    tableSchema,
    engine,
}: BuildDeleteMultipleQueryParams): string {
    const rowClauses = rows.map((row) => {
        const conditions = pkColumns.map(
            (pk) => `${quoteIdentifier(pk, engine)} = ${formatSqlValue(row[pk], pk, tableSchema)}`
        );
        return `(${conditions.join(' AND ')})`;
    });

    return `DELETE FROM ${tableName} WHERE ${rowClauses.join(' OR ')};`;
}
