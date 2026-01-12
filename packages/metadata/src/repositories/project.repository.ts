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
    created_at: string;
    updated_at: string;
}

export class ProjectRepository {
    constructor(private db: MetadataDatabase) {}

    /**
     * Create a new project
     */
    create(input: ProjectCreateInput): Project {
        const id = crypto.randomUUID();

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO projects (id, name, description, color)
            VALUES (?, ?, ?, ?)
        `
            )
            .run(id, input.name, input.description || null, input.color || null);

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
     * Get all projects
     */
    findAll(): Project[] {
        const rows = this.db
            .getDb()
            .prepare(
                `
            SELECT * FROM projects ORDER BY name
        `
            )
            .all() as ProjectRow[];

        return rows.map((row) => this.rowToProject(row));
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
        };
    }
}
