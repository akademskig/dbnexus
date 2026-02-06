/**
 * Server repository for CRUD operations
 */

import type Database from 'better-sqlite3';
import type {
    DatabaseEngine,
    ConnectionType,
    ConnectionTag,
    ServerConfig,
    ServerCreateInput,
    ServerUpdateInput,
} from '@dbnexus/shared';
import { MetadataDatabase } from '../database.js';
import { encryptPassword, decryptPassword } from '../crypto.js';

// Re-export types for convenience
export type { ServerConfig, ServerCreateInput, ServerUpdateInput };

interface ServerRow {
    id: string;
    name: string;
    engine: string;
    connection_type: string;
    host: string;
    port: number;
    username: string;
    encrypted_password: string | null;
    ssl: number;
    tags: string;
    created_at: string;
    updated_at: string;
    database_count?: number;
}

export class ServerRepository {
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
     * Convert database row to ServerConfig
     */
    private rowToServer(row: ServerRow): ServerConfig {
        return {
            id: row.id,
            name: row.name,
            engine: row.engine as DatabaseEngine,
            connectionType: row.connection_type as ConnectionType,
            host: row.host,
            port: row.port,
            username: row.username,
            ssl: row.ssl === 1,
            tags: JSON.parse(row.tags) as ConnectionTag[],
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            databaseCount: row.database_count,
        };
    }

    /**
     * Create a new server
     */
    create(input: ServerCreateInput): ServerConfig {
        const id = MetadataDatabase.generateId();
        const now = new Date().toISOString();
        const encryptedPwd = input.password ? encryptPassword(input.password) : null;
        const connectionType = input.connectionType || this.inferConnectionType(input.host);

        this.db
            .prepare(
                `
                INSERT INTO servers (id, name, engine, connection_type, host, port, username, encrypted_password, ssl, tags, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `
            )
            .run(
                id,
                input.name,
                input.engine,
                connectionType,
                input.host,
                input.port,
                input.username,
                encryptedPwd,
                input.ssl ? 1 : 0,
                JSON.stringify(input.tags ?? []),
                now,
                now
            );

        return this.findById(id)!;
    }

    /**
     * Find a server by ID
     */
    findById(id: string): ServerConfig | null {
        const row = this.db
            .prepare(
                `
                SELECT s.*,
                    (SELECT COUNT(*) FROM connections c WHERE c.server_id = s.id) as database_count
                FROM servers s
                WHERE s.id = ?
                `
            )
            .get(id) as ServerRow | undefined;

        return row ? this.rowToServer(row) : null;
    }

    /**
     * Find a server by name
     */
    findByName(name: string): ServerConfig | null {
        const row = this.db
            .prepare(
                `
                SELECT s.*,
                    (SELECT COUNT(*) FROM connections c WHERE c.server_id = s.id) as database_count
                FROM servers s
                WHERE s.name = ?
                `
            )
            .get(name) as ServerRow | undefined;

        return row ? this.rowToServer(row) : null;
    }

    /**
     * Find all servers
     */
    findAll(): ServerConfig[] {
        const rows = this.db
            .prepare(
                `
                SELECT s.*,
                    (SELECT COUNT(*) FROM connections c WHERE c.server_id = s.id) as database_count
                FROM servers s
                ORDER BY s.name
                `
            )
            .all() as ServerRow[];

        return rows.map((row) => this.rowToServer(row));
    }

    /**
     * Find servers by engine
     */
    findByEngine(engine: DatabaseEngine): ServerConfig[] {
        const rows = this.db
            .prepare(
                `
                SELECT s.*,
                    (SELECT COUNT(*) FROM connections c WHERE c.server_id = s.id) as database_count
                FROM servers s
                WHERE s.engine = ?
                ORDER BY s.name
                `
            )
            .all(engine) as ServerRow[];

        return rows.map((row) => this.rowToServer(row));
    }

    /**
     * Update a server
     */
    update(id: string, input: ServerUpdateInput): ServerConfig | null {
        const existing = this.findById(id);
        if (!existing) {
            return null;
        }

        const updates: string[] = [];
        const values: (string | number | null)[] = [];

        if (input.name !== undefined) {
            updates.push('name = ?');
            values.push(input.name);
        }
        if (input.connectionType !== undefined) {
            updates.push('connection_type = ?');
            values.push(input.connectionType);
        }
        if (input.host !== undefined) {
            updates.push('host = ?');
            values.push(input.host);
        }
        if (input.port !== undefined) {
            updates.push('port = ?');
            values.push(input.port);
        }
        if (input.username !== undefined) {
            updates.push('username = ?');
            values.push(input.username);
        }
        if (input.password !== undefined) {
            updates.push('encrypted_password = ?');
            values.push(input.password ? encryptPassword(input.password) : null);
        }
        if (input.ssl !== undefined) {
            updates.push('ssl = ?');
            values.push(input.ssl ? 1 : 0);
        }
        if (input.tags !== undefined) {
            updates.push('tags = ?');
            values.push(JSON.stringify(input.tags));
        }

        if (updates.length === 0) {
            return existing;
        }

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        this.db.prepare(`UPDATE servers SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.findById(id);
    }

    /**
     * Delete a server
     * Note: Connections referencing this server will have server_id set to NULL (ON DELETE SET NULL)
     */
    delete(id: string): boolean {
        const result = this.db.prepare('DELETE FROM servers WHERE id = ?').run(id);
        return result.changes > 0;
    }

    /**
     * Get decrypted password for a server
     */
    getPassword(id: string): string | null {
        const row = this.db
            .prepare('SELECT encrypted_password FROM servers WHERE id = ?')
            .get(id) as { encrypted_password: string | null } | undefined;

        if (!row || !row.encrypted_password) {
            return null;
        }

        return decryptPassword(row.encrypted_password);
    }

    /**
     * Check if server has a password
     */
    hasPassword(id: string): boolean {
        const row = this.db
            .prepare('SELECT encrypted_password FROM servers WHERE id = ?')
            .get(id) as { encrypted_password: string | null } | undefined;

        return row?.encrypted_password != null;
    }

    /**
     * Get count of connections using this server
     */
    getConnectionCount(id: string): number {
        const row = this.db
            .prepare('SELECT COUNT(*) as count FROM connections WHERE server_id = ?')
            .get(id) as { count: number };

        return row.count;
    }
}
