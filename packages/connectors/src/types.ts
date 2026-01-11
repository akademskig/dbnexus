/**
 * Connector interface types
 */

import type { TableInfo, TableSchema, QueryResult, ConnectionTestResult } from '@dbnexus/shared';

export interface ConnectorConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
}

export interface SqliteConnectorConfig {
    filepath: string;
}

export interface DatabaseConnector {
    /**
     * Test the connection
     */
    testConnection(): Promise<ConnectionTestResult>;

    /**
     * Connect to the database
     */
    connect(): Promise<void>;

    /**
     * Disconnect from the database
     */
    disconnect(): Promise<void>;

    /**
     * Check if connected
     */
    isConnected(): boolean;

    /**
     * Execute a query and return results
     */
    query(sql: string, params?: unknown[]): Promise<QueryResult>;

    /**
     * Execute a query without returning results (for mutations)
     */
    execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>;

    /**
     * Get list of tables in the database
     */
    getTables(schema?: string): Promise<TableInfo[]>;

    /**
     * Get detailed schema for a table
     */
    getTableSchema(schema: string, table: string): Promise<TableSchema>;

    /**
     * Get all schemas in the database
     */
    getSchemas(): Promise<string[]>;

    /**
     * Get server version
     */
    getServerVersion(): Promise<string>;
}
