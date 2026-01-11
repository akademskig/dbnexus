/**
 * SQLite database connector
 */

import Database from 'better-sqlite3';
import type {
    TableInfo,
    TableSchema,
    ColumnInfo,
    IndexInfo,
    ForeignKeyInfo,
    QueryResult,
    QueryColumn,
    ConnectionTestResult,
} from '@dbnexus/shared';
import type { SqliteConnectorConfig, DatabaseConnector } from '../types.js';

export class SqliteConnector implements DatabaseConnector {
    private db: Database.Database | null = null;
    private readonly config: SqliteConnectorConfig;

    constructor(config: SqliteConnectorConfig) {
        this.config = config;
    }

    async testConnection(): Promise<ConnectionTestResult> {
        const startTime = Date.now();

        try {
            const testDb = new Database(this.config.filepath, { readonly: true });
            const result = testDb.prepare('SELECT sqlite_version() as version').get() as {
                version: string;
            };
            testDb.close();

            return {
                success: true,
                message: 'Connection successful',
                latencyMs: Date.now() - startTime,
                serverVersion: `SQLite ${result.version}`,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                latencyMs: Date.now() - startTime,
            };
        }
    }

    async connect(): Promise<void> {
        if (this.db) return;
        this.db = new Database(this.config.filepath);
    }

    async disconnect(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    isConnected(): boolean {
        return this.db !== null;
    }

    async query(sql: string, params?: unknown[]): Promise<QueryResult> {
        if (!this.db) {
            throw new Error('Not connected to database');
        }

        const startTime = Date.now();
        const stmt = this.db.prepare(sql);

        // Check if it's a SELECT query
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

        if (isSelect) {
            const rows = (params ? stmt.all(...params) : stmt.all()) as Record<string, unknown>[];
            const executionTimeMs = Date.now() - startTime;

            // Get column info from first row or statement
            const columns: QueryColumn[] =
                rows.length > 0 && rows[0]
                    ? Object.keys(rows[0]).map((name) => ({
                          name,
                          dataType: this.inferType(rows[0]![name]),
                      }))
                    : [];

            return {
                columns,
                rows,
                rowCount: rows.length,
                executionTimeMs,
                truncated: false,
            };
        } else {
            // For non-SELECT queries
            const result = params ? stmt.run(...params) : stmt.run();
            const executionTimeMs = Date.now() - startTime;

            return {
                columns: [],
                rows: [],
                rowCount: result.changes,
                executionTimeMs,
                truncated: false,
            };
        }
    }

    async execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }> {
        if (!this.db) {
            throw new Error('Not connected to database');
        }

        const stmt = this.db.prepare(sql);
        const result = params ? stmt.run(...params) : stmt.run();
        return { rowsAffected: result.changes };
    }

    async getTables(_schema?: string): Promise<TableInfo[]> {
        if (!this.db) {
            throw new Error('Not connected to database');
        }

        const tables = this.db
            .prepare(
                `
            SELECT name, type 
            FROM sqlite_master 
            WHERE type IN ('table', 'view') 
            AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `
            )
            .all() as { name: string; type: string }[];

        const result: TableInfo[] = [];

        for (const table of tables) {
            let rowCount: number | undefined;

            if (table.type === 'table') {
                try {
                    const countResult = this.db
                        .prepare(`SELECT COUNT(*) as count FROM "${table.name}"`)
                        .get() as { count: number };
                    rowCount = countResult.count;
                } catch {
                    // Ignore errors
                }
            }

            result.push({
                schema: 'main',
                name: table.name,
                type: table.type as 'table' | 'view',
                rowCount,
            });
        }

        return result;
    }

    async getTableSchema(_schema: string, table: string): Promise<TableSchema> {
        if (!this.db) {
            throw new Error('Not connected to database');
        }

        const columns = await this.getColumns(table);
        const indexes = await this.getIndexes(table);
        const foreignKeys = await this.getForeignKeys(table);
        const primaryKey = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

        return {
            schema: 'main',
            name: table,
            columns,
            indexes,
            foreignKeys,
            primaryKey,
        };
    }

    async getSchemas(): Promise<string[]> {
        // SQLite doesn't have schemas like PostgreSQL, return 'main'
        return ['main'];
    }

    async getServerVersion(): Promise<string> {
        if (!this.db) {
            throw new Error('Not connected to database');
        }

        const result = this.db.prepare('SELECT sqlite_version() as version').get() as {
            version: string;
        };
        return `SQLite ${result.version}`;
    }

    // ============ Private helpers ============

    private async getColumns(table: string): Promise<ColumnInfo[]> {
        const columns = this.db!.prepare(`PRAGMA table_info("${table}")`).all() as {
            cid: number;
            name: string;
            type: string;
            notnull: number;
            dflt_value: string | null;
            pk: number;
        }[];

        return columns.map((col) => ({
            name: col.name,
            dataType: col.type || 'TEXT',
            nullable: col.notnull === 0,
            defaultValue: col.dflt_value,
            isPrimaryKey: col.pk > 0,
            isUnique: false, // Will be updated from index info
        }));
    }

    private async getIndexes(table: string): Promise<IndexInfo[]> {
        const indexes = this.db!.prepare(`PRAGMA index_list("${table}")`).all() as {
            seq: number;
            name: string;
            unique: number;
            origin: string;
            partial: number;
        }[];

        const result: IndexInfo[] = [];

        for (const idx of indexes) {
            const indexInfo = this.db!.prepare(`PRAGMA index_info("${idx.name}")`).all() as {
                seqno: number;
                cid: number;
                name: string;
            }[];

            result.push({
                name: idx.name,
                columns: indexInfo.map((i) => i.name),
                isUnique: idx.unique === 1,
                isPrimary: idx.origin === 'pk',
                type: 'btree',
            });
        }

        return result;
    }

    private async getForeignKeys(table: string): Promise<ForeignKeyInfo[]> {
        const fks = this.db!.prepare(`PRAGMA foreign_key_list("${table}")`).all() as {
            id: number;
            seq: number;
            table: string;
            from: string;
            to: string;
            on_update: string;
            on_delete: string;
            match: string;
        }[];

        // Group by id
        const grouped = new Map<number, typeof fks>();
        for (const fk of fks) {
            if (!grouped.has(fk.id)) {
                grouped.set(fk.id, []);
            }
            grouped.get(fk.id)!.push(fk);
        }

        const result: ForeignKeyInfo[] = [];
        for (const [id, cols] of grouped) {
            const first = cols[0]!;
            result.push({
                name: `fk_${table}_${id}`,
                columns: cols.map((c) => c.from),
                referencedSchema: 'main',
                referencedTable: first.table,
                referencedColumns: cols.map((c) => c.to),
                onDelete: first.on_delete,
                onUpdate: first.on_update,
            });
        }

        return result;
    }

    private inferType(value: unknown): string {
        if (value === null) return 'NULL';
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'INTEGER' : 'REAL';
        }
        if (typeof value === 'string') return 'TEXT';
        if (typeof value === 'boolean') return 'INTEGER';
        if (value instanceof Buffer) return 'BLOB';
        return 'TEXT';
    }
}
