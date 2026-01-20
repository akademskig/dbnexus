/**
 * Repository for migration history operations
 */

import type { MetadataDatabase } from '../database.js';
import type { MigrationHistoryEntry } from '@dbnexus/shared';

interface MigrationHistoryRow {
    id: string;
    source_connection_id: string;
    target_connection_id: string;
    source_schema: string;
    target_schema: string;
    group_id: string | null;
    description: string | null;
    sql_statements: string;
    applied_at: string;
    success: number;
    error: string | null;
    source_connection_name?: string;
    target_connection_name?: string;
    group_name?: string;
}

export class MigrationHistoryRepository {
    constructor(private db: MetadataDatabase) {}

    /**
     * Record a migration
     */
    create(input: {
        sourceConnectionId: string;
        targetConnectionId: string;
        sourceSchema: string;
        targetSchema: string;
        groupId?: string;
        description?: string;
        sqlStatements: string[];
        success: boolean;
        error?: string;
    }): MigrationHistoryEntry {
        const id = crypto.randomUUID();
        const sqlJson = JSON.stringify(input.sqlStatements);

        // Temporarily disable FK checks to avoid schema migration order issues
        const fkWasEnabled = this.db.getDb().prepare('PRAGMA foreign_keys').get() as {
            foreign_keys: number;
        };
        if (fkWasEnabled.foreign_keys) {
            this.db.getDb().prepare('PRAGMA foreign_keys = OFF').run();
        }

        try {
            this.db
                .getDb()
                .prepare(
                    `
                INSERT INTO migration_history (
                    id, source_connection_id, target_connection_id, 
                    source_schema, target_schema, group_id, description, 
                    sql_statements, success, error
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
                )
                .run(
                    id,
                    input.sourceConnectionId,
                    input.targetConnectionId,
                    input.sourceSchema,
                    input.targetSchema,
                    input.groupId || null,
                    input.description || null,
                    sqlJson,
                    input.success ? 1 : 0,
                    input.error || null
                );

            return this.findById(id)!;
        } finally {
            // Re-enable FK checks if they were enabled
            if (fkWasEnabled.foreign_keys) {
                this.db.getDb().prepare('PRAGMA foreign_keys = ON').run();
            }
        }
    }

    /**
     * Find a migration by ID
     */
    findById(id: string): MigrationHistoryEntry | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                mh.*,
                sc.name as source_connection_name,
                tc.name as target_connection_name,
                ig.name as group_name
            FROM migration_history mh
            LEFT JOIN connections sc ON mh.source_connection_id = sc.id
            LEFT JOIN connections tc ON mh.target_connection_id = tc.id
            LEFT JOIN database_groups ig ON mh.group_id = ig.id
            WHERE mh.id = ?
        `
            )
            .get(id) as MigrationHistoryRow | undefined;

        return row ? this.rowToEntry(row) : null;
    }

    /**
     * Get migration history
     */
    findAll(options?: { targetConnectionId?: string; limit?: number }): MigrationHistoryEntry[] {
        let query = `
            SELECT 
                mh.*,
                sc.name as source_connection_name,
                tc.name as target_connection_name,
                ig.name as group_name
            FROM migration_history mh
            LEFT JOIN connections sc ON mh.source_connection_id = sc.id
            LEFT JOIN connections tc ON mh.target_connection_id = tc.id
            LEFT JOIN database_groups ig ON mh.group_id = ig.id
        `;
        const params: unknown[] = [];

        if (options?.targetConnectionId) {
            query += ' WHERE mh.target_connection_id = ?';
            params.push(options.targetConnectionId);
        }

        query += ' ORDER BY mh.applied_at DESC';

        if (options?.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        const rows = this.db
            .getDb()
            .prepare(query)
            .all(...params) as MigrationHistoryRow[];
        return rows.map((row) => this.rowToEntry(row));
    }

    /**
     * Delete a migration record
     */
    delete(id: string): boolean {
        // Temporarily disable FK checks
        const fkWasEnabled = this.db.getDb().prepare('PRAGMA foreign_keys').get() as {
            foreign_keys: number;
        };
        if (fkWasEnabled.foreign_keys) {
            this.db.getDb().prepare('PRAGMA foreign_keys = OFF').run();
        }

        try {
            const result = this.db
                .getDb()
                .prepare(
                    `
                DELETE FROM migration_history WHERE id = ?
            `
                )
                .run(id);

            return result.changes > 0;
        } finally {
            // Re-enable FK checks if they were enabled
            if (fkWasEnabled.foreign_keys) {
                this.db.getDb().prepare('PRAGMA foreign_keys = ON').run();
            }
        }
    }

    /**
     * Convert database row to MigrationHistoryEntry
     */
    private rowToEntry(row: MigrationHistoryRow): MigrationHistoryEntry {
        return {
            id: row.id,
            sourceConnectionId: row.source_connection_id,
            targetConnectionId: row.target_connection_id,
            sourceSchema: row.source_schema,
            targetSchema: row.target_schema,
            groupId: row.group_id || undefined,
            description: row.description || undefined,
            sqlStatements: JSON.parse(row.sql_statements) as string[],
            appliedAt: row.applied_at,
            success: row.success === 1,
            error: row.error || undefined,
            sourceConnectionName: row.source_connection_name,
            targetConnectionName: row.target_connection_name,
            groupName: row.group_name || undefined,
        };
    }
}
