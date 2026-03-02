import type { Database } from 'better-sqlite3';

export type BackupMethod = 'native' | 'sql';
export type BackupStatus = 'in_progress' | 'completed' | 'failed';
export type BackupCompression = 'none' | 'gzip';
export type BackupBackupType = 'full' | 'schema' | 'data';

export interface UserContext {
    userId: string | null;
    isAdmin: boolean;
}

export interface Backup {
    id: string;
    connectionId: string;
    filename: string;
    filePath: string;
    fileSize: number;
    databaseName: string;
    databaseEngine: string;
    backupType: BackupBackupType;
    method: BackupMethod;
    compression: BackupCompression;
    status: BackupStatus;
    error?: string;
    createdBy?: string;
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
    backupType: BackupBackupType;
    method: BackupMethod;
    compression: BackupCompression;
    status?: BackupStatus;
    error?: string;
}

export class BackupRepository {
    constructor(private db: Database) {}

    create(input: CreateBackupInput, userId?: string): Backup {
        const stmt = this.db.prepare(`
      INSERT INTO backups (
        id, connection_id, filename, file_path, file_size,
        database_name, database_engine, backup_type, method, compression, status, error, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            input.method,
            input.compression,
            input.status || 'completed',
            input.error || null,
            userId || null
        );

        return this.getById(input.id)!;
    }

    getById(id: string): Backup | null {
        const stmt = this.db.prepare(`
      SELECT 
        id, connection_id as connectionId, filename, file_path as filePath,
        file_size as fileSize, database_name as databaseName,
        database_engine as databaseEngine, backup_type as backupType,
        method, compression, status, error, created_by as createdBy, created_at as createdAt
      FROM backups
      WHERE id = ?
    `);

        return stmt.get(id) as Backup | null;
    }

    getByConnectionId(connectionId: string, userContext?: UserContext): Backup[] {
        let query = `
      SELECT 
        id, connection_id as connectionId, filename, file_path as filePath,
        file_size as fileSize, database_name as databaseName,
        database_engine as databaseEngine, backup_type as backupType,
        method, compression, status, error, created_by as createdBy, created_at as createdAt
      FROM backups
      WHERE connection_id = ?
    `;

        const params: unknown[] = [connectionId];

        if (userContext && !userContext.isAdmin && userContext.userId) {
            query += ` AND (created_by = ? OR created_by IS NULL)`;
            params.push(userContext.userId);
        }

        query += ` ORDER BY created_at DESC`;

        return this.db.prepare(query).all(...params) as Backup[];
    }

    getAll(userContext?: UserContext): Backup[] {
        let query = `
      SELECT 
        id, connection_id as connectionId, filename, file_path as filePath,
        file_size as fileSize, database_name as databaseName,
        database_engine as databaseEngine, backup_type as backupType,
        method, compression, status, error, created_by as createdBy, created_at as createdAt
      FROM backups
    `;

        const params: unknown[] = [];

        if (userContext && !userContext.isAdmin && userContext.userId) {
            query += ` WHERE created_by = ? OR created_by IS NULL`;
            params.push(userContext.userId);
        }

        query += ` ORDER BY created_at DESC`;

        return this.db.prepare(query).all(...params) as Backup[];
    }

    /**
     * Check if user can access a backup
     */
    canAccess(backupId: string, userContext: UserContext): boolean {
        if (userContext.isAdmin) return true;

        const row = this.db.prepare('SELECT created_by FROM backups WHERE id = ?').get(backupId) as
            | { created_by: string | null }
            | undefined;

        if (!row) return false;
        return row.created_by === null || row.created_by === userContext.userId;
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
