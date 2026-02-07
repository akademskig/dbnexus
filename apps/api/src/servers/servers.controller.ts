import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
} from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import { PostgresConnector, MysqlConnector, type ConnectorConfig } from '@dbnexus/connectors';
import type { ServerConfig, DatabaseEngine, ConnectionConfig } from '@dbnexus/shared';
import { CreateServerDto, UpdateServerDto, CreateDatabaseDto } from './dto/index.js';

@Controller('servers')
export class ServersController {
    constructor(private readonly metadataService: MetadataService) { }

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
    createServer(@Body() input: CreateServerDto): ServerConfig {
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
    updateServer(@Param('id') id: string, @Body() input: UpdateServerDto): ServerConfig | null {
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
        @Body() input: CreateDatabaseDto
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

        // Validation is handled by CreateDatabaseDto decorators
        const { databaseName, username, password } = input;

        try {
            const connector = this.createServerConnector(server, adminPassword);
            await connector.connect();

            // Create database
            if (server.engine === 'postgres') {
                // Check if database exists using parameterized query
                const checkResult = await connector.query(
                    `SELECT 1 FROM pg_database WHERE datname = $1`,
                    [databaseName]
                );
                if (checkResult.rows.length > 0) {
                    await connector.disconnect();
                    return { success: false, message: `Database "${databaseName}" already exists` };
                }
                // Note: CREATE DATABASE doesn't support parameterized identifiers
                // databaseName is validated with regex above, safe for identifier use
                await connector.query(`CREATE DATABASE "${databaseName}"`);
            } else {
                // MySQL/MariaDB
                // Note: CREATE DATABASE doesn't support parameterized identifiers
                // databaseName is validated with regex above, safe for identifier use
                await connector.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
            }

            // Optionally create user with access
            if (username && password) {
                // Escape password for SQL (replace single quotes with two single quotes)
                const escapedPassword = password.replaceAll("'", "''");

                if (server.engine === 'postgres') {
                    // Create user if not exists and grant privileges
                    // Using dollar quoting for the password to handle special characters
                    await connector.query(
                        `DO $$ BEGIN CREATE USER "${username}" WITH PASSWORD '${escapedPassword}'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`
                    );
                    await connector.query(
                        `GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${username}"`
                    );
                } else {
                    // MySQL/MariaDB
                    await connector.query(
                        `CREATE USER IF NOT EXISTS '${username}'@'%' IDENTIFIED BY '${escapedPassword}'`
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
    async listDatabases(@Param('id') id: string): Promise<{
        success: boolean;
        databases?: Array<{
            name: string;
            size: string;
            owner?: string;
            tracked: boolean;
            connectionId?: string;
        }>;
        message?: string;
    }> {
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

            // Get tracked connections for this server
            const trackedConnections = this.metadataService.connectionRepository
                .findAll()
                .filter((c) => c.serverId === id);
            const trackedDbNames = new Set(trackedConnections.map((c) => c.database));

            let databases: Array<{
                name: string;
                size: string;
                owner?: string;
                tracked: boolean;
                connectionId?: string;
            }> = [];

            if (server.engine === 'postgres') {
                const result = await connector.query(`
                    SELECT 
                        d.datname as name,
                        pg_size_pretty(pg_database_size(d.datname)) as size,
                        r.rolname as owner
                    FROM pg_database d
                    JOIN pg_roles r ON d.datdba = r.oid
                    WHERE d.datistemplate = false 
                    AND d.datname NOT IN ('postgres')
                    ORDER BY d.datname
                `);
                databases = result.rows.map((row: Record<string, unknown>) => {
                    const name = row.name as string;
                    const tracked = trackedDbNames.has(name);
                    const connection = trackedConnections.find((c) => c.database === name);
                    return {
                        name,
                        size: row.size as string,
                        owner: row.owner as string,
                        tracked,
                        connectionId: connection?.id,
                    };
                });
            } else {
                // MySQL/MariaDB
                const result = await connector.query(`
                    SELECT 
                        table_schema as name,
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                    GROUP BY table_schema
                    ORDER BY table_schema
                `);
                databases = result.rows.map((row: Record<string, unknown>) => {
                    const name = row.name as string;
                    const sizeMb = row.size_mb as number;
                    const tracked = trackedDbNames.has(name);
                    const connection = trackedConnections.find((c) => c.database === name);
                    return {
                        name,
                        size: sizeMb ? `${sizeMb} MB` : '0 MB',
                        tracked,
                        connectionId: connection?.id,
                    };
                });
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

    @Get(':id/info')
    async getServerInfo(@Param('id') id: string): Promise<{
        success: boolean;
        info?: {
            version: string;
            uptime: string;
            activeConnections: number;
            maxConnections: number;
            currentDatabase: string;
        };
        message?: string;
    }> {
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

            let info: {
                version: string;
                uptime: string;
                activeConnections: number;
                maxConnections: number;
                currentDatabase: string;
            };

            if (server.engine === 'postgres') {
                const versionResult = await connector.query(`SELECT version()`);
                const version = (versionResult.rows[0]?.version as string) || 'Unknown';

                const uptimeResult = await connector.query(
                    `SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time()))::int as uptime_seconds`
                );
                const uptimeSeconds = (uptimeResult.rows[0]?.uptime_seconds as number) || 0;

                const connectionsResult = await connector.query(
                    `SELECT count(*) as active FROM pg_stat_activity WHERE state = 'active'`
                );
                const activeConnections = parseInt(
                    String(connectionsResult.rows[0]?.active || 0),
                    10
                );

                const maxConnResult = await connector.query(`SHOW max_connections`);
                const maxConnections = parseInt(
                    String(maxConnResult.rows[0]?.max_connections || 100),
                    10
                );

                info = {
                    version: version.split(',')[0] || version,
                    uptime: this.formatUptime(uptimeSeconds),
                    activeConnections,
                    maxConnections,
                    currentDatabase: 'postgres',
                };
            } else {
                // MySQL/MariaDB
                const versionResult = await connector.query(`SELECT VERSION() as version`);
                const version = (versionResult.rows[0]?.version as string) || 'Unknown';

                const uptimeResult = await connector.query(`SHOW GLOBAL STATUS LIKE 'Uptime'`);
                const uptimeSeconds = parseInt(String(uptimeResult.rows[0]?.Value || 0), 10);

                const connectionsResult = await connector.query(
                    `SHOW STATUS LIKE 'Threads_connected'`
                );
                const activeConnections = parseInt(
                    String(connectionsResult.rows[0]?.Value || 0),
                    10
                );

                const maxConnResult = await connector.query(
                    `SHOW VARIABLES LIKE 'max_connections'`
                );
                const maxConnections = parseInt(String(maxConnResult.rows[0]?.Value || 100), 10);

                info = {
                    version,
                    uptime: this.formatUptime(uptimeSeconds),
                    activeConnections,
                    maxConnections,
                    currentDatabase: server.engine === 'mysql' ? 'MySQL' : 'MariaDB',
                };
            }

            await connector.disconnect();
            return { success: true, info };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get server info',
            };
        }
    }

    @Delete(':id/databases/:dbName')
    async dropDatabase(
        @Param('id') id: string,
        @Param('dbName') dbName: string
    ): Promise<{ success: boolean; message: string }> {
        const server = this.metadataService.serverRepository.findById(id);
        if (!server) {
            return { success: false, message: 'Server not found' };
        }

        const password = this.metadataService.serverRepository.getPassword(id);
        if (!password || !server.username) {
            return { success: false, message: 'Server admin credentials not configured' };
        }

        // Validate database name
        if (!dbName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
            return { success: false, message: 'Invalid database name' };
        }

        // Prevent dropping system databases
        const systemDbs =
            server.engine === 'postgres'
                ? ['postgres', 'template0', 'template1']
                : ['information_schema', 'mysql', 'performance_schema', 'sys'];
        if (systemDbs.includes(dbName.toLowerCase())) {
            return { success: false, message: 'Cannot drop system database' };
        }

        try {
            const connector = this.createServerConnector(server, password);
            await connector.connect();

            if (server.engine === 'postgres') {
                // Terminate active connections to the database
                // Note: dbName is already validated with regex, safe for identifier use
                await connector.query(`
                    SELECT pg_terminate_backend(pid) 
                    FROM pg_stat_activity 
                    WHERE datname = $1 AND pid <> pg_backend_pid()
                `, [dbName]);
                await connector.query(`DROP DATABASE IF EXISTS "${dbName}"`);
            } else {
                await connector.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
            }

            await connector.disconnect();

            // Remove any tracked connections for this database
            const trackedConnections = this.metadataService.connectionRepository
                .findAll()
                .filter((c) => c.serverId === id && c.database === dbName);
            for (const conn of trackedConnections) {
                this.metadataService.connectionRepository.delete(conn.id);
            }

            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'database_deleted',
                entityType: 'server',
                entityId: id,
                details: {
                    serverName: server.name,
                    databaseName: dbName,
                },
            });

            return { success: true, message: `Database "${dbName}" dropped successfully` };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to drop database',
            };
        }
    }

    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
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
