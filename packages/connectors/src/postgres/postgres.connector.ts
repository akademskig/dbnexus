/**
 * PostgreSQL database connector
 */

import pg from 'pg';
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
import type { ConnectorConfig, DatabaseConnector } from '../types.js';

const { Pool } = pg;

export class PostgresConnector implements DatabaseConnector {
    private pool: pg.Pool | null = null;
    private readonly config: ConnectorConfig;

    constructor(config: ConnectorConfig) {
        this.config = config;
    }

    async testConnection(): Promise<ConnectionTestResult> {
        const startTime = Date.now();
        let client: pg.PoolClient | null = null;

        try {
            const testPool = new Pool({
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.username,
                password: this.config.password,
                ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
                connectionTimeoutMillis: 5000,
                max: 1,
            });

            client = await testPool.connect();
            const versionResult = await client.query('SELECT version()');
            const version = versionResult.rows[0]?.version as string;
            client.release();
            await testPool.end();

            return {
                success: true,
                message: 'Connection successful',
                latencyMs: Date.now() - startTime,
                serverVersion: version,
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
        if (this.pool) return;

        this.pool = new Pool({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    }

    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    isConnected(): boolean {
        return this.pool !== null;
    }

    async query(sql: string, params?: unknown[]): Promise<QueryResult> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const startTime = Date.now();
        const result = await this.pool.query(sql, params);
        const executionTimeMs = Date.now() - startTime;

        const columns: QueryColumn[] = result.fields.map((field) => ({
            name: field.name,
            dataType: this.pgTypeToString(field.dataTypeID),
        }));

        return {
            columns,
            rows: result.rows as Record<string, unknown>[],
            rowCount: result.rowCount ?? 0,
            executionTimeMs,
            truncated: false,
        };
    }

    async execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const result = await this.pool.query(sql, params);
        return { rowsAffected: result.rowCount ?? 0 };
    }

    async getTables(schema: string = 'public'): Promise<TableInfo[]> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const result = await this.pool.query(
            `
      SELECT 
        schemaname as schema,
        tablename as name,
        'table' as type
      FROM pg_tables 
      WHERE schemaname = $1
      UNION ALL
      SELECT 
        schemaname as schema,
        viewname as name,
        'view' as type
      FROM pg_views 
      WHERE schemaname = $1
      ORDER BY name
    `,
            [schema]
        );

        const tables: TableInfo[] = [];

        for (const row of result.rows) {
            const tableRow = row as { schema: string; name: string; type: string };

            // Get row count and size for tables
            let rowCount: number | undefined;
            let sizeBytes: number | undefined;

            if (tableRow.type === 'table') {
                try {
                    const statsResult = await this.pool.query(
                        `
            SELECT 
              pg_total_relation_size($1) as size,
              (SELECT reltuples::bigint FROM pg_class WHERE oid = $1::regclass) as row_estimate
          `,
                        [`${tableRow.schema}.${tableRow.name}`]
                    );

                    const stats = statsResult.rows[0] as
                        | { size: string; row_estimate: string }
                        | undefined;
                    if (stats) {
                        sizeBytes = Number.parseInt(stats.size, 10);
                        rowCount = Number.parseInt(stats.row_estimate, 10);
                    }
                } catch {
                    // Ignore errors getting stats
                }
            }

            tables.push({
                schema: tableRow.schema,
                name: tableRow.name,
                type: tableRow.type as 'table' | 'view',
                rowCount,
                sizeBytes,
            });
        }

        return tables;
    }

    async getTableSchema(schema: string, table: string): Promise<TableSchema> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const columns = await this.getColumns(schema, table);
        const indexes = await this.getIndexes(schema, table);
        const foreignKeys = await this.getForeignKeys(schema, table);
        const primaryKey = await this.getPrimaryKey(schema, table);

        return {
            schema,
            name: table,
            columns,
            indexes,
            foreignKeys,
            primaryKey,
        };
    }

    async getSchemas(): Promise<string[]> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const result = await this.pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);

        return result.rows.map((row) => (row as { schema_name: string }).schema_name);
    }

    async getServerVersion(): Promise<string> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const result = await this.pool.query('SELECT version()');
        return (result.rows[0] as { version: string }).version;
    }

    // ============ Private helpers ============

    private async getColumns(schema: string, table: string): Promise<ColumnInfo[]> {
        const result = await this.pool!.query(
            `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.udt_name,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        pgd.description as comment,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN u.column_name IS NOT NULL THEN true ELSE false END as is_unique
      FROM information_schema.columns c
      LEFT JOIN pg_catalog.pg_statio_all_tables st 
        ON st.schemaname = c.table_schema AND st.relname = c.table_name
      LEFT JOIN pg_catalog.pg_description pgd 
        ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) pk ON pk.column_name = c.column_name
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) u ON u.column_name = c.column_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `,
            [schema, table]
        );

        return result.rows.map((row) => {
            const r = row as {
                column_name: string;
                data_type: string;
                is_nullable: string;
                column_default: string | null;
                udt_name: string;
                character_maximum_length: number | null;
                numeric_precision: number | null;
                numeric_scale: number | null;
                comment: string | null;
                is_primary_key: boolean;
                is_unique: boolean;
            };

            let dataType = r.data_type;
            if (r.character_maximum_length) {
                dataType = `${r.udt_name}(${r.character_maximum_length})`;
            } else if (r.numeric_precision && r.numeric_scale) {
                dataType = `${r.udt_name}(${r.numeric_precision},${r.numeric_scale})`;
            } else if (r.data_type === 'ARRAY') {
                dataType = `${r.udt_name}[]`;
            }

            return {
                name: r.column_name,
                dataType,
                nullable: r.is_nullable === 'YES',
                defaultValue: r.column_default,
                isPrimaryKey: r.is_primary_key,
                isUnique: r.is_unique,
                comment: r.comment ?? undefined,
            };
        });
    }

    private async getIndexes(schema: string, table: string): Promise<IndexInfo[]> {
        const result = await this.pool!.query(
            `
      SELECT
        i.relname as index_name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary,
        am.amname as index_type
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE n.nspname = $1 AND t.relname = $2
      GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
      ORDER BY i.relname
    `,
            [schema, table]
        );

        return result.rows.map((row) => {
            const r = row as {
                index_name: string;
                columns: string[];
                is_unique: boolean;
                is_primary: boolean;
                index_type: string;
            };
            return {
                name: r.index_name,
                columns: r.columns,
                isUnique: r.is_unique,
                isPrimary: r.is_primary,
                type: r.index_type,
            };
        });
    }

    private async getForeignKeys(schema: string, table: string): Promise<ForeignKeyInfo[]> {
        const result = await this.pool!.query(
            `
      SELECT
        tc.constraint_name,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
        ccu.table_schema as referenced_schema,
        ccu.table_name as referenced_table,
        array_agg(ccu.column_name ORDER BY kcu.ordinal_position) as referenced_columns,
        rc.delete_rule as on_delete,
        rc.update_rule as on_update
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      GROUP BY tc.constraint_name, ccu.table_schema, ccu.table_name, rc.delete_rule, rc.update_rule
    `,
            [schema, table]
        );

        return result.rows.map((row) => {
            const r = row as {
                constraint_name: string;
                columns: string[];
                referenced_schema: string;
                referenced_table: string;
                referenced_columns: string[];
                on_delete: string;
                on_update: string;
            };
            return {
                name: r.constraint_name,
                columns: r.columns,
                referencedSchema: r.referenced_schema,
                referencedTable: r.referenced_table,
                referencedColumns: r.referenced_columns,
                onDelete: r.on_delete,
                onUpdate: r.on_update,
            };
        });
    }

    private async getPrimaryKey(schema: string, table: string): Promise<string[]> {
        const result = await this.pool!.query(
            `
      SELECT array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    `,
            [schema, table]
        );

        const row = result.rows[0] as { columns: string[] | null } | undefined;
        return row?.columns ?? [];
    }

    private pgTypeToString(typeId: number): string {
        // Common PostgreSQL type OIDs
        const typeMap: Record<number, string> = {
            16: 'boolean',
            17: 'bytea',
            20: 'bigint',
            21: 'smallint',
            23: 'integer',
            25: 'text',
            114: 'json',
            700: 'real',
            701: 'double precision',
            1042: 'char',
            1043: 'varchar',
            1082: 'date',
            1083: 'time',
            1114: 'timestamp',
            1184: 'timestamptz',
            1700: 'numeric',
            2950: 'uuid',
            3802: 'jsonb',
        };

        return typeMap[typeId] ?? 'unknown';
    }
}
