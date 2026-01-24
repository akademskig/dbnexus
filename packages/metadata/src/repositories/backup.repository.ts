import type { Database } from 'better-sqlite3';

export interface Backup {
    id: string;
    connectionId: string;
    filename: string;
    filePath: string;
    fileSize: number;
    databaseName: string;
    databaseEngine: string;
    backupType: 'full' | 'schema' | 'data';
    compression: 'none' | 'gzip';
    status: 'in_progress' | 'completed' | 'failed';
    error?: string;
    createdAt: string;
}

export interface CreateBackupInput {
    id: string;
    connectionId: string;
    filename: string;
    filePath: string;
    fileSize: number;
    databaseName: string;
    databaseEngine: string;
    backupType: 'full' | 'schema' | 'data';
    compression: 'none' | 'gzip';
    status?: 'in_progress' | 'completed' | 'failed';
    error?: string;
}

export class BackupRepository {
    constructor(private db: Database) {}

    create(input: CreateBackupInput): Backup {
        const stmt = this.db.prepare(`
      INSERT INTO backups (
        id, connection_id, filename, file_path, file_size,
        database_name, database_engine, backup_type, compression, status, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            input.id,
            input.connectionId,
            input.filename,
            input.filePath,
            input.fileSize,
            input.databaseName,
            input.databaseEngine,
            input.backupType,
            input.compression,
            input.status || 'completed',
            input.error || null
        );

        return this.getById(input.id)!;
    }

    getById(id: string): Backup | null {
        const stmt = this.db.prepare(`
      SELECT 
        id, connection_id as connectionId, filename, file_path as filePath,
        file_size as fileSize, database_name as databaseName,
        database_engine as databaseEngine, backup_type as backupType,
        compression, status, error, created_at as createdAt
      FROM backups
      WHERE id = ?
    `);

        return stmt.get(id) as Backup | null;
    }

    getByConnectionId(connectionId: string): Backup[] {
        const stmt = this.db.prepare(`
      SELECT 
        id, connection_id as connectionId, filename, file_path as filePath,
        file_size as fileSize, database_name as databaseName,
        database_engine as databaseEngine, backup_type as backupType,
        compression, status, error, created_at as createdAt
      FROM backups
      WHERE connection_id = ?
      ORDER BY created_at DESC
    `);

        return stmt.all(connectionId) as Backup[];
    }

    getAll(): Backup[] {
        const stmt = this.db.prepare(`
      SELECT 
        id, connection_id as connectionId, filename, file_path as filePath,
        file_size as fileSize, database_name as databaseName,
        database_engine as databaseEngine, backup_type as backupType,
        compression, status, error, created_at as createdAt
      FROM backups
      ORDER BY created_at DESC
    `);

        return stmt.all() as Backup[];
    }

    updateStatus(id: string, status: 'in_progress' | 'completed' | 'failed', error?: string): void {
        const stmt = this.db.prepare(`
      UPDATE backups
      SET status = ?, error = ?
      WHERE id = ?
    `);

        stmt.run(status, error || null, id);
    }

    delete(id: string): void {
        const stmt = this.db.prepare('DELETE FROM backups WHERE id = ?');
        stmt.run(id);
    }

    deleteByConnectionId(connectionId: string): void {
        const stmt = this.db.prepare('DELETE FROM backups WHERE connection_id = ?');
        stmt.run(connectionId);
    }
}
