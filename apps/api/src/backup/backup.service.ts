import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MetadataService } from '../metadata/metadata.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import type { DatabaseEngine } from '@dbnexus/shared';

export interface CreateBackupOptions {
    connectionId: string;
    backupType?: 'full' | 'schema' | 'data';
    compression?: boolean;
}

export interface RestoreBackupOptions {
    connectionId: string;
    backupId: string;
}

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);
    private readonly backupsDir: string;

    constructor(
        private metadataService: MetadataService,
        private connectionsService: ConnectionsService
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
        const { connectionId, backupType = 'full', compression = false } = options;

        // Get connection details
        const connection = this.connectionsService.findById(connectionId);
        if (!connection) {
            throw new Error('Connection not found');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = compression ? '.sql.gz' : '.sql';
        const filename = `${connection.name}_${timestamp}${ext}`;
        const filePath = path.join(this.backupsDir, filename);

        // Create backup record
        const backupId = randomUUID();
        this.metadataService.backupRepository.create({
            id: backupId,
            connectionId,
            filename,
            filePath,
            fileSize: 0, // Will update after backup completes
            databaseName: connection.database,
            databaseEngine: connection.engine,
            backupType,
            compression: compression ? 'gzip' : 'none',
            status: 'in_progress',
        });

        try {
            // Perform backup based on engine
            await this.performBackup(connection, filePath, backupType, compression);

            // Get file size
            const stats = await fs.stat(filePath);

            // Update backup record with file size and status
            this.metadataService.backupRepository.updateStatus(backupId, 'completed');
            // Update file size directly
            const updateSizeStmt = this.metadataService.database.db.prepare(
                'UPDATE backups SET file_size = ? WHERE id = ?'
            );
            updateSizeStmt.run(stats.size, backupId);

            return this.metadataService.backupRepository.getById(backupId);
        } catch (error) {
            this.logger.error(`Backup failed: ${error}`);
            this.metadataService.backupRepository.updateStatus(
                backupId,
                'failed',
                error instanceof Error ? error.message : String(error)
            );
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
        backupType: 'full' | 'schema' | 'data',
        compression: boolean
    ): Promise<void> {
        switch (connection.engine) {
            case 'postgres':
                return this.performPostgresBackup(connection, filePath, backupType, compression);
            case 'mysql':
            case 'mariadb':
                return this.performMySQLBackup(connection, filePath, backupType, compression);
            case 'sqlite':
                return this.performSQLiteBackup(connection, filePath);
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
        backupType: 'full' | 'schema' | 'data',
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

        if (compression) {
            args.push('-Z', '6'); // Compression level 6
        }

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

            proc.on('close', (code) => {
                if (code === 0) {
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
        backupType: 'full' | 'schema' | 'data',
        compression: boolean
    ): Promise<void> {
        const args = [
            '-h',
            connection.host,
            '-P',
            String(connection.port),
            '-u',
            connection.username,
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
        filePath: string
    ): Promise<void> {
        // For SQLite, just copy the database file
        await fs.copyFile(connection.database, filePath);
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
            await fs.rename(`${filePath}.gz`, filePath); // Rename to original name
        } finally {
            await source.close();
            await destination.close();
        }
    }

    async restoreBackup(options: RestoreBackupOptions) {
        const { connectionId, backupId } = options;

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

        // Verify file exists
        try {
            await fs.access(backup.filePath);
        } catch {
            throw new Error('Backup file not found');
        }

        // Perform restore based on engine
        await this.performRestore(connection, backup.filePath);

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
        },
        filePath: string
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
            '-f',
            filePath,
        ];

        // Set password via environment variable to avoid interactive prompt
        const env = {
            ...process.env,
            PGPASSWORD: connection.password || '',
        };

        return new Promise((resolve, reject) => {
            const proc = spawn('psql', args, { env });

            let stderr = '';
            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`psql restore failed: ${stderr}`));
                }
            });

            proc.on('error', (error) => {
                reject(new Error(`Failed to spawn psql: ${error.message}`));
            });
        });
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
        const args = [
            '-h',
            connection.host,
            '-P',
            String(connection.port),
            '-u',
            connection.username,
            connection.database,
        ];

        // Set password via environment variable to avoid interactive prompt
        const env = {
            ...process.env,
            MYSQL_PWD: connection.password || '',
        };

        return new Promise((resolve, reject) => {
            const proc = spawn('mysql', args, { env });

            // Pipe the backup file to mysql
            fs.readFile(filePath).then((data) => {
                proc.stdin?.write(data);
                proc.stdin?.end();
            });

            let stderr = '';
            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`mysql restore failed: ${stderr}`));
                }
            });

            proc.on('error', (error) => {
                reject(new Error(`Failed to spawn mysql: ${error.message}`));
            });
        });
    }

    private async performSQLiteRestore(
        connection: { database: string },
        filePath: string
    ): Promise<void> {
        // For SQLite, just copy the backup file over the database file
        await fs.copyFile(filePath, connection.database);
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
            throw new Error('Backup not found');
        }

        // Delete the file
        try {
            await fs.unlink(backup.filePath);
        } catch (error) {
            this.logger.warn(`Failed to delete backup file: ${error}`);
        }

        // Delete the record
        this.metadataService.backupRepository.delete(id);

        return { success: true, message: 'Backup deleted successfully' };
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
            compression: filename.endsWith('.gz') ? 'gzip' : 'none',
            status: 'completed',
        });

        return backup;
    }
}
