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
    Project,
    ProjectCreateInput,
    ProjectUpdateInput,
    DatabaseGroup,
    DatabaseGroupCreateInput,
    DatabaseGroupUpdateInput,
    InstanceGroup,
    InstanceGroupSyncStatus,
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

    createSchema: (connectionId: string, name: string) =>
        fetchApi<{ success: boolean; name: string }>(`/schema/${connectionId}/schemas`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),

    deleteSchema: (connectionId: string, schemaName: string) =>
        fetchApi<{ success: boolean }>(`/schema/${connectionId}/schemas/${schemaName}`, {
            method: 'DELETE',
        }),

    getTables: (connectionId: string, schema?: string) => {
        const params = schema ? `?schema=${schema}` : '';
        return fetchApi<TableInfo[]>(`/schema/${connectionId}/tables${params}`);
    },

    getTableSchema: (connectionId: string, schema: string, table: string) =>
        fetchApi<TableSchema>(`/schema/${connectionId}/tables/${schema}/${table}`),

    getTableRowCount: (connectionId: string, schema: string, table: string) =>
        fetchApi<{ count: number }>(`/schema/${connectionId}/tables/${schema}/${table}/count`),

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

// ============ Projects ============

export const projectsApi = {
    getAll: () => fetchApi<Project[]>('/projects'),

    getById: (id: string) => fetchApi<Project>(`/projects/${id}`),

    create: (input: ProjectCreateInput) =>
        fetchApi<Project>('/projects', {
            method: 'POST',
            body: JSON.stringify(input),
        }),

    update: (id: string, input: ProjectUpdateInput) =>
        fetchApi<Project>(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(input),
        }),

    delete: (id: string) =>
        fetchApi<{ success: boolean }>(`/projects/${id}`, {
            method: 'DELETE',
        }),

    // Groups within a project
    getGroups: (projectId: string) => fetchApi<DatabaseGroup[]>(`/projects/${projectId}/groups`),

    createGroup: (projectId: string, input: Omit<DatabaseGroupCreateInput, 'projectId'>) =>
        fetchApi<DatabaseGroup>(`/projects/${projectId}/groups`, {
            method: 'POST',
            body: JSON.stringify(input),
        }),

    updateGroup: (projectId: string, groupId: string, input: DatabaseGroupUpdateInput) =>
        fetchApi<DatabaseGroup>(`/projects/${projectId}/groups/${groupId}`, {
            method: 'PUT',
            body: JSON.stringify(input),
        }),

    deleteGroup: (projectId: string, groupId: string) =>
        fetchApi<{ success: boolean }>(`/projects/${projectId}/groups/${groupId}`, {
            method: 'DELETE',
        }),

    // Connections in project/group
    getProjectConnections: (projectId: string) =>
        fetchApi<ConnectionConfig[]>(`/projects/${projectId}/connections`),

    getGroupConnections: (projectId: string, groupId: string) =>
        fetchApi<ConnectionConfig[]>(`/projects/${projectId}/groups/${groupId}/connections`),
};

// ============ Database Groups ============

export const groupsApi = {
    getAll: (projectId?: string) => {
        const params = projectId ? `?projectId=${projectId}` : '';
        return fetchApi<DatabaseGroup[]>(`/groups${params}`);
    },

    getById: (id: string) => fetchApi<DatabaseGroup>(`/groups/${id}`),

    getConnections: (groupId: string) =>
        fetchApi<ConnectionConfig[]>(`/groups/${groupId}/connections`),
};

// ============ Sync ============

export interface TableDataDiff {
    table: string;
    schema: string;
    sourceCount: number;
    targetCount: number;
    missingInTarget: number;
    missingInSource: number;
    different: number;
}

export interface DataSyncResult {
    table: string;
    schema: string;
    inserted: number;
    updated: number;
    deleted: number;
    errors: string[];
}

export const syncApi = {
    // Get sync status for an instance group
    getGroupSyncStatus: (groupId: string) =>
        fetchApi<InstanceGroupSyncStatus>(`/sync/groups/${groupId}/status`),

    // Get all groups with sync enabled
    getSyncEnabledGroups: () => fetchApi<InstanceGroup[]>('/sync/groups'),

    // Get table row counts comparison
    getTableRowCounts: (
        sourceConnectionId: string,
        targetConnectionId: string,
        schema: string = 'public'
    ) =>
        fetchApi<TableDataDiff[]>(
            `/sync/data/${sourceConnectionId}/${targetConnectionId}/counts?schema=${schema}`
        ),

    // Get detailed data diff for a table
    getTableDataDiff: (
        sourceConnectionId: string,
        targetConnectionId: string,
        schema: string,
        table: string,
        primaryKeys: string[]
    ) =>
        fetchApi<{
            missingInTarget: Record<string, unknown>[];
            missingInSource: Record<string, unknown>[];
            different: { source: Record<string, unknown>; target: Record<string, unknown> }[];
        }>(
            `/sync/data/${sourceConnectionId}/${targetConnectionId}/diff/${schema}/${table}?primaryKeys=${primaryKeys.join(',')}`
        ),

    // Sync data for a specific table
    syncTableData: (
        sourceConnectionId: string,
        targetConnectionId: string,
        schema: string,
        table: string,
        options: {
            primaryKeys: string[];
            insertMissing?: boolean;
            updateDifferent?: boolean;
            deleteExtra?: boolean;
        }
    ) =>
        fetchApi<DataSyncResult>(
            `/sync/data/${sourceConnectionId}/${targetConnectionId}/sync/${schema}/${table}`,
            {
                method: 'POST',
                body: JSON.stringify(options),
            }
        ),

    // Sync all tables in a group
    syncAllTables: (
        groupId: string,
        targetConnectionId: string,
        schema: string = 'public',
        options?: {
            insertMissing?: boolean;
            updateDifferent?: boolean;
            deleteExtra?: boolean;
        }
    ) =>
        fetchApi<DataSyncResult[]>(
            `/sync/groups/${groupId}/sync-all?targetConnectionId=${targetConnectionId}&schema=${schema}`,
            {
                method: 'POST',
                body: JSON.stringify(options || {}),
            }
        ),

    // Sync specific rows to a target connection by primary key values
    syncRows: (
        sourceConnectionId: string,
        targetConnectionId: string,
        sourceSchema: string,
        targetSchema: string,
        table: string,
        rowIds: Record<string, unknown>[], // Array of primary key value objects
        primaryKeys: string[],
        mode: 'insert' | 'upsert' = 'upsert'
    ) =>
        fetchApi<{ inserted: number; updated: number; errors: string[] }>(
            `/sync/rows/${targetConnectionId}/${encodeURIComponent(targetSchema)}/${encodeURIComponent(table)}`,
            {
                method: 'POST',
                body: JSON.stringify({
                    sourceConnectionId,
                    sourceSchema,
                    rowIds,
                    primaryKeys,
                    mode,
                }),
            }
        ),

    // Dump and restore all data from source to target (handles FK constraints)
    dumpAndRestore: (
        sourceConnectionId: string,
        targetConnectionId: string,
        schema: string = 'public',
        options?: {
            truncateTarget?: boolean;
            tables?: string[];
        }
    ) =>
        fetchApi<{
            success: boolean;
            tablesProcessed: number;
            rowsCopied: number;
            errors: string[];
            tableResults: { table: string; rows: number; error?: string }[];
        }>(
            `/sync/dump-restore/${sourceConnectionId}/${targetConnectionId}?schema=${encodeURIComponent(schema)}`,
            {
                method: 'POST',
                body: JSON.stringify(options || {}),
            }
        ),
};
