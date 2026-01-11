/**
 * Workspace configuration types
 */

export interface WorkspaceConfig {
    version: string;
    name?: string;
    createdAt: Date;
}

export interface WorkspaceExport {
    version: string;
    exportedAt: Date;
    connections: ExportedConnection[];
    savedQueries: ExportedQuery[];
    folders: ExportedFolder[];
    syncConfigs: ExportedSyncConfig[];
}

export interface ExportedConnection {
    name: string;
    engine: string;
    host: string;
    port: number;
    database: string;
    username: string;
    ssl?: boolean;
    tags: string[];
    readOnly: boolean;
    // Password NOT included by default
    includePassword?: boolean;
    encryptedPassword?: string;
}

export interface ExportedQuery {
    name: string;
    sql: string;
    folderPath?: string;
}

export interface ExportedFolder {
    path: string;
}

export interface ExportedSyncConfig {
    name: string;
    sourceConnectionName: string;
    targetConnectionName: string;
    sourceTable: string;
    targetTable: string;
    primaryKeyColumns: string[];
    conflictStrategy: string;
    timestampColumn?: string;
    batchSize: number;
}
