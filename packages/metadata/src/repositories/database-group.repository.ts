/**
 * Repository for database group operations
 */

import type { MetadataDatabase } from '../database.js';
import type {
    DatabaseGroup,
    DatabaseGroupCreateInput,
    DatabaseGroupUpdateInput,
} from '@dbnexus/shared';

interface DatabaseGroupRow {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    project_name?: string;
    connection_count?: number;
}

export class DatabaseGroupRepository {
    constructor(private db: MetadataDatabase) {}

    /**
     * Create a new database group
     */
    create(input: DatabaseGroupCreateInput): DatabaseGroup {
        const id = crypto.randomUUID();

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO database_groups (id, project_id, name, description)
            VALUES (?, ?, ?, ?)
        `
            )
            .run(id, input.projectId, input.name, input.description || null);

        return this.findById(id)!;
    }

    /**
     * Find a database group by ID
     */
    findById(id: string): DatabaseGroup | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                dg.*,
                p.name as project_name,
                (SELECT COUNT(*) FROM connections c WHERE c.group_id = dg.id) as connection_count
            FROM database_groups dg
            LEFT JOIN projects p ON dg.project_id = p.id
            WHERE dg.id = ?
        `
            )
            .get(id) as DatabaseGroupRow | undefined;

        return row ? this.rowToGroup(row) : null;
    }

    /**
     * Get all database groups
     */
    findAll(projectId?: string): DatabaseGroup[] {
        let query = `
            SELECT 
                dg.*,
                p.name as project_name,
                (SELECT COUNT(*) FROM connections c WHERE c.group_id = dg.id) as connection_count
            FROM database_groups dg
            LEFT JOIN projects p ON dg.project_id = p.id
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
     * Update a database group
     */
    update(id: string, input: DatabaseGroupUpdateInput): DatabaseGroup | null {
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
     * Delete a database group
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
     * Convert database row to DatabaseGroup
     */
    private rowToGroup(row: DatabaseGroupRow): DatabaseGroup {
        return {
            id: row.id,
            projectId: row.project_id,
            name: row.name,
            description: row.description || undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            projectName: row.project_name,
            connectionCount: row.connection_count,
        };
    }
}
