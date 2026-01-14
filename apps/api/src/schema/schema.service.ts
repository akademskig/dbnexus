import { Injectable } from '@nestjs/common';
import { ConnectionsService } from '../connections/connections.service.js';
import type { TableInfo, TableSchema } from '@dbnexus/shared';

@Injectable()
export class SchemaService {
    constructor(private readonly connectionsService: ConnectionsService) { }

    /**
     * Get all schemas in a database
     */
    async getSchemas(connectionId: string): Promise<string[]> {
        const connector = await this.connectionsService.getConnector(connectionId);
        return connector.getSchemas();
    }

    /**
     * Get all tables in a schema
     */
    async getTables(connectionId: string, schema: string = 'public'): Promise<TableInfo[]> {
        const connector = await this.connectionsService.getConnector(connectionId);
        return connector.getTables(schema);
    }

    /**
     * Get detailed schema for a table
     */
    async getTableSchema(
        connectionId: string,
        schema: string,
        table: string
    ): Promise<TableSchema> {
        const connector = await this.connectionsService.getConnector(connectionId);
        return connector.getTableSchema(schema, table);
    }

    /**
     * Get server version
     */
    async getServerVersion(connectionId: string): Promise<string> {
        const connector = await this.connectionsService.getConnector(connectionId);
        return connector.getServerVersion();
    }

    /**
     * Get row count for a table
     */
    async getTableRowCount(connectionId: string, schema: string, table: string): Promise<number> {
        const connection = this.connectionsService.findById(connectionId);
        const connector = await this.connectionsService.getConnector(connectionId);

        // Use appropriate quoting based on engine
        let sql: string;
        if (connection.engine === 'mysql' || connection.engine === 'mariadb') {
            sql = `SELECT COUNT(*) as count FROM \`${schema}\`.\`${table}\``;
        } else if (connection.engine === 'sqlite') {
            sql = `SELECT COUNT(*) as count FROM "${table}"`;
        } else {
            sql = `SELECT COUNT(*) as count FROM "${schema}"."${table}"`;
        }

        const result = await connector.query(sql);
        const countValue = result.rows[0]?.count;
        return parseInt(String(countValue ?? '0'), 10);
    }

    /**
     * Create a new schema in the database
     */
    async createSchema(connectionId: string, schemaName: string): Promise<void> {
        const connection = this.connectionsService.findById(connectionId);
        const connector = await this.connectionsService.getConnector(connectionId);

        // Validate schema name (basic validation - alphanumeric and underscores)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) {
            throw new Error('Invalid schema name. Use only letters, numbers, and underscores, starting with a letter or underscore.');
        }

        // Generate SQL based on database engine
        let sql: string;
        if (connection.engine === 'mysql' || connection.engine === 'mariadb') {
            sql = `CREATE SCHEMA \`${schemaName}\``;
        } else if (connection.engine === 'sqlite') {
            throw new Error('SQLite does not support creating schemas');
        } else {
            // PostgreSQL
            sql = `CREATE SCHEMA "${schemaName}"`;
        }

        await connector.execute(sql);
    }

    /**
     * Delete a schema from the database
     */
    async deleteSchema(connectionId: string, schemaName: string): Promise<void> {
        const connection = this.connectionsService.findById(connectionId);
        const connector = await this.connectionsService.getConnector(connectionId);

        // Validate schema name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) {
            throw new Error('Invalid schema name.');
        }

        // Prevent deletion of system schemas
        const systemSchemas = ['information_schema', 'pg_catalog', 'pg_toast', 'mysql', 'performance_schema', 'sys'];
        if (systemSchemas.includes(schemaName.toLowerCase())) {
            throw new Error('Cannot delete system schema');
        }

        // Generate SQL based on database engine
        let sql: string;
        if (connection.engine === 'mysql' || connection.engine === 'mariadb') {
            sql = `DROP SCHEMA \`${schemaName}\``;
        } else if (connection.engine === 'sqlite') {
            throw new Error('SQLite does not support deleting schemas');
        } else {
            // PostgreSQL - CASCADE to drop all objects within
            sql = `DROP SCHEMA "${schemaName}" CASCADE`;
        }

        await connector.execute(sql);
    }
}
