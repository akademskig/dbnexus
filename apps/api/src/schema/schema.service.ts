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
}
