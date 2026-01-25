import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { MetadataService } from '../metadata/metadata.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import type { DatabaseEngine } from '@dbnexus/shared';

export interface RestoreBackupOptions {
    connectionId: string;
    backupId: string;
    method?: 'native' | 'sql';
}

@Injectable()
export class RestoreService {
    private readonly logger = new Logger(RestoreService.name);

    constructor(
        private readonly metadataService: MetadataService,
        private readonly connectionsService: ConnectionsService
    ) {}

    async restoreBackup(options: RestoreBackupOptions) {
        const { connectionId, backupId, method = 'native' } = options;

        // Get backup details
        const backup = this.metadataService.backupRepository.getById(backupId);
        if (!backup) {
            throw new Error('Backup not found');
        }

        // Get connection details
        const connection = this.connectionsService.findById(connectionId);
        if (!connection) {
            throw new Error('Connection not found');
        }

        // Get decrypted password
        const password =
            connection.engine !== 'sqlite'
                ? (this.metadataService.connectionRepository.getPassword(connectionId) ?? undefined)
                : undefined;

        // Verify file exists
        try {
            await fs.access(backup.filePath);
        } catch {
            throw new Error('Backup file not found');
        }

        // For SQLite, disconnect before restoring to release file locks
        if (connection.engine === 'sqlite') {
            try {
                await this.connectionsService.disconnect(connectionId);
                this.logger.log('Disconnected SQLite connection before restore');
            } catch (error) {
                this.logger.warn(`Failed to disconnect: ${error}`);
            }
        }

        // Perform restore based on method
        if (method === 'sql') {
            await this.performSQLRestore(connectionId, backup.filePath);
        } else {
            await this.performRestore({ ...connection, password }, backup.filePath);
        }

        return { success: true, message: 'Backup restored successfully' };
    }

    private async performRestore(
        connection: {
            engine: DatabaseEngine;
            host: string;
            port: number;
            database: string;
            username: string;
            password?: string;
            defaultSchema?: string;
        },
        filePath: string
    ): Promise<void> {
        switch (connection.engine) {
            case 'postgres':
                return this.performPostgresRestore(connection, filePath);
            case 'mysql':
            case 'mariadb':
                return this.performMySQLRestore(connection, filePath);
            case 'sqlite':
                return this.performSQLiteRestore(connection, filePath);
            default:
                throw new Error(`Unsupported database engine: ${connection.engine}`);
        }
    }

    private async performPostgresRestore(
        connection: {
            host: string;
            port: number;
            database: string;
            username: string;
            password?: string;
            defaultSchema?: string;
        },
        filePath: string
    ): Promise<void> {
        // Check if file is actually compressed by reading magic bytes
        const isCompressed = await this.isGzipCompressed(filePath);
        this.logger.log(`Postgres restore - File is compressed: ${isCompressed}`);
        let actualFilePath = filePath;

        // Decompress if needed
        if (isCompressed) {
            actualFilePath = filePath.replace(/\.gz$/, '') + '.tmp';
            await this.decompressFile(filePath, actualFilePath);
        }

        // First, clean the database
        await this.cleanPostgresDatabase(connection);

        const args = [
            '-h',
            connection.host,
            '-p',
            String(connection.port),
            '-U',
            connection.username,
            '-d',
            connection.database,
            '-f',
            actualFilePath,
        ];

        // Set password via environment variable to avoid interactive prompt
        const env = {
            ...process.env,
            PGPASSWORD: connection.password || '',
        };

        try {
            await new Promise<void>((resolve, reject) => {
                const proc = spawn('psql', args, { env });

                let stderr = '';
                proc.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    if (code === 0) {
                        this.logger.log('Postgres restore completed successfully');
                        resolve();
                    } else {
                        reject(new Error(`psql restore failed: ${stderr}`));
                    }
                });

                proc.on('error', (error) => {
                    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                        reject(
                            new Error(
                                'psql command not found. Please install PostgreSQL client tools or ensure they are in your PATH.'
                            )
                        );
                    } else {
                        reject(new Error(`Failed to spawn psql: ${error.message}`));
                    }
                });
            });
        } finally {
            // Clean up decompressed file if we created it
            if (isCompressed && actualFilePath !== filePath) {
                try {
                    await fs.unlink(actualFilePath);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    private async cleanPostgresDatabase(connection: {
        host: string;
        port: number;
        database: string;
        username: string;
        password?: string;
        defaultSchema?: string;
    }): Promise<void> {
        this.logger.log('Cleaning Postgres database before restore...');

        // Determine which schemas to clean
        // If defaultSchema is specified, only clean that schema
        // Otherwise, clean all non-system schemas
        let schemasToClean: string[];

        if (connection.defaultSchema) {
            // Only clean the specified schema
            schemasToClean = [connection.defaultSchema];
            this.logger.log(`Cleaning only schema: ${connection.defaultSchema}`);
        } else {
            // Get all non-system schemas
            const getSchemasSQL = `
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
                AND schema_name NOT LIKE 'pg_temp_%'
                AND schema_name NOT LIKE 'pg_toast_temp_%';
            `;

            const args = [
                '-h',
                connection.host,
                '-p',
                String(connection.port),
                '-U',
                connection.username,
                '-d',
                connection.database,
                '-t', // Tuples only (no headers)
                '-c',
                getSchemasSQL,
            ];

            const env = {
                ...process.env,
                PGPASSWORD: connection.password || '',
            };

            schemasToClean = await new Promise<string[]>((resolve, reject) => {
                const proc = spawn('psql', args, { env });

                let stdout = '';
                let stderr = '';
                proc.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });
                proc.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    if (code === 0) {
                        const schemaList = stdout
                            .split('\n')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
                        resolve(schemaList);
                    } else {
                        this.logger.error(`Failed to get schemas: ${stderr}`);
                        reject(new Error(`Failed to get schemas: ${stderr}`));
                    }
                });

                proc.on('error', (error) => {
                    reject(new Error(`Failed to spawn psql: ${error.message}`));
                });
            });

            this.logger.log(`Found schemas to drop: ${schemasToClean.join(', ')}`);
        }

        // Drop the schemas
        if (schemasToClean.length > 0) {
            const dropSQL = schemasToClean
                .map((schema) => `DROP SCHEMA IF EXISTS "${schema}" CASCADE;`)
                .join('\n');

            // Recreate public schema if it was dropped
            const recreatePublic = schemasToClean.includes('public')
                ? `
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO "${connection.username}";
            GRANT ALL ON SCHEMA public TO public;
            `
                : '';

            const cleanSQL = dropSQL + recreatePublic;

            const env = {
                ...process.env,
                PGPASSWORD: connection.password || '',
            };

            const cleanArgs = [
                '-h',
                connection.host,
                '-p',
                String(connection.port),
                '-U',
                connection.username,
                '-d',
                connection.database,
                '-c',
                cleanSQL,
            ];

            await new Promise<void>((resolve, reject) => {
                const proc = spawn('psql', cleanArgs, { env });

                let stderr = '';
                proc.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    if (code === 0) {
                        this.logger.log('Database cleaned successfully');
                        resolve();
                    } else {
                        this.logger.error(`Clean stderr: ${stderr}`);
                        reject(new Error(`Failed to clean database: ${stderr}`));
                    }
                });

                proc.on('error', (error) => {
                    reject(new Error(`Failed to spawn psql for cleaning: ${error.message}`));
                });
            });
        } else {
            this.logger.log('No schemas to drop');
        }
    }

    private async performMySQLRestore(
        connection: {
            host: string;
            port: number;
            database: string;
            username: string;
            password?: string;
        },
        filePath: string
    ): Promise<void> {
        // First, drop all tables to clean the database
        await this.cleanMySQLDatabase(connection);

        // Check if file is compressed
        const isCompressed = await this.isGzipCompressed(filePath);
        const catCommand = isCompressed ? `gunzip -c "${filePath}"` : `cat "${filePath}"`;

        // Use mysql with --force to continue on errors (skip privilege-requiring statements)
        const command = `${catCommand} | mysql -h ${connection.host} -P ${connection.port} -u ${connection.username} --protocol=TCP --force ${connection.database}`;

        this.logger.log(`Executing MySQL restore command (compressed: ${isCompressed})`);

        // Set password via environment variable to avoid interactive prompt
        const env = {
            ...process.env,
            MYSQL_PWD: connection.password || '',
        };

        await new Promise<void>((resolve, reject) => {
            const proc = spawn('sh', ['-c', command], { env });

            let stderr = '';
            proc.stderr?.on('data', (data) => {
                const msg = data.toString();
                stderr += msg;
                // Log warnings but don't fail on privilege errors
                if (msg.includes('ERROR 1227')) {
                    this.logger.warn(`Skipping privilege-requiring statement: ${msg}`);
                }
            });

            proc.on('close', (code) => {
                // With --force flag, mysql returns 0 even if some statements failed
                // We only fail if the entire process failed
                if (code === 0 || code === 1) {
                    // Check if there were any real errors (not just privilege warnings)
                    const hasRealErrors =
                        stderr.includes('ERROR') &&
                        !stderr.includes('ERROR 1227') &&
                        !stderr.includes('Access denied; you need');

                    if (hasRealErrors) {
                        this.logger.error(`MySQL restore had errors: ${stderr}`);
                        reject(new Error(`mysql restore failed: ${stderr}`));
                    } else {
                        this.logger.log(
                            'MySQL restore completed successfully (some privilege statements skipped)'
                        );
                        resolve();
                    }
                } else {
                    this.logger.error(`MySQL restore failed with code ${code}: ${stderr}`);
                    reject(new Error(`mysql restore failed: ${stderr}`));
                }
            });

            proc.on('error', (error) => {
                reject(new Error(`Failed to execute mysql restore: ${error.message}`));
            });
        });
    }

    private async cleanMySQLDatabase(connection: {
        host: string;
        port: number;
        database: string;
        username: string;
        password?: string;
    }): Promise<void> {
        this.logger.log('Cleaning MySQL database before restore...');

        const args = [
            '-h',
            connection.host,
            '-P',
            String(connection.port),
            '-u',
            connection.username,
            '--protocol=TCP', // Force TCP connection instead of socket
            connection.database,
            '-N', // Skip column names in output
            '-e',
            `SELECT CONCAT('DROP TABLE IF EXISTS \`', table_name, '\`;') 
             FROM information_schema.tables 
             WHERE table_schema = '${connection.database}' 
             AND table_type = 'BASE TABLE'
             ORDER BY table_name;`,
        ];

        const env = {
            ...process.env,
            MYSQL_PWD: connection.password || '',
        };

        await new Promise<void>((resolve, reject) => {
            const proc = spawn('mysql', args, { env });

            let stdout = '';
            let stderr = '';

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', async (code) => {
                if (code === 0) {
                    // Execute the DROP statements
                    const dropStatements = stdout
                        .split('\n')
                        .map((line) => line.trim())
                        .filter((line) => line.startsWith('DROP TABLE'))
                        .join('\n');

                    this.logger.log(`Drop statements:\n${dropStatements}`);

                    if (dropStatements) {
                        // Wrap DROP statements with FK checks disabled
                        const sqlToExecute = `SET FOREIGN_KEY_CHECKS=0;\n${dropStatements}\nSET FOREIGN_KEY_CHECKS=1;`;

                        const dropArgs = [
                            '-h',
                            connection.host,
                            '-P',
                            String(connection.port),
                            '-u',
                            connection.username,
                            '--protocol=TCP', // Force TCP connection instead of socket
                            connection.database,
                            '-e',
                            sqlToExecute,
                        ];

                        const dropProc = spawn('mysql', dropArgs, { env });

                        let dropStderr = '';
                        dropProc.stderr?.on('data', (data) => {
                            dropStderr += data.toString();
                        });

                        dropProc.on('close', (dropCode) => {
                            if (dropCode === 0) {
                                this.logger.log('Database cleaned successfully');
                                resolve();
                            } else {
                                this.logger.error(`Drop tables stderr: ${dropStderr}`);
                                reject(new Error(`Failed to drop tables: ${dropStderr}`));
                            }
                        });

                        dropProc.on('error', (error) => {
                            reject(new Error(`Failed to drop tables: ${error.message}`));
                        });
                    } else {
                        this.logger.log('No tables to drop');
                        resolve();
                    }
                } else {
                    reject(new Error(`Failed to get table list: ${stderr}`));
                }
            });

            proc.on('error', (error) => {
                reject(new Error(`Failed to spawn mysql for cleaning: ${error.message}`));
            });
        });
    }

    private async performSQLiteRestore(
        connection: { database: string },
        filePath: string
    ): Promise<void> {
        this.logger.log(`Performing SQLite restore for file: ${filePath}`);

        // Check if file is actually compressed by reading magic bytes
        const isCompressed = await this.isGzipCompressed(filePath);
        this.logger.log(`SQLite restore - File is compressed: ${isCompressed}`);
        let actualFilePath = filePath;

        // Decompress if needed
        if (isCompressed) {
            actualFilePath = filePath.replace(/\.gz$/, '') + '.tmp';
            await this.decompressFile(filePath, actualFilePath);
        }

        try {
            // Validate that the file is a valid SQLite database
            await this.validateSQLiteDatabase(actualFilePath);

            // For SQLite, we need to close any existing connections first
            // Then replace the database file

            // Check if target database exists and remove it
            try {
                await fs.access(connection.database);
                await fs.unlink(connection.database);
                this.logger.log('Removed existing SQLite database file');
            } catch {
                // Database doesn't exist, that's fine
            }

            // Copy the backup file to the database location
            await fs.copyFile(actualFilePath, connection.database);
            this.logger.log('SQLite restore completed successfully');
        } finally {
            // Clean up decompressed file if we created it
            if (isCompressed && actualFilePath !== filePath) {
                try {
                    await fs.unlink(actualFilePath);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * SQL-based restore - executes SQL file directly using database connector
     * This method doesn't require external CLI tools (pg_dump, mysql, etc.)
     */
    private async performSQLRestore(connectionId: string, filePath: string): Promise<void> {
        this.logger.log(`Performing SQL-based restore for connection: ${connectionId}`);

        const connection = this.connectionsService.findById(connectionId);
        if (!connection) {
            throw new Error('Connection not found');
        }

        // Check if file is compressed
        const isCompressed = await this.isGzipCompressed(filePath);
        let actualFilePath = filePath;

        if (isCompressed) {
            actualFilePath = filePath.replace(/\.gz$/, '') + '.tmp';
            await this.decompressFile(filePath, actualFilePath);
        }

        try {
            // Read SQL file
            const sqlContent = await fs.readFile(actualFilePath, 'utf8');

            // Get connector
            const connector = await this.connectionsService.getConnector(connectionId);

            // Split into statements (simple split by semicolon)
            // This is basic but works for most SQL dumps
            const statements = sqlContent
                .split(';')
                .map((s) => s.trim())
                .filter((s) => s && !s.startsWith('--') && !s.startsWith('/*'));

            this.logger.log(`Executing ${statements.length} SQL statements...`);

            let successCount = 0;
            let errorCount = 0;

            // Execute each statement
            for (const statement of statements) {
                try {
                    await connector.execute(statement);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    // Log error but continue with other statements
                    // Many errors are expected (e.g., DROP TABLE IF NOT EXISTS, privilege statements)
                    this.logger.warn(
                        `Statement failed (${errorCount}/${statements.length}): ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }

            this.logger.log(
                `SQL-based restore completed: ${successCount} succeeded, ${errorCount} failed`
            );

            // If more than 50% failed, consider it a failure
            if (errorCount > successCount) {
                throw new Error(
                    `Too many errors during restore: ${errorCount} failed out of ${statements.length} statements`
                );
            }
        } finally {
            // Clean up decompressed file if we created it
            if (isCompressed && actualFilePath !== filePath) {
                try {
                    await fs.unlink(actualFilePath);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
        this.logger.log(`Decompressing ${inputPath} to ${outputPath}`);
        const gunzip = createGunzip();
        const input = createReadStream(inputPath);
        const output = createWriteStream(outputPath);
        await pipeline(input, gunzip, output);
    }

    private async isGzipCompressed(filePath: string): Promise<boolean> {
        try {
            const buffer = Buffer.alloc(2);
            const fileHandle = await fs.open(filePath, 'r');
            await fileHandle.read(buffer, 0, 2, 0);
            await fileHandle.close();

            // Check for gzip magic bytes (0x1f 0x8b)
            return buffer[0] === 0x1f && buffer[1] === 0x8b;
        } catch (error) {
            this.logger.error(`Failed to check compression: ${error}`);
            return false;
        }
    }

    private async validateSQLiteDatabase(filePath: string): Promise<void> {
        try {
            const buffer = Buffer.alloc(16);
            const fileHandle = await fs.open(filePath, 'r');
            await fileHandle.read(buffer, 0, 16, 0);
            await fileHandle.close();

            // Check for SQLite magic bytes ("SQLite format 3\0")
            const magic = buffer.toString('utf8', 0, 16);
            if (!magic.startsWith('SQLite format 3')) {
                throw new Error('Not a valid SQLite database file');
            }
        } catch (error) {
            this.logger.error(`SQLite validation failed: ${error}`);
            throw new Error(`Invalid SQLite database file: ${error}`);
        }
    }
}
