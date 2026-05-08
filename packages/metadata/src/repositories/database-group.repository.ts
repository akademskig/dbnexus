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
    database_engine: string;
    source_connection_id: string | null;
    sync_schema: number;
    sync_data: number;
    sync_target_schema: string | null;
    created_by: string | null;
    is_public: number;
    created_at: string;
    updated_at: string;
    project_name?: string;
    source_connection_name?: string;
    connection_count?: number;
}

export interface UserContext {
    userId: string | null;
    isAdmin: boolean;
}

export class DatabaseGroupRepository {
    constructor(private db: MetadataDatabase) {}

    /**
     * Create a new instance group
     */
    create(input: InstanceGroupCreateInput, userId?: string): InstanceGroup {
        const id = crypto.randomUUID();

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO database_groups (id, project_id, name, description, database_engine, source_connection_id, sync_schema, sync_data, sync_target_schema, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
            )
            .run(
                id,
                input.projectId,
                input.name,
                input.description || null,
                input.databaseEngine,
                input.sourceConnectionId || null,
                input.syncSchema ? 1 : 0,
                input.syncData ? 1 : 0,
                input.syncTargetSchema || null,
                userId || null
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
     * Get all instance groups (filtered by user unless admin)
     */
    findAll(projectId?: string, userContext?: UserContext): InstanceGroup[] {
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
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (projectId) {
            conditions.push('dg.project_id = ?');
            params.push(projectId);
        }

        if (userContext && !userContext.isAdmin && userContext.userId) {
            conditions.push('(dg.created_by = ? OR dg.created_by IS NULL OR dg.is_public = 1)');
            params.push(userContext.userId);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY p.name, dg.name';

        const rows = this.db
            .getDb()
            .prepare(query)
            .all(...params) as DatabaseGroupRow[];

        return rows.map((row) => this.rowToGroup(row));
    }

    /**
     * Find groups with sync enabled (filtered by user unless admin)
     */
    findWithSyncEnabled(userContext?: UserContext): InstanceGroup[] {
        let query = `
            SELECT 
                dg.*,
                p.name as project_name,
                sc.name as source_connection_name,
                (SELECT COUNT(*) FROM connections c WHERE c.group_id = dg.id) as connection_count
            FROM database_groups dg
            LEFT JOIN projects p ON dg.project_id = p.id
            LEFT JOIN connections sc ON dg.source_connection_id = sc.id
            WHERE (dg.sync_schema = 1 OR dg.sync_data = 1) AND dg.source_connection_id IS NOT NULL
        `;

        const params: unknown[] = [];

        if (userContext && !userContext.isAdmin && userContext.userId) {
            query += ` AND (dg.created_by = ? OR dg.created_by IS NULL OR dg.is_public = 1)`;
            params.push(userContext.userId);
        }

        query += ` ORDER BY p.name, dg.name`;

        const rows = this.db
            .getDb()
            .prepare(query)
            .all(...params) as DatabaseGroupRow[];

        return rows.map((row) => this.rowToGroup(row));
    }

    /**
     * Check if user can access (view) a database group
     */
    canAccess(groupId: string, userContext: UserContext): boolean {
        if (userContext.isAdmin) return true;

        const row = this.db
            .getDb()
            .prepare('SELECT created_by, is_public FROM database_groups WHERE id = ?')
            .get(groupId) as { created_by: string | null; is_public: number } | undefined;

        if (!row) return false;
        return (
            row.created_by === null || row.created_by === userContext.userId || row.is_public === 1
        );
    }

    /**
     * Check if user can modify (update/delete) a database group
     */
    canModify(groupId: string, userContext: UserContext): boolean {
        if (userContext.isAdmin) return true;

        const row = this.db
            .getDb()
            .prepare('SELECT created_by FROM database_groups WHERE id = ?')
            .get(groupId) as { created_by: string | null } | undefined;

        if (!row) return false;
        // Allow modification if created_by is null (legacy/unowned) or matches user
        return row.created_by === null || row.created_by === userContext.userId;
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
        if (input.syncTargetSchema !== undefined) {
            updates.push('sync_target_schema = ?');
            values.push(input.syncTargetSchema);
        }
        if (input.isPublic !== undefined) {
            updates.push('is_public = ?');
            values.push(input.isPublic ? 1 : 0);
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
            databaseEngine: row.database_engine as InstanceGroup['databaseEngine'],
            sourceConnectionId: row.source_connection_id || undefined,
            syncSchema: row.sync_schema === 1,
            syncData: row.sync_data === 1,
            syncTargetSchema: row.sync_target_schema || undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.created_by || undefined,
            isPublic: row.is_public === 1,
            projectName: row.project_name,
            sourceConnectionName: row.source_connection_name,
            connectionCount: row.connection_count,
        };
    }
}
