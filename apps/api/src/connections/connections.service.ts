import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import {
    PostgresConnector,
    SqliteConnector,
    MysqlConnector,
    type ConnectorConfig,
    type SqliteConnectorConfig,
    type DatabaseConnector,
} from '@dbnexus/connectors';
import type {
    ConnectionConfig,
    ConnectionCreateInput,
    ConnectionUpdateInput,
    ConnectionTestResult,
} from '@dbnexus/shared';

@Injectable()
export class ConnectionsService {
    private readonly logger = new Logger(ConnectionsService.name);
    // Active connections pool
    private connectors: Map<string, DatabaseConnector> = new Map();

    constructor(private readonly metadataService: MetadataService) {}

    /**
     * Get all connections
     */
    findAll(): ConnectionConfig[] {
        return this.metadataService.connectionRepository.findAll();
    }

    /**
     * Get a connection by ID
     */
    findById(id: string): ConnectionConfig {
        const connection = this.metadataService.connectionRepository.findById(id);
        if (!connection) {
            throw new NotFoundException(`Connection with ID ${id} not found`);
        }
        return connection;
    }

    /**
     * Get a connection by name
     */
    findByName(name: string): ConnectionConfig | null {
        return this.metadataService.connectionRepository.findByName(name);
    }

    /**
     * Create a new connection
     */
    async create(input: ConnectionCreateInput): Promise<ConnectionConfig> {
        // Check for duplicate name
        const existing = this.metadataService.connectionRepository.findByName(input.name);
        if (existing) {
            throw new BadRequestException(`Connection with name "${input.name}" already exists`);
        }

        // Create connection in database (password will be encrypted)
        const connection = this.metadataService.connectionRepository.create(input);
        this.logger.log(`Created connection "${connection.name}" (${connection.id})`);

        // Audit log
        this.metadataService.auditLogRepository.create({
            action: 'connection_created',
            entityType: 'connection',
            entityId: connection.id,
            connectionId: connection.id,
            details: {
                name: connection.name,
                engine: connection.engine,
                host: connection.host,
                database: connection.database,
            },
        });

        return connection;
    }

    /**
     * Update a connection
     */
    async update(id: string, input: ConnectionUpdateInput): Promise<ConnectionConfig> {
        const existing = this.findById(id);

        // Check for duplicate name if name is being changed
        if (input.name && input.name !== existing.name) {
            const duplicate = this.metadataService.connectionRepository.findByName(input.name);
            if (duplicate) {
                throw new BadRequestException(
                    `Connection with name "${input.name}" already exists`
                );
            }
        }

        // Update connection in database (password will be encrypted if provided)
        const updated = this.metadataService.connectionRepository.update(id, input);
        if (!updated) {
            throw new NotFoundException(`Connection with ID ${id} not found`);
        }

        // Disconnect if connected (will reconnect with new settings)
        await this.disconnect(id);

        // Audit log
        this.metadataService.auditLogRepository.create({
            action: 'connection_updated',
            entityType: 'connection',
            entityId: id,
            connectionId: id,
            details: {
                name: updated.name,
                changes: input,
            },
        });

        return updated;
    }

    /**
     * Delete a connection
     */
    async delete(id: string): Promise<void> {
        const connection = this.findById(id);

        await this.disconnect(id);

        const deleted = this.metadataService.connectionRepository.delete(id);
        if (!deleted) {
            throw new NotFoundException(`Connection with ID ${id} not found`);
        }

        // Audit log
        this.metadataService.auditLogRepository.create({
            action: 'connection_deleted',
            entityType: 'connection',
            entityId: id,
            details: {
                name: connection.name,
                engine: connection.engine,
            },
        });
    }

    /**
     * Test a connection
     */
    async test(id: string): Promise<ConnectionTestResult> {
        const connection = this.findById(id);

        // SQLite doesn't need a password
        if (connection.engine === 'sqlite') {
            const connector = this.createConnector(connection, '');
            return connector.testConnection();
        }

        const password = this.metadataService.connectionRepository.getPassword(id);

        if (!password) {
            return {
                success: false,
                message: 'Password not found. Please update the connection with the password.',
            };
        }

        const connector = this.createConnector(connection, password);
        return connector.testConnection();
    }

    /**
     * Test connection settings without saving
     */
    async testSettings(settings: ConnectionCreateInput): Promise<ConnectionTestResult> {
        if (settings.engine === 'sqlite') {
            // For SQLite, database field contains the file path
            const connector = new SqliteConnector({
                filepath: settings.database,
            });
            return connector.testConnection();
        }

        const config: ConnectorConfig = {
            host: settings.host,
            port: settings.port,
            database: settings.database,
            username: settings.username,
            password: settings.password,
            ssl: settings.ssl,
        };

        if (settings.engine === 'mysql') {
            const connector = new MysqlConnector(config, false);
            return connector.testConnection();
        }

        if (settings.engine === 'mariadb') {
            const connector = new MysqlConnector(config, true);
            return connector.testConnection();
        }

        const connector = new PostgresConnector(config);
        return connector.testConnection();
    }

    /**
     * Get an active connector for a connection
     */
    async getConnector(id: string): Promise<DatabaseConnector> {
        // Return existing connector if connected
        const existing = this.connectors.get(id);
        if (existing?.isConnected()) {
            return existing;
        }

        // Create and connect
        const connection = this.findById(id);

        // SQLite doesn't need a password
        let password = '';
        if (connection.engine !== 'sqlite') {
            password = this.metadataService.connectionRepository.getPassword(id) ?? '';
            if (!password) {
                throw new BadRequestException(
                    'Password not found. Please update the connection with the password.'
                );
            }
        }

        const connector = this.createConnector(connection, password);
        const logInfo =
            connection.engine === 'sqlite'
                ? `"${connection.name}" (${connection.database})`
                : `"${connection.name}" (${connection.host}:${connection.port})`;
        this.logger.log(`Connecting to ${logInfo}`);
        await connector.connect();
        this.connectors.set(id, connector);
        this.logger.log(`Connected to "${connection.name}"`);

        return connector;
    }

    /**
     * Disconnect a connection
     */
    async disconnect(id: string): Promise<void> {
        const connector = this.connectors.get(id);
        if (connector) {
            await connector.disconnect();
            this.connectors.delete(id);
            this.logger.log(`Disconnected from connection ${id}`);
        }
    }

    /**
     * Check if a connection is active
     */
    isConnected(id: string): boolean {
        const connector = this.connectors.get(id);
        return connector?.isConnected() ?? false;
    }

    /**
     * Create a connector instance
     */
    private createConnector(connection: ConnectionConfig, password: string): DatabaseConnector {
        if (connection.engine === 'sqlite') {
            const config: SqliteConnectorConfig = {
                filepath: connection.database, // For SQLite, database field stores the file path
            };
            return new SqliteConnector(config);
        }

        const config: ConnectorConfig = {
            host: connection.host,
            port: connection.port,
            database: connection.database,
            username: connection.username,
            password,
            ssl: connection.ssl,
        };

        if (connection.engine === 'mysql') {
            return new MysqlConnector(config, false);
        }

        if (connection.engine === 'mariadb') {
            return new MysqlConnector(config, true);
        }

        return new PostgresConnector(config);
    }
}
