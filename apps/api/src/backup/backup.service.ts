import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MetadataService } from '../metadata/metadata.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import type { DatabaseEngine, BackupType } from '@dbnexus/shared';

export interface CreateBackupOptions {
    connectionId: string;
    backupType?: BackupType;
    compression?: boolean;
    method?: 'native' | 'sql'; // native = pg_dump/mysqldump, sql = SQL-based
}

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);
    private readonly backupsDir: string;

    constructor(
        private readonly metadataService: MetadataService,
        private readonly connectionsService: ConnectionsService
    ) {
        // Store backups in the data directory
        const dataDir = process.env.DBNEXUS_DATA_DIR || path.join(process.cwd(), 'data');
        this.backupsDir = path.join(dataDir, 'backups');
        this.ensureBackupsDir();
    }

    private async ensureBackupsDir() {
        try {
            await fs.mkdir(this.backupsDir, { recursive: true });
        } catch (error) {
            this.logger.error(`Failed to create backups directory: ${error}`);
        }
    }

    async createBackup(options: CreateBackupOptions) {
        const {
            connectionId,
            backupType = 'full',
            compression = false,
            method = 'native',
        } = options;

        const startTime = Date.now();

        // Get connection details
        const connection = this.connectionsService.findById(connectionId);
        if (!connection) {
            throw new Error('Connection not found');
        }

        // Get decrypted password
        let password = '';
        if (connection.engine !== 'sqlite') {
            password = this.metadataService.connectionRepository.getPassword(connectionId) ?? '';
        }

        // SQLite always uses native method (file copy)
        const actualMethod = connection.engine === 'sqlite' ? 'native' : method;

        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
        // Always use .sql extension, compression will add .gz later
        const filename = `${connection.name}_${timestamp}.sql${compression ? '.gz' : ''}`;
        // For backup operations, use path without .gz (will be added by compression)
        const backupPath = path.join(this.backupsDir, `${connection.name}_${timestamp}.sql`);
        const finalPath = path.join(this.backupsDir, filename);

        // Create backup record
        const backupId = randomUUID();
        this.metadataService.backupRepository.create({
            id: backupId,
            connectionId,
            filename,
            filePath: finalPath,
            fileSize: 0, // Will update after backup completes
            databaseName: connection.database,
            databaseEngine: connection.engine,
            backupType,
            method: actualMethod,
            compression: compression ? 'gzip' : 'none',
            status: 'in_progress',
        });

        try {
            // Perform backup based on engine and method
            await this.performBackup(
                { ...connection, password },
                backupPath,
                backupType,
                compression,
                method
            );

            // Get file size (check finalPath which includes .gz if compressed)
            const stats = await fs.stat(finalPath);
            const duration = Date.now() - startTime;

            // Update backup record with file size and status
            this.metadataService.backupRepository.updateStatus(backupId, 'completed');
            // Update file size directly
            const updateSizeStmt = this.metadataService.database.db.prepare(
                'UPDATE backups SET file_size = ? WHERE id = ?'
            );
            updateSizeStmt.run(stats.size, backupId);

            // Log successful backup
            this.metadataService.backupLogsRepository.create({
                operation: 'backup_created',
                backupId,
                connectionId,
                databaseName: connection.database,
                databaseEngine: connection.engine,
                backupType,
                method: actualMethod,
                fileSize: stats.size,
                duration,
                status: 'success',
            });

            return this.metadataService.backupRepository.getById(backupId);
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.logger.error(`Backup failed: ${errorMessage}`);
            this.metadataService.backupRepository.updateStatus(backupId, 'failed', errorMessage);

            // Log failed backup
            this.metadataService.backupLogsRepository.create({
                operation: 'backup_created',
                backupId,
                connectionId,
                databaseName: connection.database,
                databaseEngine: connection.engine,
                backupType,
                method: actualMethod,
                duration,
                status: 'failed',
                error: errorMessage,
            });

            throw error;
        }
    }

    private async performBackup(
        connection: {
            engine: DatabaseEngine;
            host: string;
            port: number;
            database: string;
            username: string;
            password?: string;
        },
        filePath: string,
        backupType: BackupType,
        compression: boolean,
        method: 'native' | 'sql' = 'native'
    ): Promise<void> {
        // Use SQL-based backup if method is 'sql' (for MySQL/PostgreSQL)
        if (method === 'sql' && connection.engine !== 'sqlite') {
            return this.performSQLBackup(
                connection,
                filePath,
                backupType,
                compression,
                connection.engine
            );
        }

        // Use native backup methods
        switch (connection.engine) {
            case 'postgres':
                return this.performPostgresBackup(connection, filePath, backupType, compression);
            case 'mysql':
            case 'mariadb':
                return this.performMySQLBackup(connection, filePath, backupType, compression);
            case 'sqlite':
                return this.performSQLiteBackup(
                    connection,
                    filePath,
                    backupType,
                    compression,
                    method
                );
            default:
                throw new Error(`Unsupported database engine: ${connection.engine}`);
        }
    }

    private async performPostgresBackup(
        connection: {
            host: string;
            port: number;
            database: string;
            username: string;
            password?: string;
        },
        filePath: string,
        backupType: BackupType,
        compression: boolean
    ): Promise<void> {
        const args = [
            '-h',
            connection.host,
            '-p',
            String(connection.port),
            '-U',
            connection.username,
            '-d',
            connection.database,
            '-F',
            'p', // Plain text format
            '-f',
            filePath,
        ];

        // Add backup type options
        if (backupType === 'schema') {
            args.push('--schema-only');
        } else if (backupType === 'data') {
            args.push('--data-only');
        }

        // Don't use pg_dump's built-in compression - we'll compress manually after

        // Set password via environment variable to avoid interactive prompt
        const env = {
            ...process.env,
            PGPASSWORD: connection.password || '',
        };

        return new Promise((resolve, reject) => {
            const proc = spawn('pg_dump', args, { env });

            let stderr = '';
            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', async (code) => {
                if (code === 0) {
                    // If compression is requested, compress the file manually
                    if (compression) {
                        try {
                            await this.compressFile(filePath);
                        } catch (error) {
                            reject(
                                new Error(
                                    `Backup created but compression failed: ${error instanceof Error ? error.message : String(error)}`
                                )
                            );
                            return;
                        }
                    }
                    resolve();
                } else {
                    reject(new Error(`pg_dump failed: ${stderr}`));
                }
            });

            proc.on('error', (error) => {
                reject(new Error(`Failed to spawn pg_dump: ${error.message}`));
            });
        });
    }

    private async performMySQLBackup(
        connection: {
            host: string;
            port: number;
            database: string;
            username: string;
            password?: string;
        },
        filePath: string,
        backupType: BackupType,
        compression: boolean
    ): Promise<void> {
        const args = [
            '-h',
            connection.host,
            '-P',
            String(connection.port),
            '-u',
            connection.username,
            '--protocol=TCP', // Force TCP/IP connection instead of socket
            connection.database,
        ];

        // Add backup type options
        if (backupType === 'schema') {
            args.push('--no-data');
        } else if (backupType === 'data') {
            args.push('--no-create-info');
        }

        args.push('--result-file', filePath);

        // Set password via environment variable to avoid interactive prompt
        const env = {
            ...process.env,
            MYSQL_PWD: connection.password || '',
        };

        return new Promise((resolve, reject) => {
            const proc = spawn('mysqldump', args, { env });

            let stderr = '';
            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    if (compression) {
                        // Compress the file
                        this.compressFile(filePath).then(resolve).catch(reject);
                    } else {
                        resolve();
                    }
                } else {
                    reject(new Error(`mysqldump failed: ${stderr}`));
                }
            });

            proc.on('error', (error) => {
                reject(new Error(`Failed to spawn mysqldump: ${error.message}`));
            });
        });
    }

    private async performSQLiteBackup(
        connection: { database: string },
        filePath: string,
        _backupType: BackupType = 'full',
        compression: boolean = false,
        _method: 'native' | 'sql' = 'native'
    ): Promise<void> {
        // SQLite backup: Copy the database file
        // No need for SQL method since SQLite doesn't require external CLI tools
        await fs.copyFile(connection.database, filePath);

        if (compression) {
            // Compress the file (will rename to .gz)
            await this.compressFile(filePath);
        }
    }

    private async performSQLBackup(
        connection: {
            engine: DatabaseEngine;
            host: string;
            port: number;
            database: string;
            username: string;
            password?: string;
        },
        filePath: string,
        backupType: BackupType,
        compression: boolean,
        engine: DatabaseEngine
    ): Promise<void> {
        this.logger.log(`Performing SQL-based backup for ${engine}`);

        // Get connector for the connection
        const connectionId = this.metadataService.connectionRepository
            .findAll()
            .find(
                (c) =>
                    c.host === connection.host &&
                    c.port === connection.port &&
                    c.database === connection.database
            )?.id;

        if (!connectionId) {
            throw new Error('Connection not found for SQL backup');
        }

        const connector = await this.connectionsService.getConnector(connectionId);

        // Generate SQL dump
        let sql = '';

        // Add header comments
        sql += `-- SQL Backup\n`;
        sql += `-- Database: ${connection.database}\n`;
        sql += `-- Engine: ${engine}\n`;
        sql += `-- Type: ${backupType}\n`;
        sql += `-- Date: ${new Date().toISOString()}\n\n`;

        if (backupType === 'full' || backupType === 'schema') {
            // Get schema SQL
            const tables = await connector.getTables();
            this.logger.log(`Found ${tables.length} tables to backup`);

            for (const table of tables) {
                try {
                    if (engine === 'postgres') {
                        // For PostgreSQL, use pg_dump-like output
                        const tableRef = `"${table.schema}"."${table.name}"`;
                        sql += `-- Table: ${tableRef}\n`;
                        sql += `DROP TABLE IF EXISTS ${tableRef} CASCADE;\n`;

                        // Get CREATE TABLE statement
                        const createResult = await connector.query(
                            `SELECT 
                                'CREATE TABLE ' || quote_ident(table_schema) || '.' || quote_ident(table_name) || ' (' ||
                                string_agg(
                                    quote_ident(column_name) || ' ' || 
                                    data_type || 
                                    CASE WHEN character_maximum_length IS NOT NULL 
                                        THEN '(' || character_maximum_length || ')' 
                                        ELSE '' 
                                    END ||
                                    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
                                    ', '
                                ) || ');' as create_sql
                            FROM information_schema.columns
                            WHERE table_schema = '${table.schema}' AND table_name = '${table.name}'
                            GROUP BY table_schema, table_name`
                        );
                        sql += createResult.rows[0]?.create_sql || '';
                        sql += '\n\n';
                    } else {
                        // For MySQL/MariaDB
                        const tableRef = `\`${table.name}\``;
                        sql += `-- Table: ${tableRef}\n`;
                        sql += `DROP TABLE IF EXISTS ${tableRef};\n`;

                        const createResult = await connector.query(`SHOW CREATE TABLE ${tableRef}`);
                        const createTableSql =
                            createResult.rows[0]?.['Create Table'] ||
                            createResult.rows[0]?.create_table;
                        sql += createTableSql + ';\n\n';
                    }
                } catch (error) {
                    this.logger.warn(`Failed to get schema for table ${table.name}: ${error}`);
                }
            }
        }

        if (backupType === 'full' || backupType === 'data') {
            // Get data SQL
            const tables = await connector.getTables();

            for (const table of tables) {
                try {
                    const tableRef =
                        engine === 'postgres'
                            ? `"${table.schema}"."${table.name}"`
                            : `\`${table.name}\``;
                    const data = await connector.query(`SELECT * FROM ${tableRef} LIMIT 10000`); // Limit for safety

                    if (data.rows.length > 0) {
                        sql += `-- Data for table: ${tableRef}\n`;

                        for (const row of data.rows) {
                            const columns = Object.keys(row);
                            const values = columns.map((col) => {
                                const val = row[col];
                                if (val === null) return 'NULL';
                                if (typeof val === 'string')
                                    return `'${val.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
                                if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                                if (val instanceof Date) return `'${val.toISOString()}'`;
                                return val;
                            });

                            const columnRefs = columns.map((c) =>
                                engine === 'postgres' ? `"${c}"` : `\`${c}\``
                            );
                            sql += `INSERT INTO ${tableRef} (${columnRefs.join(', ')}) VALUES (${values.join(', ')});\n`;
                        }
                        sql += '\n';
                    }
                } catch (error) {
                    this.logger.warn(`Failed to get data for table ${table.name}: ${error}`);
                }
            }
        }

        // Write SQL to file
        await fs.writeFile(filePath, sql, 'utf-8');

        if (compression) {
            await this.compressFile(filePath);
        }

        this.logger.log(`SQL-based backup completed: ${filePath}`);
    }

    private async compressFile(filePath: string): Promise<void> {
        const { createGzip } = await import('node:zlib');
        const { pipeline } = await import('node:stream/promises');

        const source = await fs.open(filePath, 'r');
        const destination = await fs.open(`${filePath}.gz`, 'w');
        const gzip = createGzip();

        try {
            await pipeline(source.createReadStream(), gzip, destination.createWriteStream());
            await fs.unlink(filePath); // Remove uncompressed file
            // Note: The compressed file is now at ${filePath}.gz
        } finally {
            await source.close();
            await destination.close();
        }
    }

    async getBackups(connectionId?: string) {
        if (connectionId) {
            return this.metadataService.backupRepository.getByConnectionId(connectionId);
        }
        return this.metadataService.backupRepository.getAll();
    }

    async getBackupById(id: string) {
        return this.metadataService.backupRepository.getById(id);
    }

    async deleteBackup(id: string) {
        const backup = this.metadataService.backupRepository.getById(id);
        if (!backup) {
            // Idempotent delete - if already deleted, return success
            return { success: true, message: 'Backup already deleted or does not exist' };
        }

        // Check if file exists before attempting to delete
        let fileExists = false;
        try {
            await fs.access(backup.filePath);
            fileExists = true;
        } catch {
            this.logger.warn(
                `Backup file does not exist on disk: ${backup.filePath}. Will remove database record only.`
            );
        }

        // Delete the file if it exists
        if (fileExists) {
            try {
                this.logger.log(`Deleting backup file: ${backup.filePath}`);
                await fs.unlink(backup.filePath);
                this.logger.log(`Successfully deleted backup file: ${backup.filePath}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(
                    `Failed to delete backup file ${backup.filePath}: ${errorMessage}`
                );

                // Log failed deletion
                this.metadataService.backupLogsRepository.create({
                    operation: 'backup_deleted',
                    backupId: id,
                    connectionId: backup.connectionId,
                    databaseName: backup.databaseName,
                    databaseEngine: backup.databaseEngine,
                    status: 'failed',
                    error: errorMessage,
                });

                // File exists but couldn't be deleted - this is a real error
                throw new Error(
                    `Failed to delete backup file: ${errorMessage}. The database record will not be removed.`
                );
            }
        }

        // Log successful deletion BEFORE deleting the record (to satisfy FK constraint)
        this.metadataService.backupLogsRepository.create({
            operation: 'backup_deleted',
            backupId: id,
            connectionId: backup.connectionId,
            databaseName: backup.databaseName,
            databaseEngine: backup.databaseEngine,
            fileSize: backup.fileSize,
            status: 'success',
        });

        // Delete the database record
        this.metadataService.backupRepository.delete(id);

        const message = fileExists
            ? 'Backup deleted successfully'
            : 'Backup record deleted (file was already removed from disk)';

        return { success: true, message };
    }

    async getBackupFilePath(id: string): Promise<string> {
        const backup = this.metadataService.backupRepository.getById(id);
        if (!backup) {
            throw new Error('Backup not found');
        }

        // Verify file exists
        try {
            await fs.access(backup.filePath);
        } catch {
            throw new Error('Backup file not found');
        }

        return backup.filePath;
    }

    async uploadBackup(connectionId: string, filename: string, fileBuffer: Buffer) {
        // Get connection details
        const connection = this.connectionsService.findById(connectionId);
        if (!connection) {
            throw new Error('Connection not found');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const newFilename = `${connection.name}_uploaded_${timestamp}_${sanitizedFilename}`;
        const filePath = path.join(this.backupsDir, newFilename);

        try {
            // Write file
            await fs.writeFile(filePath, fileBuffer);

            // Create backup record
            const backupId = randomUUID();
            const backup = this.metadataService.backupRepository.create({
                id: backupId,
                connectionId,
                filename: newFilename,
                filePath,
                fileSize: fileBuffer.length,
                databaseName: connection.database,
                databaseEngine: connection.engine,
                backupType: 'full',
                method: 'native', // Uploaded files are assumed to be native format
                compression: filename.endsWith('.gz') ? 'gzip' : 'none',
                status: 'completed',
            });

            // Log successful upload
            this.metadataService.backupLogsRepository.create({
                operation: 'backup_uploaded',
                backupId,
                connectionId,
                databaseName: connection.database,
                databaseEngine: connection.engine,
                backupType: 'full',
                method: 'native',
                fileSize: fileBuffer.length,
                status: 'success',
            });

            return backup;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Log failed upload
            this.metadataService.backupLogsRepository.create({
                operation: 'backup_uploaded',
                connectionId,
                databaseName: connection.database,
                databaseEngine: connection.engine,
                status: 'failed',
                error: errorMessage,
            });

            throw error;
        }
    }
}
