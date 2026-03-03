/**
 * Query repository for saved queries and history
 */

import type Database from 'better-sqlite3';
import type { SavedQuery, QueryFolder, QueryHistoryEntry } from '@dbnexus/shared';
import { MetadataDatabase } from '../database.js';

interface SavedQueryRow {
    id: string;
    name: string;
    sql: string;
    connection_id: string | null;
    folder_id: string | null;
    created_by: string | null;
    is_private: number;
    created_at: string;
    updated_at: string;
}

export interface UserContext {
    userId: string | null;
    isAdmin: boolean;
}

interface QueryFolderRow {
    id: string;
    name: string;
    parent_id: string | null;
    created_at: string;
}

interface QueryHistoryRow {
    id: string;
    connection_id: string;
    sql: string;
    executed_at: string;
    execution_time_ms: number;
    row_count: number;
    success: number;
    error: string | null;
}

export class QueryLogsRepository {
    private readonly db: Database.Database;

    constructor(metadataDb: MetadataDatabase) {
        this.db = metadataDb.getDb();
    }

    // ============ Saved Queries ============

    createSavedQuery(
        input: {
            name: string;
            sql: string;
            connectionId?: string;
            folderId?: string;
        },
        userId?: string
    ): SavedQuery {
        const id = MetadataDatabase.generateId();
        const now = new Date().toISOString();

        this.db
            .prepare(
                `
      INSERT INTO saved_queries (id, name, sql, connection_id, folder_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
            )
            .run(
                id,
                input.name,
                input.sql,
                input.connectionId ?? null,
                input.folderId ?? null,
                userId ?? null,
                now,
                now
            );

        return this.findSavedQueryById(id)!;
    }

    findSavedQueryById(id: string): SavedQuery | null {
        const row = this.db.prepare('SELECT * FROM saved_queries WHERE id = ?').get(id) as
            | SavedQueryRow
            | undefined;
        return row ? this.rowToSavedQuery(row) : null;
    }

    findAllSavedQueries(userContext?: UserContext): SavedQuery[] {
        let query = 'SELECT * FROM saved_queries';
        const params: unknown[] = [];

        if (userContext && !userContext.isAdmin && userContext.userId) {
            query += ' WHERE (created_by = ? OR created_by IS NULL OR is_private = 0)';
            params.push(userContext.userId);
        }

        query += ' ORDER BY name';

        const rows = this.db.prepare(query).all(...params) as SavedQueryRow[];
        return rows.map((row) => this.rowToSavedQuery(row));
    }

    findSavedQueriesByFolder(folderId: string | null, userContext?: UserContext): SavedQuery[] {
        let query = 'SELECT * FROM saved_queries WHERE ';
        const params: unknown[] = [];

        if (folderId) {
            query += 'folder_id = ?';
            params.push(folderId);
        } else {
            query += 'folder_id IS NULL';
        }

        if (userContext && !userContext.isAdmin && userContext.userId) {
            query += ' AND (created_by = ? OR created_by IS NULL OR is_private = 0)';
            params.push(userContext.userId);
        }

        query += ' ORDER BY name';

        const rows = this.db.prepare(query).all(...params) as SavedQueryRow[];
        return rows.map((row) => this.rowToSavedQuery(row));
    }

    /**
     * Check if user can access (view) a saved query
     */
    canAccessSavedQuery(queryId: string, userContext: UserContext): boolean {
        if (userContext.isAdmin) return true;

        const row = this.db
            .prepare('SELECT created_by, is_private FROM saved_queries WHERE id = ?')
            .get(queryId) as { created_by: string | null; is_private: number } | undefined;

        if (!row) return false;
        return (
            row.created_by === null || row.created_by === userContext.userId || row.is_private === 0
        );
    }

    /**
     * Check if user can modify (update/delete) a saved query
     */
    canModifySavedQuery(queryId: string, userContext: UserContext): boolean {
        if (userContext.isAdmin) return true;
        if (!userContext.userId) return false;

        const row = this.db
            .prepare('SELECT created_by FROM saved_queries WHERE id = ?')
            .get(queryId) as { created_by: string | null } | undefined;

        if (!row) return false;
        return row.created_by === userContext.userId;
    }

    updateSavedQuery(
        id: string,
        input: {
            name?: string;
            sql?: string;
            connectionId?: string;
            folderId?: string;
            isPrivate?: boolean;
        }
    ): SavedQuery | null {
        const updates: string[] = [];
        const values: unknown[] = [];

        if (input.name !== undefined) {
            updates.push('name = ?');
            values.push(input.name);
        }
        if (input.sql !== undefined) {
            updates.push('sql = ?');
            values.push(input.sql);
        }
        if (input.connectionId !== undefined) {
            updates.push('connection_id = ?');
            values.push(input.connectionId);
        }
        if (input.folderId !== undefined) {
            updates.push('folder_id = ?');
            values.push(input.folderId);
        }
        if (input.isPrivate !== undefined) {
            updates.push('is_private = ?');
            values.push(input.isPrivate ? 1 : 0);
        }

        if (updates.length > 0) {
            updates.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(id);

            this.db
                .prepare(`UPDATE saved_queries SET ${updates.join(', ')} WHERE id = ?`)
                .run(...values);
        }

        return this.findSavedQueryById(id);
    }

    deleteSavedQuery(id: string): boolean {
        const result = this.db.prepare('DELETE FROM saved_queries WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // ============ Query Folders ============

    createFolder(input: { name: string; parentId?: string }): QueryFolder {
        const id = MetadataDatabase.generateId();
        const now = new Date().toISOString();

        this.db
            .prepare(
                `
      INSERT INTO query_folders (id, name, parent_id, created_at)
      VALUES (?, ?, ?, ?)
    `
            )
            .run(id, input.name, input.parentId ?? null, now);

        return this.findFolderById(id)!;
    }

    findFolderById(id: string): QueryFolder | null {
        const row = this.db.prepare('SELECT * FROM query_folders WHERE id = ?').get(id) as
            | QueryFolderRow
            | undefined;
        return row ? this.rowToFolder(row) : null;
    }

    findAllFolders(): QueryFolder[] {
        const rows = this.db
            .prepare('SELECT * FROM query_folders ORDER BY name')
            .all() as QueryFolderRow[];
        return rows.map((row) => this.rowToFolder(row));
    }

    deleteFolder(id: string): boolean {
        const result = this.db.prepare('DELETE FROM query_folders WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // ============ Query History ============

    addHistoryEntry(input: {
        connectionId: string;
        sql: string;
        executionTimeMs: number;
        rowCount: number;
        success: boolean;
        error?: string;
    }): QueryHistoryEntry {
        const id = MetadataDatabase.generateId();
        const now = new Date().toISOString();

        this.db
            .prepare(
                `
      INSERT INTO query_logs (id, connection_id, sql, executed_at, execution_time_ms, row_count, success, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
            )
            .run(
                id,
                input.connectionId,
                input.sql,
                now,
                input.executionTimeMs,
                input.rowCount,
                input.success ? 1 : 0,
                input.error ?? null
            );

        return this.findHistoryEntryById(id)!;
    }

    findHistoryEntryById(id: string): QueryHistoryEntry | null {
        const row = this.db.prepare('SELECT * FROM query_logs WHERE id = ?').get(id) as
            | QueryHistoryRow
            | undefined;
        return row ? this.rowToHistoryEntry(row) : null;
    }

    findRecentHistory(limit: number = 100, connectionId?: string): QueryHistoryEntry[] {
        const query = connectionId
            ? 'SELECT * FROM query_logs WHERE connection_id = ? ORDER BY executed_at DESC LIMIT ?'
            : 'SELECT * FROM query_logs ORDER BY executed_at DESC LIMIT ?';
        const rows = this.db
            .prepare(query)
            .all(...(connectionId ? [connectionId, limit] : [limit])) as QueryHistoryRow[];
        return rows.map((row) => this.rowToHistoryEntry(row));
    }

    clearHistory(connectionId?: string): number {
        const query = connectionId
            ? 'DELETE FROM query_logs WHERE connection_id = ?'
            : 'DELETE FROM query_logs';
        const result = connectionId
            ? this.db.prepare(query).run(connectionId)
            : this.db.prepare(query).run();
        return result.changes;
    }

    // ============ Row Converters ============

    private rowToSavedQuery(row: SavedQueryRow): SavedQuery {
        return {
            id: row.id,
            name: row.name,
            sql: row.sql,
            connectionId: row.connection_id ?? undefined,
            folderId: row.folder_id ?? undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            createdBy: row.created_by ?? undefined,
            isPrivate: row.is_private === 1,
        };
    }

    private rowToFolder(row: QueryFolderRow): QueryFolder {
        return {
            id: row.id,
            name: row.name,
            parentId: row.parent_id ?? undefined,
            createdAt: new Date(row.created_at),
        };
    }

    private rowToHistoryEntry(row: QueryHistoryRow): QueryHistoryEntry {
        return {
            id: row.id,
            connectionId: row.connection_id,
            sql: row.sql,
            executedAt: new Date(row.executed_at),
            executionTimeMs: row.execution_time_ms,
            rowCount: row.row_count,
            success: row.success === 1,
            error: row.error ?? undefined,
        };
    }
}
