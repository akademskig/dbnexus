/**
 * Repository for project operations
 */

import type { MetadataDatabase } from '../database.js';
import type { Project, ProjectCreateInput, ProjectUpdateInput } from '@dbnexus/shared';

interface ProjectRow {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserContext {
    userId: string | null;
    isAdmin: boolean;
}

export class ProjectRepository {
    constructor(private db: MetadataDatabase) {}

    /**
     * Create a new project
     */
    create(input: ProjectCreateInput, userId?: string): Project {
        const id = crypto.randomUUID();

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO projects (id, name, description, color, created_by)
            VALUES (?, ?, ?, ?, ?)
        `
            )
            .run(id, input.name, input.description || null, input.color || null, userId || null);

        return this.findById(id)!;
    }

    /**
     * Find a project by ID
     */
    findById(id: string): Project | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT * FROM projects WHERE id = ?
        `
            )
            .get(id) as ProjectRow | undefined;

        return row ? this.rowToProject(row) : null;
    }

    /**
     * Get all projects (filtered by user unless admin)
     */
    findAll(userContext?: UserContext): Project[] {
        let query = `SELECT * FROM projects`;
        const params: unknown[] = [];

        if (userContext && !userContext.isAdmin && userContext.userId) {
            query += ` WHERE created_by = ? OR created_by IS NULL`;
            params.push(userContext.userId);
        }

        query += ` ORDER BY name`;

        const rows = this.db
            .getDb()
            .prepare(query)
            .all(...params) as ProjectRow[];
        return rows.map((row) => this.rowToProject(row));
    }

    /**
     * Check if user can access a project
     */
    canAccess(projectId: string, userContext: UserContext): boolean {
        if (userContext.isAdmin) return true;

        const row = this.db
            .getDb()
            .prepare('SELECT created_by FROM projects WHERE id = ?')
            .get(projectId) as { created_by: string | null } | undefined;

        if (!row) return false;
        return row.created_by === null || row.created_by === userContext.userId;
    }

    /**
     * Update a project
     */
    update(id: string, input: ProjectUpdateInput): Project | null {
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
        if (input.color !== undefined) {
            updates.push('color = ?');
            values.push(input.color);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        updates.push("updated_at = datetime('now')");
        values.push(id);

        this.db
            .getDb()
            .prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`)
            .run(...values);

        return this.findById(id);
    }

    /**
     * Delete a project
     */
    delete(id: string): boolean {
        const result = this.db
            .getDb()
            .prepare(
                `
            DELETE FROM projects WHERE id = ?
        `
            )
            .run(id);

        return result.changes > 0;
    }

    /**
     * Convert database row to Project
     */
    private rowToProject(row: ProjectRow): Project {
        return {
            id: row.id,
            name: row.name,
            description: row.description || undefined,
            color: row.color || undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.created_by || undefined,
        };
    }
}
