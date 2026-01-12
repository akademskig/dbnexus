/**
 * API client for DB Nexus backend
 */

import type {
    ConnectionConfig,
    ConnectionCreateInput,
    ConnectionUpdateInput,
    ConnectionTestResult,
    QueryResult,
    QueryValidationResult,
    SavedQuery,
    QueryHistoryEntry,
    TableInfo,
    TableSchema,
    SchemaDiff,
    MigrationHistoryEntry,
} from '@dbnexus/shared';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// ============ Connections ============

export const connectionsApi = {
    getAll: () => fetchApi<ConnectionConfig[]>('/connections'),

    getById: (id: string) => fetchApi<ConnectionConfig>(`/connections/${id}`),

    create: (input: ConnectionCreateInput) =>
        fetchApi<ConnectionConfig>('/connections', {
            method: 'POST',
            body: JSON.stringify(input),
        }),

    update: (id: string, input: ConnectionUpdateInput) =>
        fetchApi<ConnectionConfig>(`/connections/${id}`, {
            method: 'PUT',
            body: JSON.stringify(input),
        }),

    delete: (id: string) =>
        fetchApi<{ success: boolean }>(`/connections/${id}`, {
            method: 'DELETE',
        }),

    test: (id: string) =>
        fetchApi<ConnectionTestResult>(`/connections/${id}/test`, {
            method: 'POST',
        }),

    testSettings: (settings: ConnectionCreateInput) =>
        fetchApi<ConnectionTestResult>('/connections/test', {
            method: 'POST',
            body: JSON.stringify(settings),
        }),

    connect: (id: string) =>
        fetchApi<{ success: boolean }>(`/connections/${id}/connect`, {
            method: 'POST',
        }),

    disconnect: (id: string) =>
        fetchApi<{ success: boolean }>(`/connections/${id}/disconnect`, {
            method: 'POST',
        }),

    getStatus: (id: string) => fetchApi<{ connected: boolean }>(`/connections/${id}/status`),
};

// ============ Queries ============

export const queriesApi = {
    execute: (connectionId: string, sql: string, confirmed?: boolean) =>
        fetchApi<QueryResult>('/queries/execute', {
            method: 'POST',
            body: JSON.stringify({ connectionId, sql, confirmed }),
        }),

    validate: (connectionId: string, sql: string) =>
        fetchApi<QueryValidationResult>('/queries/validate', {
            method: 'POST',
            body: JSON.stringify({ connectionId, sql }),
        }),

    // Saved queries
    getSaved: () => fetchApi<SavedQuery[]>('/queries/saved'),

    getSavedById: (id: string) => fetchApi<SavedQuery>(`/queries/saved/${id}`),

    createSaved: (input: { name: string; sql: string; connectionId?: string; folderId?: string }) =>
        fetchApi<SavedQuery>('/queries/saved', {
            method: 'POST',
            body: JSON.stringify(input),
        }),

    updateSaved: (
        id: string,
        input: { name?: string; sql?: string; connectionId?: string; folderId?: string }
    ) =>
        fetchApi<SavedQuery>(`/queries/saved/${id}`, {
            method: 'PUT',
            body: JSON.stringify(input),
        }),

    deleteSaved: (id: string) =>
        fetchApi<{ success: boolean }>(`/queries/saved/${id}`, {
            method: 'DELETE',
        }),

    // History
    getHistory: (connectionId?: string, limit?: number) => {
        const params = new URLSearchParams();
        if (connectionId) params.set('connectionId', connectionId);
        if (limit) params.set('limit', String(limit));
        return fetchApi<QueryHistoryEntry[]>(`/queries/history?${params}`);
    },

    clearHistory: (connectionId?: string) => {
        const params = connectionId ? `?connectionId=${connectionId}` : '';
        return fetchApi<{ cleared: number }>(`/queries/history${params}`, {
            method: 'DELETE',
        });
    },
};

// ============ Schema ============

export const schemaApi = {
    getSchemas: (connectionId: string) => fetchApi<string[]>(`/schema/${connectionId}/schemas`),

    getTables: (connectionId: string, schema?: string) => {
        const params = schema ? `?schema=${schema}` : '';
        return fetchApi<TableInfo[]>(`/schema/${connectionId}/tables${params}`);
    },

    getTableSchema: (connectionId: string, schema: string, table: string) =>
        fetchApi<TableSchema>(`/schema/${connectionId}/tables/${schema}/${table}`),

    getServerVersion: (connectionId: string) =>
        fetchApi<{ version: string }>(`/schema/${connectionId}/version`),

    // Schema diff
    compareSchemasApi: (
        sourceConnectionId: string,
        targetConnectionId: string,
        sourceSchema?: string,
        targetSchema?: string
    ) => {
        const params = new URLSearchParams();
        if (sourceSchema) params.set('sourceSchema', sourceSchema);
        if (targetSchema) params.set('targetSchema', targetSchema);
        return fetchApi<SchemaDiff>(
            `/schema/diff/${sourceConnectionId}/${targetConnectionId}?${params}`
        );
    },

    getMigrationSql: (
        sourceConnectionId: string,
        targetConnectionId: string,
        sourceSchema?: string,
        targetSchema?: string
    ) => {
        const params = new URLSearchParams();
        if (sourceSchema) params.set('sourceSchema', sourceSchema);
        if (targetSchema) params.set('targetSchema', targetSchema);
        return fetchApi<{ sql: string[] }>(
            `/schema/diff/${sourceConnectionId}/${targetConnectionId}/sql?${params}`
        );
    },

    // Apply migration
    applyMigration: (
        sourceConnectionId: string,
        targetConnectionId: string,
        sourceSchema?: string,
        targetSchema?: string,
        description?: string
    ) => {
        const params = new URLSearchParams();
        if (sourceSchema) params.set('sourceSchema', sourceSchema);
        if (targetSchema) params.set('targetSchema', targetSchema);
        return fetchApi<MigrationHistoryEntry>(
            `/schema/diff/${sourceConnectionId}/${targetConnectionId}/apply?${params}`,
            {
                method: 'POST',
                body: JSON.stringify({ description }),
            }
        );
    },

    // Migration history
    getMigrationHistory: (options?: { targetConnectionId?: string; limit?: number }) => {
        const params = new URLSearchParams();
        if (options?.targetConnectionId)
            params.set('targetConnectionId', options.targetConnectionId);
        if (options?.limit) params.set('limit', String(options.limit));
        return fetchApi<MigrationHistoryEntry[]>(`/schema/migrations?${params}`);
    },

    getMigration: (id: string) => fetchApi<MigrationHistoryEntry>(`/schema/migrations/${id}`),

    deleteMigration: (id: string) =>
        fetchApi<{ success: boolean }>(`/schema/migrations/${id}`, {
            method: 'DELETE',
        }),
};
