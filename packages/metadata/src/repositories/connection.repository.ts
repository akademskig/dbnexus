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
} from '@dbnexus/shared';
import { MetadataDatabase } from '../database.js';
import { encryptPassword, decryptPassword } from '../crypto.js';

interface ConnectionRow {
    id: string;
    name: string;
    engine: string;
    host: string;
    port: number;
    database: string;
    username: string;
    encrypted_password: string | null;
    ssl: number;
    tags: string;
    read_only: number;
    created_at: string;
    updated_at: string;
}

export class ConnectionRepository {
    private readonly db: Database.Database;

    constructor(metadataDb: MetadataDatabase) {
        this.db = metadataDb.getDb();
    }

    /**
     * Create a new connection with password
     */
    create(input: ConnectionCreateInput): ConnectionConfig {
        const id = MetadataDatabase.generateId();
        const now = new Date().toISOString();
        const encryptedPwd = input.password ? encryptPassword(input.password) : null;

        this.db
            .prepare(
                `
      INSERT INTO connections (id, name, engine, host, port, database, username, encrypted_password, ssl, tags, read_only, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
            )
            .run(
                id,
                input.name,
                input.engine,
                input.host,
                input.port,
                input.database,
                input.username,
                encryptedPwd,
                input.ssl ? 1 : 0,
                JSON.stringify(input.tags ?? []),
                input.readOnly ? 1 : 0,
                now,
                now
            );

        return this.findById(id)!;
    }

    /**
     * Find a connection by ID
     */
    findById(id: string): ConnectionConfig | null {
        const row = this.db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as
            | ConnectionRow
            | undefined;
        return row ? this.rowToConnection(row) : null;
    }

    /**
     * Find a connection by name
     */
    findByName(name: string): ConnectionConfig | null {
        const row = this.db.prepare('SELECT * FROM connections WHERE name = ?').get(name) as
            | ConnectionRow
            | undefined;
        return row ? this.rowToConnection(row) : null;
    }

    /**
     * Get all connections
     */
    findAll(): ConnectionConfig[] {
        const rows = this.db
            .prepare('SELECT * FROM connections ORDER BY name')
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
        if (input.tags !== undefined) {
            updates.push('tags = ?');
            values.push(JSON.stringify(input.tags));
        }
        if (input.readOnly !== undefined) {
            updates.push('read_only = ?');
            values.push(input.readOnly ? 1 : 0);
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
            host: row.host,
            port: row.port,
            database: row.database,
            username: row.username,
            ssl: row.ssl === 1,
            tags: JSON.parse(row.tags) as ConnectionTag[],
            readOnly: row.read_only === 1,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}
