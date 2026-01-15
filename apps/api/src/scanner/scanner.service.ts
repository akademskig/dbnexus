import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

export interface DiscoveredConnection {
    name: string;
    engine: 'postgres' | 'mysql' | 'mariadb' | 'sqlite';
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    filepath?: string;
    source: 'port-scan' | 'docker' | 'env-file' | 'docker-compose' | 'sqlite-file' | 'config-file';
    confidence: 'high' | 'medium' | 'low';
    details?: string;
}

export interface ScanResult {
    connections: DiscoveredConnection[];
    scannedSources: string[];
    errors: string[];
}

interface DockerContainer {
    id: string;
    name: string;
    image: string;
    ports: string;
    status: string;
}

const DATABASE_PORTS: Record<number, { engine: 'postgres' | 'mysql' | 'mariadb'; name: string }> = {
    // PostgreSQL ports (5432-5437)
    5432: { engine: 'postgres', name: 'PostgreSQL' },
    5433: { engine: 'postgres', name: 'PostgreSQL (alt)' },
    5434: { engine: 'postgres', name: 'PostgreSQL (alt)' },
    5435: { engine: 'postgres', name: 'PostgreSQL (alt)' },
    5436: { engine: 'postgres', name: 'PostgreSQL (alt)' },
    5437: { engine: 'postgres', name: 'PostgreSQL (alt)' },
    // MySQL/MariaDB ports (3306-3311)
    3306: { engine: 'mysql', name: 'MySQL/MariaDB' },
    3307: { engine: 'mysql', name: 'MySQL/MariaDB (alt)' },
    3308: { engine: 'mysql', name: 'MySQL/MariaDB (alt)' },
    3309: { engine: 'mysql', name: 'MySQL/MariaDB (alt)' },
    3310: { engine: 'mysql', name: 'MySQL/MariaDB (alt)' },
    3311: { engine: 'mysql', name: 'MySQL/MariaDB (alt)' },
};

@Injectable()
export class ScannerService {
    private readonly logger = new Logger(ScannerService.name);

    async scanAll(workspacePath?: string): Promise<ScanResult> {
        const result: ScanResult = {
            connections: [],
            scannedSources: [],
            errors: [],
        };

        // Run all scans in parallel
        const handleError =
            (source: string) =>
            (e: Error): DiscoveredConnection[] => {
                result.errors.push(`${source}: ${e.message}`);
                return [];
            };

        const [portResults, dockerResults, envResults, composeResults, sqliteResults] =
            await Promise.all([
                this.scanPorts().catch(handleError('Port scan')),
                this.scanDockerContainers().catch(handleError('Docker scan')),
                this.scanEnvFiles(workspacePath).catch(handleError('Env file scan')),
                this.scanDockerCompose(workspacePath).catch(handleError('Docker Compose scan')),
                this.scanSqliteFiles(workspacePath).catch(handleError('SQLite scan')),
            ]);

        result.connections = [
            ...portResults,
            ...dockerResults,
            ...envResults,
            ...composeResults,
            ...sqliteResults,
        ];

        result.scannedSources = [
            'Local ports (5432-5437, 3306-3311)',
            'Docker containers',
            'Environment files (.env)',
            'Docker Compose files',
            'SQLite files',
        ];

        // Deduplicate connections
        result.connections = this.deduplicateConnections(result.connections);

        return result;
    }

    async scanPorts(): Promise<DiscoveredConnection[]> {
        const connections: DiscoveredConnection[] = [];
        const hosts = ['127.0.0.1', 'localhost'];

        for (const [portStr, info] of Object.entries(DATABASE_PORTS)) {
            const port = parseInt(portStr);
            for (const host of hosts) {
                const isOpen = await this.checkPort(host, port);
                if (isOpen) {
                    connections.push({
                        name: `${info.name} on ${host}:${port}`,
                        engine: info.engine,
                        host,
                        port,
                        source: 'port-scan',
                        confidence: 'medium',
                        details: `Found open port ${port}`,
                    });
                    break; // Don't add both localhost and 127.0.0.1
                }
            }
        }

        return connections;
    }

    private checkPort(host: string, port: number, timeout = 1000): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });

            socket.connect(port, host);
        });
    }

    async scanDockerContainers(): Promise<DiscoveredConnection[]> {
        const connections: DiscoveredConnection[] = [];

        try {
            // Check if Docker is available
            const dockerOutput = execSync(
                'docker ps --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Ports}}|{{.Status}}"',
                {
                    encoding: 'utf-8',
                    timeout: 5000,
                }
            ).trim();

            if (!dockerOutput) return connections;

            const containers: DockerContainer[] = dockerOutput.split('\n').map((line) => {
                const parts = line.split('|');
                return {
                    id: parts[0] || '',
                    name: parts[1] || '',
                    image: parts[2] || '',
                    ports: parts[3] || '',
                    status: parts[4] || '',
                };
            });

            for (const container of containers) {
                const lowerImage = container.image.toLowerCase();
                const lowerName = container.name.toLowerCase();

                let engine: 'postgres' | 'mysql' | 'mariadb' | null = null;

                if (lowerImage.includes('postgres') || lowerName.includes('postgres')) {
                    engine = 'postgres';
                } else if (lowerImage.includes('mariadb') || lowerName.includes('mariadb')) {
                    engine = 'mariadb';
                } else if (lowerImage.includes('mysql') || lowerName.includes('mysql')) {
                    engine = 'mysql';
                }

                if (engine) {
                    // Extract port mapping
                    const portMatch = container.ports.match(/0\.0\.0\.0:(\d+)->(\d+)/);
                    const hostPort = portMatch && portMatch[1] ? parseInt(portMatch[1]) : undefined;

                    // Try to get environment variables from container
                    const envVars: Record<string, string> = {};
                    try {
                        const envOutput = execSync(
                            `docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' ${container.id}`,
                            {
                                encoding: 'utf-8',
                                timeout: 3000,
                            }
                        ).trim();

                        envOutput.split('\n').forEach((line) => {
                            const [key, ...valueParts] = line.split('=');
                            if (key) {
                                envVars[key] = valueParts.join('=');
                            }
                        });
                    } catch {
                        // Ignore errors getting env vars
                    }

                    const connection: DiscoveredConnection = {
                        name: `Docker: ${container.name}`,
                        engine,
                        host: 'localhost',
                        port: hostPort,
                        source: 'docker',
                        confidence: 'high',
                        details: `Container: ${container.name} (${container.image})`,
                    };

                    // Extract credentials from env vars
                    if (engine === 'postgres') {
                        connection.database = envVars['POSTGRES_DB'] || 'postgres';
                        connection.username = envVars['POSTGRES_USER'] || 'postgres';
                        connection.password = envVars['POSTGRES_PASSWORD'];
                    } else if (engine === 'mysql' || engine === 'mariadb') {
                        connection.database =
                            envVars['MYSQL_DATABASE'] || envVars['MARIADB_DATABASE'];
                        connection.username =
                            envVars['MYSQL_USER'] || envVars['MARIADB_USER'] || 'root';
                        connection.password =
                            envVars['MYSQL_PASSWORD'] ||
                            envVars['MARIADB_PASSWORD'] ||
                            envVars['MYSQL_ROOT_PASSWORD'] ||
                            envVars['MARIADB_ROOT_PASSWORD'];
                    }

                    connections.push(connection);
                }
            }
        } catch (error) {
            // Docker not available or error running command
            this.logger.debug('Docker scan failed:', error);
        }

        return connections;
    }

    async scanEnvFiles(workspacePath?: string): Promise<DiscoveredConnection[]> {
        const connections: DiscoveredConnection[] = [];
        const searchPaths = [workspacePath, process.cwd(), os.homedir()].filter(
            Boolean
        ) as string[];

        const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];

        for (const basePath of searchPaths) {
            for (const envFile of envFiles) {
                const filePath = path.join(basePath, envFile);
                try {
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const parsed = this.parseEnvFile(content);
                        const discovered = this.extractConnectionsFromEnv(parsed, filePath);
                        connections.push(...discovered);
                    }
                } catch {
                    // Ignore errors reading env files
                }
            }
        }

        return connections;
    }

    private parseEnvFile(content: string): Record<string, string> {
        const result: Record<string, string> = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const match = trimmed.match(/^([^=]+)=(.*)$/);
            if (match && match[1] && match[2] !== undefined) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes
                if (
                    (value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))
                ) {
                    value = value.slice(1, -1);
                }
                result[key] = value;
            }
        }

        return result;
    }

    private extractConnectionsFromEnv(
        env: Record<string, string>,
        source: string
    ): DiscoveredConnection[] {
        const connections: DiscoveredConnection[] = [];

        // Look for DATABASE_URL style connections
        for (const [key, value] of Object.entries(env)) {
            if (key.toLowerCase().includes('url') && value.includes('://')) {
                const parsed = this.parseConnectionUrl(value);
                if (parsed) {
                    connections.push({
                        ...parsed,
                        name: `${key} from ${path.basename(source)}`,
                        source: 'env-file',
                        confidence: 'high',
                        details: `Found in ${source}`,
                    });
                }
            }
        }

        // Look for individual connection variables
        const hostKeys = Object.keys(env).filter((k) =>
            /^(?:POSTGRES|PG|MYSQL|MARIADB|DB|DATABASE)_(?:HOST|HOSTNAME)$/i.test(k)
        );

        for (const hostKey of hostKeys) {
            const prefix = hostKey.replace(/_(?:HOST|HOSTNAME)$/i, '');
            const host = env[hostKey];
            const port = env[`${prefix}_PORT`];
            const database =
                env[`${prefix}_DATABASE`] || env[`${prefix}_DB`] || env[`${prefix}_NAME`];
            const username = env[`${prefix}_USER`] || env[`${prefix}_USERNAME`];
            const password = env[`${prefix}_PASSWORD`] || env[`${prefix}_PASS`];

            let engine: 'postgres' | 'mysql' | 'mariadb' = 'postgres';
            if (prefix.toLowerCase().includes('mysql')) {
                engine = 'mysql';
            } else if (prefix.toLowerCase().includes('mariadb')) {
                engine = 'mariadb';
            }

            connections.push({
                name: `${prefix} from ${path.basename(source)}`,
                engine,
                host,
                port: port ? parseInt(port) : undefined,
                database,
                username,
                password,
                source: 'env-file',
                confidence: 'high',
                details: `Found in ${source}`,
            });
        }

        return connections;
    }

    private parseConnectionUrl(
        url: string
    ): Pick<
        DiscoveredConnection,
        'engine' | 'host' | 'port' | 'database' | 'username' | 'password'
    > | null {
        try {
            // Handle postgres:// mysql:// mariadb:// etc.
            const match = url.match(
                /^(postgres(?:ql)?|mysql|mariadb):\/\/(?:([^:@]+)(?::([^@]*))?@)?([^:/]+)(?::(\d+))?(?:\/([^?]+))?/i
            );

            if (!match) return null;

            const [, protocol, username, password, host, port, database] = match;

            if (!protocol || !host) return null;

            let engine: 'postgres' | 'mysql' | 'mariadb' = 'postgres';
            if (protocol.toLowerCase().startsWith('mysql')) {
                engine = 'mysql';
            } else if (protocol.toLowerCase().startsWith('mariadb')) {
                engine = 'mariadb';
            }

            return {
                engine,
                host,
                port: port ? parseInt(port) : undefined,
                database,
                username,
                password,
            };
        } catch {
            return null;
        }
    }

    async scanDockerCompose(workspacePath?: string): Promise<DiscoveredConnection[]> {
        const connections: DiscoveredConnection[] = [];
        const searchPaths = [workspacePath, process.cwd()].filter(Boolean) as string[];

        const composeFiles = [
            'docker-compose.yml',
            'docker-compose.yaml',
            'compose.yml',
            'compose.yaml',
        ];

        for (const basePath of searchPaths) {
            for (const composeFile of composeFiles) {
                const filePath = path.join(basePath, composeFile);
                try {
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const discovered = this.parseDockerCompose(content, filePath);
                        connections.push(...discovered);
                    }
                } catch {
                    // Ignore errors
                }
            }
        }

        return connections;
    }

    private parseDockerCompose(content: string, source: string): DiscoveredConnection[] {
        const connections: DiscoveredConnection[] = [];

        // Simple YAML parsing for common patterns
        // Look for image: postgres, mysql, mariadb
        const serviceBlocks = content.split(/^ {2}\w+:/m);

        for (const block of serviceBlocks) {
            let engine: 'postgres' | 'mysql' | 'mariadb' | null = null;
            let port: number | undefined;
            let database: string | undefined;
            let username: string | undefined;
            let password: string | undefined;

            const imageMatch = block.match(/image:\s*['"]?([^'"\n]+)/);
            if (imageMatch && imageMatch[1]) {
                const image = imageMatch[1].toLowerCase();
                if (image.includes('postgres')) {
                    engine = 'postgres';
                } else if (image.includes('mariadb')) {
                    engine = 'mariadb';
                } else if (image.includes('mysql')) {
                    engine = 'mysql';
                }
            }

            if (!engine) continue;

            // Extract port mapping
            const portMatch = block.match(/ports:\s*\n\s*-\s*['"]?(\d+):(\d+)/);
            if (portMatch && portMatch[1]) {
                port = parseInt(portMatch[1]);
            }

            // Extract environment variables from list format (- KEY=value)
            const envSection = block.match(/environment:\s*\n((?:\s+-\s*[^\n]+\n?)+)/);
            const envLines = envSection?.[1] || '';

            if (envLines) {
                if (engine === 'postgres') {
                    const dbMatch = envLines.match(/POSTGRES_DB[=:]\s*['"]?([^'"\n]+)/);
                    const userMatch = envLines.match(/POSTGRES_USER[=:]\s*['"]?([^'"\n]+)/);
                    const passMatch = envLines.match(/POSTGRES_PASSWORD[=:]\s*['"]?([^'"\n]+)/);
                    database = dbMatch?.[1];
                    username = userMatch?.[1] || 'postgres';
                    password = passMatch?.[1];
                } else {
                    const dbMatch = envLines.match(
                        /(?:MYSQL|MARIADB)_DATABASE[=:]\s*['"]?([^'"\n]+)/
                    );
                    const userMatch = envLines.match(
                        /(?:MYSQL|MARIADB)_USER[=:]\s*['"]?([^'"\n]+)/
                    );
                    const passMatch = envLines.match(
                        /(?:MYSQL|MARIADB)_(?:ROOT_)?PASSWORD[=:]\s*['"]?([^'"\n]+)/
                    );
                    database = dbMatch?.[1];
                    username = userMatch?.[1] || 'root';
                    password = passMatch?.[1];
                }
            }

            // Also try key: value format for environment
            const envMapSection = block.match(/environment:\s*\n((?:\s+[A-Z_]+:\s*[^\n]+\n?)+)/);
            const envMapLines = envMapSection?.[1] || '';

            if (envMapLines) {
                if (engine === 'postgres') {
                    const dbMatch = envMapLines.match(/POSTGRES_DB:\s*['"]?([^'"\n]+)/);
                    const userMatch = envMapLines.match(/POSTGRES_USER:\s*['"]?([^'"\n]+)/);
                    const passMatch = envMapLines.match(/POSTGRES_PASSWORD:\s*['"]?([^'"\n]+)/);
                    database = dbMatch?.[1] || database;
                    username = userMatch?.[1] || username || 'postgres';
                    password = passMatch?.[1] || password;
                } else {
                    const dbMatch = envMapLines.match(
                        /(?:MYSQL|MARIADB)_DATABASE:\s*['"]?([^'"\n]+)/
                    );
                    const userMatch = envMapLines.match(
                        /(?:MYSQL|MARIADB)_USER:\s*['"]?([^'"\n]+)/
                    );
                    const passMatch = envMapLines.match(
                        /(?:MYSQL|MARIADB)_(?:ROOT_)?PASSWORD:\s*['"]?([^'"\n]+)/
                    );
                    database = dbMatch?.[1] || database;
                    username = userMatch?.[1] || username || 'root';
                    password = passMatch?.[1] || password;
                }
            }

            connections.push({
                name: `Docker Compose: ${engine} from ${path.basename(source)}`,
                engine,
                host: 'localhost',
                port,
                database,
                username,
                password,
                source: 'docker-compose',
                confidence: 'high',
                details: `Found in ${source}`,
            });
        }

        return connections;
    }

    async scanSqliteFiles(workspacePath?: string): Promise<DiscoveredConnection[]> {
        const connections: DiscoveredConnection[] = [];
        const homeDir = os.homedir();

        // Search paths: workspace, current dir, and common data directories
        const potentialPaths = [
            workspacePath,
            process.cwd(),
            path.join(homeDir, '.dbnexus'), // Our own data directory
            path.join(homeDir, 'data'),
            path.join(homeDir, 'databases'),
            path.join(homeDir, 'db'),
        ].filter((p): p is string => Boolean(p));

        // Filter to only existing paths and deduplicate
        const uniquePaths = [...new Set(potentialPaths)].filter((p) => {
            try {
                return fs.existsSync(p);
            } catch {
                return false;
            }
        });

        const sqliteExtensions = ['.db', '.sqlite', '.sqlite3', '.db3'];
        const ignoreDirs = [
            'node_modules',
            '.git',
            'dist',
            'build',
            '.next',
            '.nuxt',
            'coverage',
            '__pycache__',
        ];

        for (const basePath of uniquePaths) {
            try {
                // Use depth 5 for more thorough search
                const files = this.findFiles(basePath, sqliteExtensions, ignoreDirs, 5);
                for (const file of files) {
                    // Verify it's a SQLite file by checking magic bytes
                    try {
                        const fd = fs.openSync(file, 'r');
                        const buffer = Buffer.alloc(16);
                        fs.readSync(fd, buffer, 0, 16, 0);
                        fs.closeSync(fd);

                        const header = buffer.toString('utf-8', 0, 16);
                        if (header.startsWith('SQLite format 3')) {
                            connections.push({
                                name: `SQLite: ${path.basename(file)}`,
                                engine: 'sqlite',
                                filepath: file,
                                source: 'sqlite-file',
                                confidence: 'high',
                                details: `Found at ${file}`,
                            });
                        }
                    } catch {
                        // Can't read file, skip
                    }
                }
            } catch {
                // Ignore errors
            }
        }

        return connections;
    }

    private findFiles(
        dir: string,
        extensions: string[],
        ignoreDirs: string[],
        maxDepth: number,
        currentDepth = 0
    ): string[] {
        const files: string[] = [];

        if (currentDepth > maxDepth) return files;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
                        files.push(
                            ...this.findFiles(
                                path.join(dir, entry.name),
                                extensions,
                                ignoreDirs,
                                maxDepth,
                                currentDepth + 1
                            )
                        );
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (extensions.includes(ext)) {
                        files.push(path.join(dir, entry.name));
                    }
                }
            }
        } catch {
            // Ignore permission errors
        }

        return files;
    }

    private deduplicateConnections(connections: DiscoveredConnection[]): DiscoveredConnection[] {
        const seen = new Map<string, DiscoveredConnection>();

        // Normalize localhost variants
        const normalizeHost = (host: string | undefined): string => {
            if (!host || host === '127.0.0.1' || host === '0.0.0.0') return 'localhost';
            return host;
        };

        // Source priority: docker > docker-compose > env-file > config-file > port-scan
        const sourceRank: Record<string, number> = {
            docker: 5,
            'docker-compose': 4,
            'env-file': 3,
            'config-file': 2,
            'port-scan': 1,
            'sqlite-file': 5,
        };

        for (const conn of connections) {
            // Create a unique key based on host + port only
            // This catches the same database found via different methods
            const key = conn.filepath
                ? `sqlite:${conn.filepath}`
                : `${normalizeHost(conn.host)}:${conn.port}`;

            const existing = seen.get(key);
            if (!existing) {
                seen.set(key, conn);
            } else {
                // Keep the one from a better source (Docker > port-scan, etc.)
                const existingRank = sourceRank[existing.source] || 0;
                const newRank = sourceRank[conn.source] || 0;

                if (newRank > existingRank) {
                    // New connection is from a better source, replace
                    seen.set(key, conn);
                } else if (newRank === existingRank) {
                    // Same source priority, prefer one with more info
                    const confidenceRank = { high: 3, medium: 2, low: 1 };
                    if (confidenceRank[conn.confidence] > confidenceRank[existing.confidence]) {
                        seen.set(key, conn);
                    } else if (conn.password && !existing.password) {
                        seen.set(key, conn);
                    } else if (conn.database && !existing.database) {
                        seen.set(key, conn);
                    }
                }
                // Otherwise keep the existing one
            }
        }

        return Array.from(seen.values());
    }
}
