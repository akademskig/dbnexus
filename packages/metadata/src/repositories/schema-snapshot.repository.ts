/**
 * Repository for schema snapshot operations
 */

import type { MetadataDatabase } from '../database.js';

export interface SchemaSnapshot {
    id: string;
    connectionId: string;
    capturedAt: Date;
    schemaJson: unknown;
    // Joined fields
    connectionName?: string;
}

interface SchemaSnapshotRow {
    id: string;
    connection_id: string;
    captured_at: string;
    schema_json: string;
    connection_name?: string;
}

export interface SchemaSnapshotCreateInput {
    connectionId: string;
    schemaJson: unknown;
}

export class SchemaSnapshotRepository {
    constructor(private readonly db: MetadataDatabase) { }

    /**
     * Create a new schema snapshot
     */
    create(input: SchemaSnapshotCreateInput): SchemaSnapshot {
        const id = crypto.randomUUID();
        const schemaJsonStr = JSON.stringify(input.schemaJson);

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO schema_snapshots (id, connection_id, schema_json)
            VALUES (?, ?, ?)
        `
            )
            .run(id, input.connectionId, schemaJsonStr);

        return this.findById(id)!;
    }

    /**
     * Find a snapshot by ID
     */
    findById(id: string): SchemaSnapshot | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                ss.*,
                c.name as connection_name
            FROM schema_snapshots ss
            LEFT JOIN connections c ON ss.connection_id = c.id
            WHERE ss.id = ?
        `
            )
            .get(id) as SchemaSnapshotRow | undefined;

        return row ? this.rowToSnapshot(row) : null;
    }

    /**
     * Find snapshots by connection ID
     */
    findByConnectionId(connectionId: string, limit?: number): SchemaSnapshot[] {
        let query = `
            SELECT 
                ss.*,
                c.name as connection_name
            FROM schema_snapshots ss
            LEFT JOIN connections c ON ss.connection_id = c.id
            WHERE ss.connection_id = ?
            ORDER BY ss.captured_at DESC
        `;

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const rows = this.db.getDb().prepare(query).all(connectionId) as SchemaSnapshotRow[];
        return rows.map((row) => this.rowToSnapshot(row));
    }

    /**
     * Find the latest snapshot for a connection
     */
    findLatest(connectionId: string): SchemaSnapshot | null {
        const row = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                ss.*,
                c.name as connection_name
            FROM schema_snapshots ss
            LEFT JOIN connections c ON ss.connection_id = c.id
            WHERE ss.connection_id = ?
            ORDER BY ss.captured_at DESC
            LIMIT 1
        `
            )
            .get(connectionId) as SchemaSnapshotRow | undefined;

        return row ? this.rowToSnapshot(row) : null;
    }

    /**
     * Find all snapshots
     */
    findAll(limit: number = 100): SchemaSnapshot[] {
        const rows = this.db
            .getDb()
            .prepare(
                `
            SELECT 
                ss.*,
                c.name as connection_name
            FROM schema_snapshots ss
            LEFT JOIN connections c ON ss.connection_id = c.id
            ORDER BY ss.captured_at DESC
            LIMIT ?
        `
            )
            .all(limit) as SchemaSnapshotRow[];
        return rows.map((row) => this.rowToSnapshot(row));
    }

    /**
     * Delete a snapshot
     */
    delete(id: string): boolean {
        const result = this.db
            .getDb()
            .prepare('DELETE FROM schema_snapshots WHERE id = ?')
            .run(id);

        return result.changes > 0;
    }

    /**
     * Delete snapshots older than N days
     */
    deleteOlderThan(days: number): number {
        const result = this.db
            .getDb()
            .prepare(
                `
            DELETE FROM schema_snapshots 
            WHERE captured_at < datetime('now', '-' || ? || ' days')
        `
            )
            .run(days);

        return result.changes;
    }

    /**
     * Delete all snapshots for a connection except the N most recent
     */
    keepLatest(connectionId: string, count: number): number {
        const result = this.db
            .getDb()
            .prepare(
                `
            DELETE FROM schema_snapshots 
            WHERE connection_id = ?
            AND id NOT IN (
                SELECT id FROM schema_snapshots
                WHERE connection_id = ?
                ORDER BY captured_at DESC
                LIMIT ?
            )
        `
            )
            .run(connectionId, connectionId, count);

        return result.changes;
    }

    /**
     * Convert database row to SchemaSnapshot
     */
    private rowToSnapshot(row: SchemaSnapshotRow): SchemaSnapshot {
        return {
            id: row.id,
            connectionId: row.connection_id,
            capturedAt: new Date(row.captured_at),
            schemaJson: JSON.parse(row.schema_json),
            connectionName: row.connection_name,
        };
    }
}
