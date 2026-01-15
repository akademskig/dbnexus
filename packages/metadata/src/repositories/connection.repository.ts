/**
 * Connection repository for CRUD operations
 */

import type Database from 'better-sqlite3';
import type {
    ConnectionConfig,
    ConnectionCreateInput,
    ConnectionUpdateInput,
    ConnectionTag,
    DatabaseEngine,
    ConnectionType,
} from '@dbnexus/shared';
import { MetadataDatabase } from '../database.js';
import { encryptPassword, decryptPassword } from '../crypto.js';

interface ConnectionRow {
    id: string;
    name: string;
    engine: string;
    connection_type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    encrypted_password: string | null;
    ssl: number;
    default_schema: string | null;
    tags: string;
    read_only: number;
    created_at: string;
    updated_at: string;
    project_id: string | null;
    group_id: string | null;
    project_name?: string;
    group_name?: string;
}

export class ConnectionRepository {
    private readonly db: Database.Database;

    constructor(metadataDb: MetadataDatabase) {
        this.db = metadataDb.getDb();
    }

    /**
     * Infer connection type from host
     */
    private inferConnectionType(host: string): ConnectionType {
        if (!host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
            return 'local';
        }
        return 'remote';
    }

    /**
     * Create a new connection with password
     */
    create(input: ConnectionCreateInput): ConnectionConfig {
        const id = MetadataDatabase.generateId();
        const now = new Date().toISOString();
        const encryptedPwd = input.password ? encryptPassword(input.password) : null;
        const connectionType = input.connectionType || this.inferConnectionType(input.host);

        this.db
            .prepare(
                `
      INSERT INTO connections (id, name, engine, connection_type, host, port, database, username, encrypted_password, ssl, default_schema, tags, read_only, project_id, group_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
            )
            .run(
                id,
                input.name,
                input.engine,
                connectionType,
                input.host,
                input.port,
                input.database,
                input.username,
                encryptedPwd,
                input.ssl ? 1 : 0,
                input.defaultSchema || null,
                JSON.stringify(input.tags ?? []),
                input.readOnly ? 1 : 0,
                input.projectId || null,
                input.groupId || null,
                now,
                now
            );

        return this.findById(id)!;
    }

    /**
     * Find a connection by ID
     */
    findById(id: string): ConnectionConfig | null {
        const row = this.db
            .prepare(
                `
            SELECT 
                c.*,
                p.name as project_name,
                dg.name as group_name
            FROM connections c
            LEFT JOIN projects p ON c.project_id = p.id
            LEFT JOIN database_groups dg ON c.group_id = dg.id
            WHERE c.id = ?
        `
            )
            .get(id) as ConnectionRow | undefined;
        return row ? this.rowToConnection(row) : null;
    }

    /**
     * Find a connection by name
     */
    findByName(name: string): ConnectionConfig | null {
        const row = this.db
            .prepare(
                `
            SELECT 
                c.*,
                p.name as project_name,
                dg.name as group_name
            FROM connections c
            LEFT JOIN projects p ON c.project_id = p.id
            LEFT JOIN database_groups dg ON c.group_id = dg.id
            WHERE c.name = ?
        `
            )
            .get(name) as ConnectionRow | undefined;
        return row ? this.rowToConnection(row) : null;
    }

    /**
     * Get all connections
     */
    findAll(): ConnectionConfig[] {
        const rows = this.db
            .prepare(
                `
            SELECT 
                c.*,
                p.name as project_name,
                dg.name as group_name
            FROM connections c
            LEFT JOIN projects p ON c.project_id = p.id
            LEFT JOIN database_groups dg ON c.group_id = dg.id
            ORDER BY p.name, dg.name, c.name
        `
            )
            .all() as ConnectionRow[];
        return rows.map((row) => this.rowToConnection(row));
    }

    /**
     * Find connections by project
     */
    findByProject(projectId: string): ConnectionConfig[] {
        const rows = this.db
            .prepare(
                `
            SELECT 
                c.*,
                p.name as project_name,
                dg.name as group_name
            FROM connections c
            LEFT JOIN projects p ON c.project_id = p.id
            LEFT JOIN database_groups dg ON c.group_id = dg.id
            WHERE c.project_id = ?
            ORDER BY dg.name, c.name
        `
            )
            .all(projectId) as ConnectionRow[];
        return rows.map((row) => this.rowToConnection(row));
    }

    /**
     * Find connections by database group
     */
    findByGroup(groupId: string): ConnectionConfig[] {
        const rows = this.db
            .prepare(
                `
            SELECT 
                c.*,
                p.name as project_name,
                dg.name as group_name
            FROM connections c
            LEFT JOIN projects p ON c.project_id = p.id
            LEFT JOIN database_groups dg ON c.group_id = dg.id
            WHERE c.group_id = ?
            ORDER BY c.name
        `
            )
            .all(groupId) as ConnectionRow[];
        return rows.map((row) => this.rowToConnection(row));
    }

    /**
     * Find ungrouped connections (no project assigned)
     */
    findUngrouped(): ConnectionConfig[] {
        const rows = this.db
            .prepare(
                `
            SELECT 
                c.*,
                p.name as project_name,
                dg.name as group_name
            FROM connections c
            LEFT JOIN projects p ON c.project_id = p.id
            LEFT JOIN database_groups dg ON c.group_id = dg.id
            WHERE c.project_id IS NULL
            ORDER BY c.name
        `
            )
            .all() as ConnectionRow[];
        return rows.map((row) => this.rowToConnection(row));
    }

    /**
     * Find connections by tag
     */
    findByTag(tag: ConnectionTag): ConnectionConfig[] {
        const rows = this.db
            .prepare('SELECT * FROM connections ORDER BY name')
            .all() as ConnectionRow[];
        return rows
            .filter((row) => {
                const tags = JSON.parse(row.tags) as string[];
                return tags.includes(tag);
            })
            .map((row) => this.rowToConnection(row));
    }

    /**
     * Update a connection
     */
    update(id: string, input: ConnectionUpdateInput): ConnectionConfig | null {
        const existing = this.findById(id);
        if (!existing) return null;

        const updates: string[] = [];
        const values: unknown[] = [];

        if (input.name !== undefined) {
            updates.push('name = ?');
            values.push(input.name);
        }
        if (input.host !== undefined) {
            updates.push('host = ?');
            values.push(input.host);
        }
        if (input.port !== undefined) {
            updates.push('port = ?');
            values.push(input.port);
        }
        if (input.database !== undefined) {
            updates.push('database = ?');
            values.push(input.database);
        }
        if (input.username !== undefined) {
            updates.push('username = ?');
            values.push(input.username);
        }
        if (input.password !== undefined && input.password !== '') {
            updates.push('encrypted_password = ?');
            values.push(encryptPassword(input.password));
        }
        if (input.ssl !== undefined) {
            updates.push('ssl = ?');
            values.push(input.ssl ? 1 : 0);
        }
        if (input.defaultSchema !== undefined) {
            updates.push('default_schema = ?');
            values.push(input.defaultSchema || null);
        }
        if (input.tags !== undefined) {
            updates.push('tags = ?');
            values.push(JSON.stringify(input.tags));
        }
        if (input.readOnly !== undefined) {
            updates.push('read_only = ?');
            values.push(input.readOnly ? 1 : 0);
        }
        if (input.projectId !== undefined) {
            updates.push('project_id = ?');
            values.push(input.projectId);
        }
        if (input.groupId !== undefined) {
            updates.push('group_id = ?');
            values.push(input.groupId);
        }
        if (input.connectionType !== undefined) {
            updates.push('connection_type = ?');
            values.push(input.connectionType);
        }

        if (updates.length > 0) {
            updates.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(id);

            this.db
                .prepare(`UPDATE connections SET ${updates.join(', ')} WHERE id = ?`)
                .run(...values);
        }

        return this.findById(id);
    }

    /**
     * Delete a connection
     */
    delete(id: string): boolean {
        const result = this.db.prepare('DELETE FROM connections WHERE id = ?').run(id);
        return result.changes > 0;
    }

    /**
     * Get the decrypted password for a connection
     */
    getPassword(id: string): string | null {
        const row = this.db
            .prepare('SELECT encrypted_password FROM connections WHERE id = ?')
            .get(id) as { encrypted_password: string | null } | undefined;
        if (!row?.encrypted_password) return null;
        try {
            return decryptPassword(row.encrypted_password);
        } catch {
            return null;
        }
    }

    /**
     * Check if a connection has a password stored
     */
    hasPassword(id: string): boolean {
        const row = this.db
            .prepare('SELECT encrypted_password FROM connections WHERE id = ?')
            .get(id) as { encrypted_password: string | null } | undefined;
        return !!row?.encrypted_password;
    }

    /**
     * Convert a database row to a ConnectionConfig
     */
    private rowToConnection(row: ConnectionRow): ConnectionConfig {
        return {
            id: row.id,
            name: row.name,
            engine: row.engine as DatabaseEngine,
            connectionType: (row.connection_type as ConnectionType) || 'local',
            host: row.host,
            port: row.port,
            database: row.database,
            username: row.username,
            ssl: row.ssl === 1,
            defaultSchema: row.default_schema || undefined,
            tags: JSON.parse(row.tags) as ConnectionTag[],
            readOnly: row.read_only === 1,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            projectId: row.project_id || undefined,
            groupId: row.group_id || undefined,
            projectName: row.project_name,
            groupName: row.group_name,
        };
    }
}
