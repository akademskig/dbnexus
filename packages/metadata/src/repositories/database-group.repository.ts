/**
 * Repository for database group (instance group) operations
 */

import type { MetadataDatabase } from '../database.js';
import type {
    InstanceGroup,
    InstanceGroupCreateInput,
    InstanceGroupUpdateInput,
} from '@dbnexus/shared';

interface DatabaseGroupRow {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    source_connection_id: string | null;
    sync_schema: number;
    sync_data: number;
    created_at: string;
    updated_at: string;
    project_name?: string;
    source_connection_name?: string;
    connection_count?: number;
}

export class DatabaseGroupRepository {
    constructor(private db: MetadataDatabase) {}

    /**
     * Create a new instance group
     */
    create(input: InstanceGroupCreateInput): InstanceGroup {
        const id = crypto.randomUUID();

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO database_groups (id, project_id, name, description, source_connection_id, sync_schema, sync_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `
            )
            .run(
                id,
                input.projectId,
                input.name,
                input.description || null,
                input.sourceConnectionId || null,
                input.syncSchema ? 1 : 0,
                input.syncData ? 1 : 0
            );

        return this.findById(id)!;
    }

    /**
     * Find an instance group by ID
     */
    findById(id: string): InstanceGroup | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                dg.*,
                p.name as project_name,
                sc.name as source_connection_name,
                (SELECT COUNT(*) FROM connections c WHERE c.group_id = dg.id) as connection_count
            FROM database_groups dg
            LEFT JOIN projects p ON dg.project_id = p.id
            LEFT JOIN connections sc ON dg.source_connection_id = sc.id
            WHERE dg.id = ?
        `
            )
            .get(id) as DatabaseGroupRow | undefined;

        return row ? this.rowToGroup(row) : null;
    }

    /**
     * Get all instance groups
     */
    findAll(projectId?: string): InstanceGroup[] {
        let query = `
            SELECT 
                dg.*,
                p.name as project_name,
                sc.name as source_connection_name,
                (SELECT COUNT(*) FROM connections c WHERE c.group_id = dg.id) as connection_count
            FROM database_groups dg
            LEFT JOIN projects p ON dg.project_id = p.id
            LEFT JOIN connections sc ON dg.source_connection_id = sc.id
        `;
        const params: unknown[] = [];

        if (projectId) {
            query += ' WHERE dg.project_id = ?';
            params.push(projectId);
        }

        query += ' ORDER BY p.name, dg.name';

        const rows = this.db
            .getDb()
            .prepare(query)
            .all(...params) as DatabaseGroupRow[];

        return rows.map((row) => this.rowToGroup(row));
    }

    /**
     * Find groups with sync enabled
     */
    findWithSyncEnabled(): InstanceGroup[] {
        const rows = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                dg.*,
                p.name as project_name,
                sc.name as source_connection_name,
                (SELECT COUNT(*) FROM connections c WHERE c.group_id = dg.id) as connection_count
            FROM database_groups dg
            LEFT JOIN projects p ON dg.project_id = p.id
            LEFT JOIN connections sc ON dg.source_connection_id = sc.id
            WHERE (dg.sync_schema = 1 OR dg.sync_data = 1) AND dg.source_connection_id IS NOT NULL
            ORDER BY p.name, dg.name
        `
            )
            .all() as DatabaseGroupRow[];

        return rows.map((row) => this.rowToGroup(row));
    }

    /**
     * Update an instance group
     */
    update(id: string, input: InstanceGroupUpdateInput): InstanceGroup | null {
        const updates: string[] = [];
        const values: unknown[] = [];

        if (input.name !== undefined) {
            updates.push('name = ?');
            values.push(input.name);
        }
        if (input.description !== undefined) {
            updates.push('description = ?');
            values.push(input.description);
        }
        if (input.sourceConnectionId !== undefined) {
            updates.push('source_connection_id = ?');
            values.push(input.sourceConnectionId);
        }
        if (input.syncSchema !== undefined) {
            updates.push('sync_schema = ?');
            values.push(input.syncSchema ? 1 : 0);
        }
        if (input.syncData !== undefined) {
            updates.push('sync_data = ?');
            values.push(input.syncData ? 1 : 0);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        updates.push("updated_at = datetime('now')");
        values.push(id);

        this.db
            .getDb()
            .prepare(`UPDATE database_groups SET ${updates.join(', ')} WHERE id = ?`)
            .run(...values);

        return this.findById(id);
    }

    /**
     * Delete an instance group
     */
    delete(id: string): boolean {
        const result = this.db
            .getDb()
            .prepare(
                `
            DELETE FROM database_groups WHERE id = ?
        `
            )
            .run(id);

        return result.changes > 0;
    }

    /**
     * Convert database row to InstanceGroup
     */
    private rowToGroup(row: DatabaseGroupRow): InstanceGroup {
        return {
            id: row.id,
            projectId: row.project_id,
            name: row.name,
            description: row.description || undefined,
            sourceConnectionId: row.source_connection_id || undefined,
            syncSchema: row.sync_schema === 1,
            syncData: row.sync_data === 1,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            projectName: row.project_name,
            sourceConnectionName: row.source_connection_name,
            connectionCount: row.connection_count,
        };
    }
}
