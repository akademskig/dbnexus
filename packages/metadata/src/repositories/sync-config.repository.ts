/**
 * Repository for sync configuration operations
 */

import type { MetadataDatabase } from '../database.js';
import type { DataSyncConfig, ConflictStrategy } from '@dbnexus/shared';

interface SyncConfigRow {
    id: string;
    name: string;
    source_connection_id: string;
    target_connection_id: string;
    source_table: string;
    target_table: string;
    primary_key_columns: string;
    conflict_strategy: string;
    timestamp_column: string | null;
    batch_size: number;
    created_at: string;
    updated_at: string;
    source_connection_name?: string;
    target_connection_name?: string;
}

export interface SyncConfigCreateInput {
    name: string;
    sourceConnectionId: string;
    targetConnectionId: string;
    sourceTable: string;
    targetTable: string;
    primaryKeyColumns: string[];
    conflictStrategy?: ConflictStrategy;
    timestampColumn?: string;
    batchSize?: number;
}

export interface SyncConfigUpdateInput {
    name?: string;
    primaryKeyColumns?: string[];
    conflictStrategy?: ConflictStrategy;
    timestampColumn?: string;
    batchSize?: number;
}

export class SyncConfigRepository {
    constructor(private readonly db: MetadataDatabase) { }

    /**
     * Create a new sync configuration
     */
    create(input: SyncConfigCreateInput): DataSyncConfig {
        const id = crypto.randomUUID();
        const pkColumnsJson = JSON.stringify(input.primaryKeyColumns);

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO sync_configs (
                id, name, source_connection_id, target_connection_id,
                source_table, target_table, primary_key_columns,
                conflict_strategy, timestamp_column, batch_size
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
            )
            .run(
                id,
                input.name,
                input.sourceConnectionId,
                input.targetConnectionId,
                input.sourceTable,
                input.targetTable,
                pkColumnsJson,
                input.conflictStrategy || 'source_wins',
                input.timestampColumn || null,
                input.batchSize || 1000
            );

        return this.findById(id)!;
    }

    /**
     * Find a sync config by ID
     */
    findById(id: string): DataSyncConfig | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                sc.*,
                src.name as source_connection_name,
                tgt.name as target_connection_name
            FROM sync_configs sc
            LEFT JOIN connections src ON sc.source_connection_id = src.id
            LEFT JOIN connections tgt ON sc.target_connection_id = tgt.id
            WHERE sc.id = ?
        `
            )
            .get(id) as SyncConfigRow | undefined;

        return row ? this.rowToConfig(row) : null;
    }

    /**
     * Find all sync configs
     */
    findAll(options?: {
        sourceConnectionId?: string;
        targetConnectionId?: string;
    }): DataSyncConfig[] {
        let query = `
            SELECT 
                sc.*,
                src.name as source_connection_name,
                tgt.name as target_connection_name
            FROM sync_configs sc
            LEFT JOIN connections src ON sc.source_connection_id = src.id
            LEFT JOIN connections tgt ON sc.target_connection_id = tgt.id
        `;
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (options?.sourceConnectionId) {
            conditions.push('sc.source_connection_id = ?');
            params.push(options.sourceConnectionId);
        }
        if (options?.targetConnectionId) {
            conditions.push('sc.target_connection_id = ?');
            params.push(options.targetConnectionId);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY sc.created_at DESC';

        const rows = this.db
            .getDb()
            .prepare(query)
            .all(...params) as SyncConfigRow[];
        return rows.map((row) => this.rowToConfig(row));
    }

    /**
     * Find sync configs by connection pair
     */
    findByConnectionPair(
        sourceConnectionId: string,
        targetConnectionId: string
    ): DataSyncConfig[] {
        const rows = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                sc.*,
                src.name as source_connection_name,
                tgt.name as target_connection_name
            FROM sync_configs sc
            LEFT JOIN connections src ON sc.source_connection_id = src.id
            LEFT JOIN connections tgt ON sc.target_connection_id = tgt.id
            WHERE sc.source_connection_id = ? AND sc.target_connection_id = ?
            ORDER BY sc.created_at DESC
        `
            )
            .all(sourceConnectionId, targetConnectionId) as SyncConfigRow[];
        return rows.map((row) => this.rowToConfig(row));
    }

    /**
     * Update a sync config
     */
    update(id: string, input: SyncConfigUpdateInput): DataSyncConfig | null {
        const updates: string[] = [];
        const params: unknown[] = [];

        if (input.name !== undefined) {
            updates.push('name = ?');
            params.push(input.name);
        }
        if (input.primaryKeyColumns !== undefined) {
            updates.push('primary_key_columns = ?');
            params.push(JSON.stringify(input.primaryKeyColumns));
        }
        if (input.conflictStrategy !== undefined) {
            updates.push('conflict_strategy = ?');
            params.push(input.conflictStrategy);
        }
        if (input.timestampColumn !== undefined) {
            updates.push('timestamp_column = ?');
            params.push(input.timestampColumn || null);
        }
        if (input.batchSize !== undefined) {
            updates.push('batch_size = ?');
            params.push(input.batchSize);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        updates.push("updated_at = datetime('now')");
        params.push(id);

        this.db
            .getDb()
            .prepare(`UPDATE sync_configs SET ${updates.join(', ')} WHERE id = ?`)
            .run(...params);

        return this.findById(id);
    }

    /**
     * Delete a sync config
     */
    delete(id: string): boolean {
        const result = this.db
            .getDb()
            .prepare('DELETE FROM sync_configs WHERE id = ?')
            .run(id);

        return result.changes > 0;
    }

    /**
     * Convert database row to DataSyncConfig
     */
    private rowToConfig(row: SyncConfigRow): DataSyncConfig {
        return {
            id: row.id,
            name: row.name,
            sourceConnectionId: row.source_connection_id,
            targetConnectionId: row.target_connection_id,
            sourceTable: row.source_table,
            targetTable: row.target_table,
            primaryKeyColumns: JSON.parse(row.primary_key_columns) as string[],
            conflictStrategy: row.conflict_strategy as ConflictStrategy,
            timestampColumn: row.timestamp_column || undefined,
            batchSize: row.batch_size,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}
