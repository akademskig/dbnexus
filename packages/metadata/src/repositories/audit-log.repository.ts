/**
 * Repository for audit log operations
 */

import type { MetadataDatabase } from '../database.js';

export type AuditAction =
    | 'connection_created'
    | 'connection_updated'
    | 'connection_deleted'
    | 'server_created'
    | 'server_updated'
    | 'server_deleted'
    | 'database_created'
    | 'database_deleted'
    | 'project_created'
    | 'project_updated'
    | 'project_deleted'
    | 'database_group_created'
    | 'database_group_updated'
    | 'database_group_deleted'
    | 'query_executed'
    | 'schema_migration_applied'
    | 'data_sync_started'
    | 'data_sync_completed'
    | 'data_sync_failed'
    | 'schema_snapshot_created'
    | 'table_created'
    | 'table_dropped'
    | 'column_added'
    | 'column_modified'
    | 'column_dropped'
    | 'rows_inserted'
    | 'rows_updated'
    | 'rows_deleted';

export type AuditEntityType =
    | 'connection'
    | 'server'
    | 'project'
    | 'database_group'
    | 'query'
    | 'migration'
    | 'sync_config'
    | 'sync_run'
    | 'schema_snapshot'
    | 'table'
    | 'column'
    | 'row';

export interface AuditLogEntry {
    id: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string;
    connectionId?: string;
    details?: Record<string, unknown>;
    createdAt: Date;
    // Joined fields
    connectionName?: string;
}

interface AuditLogRow {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    connection_id: string | null;
    details_json: string | null;
    created_at: string;
    connection_name?: string;
}

export interface AuditLogCreateInput {
    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string;
    connectionId?: string;
    details?: Record<string, unknown>;
}

export class AuditLogRepository {
    constructor(private readonly db: MetadataDatabase) {}

    /**
     * Create a new audit log entry
     */
    create(input: AuditLogCreateInput): AuditLogEntry {
        const id = crypto.randomUUID();
        const detailsJson = input.details ? JSON.stringify(input.details) : null;

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO audit_log (id, action, entity_type, entity_id, connection_id, details_json)
            VALUES (?, ?, ?, ?, ?, ?)
        `
            )
            .run(
                id,
                input.action,
                input.entityType,
                input.entityId || null,
                input.connectionId || null,
                detailsJson
            );

        return this.findById(id)!;
    }

    /**
     * Log a sync operation start
     */
    logSyncStart(
        syncRunId: string,
        connectionId: string,
        details: Record<string, unknown>
    ): AuditLogEntry {
        return this.create({
            action: 'data_sync_started',
            entityType: 'sync_run',
            entityId: syncRunId,
            connectionId,
            details,
        });
    }

    /**
     * Log a sync operation completion
     */
    logSyncComplete(
        syncRunId: string,
        connectionId: string,
        results: { inserts: number; updates: number; deletes: number; errors: string[] }
    ): AuditLogEntry {
        const hasErrors = results.errors.length > 0;
        return this.create({
            action: hasErrors ? 'data_sync_failed' : 'data_sync_completed',
            entityType: 'sync_run',
            entityId: syncRunId,
            connectionId,
            details: results,
        });
    }

    /**
     * Log a schema migration
     */
    logMigration(
        migrationId: string,
        targetConnectionId: string,
        details: { sourceConnectionId: string; statements: number; success: boolean }
    ): AuditLogEntry {
        return this.create({
            action: 'schema_migration_applied',
            entityType: 'migration',
            entityId: migrationId,
            connectionId: targetConnectionId,
            details,
        });
    }

    /**
     * Log a query execution
     */
    logQuery(
        connectionId: string,
        details: { sql: string; rowCount: number; executionTimeMs: number }
    ): AuditLogEntry {
        return this.create({
            action: 'query_executed',
            entityType: 'query',
            connectionId,
            details,
        });
    }

    /**
     * Find an entry by ID
     */
    findById(id: string): AuditLogEntry | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                al.*,
                c.name as connection_name
            FROM audit_log al
            LEFT JOIN connections c ON al.connection_id = c.id
            WHERE al.id = ?
        `
            )
            .get(id) as AuditLogRow | undefined;

        return row ? this.rowToEntry(row) : null;
    }

    /**
     * Find entries by connection ID
     */
    findByConnectionId(connectionId: string, limit?: number): AuditLogEntry[] {
        let query = `
            SELECT 
                al.*,
                c.name as connection_name
            FROM audit_log al
            LEFT JOIN connections c ON al.connection_id = c.id
            WHERE al.connection_id = ?
            ORDER BY al.created_at DESC
        `;

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const rows = this.db.getDb().prepare(query).all(connectionId) as AuditLogRow[];
        return rows.map((row) => this.rowToEntry(row));
    }

    /**
     * Find entries by action type
     */
    findByAction(action: AuditAction, limit?: number): AuditLogEntry[] {
        let query = `
            SELECT 
                al.*,
                c.name as connection_name
            FROM audit_log al
            LEFT JOIN connections c ON al.connection_id = c.id
            WHERE al.action = ?
            ORDER BY al.created_at DESC
        `;

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const rows = this.db.getDb().prepare(query).all(action) as AuditLogRow[];
        return rows.map((row) => this.rowToEntry(row));
    }

    /**
     * Find entries by entity
     */
    findByEntity(entityType: AuditEntityType, entityId: string): AuditLogEntry[] {
        const rows = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                al.*,
                c.name as connection_name
            FROM audit_log al
            LEFT JOIN connections c ON al.connection_id = c.id
            WHERE al.entity_type = ? AND al.entity_id = ?
            ORDER BY al.created_at DESC
        `
            )
            .all(entityType, entityId) as AuditLogRow[];
        return rows.map((row) => this.rowToEntry(row));
    }

    /**
     * Find all entries with optional filters
     */
    findAll(params?: {
        connectionId?: string;
        entityType?: string;
        action?: string;
        limit?: number;
    }): AuditLogEntry[] {
        const conditions: string[] = [];
        const values: unknown[] = [];

        if (params?.connectionId) {
            conditions.push('al.connection_id = ?');
            values.push(params.connectionId);
        }

        if (params?.entityType) {
            conditions.push('al.entity_type = ?');
            values.push(params.entityType);
        }

        if (params?.action) {
            conditions.push('al.action = ?');
            values.push(params.action);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = params?.limit || 500;

        const query = `
            SELECT 
                al.*,
                c.name as connection_name
            FROM audit_log al
            LEFT JOIN connections c ON al.connection_id = c.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ?
        `;

        values.push(limit);

        const rows = this.db
            .getDb()
            .prepare(query)
            .all(...values) as AuditLogRow[];
        return rows.map((row) => this.rowToEntry(row));
    }

    /**
     * Find recent entries
     */
    findRecent(limit: number = 100): AuditLogEntry[] {
        const rows = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                al.*,
                c.name as connection_name
            FROM audit_log al
            LEFT JOIN connections c ON al.connection_id = c.id
            ORDER BY al.created_at DESC
            LIMIT ?
        `
            )
            .all(limit) as AuditLogRow[];
        return rows.map((row) => this.rowToEntry(row));
    }

    /**
     * Delete entries older than N days
     */
    deleteOlderThan(days: number): number {
        const result = this.db
            .getDb()
            .prepare(
                `
            DELETE FROM audit_log 
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `
            )
            .run(days);

        return result.changes;
    }

    /**
     * Convert database row to AuditLogEntry
     */
    private rowToEntry(row: AuditLogRow): AuditLogEntry {
        return {
            id: row.id,
            action: row.action as AuditAction,
            entityType: row.entity_type as AuditEntityType,
            entityId: row.entity_id || undefined,
            connectionId: row.connection_id || undefined,
            details: row.details_json
                ? (JSON.parse(row.details_json) as Record<string, unknown>)
                : undefined,
            createdAt: new Date(row.created_at),
            connectionName: row.connection_name,
        };
    }
}
