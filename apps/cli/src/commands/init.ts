import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import yaml from 'js-yaml';
import { MetadataDatabase, ServerRepository, ConnectionRepository } from '@dbnexus/metadata';
import type { ServerConfig as ServerConfigEntity, ConnectionConfig } from '@dbnexus/shared';
import { VERSION } from '../version.js';

// Config file schema
interface ServerConfig {
    name: string;
    engine: 'postgres' | 'mysql' | 'mariadb';
    host: string;
    port: number;
    username: string;
    password?: string;
    ssl?: boolean;
    connectionType?: 'local' | 'docker' | 'remote';
    startCommand?: string;
    stopCommand?: string;
    tags?: string[];
}

interface DatabaseConfig {
    name: string;
    server?: string; // Reference to server by name
    engine?: 'postgres' | 'mysql' | 'mariadb' | 'sqlite';
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
    filepath?: string; // For SQLite
    tags?: string[];
}

interface DbnexusConfig {
    version: string;
    servers?: ServerConfig[];
    databases?: DatabaseConfig[];
}

const CONFIG_FILENAME = 'dbnexus.config.yaml';

// Resolve environment variables in strings
function resolveEnvVars(value: string | undefined): string | undefined {
    if (!value) return value;
    return value.replaceAll(/\$\{([^}]+)\}/g, (_, envVar: string) => {
        const envValue = process.env[envVar];
        if (!envValue) {
            console.warn(chalk.yellow(`  Warning: Environment variable ${envVar} is not set`));
            return '';
        }
        return envValue;
    });
}

function generateTemplateConfig(): string {
    const template: DbnexusConfig = {
        version: VERSION,
        servers: [
            {
                name: 'Local PostgreSQL',
                engine: 'postgres',
                host: 'localhost',
                port: 5432,
                username: 'postgres',
                password: '${POSTGRES_PASSWORD}',
                ssl: false,
                connectionType: 'docker',
                startCommand: 'docker start my-postgres',
                stopCommand: 'docker stop my-postgres',
                tags: ['local', 'development'],
            },
        ],
        databases: [
            {
                name: 'My App Database',
                server: 'Local PostgreSQL',
                database: 'myapp',
                tags: ['development'],
            },
            {
                name: 'Standalone MySQL',
                engine: 'mysql',
                host: 'localhost',
                port: 3306,
                database: 'standalone_db',
                username: 'root',
                password: '${MYSQL_PASSWORD}',
                tags: ['standalone'],
            },
        ],
    };

    return `# DB Nexus Configuration
# This file defines your database servers and connections.
# Environment variables can be used for sensitive values: \${ENV_VAR_NAME}
#
# Run 'dbnexus init' to import this configuration.

${yaml.dump(template, { indent: 2, lineWidth: 100 })}`;
}

async function importConfig(
    configPath: string,
    db: MetadataDatabase
): Promise<{ servers: number; databases: number }> {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.load(configContent) as DbnexusConfig;

    const serverRepo = new ServerRepository(db);
    const connectionRepo = new ConnectionRepository(db);

    let serversImported = 0;
    let databasesImported = 0;

    // Map server names to IDs for database references
    const serverNameToId: Record<string, string> = {};

    // Import servers
    if (config.servers) {
        for (const server of config.servers) {
            // Check if server already exists
            const existing = serverRepo.findByName(server.name);
            if (existing) {
                console.log(chalk.dim(`  • Server "${server.name}" already exists, skipping`));
                serverNameToId[server.name] = existing.id;
                continue;
            }

            const password = resolveEnvVars(server.password) || '';
            const created = serverRepo.create({
                name: server.name,
                engine: server.engine,
                host: server.host,
                port: server.port,
                username: server.username,
                password,
                ssl: server.ssl,
                connectionType: server.connectionType,
                startCommand: server.startCommand,
                stopCommand: server.stopCommand,
                tags: server.tags,
            });
            serverNameToId[server.name] = created.id;
            serversImported++;
            console.log(chalk.green(`  ✓ Server "${server.name}" created`));
        }
    }

    // Import databases
    if (config.databases) {
        for (const database of config.databases) {
            // Check if database already exists
            const existing = connectionRepo.findByName(database.name);
            if (existing) {
                console.log(chalk.dim(`  • Database "${database.name}" already exists, skipping`));
                continue;
            }

            // Resolve server reference
            let serverId: string | undefined;
            let host = database.host;
            let port = database.port;
            let username = database.username;
            let password = resolveEnvVars(database.password);
            let engine = database.engine;
            let ssl = database.ssl;

            if (database.server) {
                serverId = serverNameToId[database.server];
                if (!serverId) {
                    console.log(
                        chalk.yellow(
                            `  ⚠ Server "${database.server}" not found for database "${database.name}", skipping`
                        )
                    );
                    continue;
                }
                // Get server details to inherit connection info
                const server = serverRepo.findById(serverId);
                if (server) {
                    host = host || server.host;
                    port = port || server.port;
                    username = username || server.username;
                    password = password || serverRepo.getPassword(serverId) || '';
                    engine = engine || server.engine;
                    ssl = ssl ?? server.ssl;
                }
            }

            // Validate required fields
            if (!engine) {
                console.log(
                    chalk.yellow(
                        `  ⚠ Database "${database.name}" has no engine specified, skipping`
                    )
                );
                continue;
            }

            if (engine !== 'sqlite' && (!host || !port || !username)) {
                console.log(
                    chalk.yellow(
                        `  ⚠ Database "${database.name}" missing host/port/username, skipping`
                    )
                );
                continue;
            }

            connectionRepo.create({
                name: database.name,
                engine,
                host: host || '',
                port: port || 0,
                database: engine === 'sqlite' && database.filepath ? database.filepath : database.database,
                username: username || '',
                password: password || '',
                ssl,
                serverId,
                tags: database.tags,
            });
            databasesImported++;
            console.log(chalk.green(`  ✓ Database "${database.name}" created`));
        }
    }

    return { servers: serversImported, databases: databasesImported };
}

export async function initCommand() {
    const cwd = process.cwd();
    const dbnexusDir = path.join(cwd, '.dbnexus');
    const configPath = path.join(cwd, CONFIG_FILENAME);
    const dbPath = path.join(dbnexusDir, 'metadata.db');

    const isInitialized = fs.existsSync(dbnexusDir);
    const configExists = fs.existsSync(configPath);

    // Case 1: Not initialized and no config - create everything
    if (!isInitialized && !configExists) {
        const spinner = ora('Initializing DB Nexus workspace...').start();
        try {
            // Create .dbnexus directory
            fs.mkdirSync(dbnexusDir, { recursive: true });
            fs.mkdirSync(path.join(dbnexusDir, 'logs'), { recursive: true });

            // Initialize metadata database
            const db = new MetadataDatabase(dbPath);
            db.initialize();
            db.close();

            // Create template config file
            fs.writeFileSync(configPath, generateTemplateConfig());

            // Add to .gitignore if it exists
            const gitignorePath = path.join(cwd, '.gitignore');
            if (fs.existsSync(gitignorePath)) {
                const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
                if (!gitignore.includes('.dbnexus')) {
                    fs.appendFileSync(gitignorePath, '\n# DB Nexus\n.dbnexus/\n');
                }
            }

            spinner.succeed('Workspace initialized with template config');

            console.log('');
            console.log(chalk.cyan('Created:'));
            console.log(`  ${chalk.dim('•')} .dbnexus/metadata.db`);
            console.log(`  ${chalk.dim('•')} .dbnexus/logs/`);
            console.log(`  ${chalk.dim('•')} ${CONFIG_FILENAME}`);
            console.log('');
            console.log(chalk.cyan('Next steps:'));
            console.log(
                `  ${chalk.dim('1.')} Edit ${chalk.yellow(CONFIG_FILENAME)} with your servers and databases`
            );
            console.log(
                `  ${chalk.dim('2.')} Set environment variables for passwords (e.g., POSTGRES_PASSWORD)`
            );
            console.log(
                `  ${chalk.dim('3.')} Run ${chalk.yellow('dbnexus init')} again to import the config`
            );
        } catch (error) {
            spinner.fail('Failed to initialize workspace');
            console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
            process.exit(1);
        }
        return;
    }

    // Case 2: Not initialized but config exists - initialize and import
    if (!isInitialized && configExists) {
        const spinner = ora('Initializing DB Nexus workspace from config...').start();
        try {
            // Create .dbnexus directory
            fs.mkdirSync(dbnexusDir, { recursive: true });
            fs.mkdirSync(path.join(dbnexusDir, 'logs'), { recursive: true });

            // Initialize metadata database
            const db = new MetadataDatabase(dbPath);
            db.initialize();

            spinner.succeed('Workspace initialized');
            console.log('');
            console.log(chalk.cyan('Importing configuration...'));

            const result = await importConfig(configPath, db);
            db.close();

            // Add to .gitignore if it exists
            const gitignorePath = path.join(cwd, '.gitignore');
            if (fs.existsSync(gitignorePath)) {
                const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
                if (!gitignore.includes('.dbnexus')) {
                    fs.appendFileSync(gitignorePath, '\n# DB Nexus\n.dbnexus/\n');
                }
            }

            console.log('');
            console.log(
                chalk.green(
                    `✓ Imported ${result.servers} server(s) and ${result.databases} database(s)`
                )
            );
            console.log('');
            console.log(chalk.cyan('Next steps:'));
            console.log(`  ${chalk.dim('•')} Start the UI: ${chalk.yellow('dbnexus ui')}`);
        } catch (error) {
            spinner.fail('Failed to initialize workspace');
            console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
            process.exit(1);
        }
        return;
    }

    // Case 3: Already initialized and config exists - just import/sync
    if (isInitialized && configExists) {
        console.log(chalk.cyan('Importing configuration...'));
        try {
            const db = new MetadataDatabase(dbPath);
            db.initialize();

            const result = await importConfig(configPath, db);
            db.close();

            console.log('');
            console.log(
                chalk.green(
                    `✓ Imported ${result.servers} server(s) and ${result.databases} database(s)`
                )
            );

            if (result.servers === 0 && result.databases === 0) {
                console.log(chalk.dim('  (All entities already exist or were skipped)'));
            }
        } catch (error) {
            console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
            process.exit(1);
        }
        return;
    }

    // Case 4: Already initialized but no config - create template config
    if (isInitialized && !configExists) {
        fs.writeFileSync(configPath, generateTemplateConfig());
        console.log(chalk.green(`✓ Created ${CONFIG_FILENAME}`));
        console.log('');
        console.log(chalk.cyan('Next steps:'));
        console.log(
            `  ${chalk.dim('1.')} Edit ${chalk.yellow(CONFIG_FILENAME)} with your servers and databases`
        );
        console.log(
            `  ${chalk.dim('2.')} Run ${chalk.yellow('dbnexus init')} again to import the config`
        );
    }
}

/**
 * Export current configuration to YAML file
 */
function serverToConfig(server: ServerConfigEntity): ServerConfig {
    return {
        name: server.name,
        engine: server.engine as 'postgres' | 'mysql' | 'mariadb',
        host: server.host,
        port: server.port,
        username: server.username,
        password: '${' + server.name.toUpperCase().replaceAll(/[^A-Z0-9]/g, '_') + '_PASSWORD}',
        ssl: server.ssl,
        connectionType: server.connectionType,
        startCommand: server.startCommand,
        stopCommand: server.stopCommand,
        tags: server.tags,
    };
}

function databaseToConfig(
    conn: ConnectionConfig,
    servers: ServerConfigEntity[]
): DatabaseConfig | null {
    // Find if this database belongs to a server
    const server = servers.find((s) => s.id === conn.serverId);

    if (server) {
        // Database belongs to a server - use server reference
        return {
            name: conn.name,
            server: server.name,
            database: conn.database,
            tags: conn.tags,
        };
    }

    // Standalone database
    return {
        name: conn.name,
        engine: conn.engine as 'postgres' | 'mysql' | 'mariadb' | 'sqlite',
        host: conn.host,
        port: conn.port,
        database: conn.database,
        username: conn.username,
        password: '${' + conn.name.toUpperCase().replaceAll(/[^A-Z0-9]/g, '_') + '_PASSWORD}',
        ssl: conn.ssl,
        tags: conn.tags,
    };
}

export async function exportConfigCommand(options: { output?: string }) {
    const cwd = process.cwd();
    const dbnexusDir = path.join(cwd, '.dbnexus');
    const dbPath = path.join(dbnexusDir, 'metadata.db');
    const outputPath = options.output || path.join(cwd, CONFIG_FILENAME);

    if (!fs.existsSync(dbnexusDir)) {
        console.error(chalk.red('Workspace not initialized. Run "dbnexus init" first.'));
        process.exit(1);
    }

    const spinner = ora('Exporting configuration...').start();

    try {
        const db = new MetadataDatabase(dbPath);
        db.initialize();

        const serverRepo = new ServerRepository(db);
        const connectionRepo = new ConnectionRepository(db);

        const servers = serverRepo.findAll();
        const connections = connectionRepo.findAll();

        const config: DbnexusConfig = {
            version: VERSION,
            servers: servers.map(serverToConfig),
            databases: connections
                .map((c) => databaseToConfig(c, servers))
                .filter((d): d is DatabaseConfig => d !== null),
        };

        db.close();

        const yamlContent = `# DB Nexus Configuration
# Exported on ${new Date().toISOString()}
# Environment variables can be used for passwords: \${ENV_VAR_NAME}
#
# Run 'dbnexus init' to import this configuration.

${yaml.dump(config, { indent: 2, lineWidth: 100 })}`;

        fs.writeFileSync(outputPath, yamlContent);
        spinner.succeed(`Configuration exported to ${outputPath}`);

        console.log('');
        console.log(chalk.cyan('Summary:'));
        console.log(`  ${chalk.dim('•')} ${servers.length} server(s)`);
        console.log(`  ${chalk.dim('•')} ${connections.length} database(s)`);
        console.log('');
        console.log(
            chalk.yellow('Note: Passwords are replaced with environment variable placeholders.')
        );
        console.log(
            chalk.yellow('Set the environment variables before running "dbnexus init" to import.')
        );
    } catch (error) {
        spinner.fail('Failed to export configuration');
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}
