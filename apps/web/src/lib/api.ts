/**
 * API client for DB Nexus backend
 */

import type {
    ConnectionConfig,
    ConnectionCreateInput,
    ConnectionUpdateInput,
    ConnectionTestResult,
    ServerConfig,
    ServerCreateInput,
    ServerUpdateInput,
    QueryResult,
    QueryValidationResult,
    SavedQuery,
    QueryHistoryEntry,
    TableInfo,
    TableSchema,
    SchemaDiff,
    MigrationLogEntry,
    Project,
    ProjectCreateInput,
    ProjectUpdateInput,
    DatabaseGroup,
    DatabaseGroupCreateInput,
    DatabaseGroupUpdateInput,
    InstanceGroup,
    InstanceGroupSyncStatus,
    InstanceGroupTargetStatus,
    BackupType,
    DatabaseEngine,
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
        // If the error has requiresConfirmation, serialize the whole object so it can be parsed
        if (error.requiresConfirmation) {
            throw new Error(JSON.stringify(error));
        }
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

// ============ Servers ============

export const serversApi = {
    getAll: (engine?: DatabaseEngine) => {
        const params = engine ? `?engine=${engine}` : '';
        return fetchApi<ServerConfig[]>(`/servers${params}`);
    },

    getById: (id: string) => fetchApi<ServerConfig>(`/servers/${id}`),

    getDatabases: (id: string) => fetchApi<ConnectionConfig[]>(`/servers/${id}/databases`),

    create: (input: ServerCreateInput) =>
        fetchApi<ServerConfig>('/servers', {
            method: 'POST',
            body: JSON.stringify(input),
        }),

    update: (id: string, input: ServerUpdateInput) =>
        fetchApi<ServerConfig>(`/servers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(input),
        }),

    delete: (id: string) =>
        fetchApi<{ success: boolean; message?: string }>(`/servers/${id}`, {
            method: 'DELETE',
        }),

    test: (id: string) =>
        fetchApi<{ success: boolean; message: string }>(`/servers/${id}/test`, {
            method: 'POST',
        }),

    getPassword: (id: string) => fetchApi<{ password: string | null }>(`/servers/${id}/password`),

    createDatabase: (
        id: string,
        input: { databaseName: string; username?: string; password?: string }
    ) =>
        fetchApi<{ success: boolean; message: string }>(`/servers/${id}/create-database`, {
            method: 'POST',
            body: JSON.stringify(input),
        }),

    listDatabases: (id: string) =>
        fetchApi<{
            success: boolean;
            databases?: Array<{
                name: string;
                size: string;
                owner?: string;
                tracked: boolean;
                connectionId?: string;
            }>;
            message?: string;
        }>(`/servers/${id}/list-databases`),

    getInfo: (id: string) =>
        fetchApi<{
            success: boolean;
            info?: {
                version: string;
                uptime: string;
                activeConnections: number;
                maxConnections: number;
                currentDatabase: string;
            };
            message?: string;
        }>(`/servers/${id}/info`),

    dropDatabase: (id: string, dbName: string) =>
        fetchApi<{ success: boolean; message: string }>(`/servers/${id}/databases/${dbName}`, {
            method: 'DELETE',
        }),
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

    explain: (connectionId: string, sql: string, analyze?: boolean) =>
        fetchApi<{
            plan: unknown;
            planText: string;
            insights: { type: string; message: string }[];
            suggestions: string[];
        }>('/queries/explain', {
            method: 'POST',
            body: JSON.stringify({ connectionId, sql, analyze }),
        }),

    executeMaintenance: (
        connectionId: string,
        operation: string,
        target?: string,
        scope?: 'database' | 'schema' | 'table'
    ) =>
        fetchApi<{
            success: boolean;
            message: string;
            details?: string[];
            duration: number;
        }>('/queries/maintenance', {
            method: 'POST',
            body: JSON.stringify({ connectionId, operation, target, scope }),
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
        return fetchApi<MigrationLogEntry>(
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
        return fetchApi<MigrationLogEntry[]>(`/schema/migrations?${params}`);
    },

    getMigration: (id: string) => fetchApi<MigrationLogEntry>(`/schema/migrations/${id}`),

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

    // Check sync status for a single target connection in a group
    checkSingleTargetStatus: (groupId: string, targetConnectionId: string) =>
        fetchApi<InstanceGroupTargetStatus>(`/sync/groups/${groupId}/status/${targetConnectionId}`),

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

    // Get sync run history
    getSyncRuns: (limit?: number) =>
        fetchApi<SyncRun[]>(`/sync/runs${limit ? `?limit=${limit}` : ''}`),
};

// SyncRun type for the activity log
export interface SyncRun {
    id: string;
    sourceConnectionId?: string;
    targetConnectionId?: string;
    schemaName?: string;
    tableName?: string;
    groupId?: string;
    startedAt: string;
    completedAt?: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    inserts: number;
    updates: number;
    deletes: number;
    errors: string[];
    sqlStatements: string[];
    sourceConnectionName?: string;
    targetConnectionName?: string;
    groupName?: string;
}

// ============ Scanner ============

export interface DiscoveredConnection {
    name: string;
    engine: 'postgres' | 'mysql' | 'mariadb' | 'sqlite';
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    filepath?: string;
    source: 'port-scan' | 'docker' | 'env-file' | 'docker-compose' | 'sqlite-file' | 'config-file';
    confidence: 'high' | 'medium' | 'low';
    details?: string;
}

export interface ScanResult {
    connections: DiscoveredConnection[];
    scannedSources: string[];
    errors: string[];
}

export const scannerApi = {
    // Scan for all database connections
    scanAll: (workspace?: string) =>
        fetchApi<ScanResult>(
            `/scanner/scan${workspace ? `?workspace=${encodeURIComponent(workspace)}` : ''}`
        ),

    // Scan only local ports
    scanPorts: () => fetchApi<DiscoveredConnection[]>('/scanner/scan/ports'),

    // Scan Docker containers
    scanDocker: () => fetchApi<DiscoveredConnection[]>('/scanner/scan/docker'),

    // Scan .env files
    scanEnvFiles: (workspace?: string) =>
        fetchApi<DiscoveredConnection[]>(
            `/scanner/scan/env${workspace ? `?workspace=${encodeURIComponent(workspace)}` : ''}`
        ),

    // Scan docker-compose files
    scanDockerCompose: (workspace?: string) =>
        fetchApi<DiscoveredConnection[]>(
            `/scanner/scan/compose${workspace ? `?workspace=${encodeURIComponent(workspace)}` : ''}`
        ),

    // Scan for SQLite files
    scanSqliteFiles: (workspace?: string) =>
        fetchApi<DiscoveredConnection[]>(
            `/scanner/scan/sqlite${workspace ? `?workspace=${encodeURIComponent(workspace)}` : ''}`
        ),
};

// ============ Audit Logs API ============

export interface AuditLogEntry {
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    connectionId?: string;
    details?: Record<string, unknown>;
    createdAt: string;
    connectionName?: string;
}

export const auditApi = {
    getLogs: (params?: {
        connectionId?: string;
        entityType?: string;
        action?: string;
        limit?: number;
    }) => {
        const searchParams = new URLSearchParams();
        if (params?.connectionId) searchParams.set('connectionId', params.connectionId);
        if (params?.entityType) searchParams.set('entityType', params.entityType);
        if (params?.action) searchParams.set('action', params.action);
        if (params?.limit) searchParams.set('limit', params.limit.toString());

        const query = searchParams.toString();
        return fetchApi<AuditLogEntry[]>(`/audit/logs${query ? `?${query}` : ''}`);
    },

    getLog: (id: string) => fetchApi<AuditLogEntry>(`/audit/logs/${id}`),
};

// Backup API
export interface Backup {
    id: string;
    connectionId: string;
    filename: string;
    filePath: string;
    fileSize: number;
    databaseName: string;
    databaseEngine: string;
    backupType: BackupType;
    method: 'native' | 'sql';
    compression: 'none' | 'gzip';
    status: 'in_progress' | 'completed' | 'failed';
    error?: string;
    createdAt: string;
}

export interface BackupLog {
    id: string;
    operation: 'backup_created' | 'backup_restored' | 'backup_deleted' | 'backup_uploaded';
    backupId?: string;
    connectionId: string;
    databaseName: string;
    databaseEngine: string;
    backupType?: string;
    method?: string;
    fileSize?: number;
    duration?: number;
    status: 'success' | 'failed';
    error?: string;
    createdAt: string;
    connectionName?: string;
    backupFilename?: string;
}

export const backupsApi = {
    create: (data: {
        connectionId: string;
        backupType?: BackupType;
        compression?: boolean;
        method?: 'native' | 'sql';
    }): Promise<Backup> => {
        return fetchApi('/backups', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    checkTools: (): Promise<{
        tools: Array<{ name: string; command: string; installed: boolean; version?: string }>;
        allInstalled: boolean;
        instructions: { platform: string; instructions: string[]; canAutoInstall: boolean };
    }> => {
        return fetchApi('/backups/tools/status');
    },

    installTools: (): Promise<{ success: boolean; message: string; output?: string }> => {
        return fetchApi('/backups/tools/install', { method: 'POST' });
    },

    getAll: (connectionId?: string): Promise<Backup[]> => {
        const query = connectionId ? `?connectionId=${connectionId}` : '';
        return fetchApi(`/backups${query}`);
    },

    getById: (id: string): Promise<Backup> => {
        return fetchApi(`/backups/${id}`);
    },

    download: (id: string): string => {
        return `${API_BASE}/backups/${id}/download`;
    },

    upload: async (connectionId: string, file: File): Promise<Backup> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('connectionId', connectionId);

        const response = await fetch(`${API_BASE}/backups/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    },

    restore: (
        backupId: string,
        connectionId: string,
        method?: 'native' | 'sql'
    ): Promise<{ success: boolean; message: string }> => {
        return fetchApi(`/backups/${backupId}/restore`, {
            method: 'POST',
            body: JSON.stringify({ connectionId, method }),
        });
    },

    delete: (id: string): Promise<{ success: boolean; message: string }> => {
        return fetchApi(`/backups/${id}`, {
            method: 'DELETE',
        });
    },

    getLogs: (params?: {
        connectionId?: string;
        operation?: string;
        limit?: number;
    }): Promise<BackupLog[]> => {
        const searchParams = new URLSearchParams();
        if (params?.connectionId) searchParams.append('connectionId', params.connectionId);
        if (params?.operation) searchParams.append('operation', params.operation);
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return fetchApi(`/backups/logs${query}`);
    },

    getLogById: (id: string): Promise<BackupLog> => {
        return fetchApi(`/backups/logs/${id}`);
    },
};

// ============ Settings ============

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export const settingsApi = {
    getAll: (): Promise<Record<string, unknown>> => {
        return fetchApi('/settings');
    },

    get: <T>(key: string): Promise<T> => {
        return fetchApi(`/settings/${key}`);
    },

    set: <T>(key: string, value: T): Promise<{ success: boolean }> => {
        return fetchApi(`/settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value }),
        });
    },

    delete: (key: string): Promise<{ success: boolean }> => {
        return fetchApi(`/settings/${key}`, {
            method: 'DELETE',
        });
    },

    // Tag-specific endpoints
    getTags: (): Promise<Tag[]> => {
        return fetchApi('/settings/tags/all');
    },

    createTag: (tag: Omit<Tag, 'id'>): Promise<Tag> => {
        return fetchApi('/settings/tags', {
            method: 'POST',
            body: JSON.stringify(tag),
        });
    },

    updateTag: (id: string, updates: Partial<Omit<Tag, 'id'>>): Promise<Tag | null> => {
        return fetchApi(`/settings/tags/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    deleteTag: (id: string): Promise<{ success: boolean }> => {
        return fetchApi(`/settings/tags/${id}`, {
            method: 'DELETE',
        });
    },

    resetTags: (): Promise<Tag[]> => {
        return fetchApi('/settings/tags/reset', {
            method: 'POST',
        });
    },
};
