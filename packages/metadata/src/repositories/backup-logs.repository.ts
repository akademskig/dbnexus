import type { Database } from 'better-sqlite3';

export type BackupLogOperation =
    | 'backup_created'
    | 'backup_restored'
    | 'backup_deleted'
    | 'backup_uploaded';
export type BackupLogStatus = 'success' | 'failed';

export interface BackupLog {
    id: string;
    operation: BackupLogOperation;
    backupId?: string;
    connectionId: string;
    databaseName: string;
    databaseEngine: string;
    backupType?: string;
    method?: string;
    fileSize?: number;
    duration?: number;
    status: BackupLogStatus;
    error?: string;
    createdAt: string;
    // Joined fields
    connectionName?: string;
    backupFilename?: string;
}

interface BackupLogRow {
    id: string;
    operation: string;
    backup_id: string | null;
    connection_id: string;
    database_name: string;
    database_engine: string;
    backup_type: string | null;
    method: string | null;
    file_size: number | null;
    duration: number | null;
    status: string;
    error: string | null;
    created_at: string;
    connection_name?: string;
    backup_filename?: string;
}

export interface CreateBackupLogInput {
    operation: BackupLogOperation;
    backupId?: string;
    connectionId: string;
    databaseName: string;
    databaseEngine: string;
    backupType?: string;
    method?: string;
    fileSize?: number;
    duration?: number;
    status: BackupLogStatus;
    error?: string;
}

export class BackupLogsRepository {
    constructor(private readonly db: Database) {}

    /**
     * Create a new backup log entry
     */
    create(input: CreateBackupLogInput): BackupLog {
        const id = crypto.randomUUID();

        this.db
            .prepare(
                `
            INSERT INTO backup_logs (
                id, operation, backup_id, connection_id, database_name, 
                database_engine, backup_type, method, file_size, duration, status, error
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
            )
            .run(
                id,
                input.operation,
                input.backupId || null,
                input.connectionId,
                input.databaseName,
                input.databaseEngine,
                input.backupType || null,
                input.method || null,
                input.fileSize || null,
                input.duration || null,
                input.status,
                input.error || null
            );

        return this.findById(id)!;
    }

    /**
     * Find a log entry by ID
     */
    findById(id: string): BackupLog | null {
        const row = this.db
            .prepare(
                `
            SELECT 
                bl.*,
                c.name as connection_name,
                b.filename as backup_filename
            FROM backup_logs bl
            LEFT JOIN connections c ON bl.connection_id = c.id
            LEFT JOIN backups b ON bl.backup_id = b.id
            WHERE bl.id = ?
        `
            )
            .get(id) as BackupLogRow | undefined;

        return row ? this.rowToLog(row) : null;
    }

    /**
     * Find logs by connection ID
     */
    findByConnectionId(connectionId: string, limit?: number): BackupLog[] {
        let query = `
            SELECT 
                bl.*,
                c.name as connection_name,
                b.filename as backup_filename
            FROM backup_logs bl
            LEFT JOIN connections c ON bl.connection_id = c.id
            LEFT JOIN backups b ON bl.backup_id = b.id
            WHERE bl.connection_id = ?
            ORDER BY bl.created_at DESC
        `;

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const rows = this.db.prepare(query).all(connectionId) as BackupLogRow[];
        return rows.map((row) => this.rowToLog(row));
    }

    /**
     * Find logs by backup ID
     */
    findByBackupId(backupId: string): BackupLog[] {
        const rows = this.db
            .prepare(
                `
            SELECT 
                bl.*,
                c.name as connection_name,
                b.filename as backup_filename
            FROM backup_logs bl
            LEFT JOIN connections c ON bl.connection_id = c.id
            LEFT JOIN backups b ON bl.backup_id = b.id
            WHERE bl.backup_id = ?
            ORDER BY bl.created_at DESC
        `
            )
            .all(backupId) as BackupLogRow[];
        return rows.map((row) => this.rowToLog(row));
    }

    /**
     * Find logs by operation type
     */
    findByOperation(operation: BackupLogOperation, limit?: number): BackupLog[] {
        let query = `
            SELECT 
                bl.*,
                c.name as connection_name,
                b.filename as backup_filename
            FROM backup_logs bl
            LEFT JOIN connections c ON bl.connection_id = c.id
            LEFT JOIN backups b ON bl.backup_id = b.id
            WHERE bl.operation = ?
            ORDER BY bl.created_at DESC
        `;

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const rows = this.db.prepare(query).all(operation) as BackupLogRow[];
        return rows.map((row) => this.rowToLog(row));
    }

    /**
     * Find all logs with optional filters
     */
    findAll(params?: {
        connectionId?: string;
        operation?: string;
        status?: string;
        limit?: number;
    }): BackupLog[] {
        const conditions: string[] = [];
        const values: unknown[] = [];

        if (params?.connectionId) {
            conditions.push('bl.connection_id = ?');
            values.push(params.connectionId);
        }

        if (params?.operation) {
            conditions.push('bl.operation = ?');
            values.push(params.operation);
        }

        if (params?.status) {
            conditions.push('bl.status = ?');
            values.push(params.status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = params?.limit || 500;

        const query = `
            SELECT 
                bl.*,
                c.name as connection_name,
                b.filename as backup_filename
            FROM backup_logs bl
            LEFT JOIN connections c ON bl.connection_id = c.id
            LEFT JOIN backups b ON bl.backup_id = b.id
            ${whereClause}
            ORDER BY bl.created_at DESC
            LIMIT ?
        `;

        values.push(limit);
        try {
            const rows = this.db.prepare(query).all(...values) as BackupLogRow[];
            return rows.map((row) => this.rowToLog(row));
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    /**
     * Find recent logs
     */
    findRecent(limit: number = 100): BackupLog[] {
        const rows = this.db
            .prepare(
                `
            SELECT 
                bl.*,
                c.name as connection_name,
                b.filename as backup_filename
            FROM backup_logs bl
            LEFT JOIN connections c ON bl.connection_id = c.id
            LEFT JOIN backups b ON bl.backup_id = b.id
            ORDER BY bl.created_at DESC
            LIMIT ?
        `
            )
            .all(limit) as BackupLogRow[];
        return rows.map((row) => this.rowToLog(row));
    }

    /**
     * Delete logs older than N days
     */
    deleteOlderThan(days: number): number {
        const result = this.db
            .prepare(
                `
            DELETE FROM backup_logs 
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `
            )
            .run(days);

        return result.changes;
    }

    /**
     * Convert database row to BackupLog
     */
    private rowToLog(row: BackupLogRow): BackupLog {
        return {
            id: row.id,
            operation: row.operation as BackupLogOperation,
            backupId: row.backup_id || undefined,
            connectionId: row.connection_id,
            databaseName: row.database_name,
            databaseEngine: row.database_engine,
            backupType: row.backup_type || undefined,
            method: row.method || undefined,
            fileSize: row.file_size || undefined,
            duration: row.duration || undefined,
            status: row.status as BackupLogStatus,
            error: row.error || undefined,
            createdAt: row.created_at,
            connectionName: row.connection_name,
            backupFilename: row.backup_filename,
        };
    }
}
