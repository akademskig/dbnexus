/**
 * Repository for sync run history operations
 */

import type { MetadataDatabase } from '../database.js';

export type SyncRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface SyncRun {
    id: string;
    sourceConnectionId?: string;
    targetConnectionId?: string;
    schemaName?: string;
    tableName?: string;
    groupId?: string;
    startedAt: Date;
    completedAt?: Date;
    status: SyncRunStatus;
    inserts: number;
    updates: number;
    deletes: number;
    errors: string[];
    sqlStatements: string[];
    // Joined fields
    sourceConnectionName?: string;
    targetConnectionName?: string;
    groupName?: string;
}

interface SyncRunRow {
    id: string;
    source_connection_id: string | null;
    target_connection_id: string | null;
    schema_name: string | null;
    table_name: string | null;
    group_id: string | null;
    started_at: string;
    completed_at: string | null;
    status: string;
    inserts: number;
    updates: number;
    deletes: number;
    errors_json: string | null;
    sql_statements: string | null;
    source_connection_name?: string;
    target_connection_name?: string;
    group_name?: string;
}

export interface SyncRunCreateInput {
    sourceConnectionId: string;
    targetConnectionId: string;
    schemaName?: string;
    tableName?: string;
    groupId?: string;
}

export interface SyncRunUpdateInput {
    status?: SyncRunStatus;
    inserts?: number;
    updates?: number;
    deletes?: number;
    errors?: string[];
    sqlStatements?: string[];
}

export class SyncRunLogsRepository {
    constructor(private readonly db: MetadataDatabase) {}

    /**
     * Create a new sync run (starts in 'running' status)
     */
    create(input: SyncRunCreateInput): SyncRun {
        const id = crypto.randomUUID();

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO sync_run_logs (id, source_connection_id, target_connection_id, schema_name, table_name, group_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'running')
        `
            )
            .run(
                id,
                input.sourceConnectionId,
                input.targetConnectionId,
                input.schemaName || null,
                input.tableName || null,
                input.groupId || null
            );

        return this.findById(id)!;
    }

    /**
     * Find a sync run by ID
     */
    findById(id: string): SyncRun | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                sr.*,
                src.name as source_connection_name,
                tgt.name as target_connection_name,
                dg.name as group_name
            FROM sync_run_logs sr
            LEFT JOIN connections src ON sr.source_connection_id = src.id
            LEFT JOIN connections tgt ON sr.target_connection_id = tgt.id
            LEFT JOIN database_groups dg ON sr.group_id = dg.id
            WHERE sr.id = ?
        `
            )
            .get(id) as SyncRunRow | undefined;

        return row ? this.rowToRun(row) : null;
    }

    /**
     * Find sync runs by group ID
     */
    findByGroupId(groupId: string, limit?: number): SyncRun[] {
        let query = `
            SELECT 
                sr.*,
                src.name as source_connection_name,
                tgt.name as target_connection_name,
                dg.name as group_name
            FROM sync_run_logs sr
            LEFT JOIN connections src ON sr.source_connection_id = src.id
            LEFT JOIN connections tgt ON sr.target_connection_id = tgt.id
            LEFT JOIN database_groups dg ON sr.group_id = dg.id
            WHERE sr.group_id = ?
            ORDER BY sr.started_at DESC
        `;

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const rows = this.db.getDb().prepare(query).all(groupId) as SyncRunRow[];
        return rows.map((row) => this.rowToRun(row));
    }

    /**
     * Find sync runs by connection ID (either source or target)
     */
    findByConnectionId(connectionId: string, limit?: number): SyncRun[] {
        let query = `
            SELECT 
                sr.*,
                src.name as source_connection_name,
                tgt.name as target_connection_name,
                dg.name as group_name
            FROM sync_run_logs sr
            LEFT JOIN connections src ON sr.source_connection_id = src.id
            LEFT JOIN connections tgt ON sr.target_connection_id = tgt.id
            LEFT JOIN database_groups dg ON sr.group_id = dg.id
            WHERE sr.source_connection_id = ? OR sr.target_connection_id = ?
            ORDER BY sr.started_at DESC
        `;

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const rows = this.db.getDb().prepare(query).all(connectionId, connectionId) as SyncRunRow[];
        return rows.map((row) => this.rowToRun(row));
    }

    /**
     * Find recent sync runs
     */
    findRecent(limit: number = 50): SyncRun[] {
        const rows = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                sr.*,
                src.name as source_connection_name,
                tgt.name as target_connection_name,
                dg.name as group_name
            FROM sync_run_logs sr
            LEFT JOIN connections src ON sr.source_connection_id = src.id
            LEFT JOIN connections tgt ON sr.target_connection_id = tgt.id
            LEFT JOIN database_groups dg ON sr.group_id = dg.id
            ORDER BY sr.started_at DESC
            LIMIT ?
        `
            )
            .all(limit) as SyncRunRow[];
        return rows.map((row) => this.rowToRun(row));
    }

    /**
     * Find running sync runs
     */
    findRunning(): SyncRun[] {
        const rows = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                sr.*,
                src.name as source_connection_name,
                tgt.name as target_connection_name,
                dg.name as group_name
            FROM sync_run_logs sr
            LEFT JOIN connections src ON sr.source_connection_id = src.id
            LEFT JOIN connections tgt ON sr.target_connection_id = tgt.id
            LEFT JOIN database_groups dg ON sr.group_id = dg.id
            WHERE sr.status = 'running'
            ORDER BY sr.started_at DESC
        `
            )
            .all() as SyncRunRow[];
        return rows.map((row) => this.rowToRun(row));
    }

    /**
     * Update a sync run
     */
    update(id: string, input: SyncRunUpdateInput): SyncRun | null {
        const updates: string[] = [];
        const params: unknown[] = [];

        if (input.status !== undefined) {
            updates.push('status = ?');
            params.push(input.status);

            // Set completed_at when status changes to completed/failed/cancelled
            if (['completed', 'failed', 'cancelled'].includes(input.status)) {
                updates.push("completed_at = datetime('now')");
            }
        }
        if (input.inserts !== undefined) {
            updates.push('inserts = ?');
            params.push(input.inserts);
        }
        if (input.updates !== undefined) {
            updates.push('updates = ?');
            params.push(input.updates);
        }
        if (input.deletes !== undefined) {
            updates.push('deletes = ?');
            params.push(input.deletes);
        }
        if (input.errors !== undefined) {
            updates.push('errors_json = ?');
            params.push(JSON.stringify(input.errors));
        }
        if (input.sqlStatements !== undefined) {
            updates.push('sql_statements = ?');
            params.push(JSON.stringify(input.sqlStatements));
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        params.push(id);

        this.db
            .getDb()
            .prepare(`UPDATE sync_run_logs SET ${updates.join(', ')} WHERE id = ?`)
            .run(...params);

        return this.findById(id);
    }

    /**
     * Complete a sync run with results
     */
    complete(
        id: string,
        results: { inserts: number; updates: number; deletes: number; errors: string[] }
    ): SyncRun | null {
        return this.update(id, {
            status: results.errors.length > 0 ? 'failed' : 'completed',
            inserts: results.inserts,
            updates: results.updates,
            deletes: results.deletes,
            errors: results.errors,
        });
    }

    /**
     * Delete a sync run
     */
    delete(id: string): boolean {
        const result = this.db.getDb().prepare('DELETE FROM sync_run_logs WHERE id = ?').run(id);

        return result.changes > 0;
    }

    /**
     * Delete old sync runs (cleanup)
     */
    deleteOlderThan(days: number): number {
        const result = this.db
            .getDb()
            .prepare(
                `
            DELETE FROM sync_run_logs 
            WHERE started_at < datetime('now', '-' || ? || ' days')
        `
            )
            .run(days);

        return result.changes;
    }

    /**
     * Convert database row to SyncRun
     */
    private rowToRun(row: SyncRunRow): SyncRun {
        return {
            id: row.id,
            sourceConnectionId: row.source_connection_id || undefined,
            targetConnectionId: row.target_connection_id || undefined,
            schemaName: row.schema_name || undefined,
            tableName: row.table_name || undefined,
            groupId: row.group_id || undefined,
            startedAt: new Date(row.started_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            status: row.status as SyncRunStatus,
            inserts: row.inserts,
            updates: row.updates,
            deletes: row.deletes,
            errors: row.errors_json ? (JSON.parse(row.errors_json) as string[]) : [],
            sqlStatements: row.sql_statements ? (JSON.parse(row.sql_statements) as string[]) : [],
            sourceConnectionName: row.source_connection_name,
            targetConnectionName: row.target_connection_name,
            groupName: row.group_name,
        };
    }
}
