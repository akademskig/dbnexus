/**
 * Repository for sync run history operations
 */

import type { MetadataDatabase } from '../database.js';

export type SyncRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface SyncRun {
    id: string;
    syncConfigId: string;
    startedAt: Date;
    completedAt?: Date;
    status: SyncRunStatus;
    inserts: number;
    updates: number;
    deletes: number;
    errors: string[];
    // Joined fields
    syncConfigName?: string;
    sourceConnectionName?: string;
    targetConnectionName?: string;
}

interface SyncRunRow {
    id: string;
    sync_config_id: string;
    started_at: string;
    completed_at: string | null;
    status: string;
    inserts: number;
    updates: number;
    deletes: number;
    errors_json: string | null;
    sync_config_name?: string;
    source_connection_name?: string;
    target_connection_name?: string;
}

export interface SyncRunCreateInput {
    syncConfigId: string;
}

export interface SyncRunUpdateInput {
    status?: SyncRunStatus;
    inserts?: number;
    updates?: number;
    deletes?: number;
    errors?: string[];
}

export class SyncRunRepository {
    constructor(private readonly db: MetadataDatabase) { }

    /**
     * Create a new sync run (starts in 'running' status)
     */
    create(input: SyncRunCreateInput): SyncRun {
        const id = crypto.randomUUID();

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO sync_runs (id, sync_config_id, status)
            VALUES (?, ?, 'running')
        `
            )
            .run(id, input.syncConfigId);

        return this.findById(id)!;
    }

    /**
     * Start a sync run without a config (for ad-hoc syncs)
     * Creates a temporary config-less run
     */
    createAdHoc(details: {
        sourceConnectionId: string;
        targetConnectionId: string;
        sourceTable: string;
        targetTable: string;
        schema: string;
    }): SyncRun {
        const id = crypto.randomUUID();

        // For ad-hoc syncs, we store details in errors_json temporarily
        const detailsJson = JSON.stringify(details);

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO sync_runs (id, sync_config_id, status, errors_json)
            VALUES (?, '', 'running', ?)
        `
            )
            .run(id, detailsJson);

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
                sc.name as sync_config_name,
                src.name as source_connection_name,
                tgt.name as target_connection_name
            FROM sync_runs sr
            LEFT JOIN sync_configs sc ON sr.sync_config_id = sc.id
            LEFT JOIN connections src ON sc.source_connection_id = src.id
            LEFT JOIN connections tgt ON sc.target_connection_id = tgt.id
            WHERE sr.id = ?
        `
            )
            .get(id) as SyncRunRow | undefined;

        return row ? this.rowToRun(row) : null;
    }

    /**
     * Find sync runs by config ID
     */
    findByConfigId(syncConfigId: string, limit?: number): SyncRun[] {
        let query = `
            SELECT 
                sr.*,
                sc.name as sync_config_name,
                src.name as source_connection_name,
                tgt.name as target_connection_name
            FROM sync_runs sr
            LEFT JOIN sync_configs sc ON sr.sync_config_id = sc.id
            LEFT JOIN connections src ON sc.source_connection_id = src.id
            LEFT JOIN connections tgt ON sc.target_connection_id = tgt.id
            WHERE sr.sync_config_id = ?
            ORDER BY sr.started_at DESC
        `;

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const rows = this.db.getDb().prepare(query).all(syncConfigId) as SyncRunRow[];
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
                sc.name as sync_config_name,
                src.name as source_connection_name,
                tgt.name as target_connection_name
            FROM sync_runs sr
            LEFT JOIN sync_configs sc ON sr.sync_config_id = sc.id
            LEFT JOIN connections src ON sc.source_connection_id = src.id
            LEFT JOIN connections tgt ON sc.target_connection_id = tgt.id
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
                sc.name as sync_config_name,
                src.name as source_connection_name,
                tgt.name as target_connection_name
            FROM sync_runs sr
            LEFT JOIN sync_configs sc ON sr.sync_config_id = sc.id
            LEFT JOIN connections src ON sc.source_connection_id = src.id
            LEFT JOIN connections tgt ON sc.target_connection_id = tgt.id
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

        if (updates.length === 0) {
            return this.findById(id);
        }

        params.push(id);

        this.db
            .getDb()
            .prepare(`UPDATE sync_runs SET ${updates.join(', ')} WHERE id = ?`)
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
        const result = this.db
            .getDb()
            .prepare('DELETE FROM sync_runs WHERE id = ?')
            .run(id);

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
            DELETE FROM sync_runs 
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
            syncConfigId: row.sync_config_id,
            startedAt: new Date(row.started_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            status: row.status as SyncRunStatus,
            inserts: row.inserts,
            updates: row.updates,
            deletes: row.deletes,
            errors: row.errors_json ? (JSON.parse(row.errors_json) as string[]) : [],
            syncConfigName: row.sync_config_name,
            sourceConnectionName: row.source_connection_name,
            targetConnectionName: row.target_connection_name,
        };
    }
}
