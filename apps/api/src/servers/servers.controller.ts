import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import { PostgresConnector, MysqlConnector, type ConnectorConfig } from '@dbnexus/connectors';
import type {
    ServerConfig,
    ServerCreateInput,
    ServerUpdateInput,
    DatabaseEngine,
    ConnectionConfig,
} from '@dbnexus/shared';

@Controller('servers')
export class ServersController {
    constructor(private readonly metadataService: MetadataService) {}

    @Get()
    getServers(@Query('engine') engine?: DatabaseEngine): ServerConfig[] {
        if (engine) {
            return this.metadataService.serverRepository.findByEngine(engine);
        }
        return this.metadataService.serverRepository.findAll();
    }

    @Get(':id')
    getServer(@Param('id') id: string): ServerConfig | null {
        return this.metadataService.serverRepository.findById(id);
    }

    @Get(':id/databases')
    getServerDatabases(@Param('id') id: string): ConnectionConfig[] {
        return this.metadataService.connectionRepository.findByServerId(id);
    }

    @Get(':id/password')
    getServerPassword(@Param('id') id: string): { password: string | null } {
        const password = this.metadataService.serverRepository.getPassword(id);
        return { password };
    }

    @Post()
    createServer(@Body() input: ServerCreateInput): ServerConfig {
        const server = this.metadataService.serverRepository.create(input);

        // Audit log
        this.metadataService.auditLogRepository.create({
            action: 'server_created',
            entityType: 'server',
            entityId: server.id,
            details: {
                name: server.name,
                engine: server.engine,
                host: server.host,
                port: server.port,
            },
        });

        return server;
    }

    @Put(':id')
    updateServer(@Param('id') id: string, @Body() input: ServerUpdateInput): ServerConfig | null {
        const server = this.metadataService.serverRepository.update(id, input);

        if (server) {
            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'server_updated',
                entityType: 'server',
                entityId: id,
                details: {
                    name: server.name,
                    changes: input,
                },
            });
        }

        return server;
    }

    @Delete(':id')
    deleteServer(@Param('id') id: string): { success: boolean; message?: string } {
        const server = this.metadataService.serverRepository.findById(id);

        // Check if server has linked databases
        const linkedDatabases = this.metadataService.connectionRepository.findByServerId(id);
        if (linkedDatabases.length > 0) {
            return {
                success: false,
                message: `Cannot delete server with ${linkedDatabases.length} linked database(s). Remove or reassign them first.`,
            };
        }

        const success = this.metadataService.serverRepository.delete(id);

        if (success && server) {
            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'server_deleted',
                entityType: 'server',
                entityId: id,
                details: {
                    name: server.name,
                    engine: server.engine,
                },
            });
        }

        return { success };
    }

    @Post(':id/test')
    async testServerConnection(
        @Param('id') id: string
    ): Promise<{ success: boolean; message: string }> {
        const server = this.metadataService.serverRepository.findById(id);
        if (!server) {
            return { success: false, message: 'Server not found' };
        }

        const password = this.metadataService.serverRepository.getPassword(id);
        if (!password) {
            return { success: false, message: 'Server admin credentials not configured' };
        }

        try {
            const connector = this.createServerConnector(server, password);
            const result = await connector.testConnection();
            await connector.disconnect();
            return result;
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Connection failed',
            };
        }
    }

    @Post(':id/create-database')
    async createDatabase(
        @Param('id') id: string,
        @Body() input: { databaseName: string; username?: string; password?: string }
    ): Promise<{ success: boolean; message: string }> {
        const server = this.metadataService.serverRepository.findById(id);
        if (!server) {
            return { success: false, message: 'Server not found' };
        }

        const adminPassword = this.metadataService.serverRepository.getPassword(id);
        if (!adminPassword || !server.username) {
            return {
                success: false,
                message:
                    'Server admin credentials not configured. Edit the server to add admin username and password.',
            };
        }

        const { databaseName, username, password } = input;

        if (!databaseName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(databaseName)) {
            throw new BadRequestException(
                'Invalid database name. Use letters, numbers, and underscores only.'
            );
        }

        try {
            const connector = this.createServerConnector(server, adminPassword);
            await connector.connect();

            // Create database
            if (server.engine === 'postgres') {
                // Check if database exists
                const checkResult = await connector.query(
                    `SELECT 1 FROM pg_database WHERE datname = '${databaseName}'`
                );
                if (checkResult.rows.length > 0) {
                    await connector.disconnect();
                    return { success: false, message: `Database "${databaseName}" already exists` };
                }
                await connector.query(`CREATE DATABASE "${databaseName}"`);
            } else {
                // MySQL/MariaDB
                await connector.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
            }

            // Optionally create user with access
            if (username && password) {
                if (server.engine === 'postgres') {
                    // Create user if not exists and grant privileges
                    await connector.query(
                        `DO $$ BEGIN CREATE USER "${username}" WITH PASSWORD '${password}'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`
                    );
                    await connector.query(
                        `GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${username}"`
                    );
                } else {
                    // MySQL/MariaDB
                    await connector.query(
                        `CREATE USER IF NOT EXISTS '${username}'@'%' IDENTIFIED BY '${password}'`
                    );
                    await connector.query(
                        `GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${username}'@'%'`
                    );
                    await connector.query(`FLUSH PRIVILEGES`);
                }
            }

            await connector.disconnect();

            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'database_created',
                entityType: 'server',
                entityId: id,
                details: {
                    serverName: server.name,
                    databaseName,
                    username: username || null,
                },
            });

            return {
                success: true,
                message: username
                    ? `Database "${databaseName}" created with user "${username}"`
                    : `Database "${databaseName}" created successfully`,
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create database',
            };
        }
    }

    @Get(':id/list-databases')
    async listDatabases(
        @Param('id') id: string
    ): Promise<{ success: boolean; databases?: string[]; message?: string }> {
        const server = this.metadataService.serverRepository.findById(id);
        if (!server) {
            return { success: false, message: 'Server not found' };
        }

        const password = this.metadataService.serverRepository.getPassword(id);
        if (!password || !server.username) {
            return { success: false, message: 'Server admin credentials not configured' };
        }

        try {
            const connector = this.createServerConnector(server, password);
            await connector.connect();

            let databases: string[] = [];
            if (server.engine === 'postgres') {
                const result = await connector.query(
                    `SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres') ORDER BY datname`
                );
                databases = result.rows.map(
                    (row: Record<string, unknown>) => row.datname as string
                );
            } else {
                const result = await connector.query(`SHOW DATABASES`);
                const systemDbs = ['information_schema', 'mysql', 'performance_schema', 'sys'];
                databases = result.rows
                    .map((row: Record<string, unknown>) => Object.values(row)[0] as string)
                    .filter((db: string) => !systemDbs.includes(db));
            }

            await connector.disconnect();
            return { success: true, databases };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to list databases',
            };
        }
    }

    private createServerConnector(server: ServerConfig, password: string) {
        const config: ConnectorConfig = {
            host: server.host,
            port: server.port,
            database: server.engine === 'postgres' ? 'postgres' : '', // Connect to maintenance DB
            username: server.username!,
            password,
            ssl: server.ssl,
        };

        if (server.engine === 'mysql') {
            return new MysqlConnector(config, false);
        }
        if (server.engine === 'mariadb') {
            return new MysqlConnector(config, true);
        }
        return new PostgresConnector(config);
    }
}
