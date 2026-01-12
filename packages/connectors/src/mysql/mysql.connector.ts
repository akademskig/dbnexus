/**
 * MySQL/MariaDB database connector
 */

import mysql from 'mysql2/promise';
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

export class MysqlConnector implements DatabaseConnector {
    private pool: mysql.Pool | null = null;
    private readonly config: ConnectorConfig;

    constructor(config: ConnectorConfig, _isMariaDb: boolean = false) {
        this.config = config;
        // MariaDB uses the same protocol as MySQL, so no special handling needed
    }

    async testConnection(): Promise<ConnectionTestResult> {
        const startTime = Date.now();

        try {
            const connection = await mysql.createConnection({
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.username,
                password: this.config.password,
                ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
                connectTimeout: 5000,
            });

            const [rows] = await connection.execute('SELECT VERSION() as version');
            const version = (rows as { version: string }[])[0]?.version;
            await connection.end();

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

        this.pool = mysql.createPool({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 5000,
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
        const [rows, fields] = await this.pool.execute(sql, params);
        const executionTimeMs = Date.now() - startTime;

        // Handle SELECT queries
        if (Array.isArray(rows) && fields) {
            const columns: QueryColumn[] = (fields as mysql.FieldPacket[]).map((field) => ({
                name: field.name,
                dataType: this.mysqlTypeToString(field.type ?? 253),
            }));

            return {
                columns,
                rows: rows as Record<string, unknown>[],
                rowCount: (rows as unknown[]).length,
                executionTimeMs,
                truncated: false,
            };
        }

        // Handle non-SELECT queries (INSERT, UPDATE, DELETE)
        const resultHeader = rows as mysql.ResultSetHeader;
        return {
            columns: [],
            rows: [],
            rowCount: resultHeader.affectedRows ?? 0,
            executionTimeMs,
            truncated: false,
        };
    }

    async execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const [result] = await this.pool.execute(sql, params);
        const resultHeader = result as mysql.ResultSetHeader;
        return { rowsAffected: resultHeader.affectedRows ?? 0 };
    }

    async getTables(schema?: string): Promise<TableInfo[]> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const dbName = schema || this.config.database;

        const [rows] = await this.pool.execute(
            `
            SELECT 
                TABLE_SCHEMA as \`schema\`,
                TABLE_NAME as name,
                TABLE_TYPE as type,
                TABLE_ROWS as row_count,
                DATA_LENGTH + INDEX_LENGTH as size_bytes
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
            `,
            [dbName]
        );

        return (rows as {
            schema: string;
            name: string;
            type: string;
            row_count: number | null;
            size_bytes: number | null;
        }[]).map((row) => ({
            schema: row.schema,
            name: row.name,
            type: row.type === 'VIEW' ? 'view' : 'table',
            rowCount: row.row_count ?? undefined,
            sizeBytes: row.size_bytes ?? undefined,
        }));
    }

    async getTableSchema(schema: string, table: string): Promise<TableSchema> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const columns = await this.getColumns(schema, table);
        const indexes = await this.getIndexes(schema, table);
        const foreignKeys = await this.getForeignKeys(schema, table);
        const primaryKey = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

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

        const [rows] = await this.pool.execute(`
            SELECT SCHEMA_NAME 
            FROM information_schema.SCHEMATA 
            WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
            ORDER BY SCHEMA_NAME
        `);

        const schemas = (rows as { SCHEMA_NAME: string }[]).map((row) => row.SCHEMA_NAME);
        
        // Put the connected database first in the list
        const connectedDb = this.config.database;
        if (connectedDb && schemas.includes(connectedDb)) {
            return [connectedDb, ...schemas.filter(s => s !== connectedDb)];
        }
        
        return schemas;
    }

    async getServerVersion(): Promise<string> {
        if (!this.pool) {
            throw new Error('Not connected to database');
        }

        const [rows] = await this.pool.execute('SELECT VERSION() as version');
        return (rows as { version: string }[])[0]?.version ?? 'Unknown';
    }

    // ============ Private helpers ============

    private async getColumns(schema: string, table: string): Promise<ColumnInfo[]> {
        const [rows] = await this.pool!.execute(
            `
            SELECT 
                COLUMN_NAME as column_name,
                DATA_TYPE as data_type,
                COLUMN_TYPE as column_type,
                IS_NULLABLE as is_nullable,
                COLUMN_DEFAULT as column_default,
                CHARACTER_MAXIMUM_LENGTH as char_max_length,
                NUMERIC_PRECISION as numeric_precision,
                NUMERIC_SCALE as numeric_scale,
                COLUMN_KEY as column_key,
                EXTRA as extra,
                COLUMN_COMMENT as comment
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
            `,
            [schema, table]
        );

        // Get unique columns
        const [uniqueRows] = await this.pool!.execute(
            `
            SELECT COLUMN_NAME
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND NON_UNIQUE = 0
            `,
            [schema, table]
        );
        const uniqueColumns = new Set(
            (uniqueRows as { COLUMN_NAME: string }[]).map((r) => r.COLUMN_NAME)
        );

        return (rows as {
            column_name: string;
            data_type: string;
            column_type: string;
            is_nullable: string;
            column_default: string | null;
            char_max_length: number | null;
            numeric_precision: number | null;
            numeric_scale: number | null;
            column_key: string;
            extra: string;
            comment: string;
        }[]).map((row) => {
            let dataType = row.column_type;

            return {
                name: row.column_name,
                dataType,
                nullable: row.is_nullable === 'YES',
                defaultValue: row.column_default,
                isPrimaryKey: row.column_key === 'PRI',
                isUnique: uniqueColumns.has(row.column_name),
                comment: row.comment || undefined,
            };
        });
    }

    private async getIndexes(schema: string, table: string): Promise<IndexInfo[]> {
        const [rows] = await this.pool!.execute(
            `
            SELECT 
                INDEX_NAME as index_name,
                GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
                NOT NON_UNIQUE as is_unique,
                INDEX_TYPE as index_type
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE
            ORDER BY INDEX_NAME
            `,
            [schema, table]
        );

        return (rows as {
            index_name: string;
            columns: string;
            is_unique: number;
            index_type: string;
        }[]).map((row) => ({
            name: row.index_name,
            columns: row.columns.split(','),
            isUnique: row.is_unique === 1,
            isPrimary: row.index_name === 'PRIMARY',
            type: row.index_type.toLowerCase(),
        }));
    }

    private async getForeignKeys(schema: string, table: string): Promise<ForeignKeyInfo[]> {
        const [rows] = await this.pool!.execute(
            `
            SELECT 
                kcu.CONSTRAINT_NAME as constraint_name,
                GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as columns,
                kcu.REFERENCED_TABLE_SCHEMA as referenced_schema,
                kcu.REFERENCED_TABLE_NAME as referenced_table,
                GROUP_CONCAT(kcu.REFERENCED_COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) as referenced_columns,
                rc.DELETE_RULE as on_delete,
                rc.UPDATE_RULE as on_update
            FROM information_schema.KEY_COLUMN_USAGE kcu
            JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
                ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
            WHERE kcu.TABLE_SCHEMA = ? 
                AND kcu.TABLE_NAME = ?
                AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
            GROUP BY 
                kcu.CONSTRAINT_NAME,
                kcu.REFERENCED_TABLE_SCHEMA,
                kcu.REFERENCED_TABLE_NAME,
                rc.DELETE_RULE,
                rc.UPDATE_RULE
            `,
            [schema, table]
        );

        return (rows as {
            constraint_name: string;
            columns: string;
            referenced_schema: string;
            referenced_table: string;
            referenced_columns: string;
            on_delete: string;
            on_update: string;
        }[]).map((row) => ({
            name: row.constraint_name,
            columns: row.columns.split(','),
            referencedSchema: row.referenced_schema,
            referencedTable: row.referenced_table,
            referencedColumns: row.referenced_columns.split(','),
            onDelete: row.on_delete,
            onUpdate: row.on_update,
        }));
    }

    private mysqlTypeToString(typeId: number): string {
        // MySQL type IDs from mysql2
        const typeMap: Record<number, string> = {
            0: 'decimal',
            1: 'tinyint',
            2: 'smallint',
            3: 'int',
            4: 'float',
            5: 'double',
            6: 'null',
            7: 'timestamp',
            8: 'bigint',
            9: 'mediumint',
            10: 'date',
            11: 'time',
            12: 'datetime',
            13: 'year',
            14: 'date',
            15: 'varchar',
            16: 'bit',
            245: 'json',
            246: 'decimal',
            247: 'enum',
            248: 'set',
            249: 'tinyblob',
            250: 'mediumblob',
            251: 'longblob',
            252: 'blob',
            253: 'varchar',
            254: 'char',
            255: 'geometry',
        };

        return typeMap[typeId] ?? 'unknown';
    }
}
