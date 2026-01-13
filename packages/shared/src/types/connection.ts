/**
 * Database connection types
 */

// Tags are now dynamic strings (managed in Settings)
export type ConnectionTag = string;

export type DatabaseEngine = 'postgres' | 'sqlite' | 'mysql' | 'mariadb';

/**
 * Project - top-level grouping for connections
 */
export interface Project {
    id: string;
    name: string;
    description?: string;
    color?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProjectCreateInput {
    name: string;
    description?: string;
    color?: string;
}

export interface ProjectUpdateInput {
    name?: string;
    description?: string;
    color?: string;
}

/**
 * Instance Group - groups instances of the same database within a project
 * (e.g., local/dev/staging/prod instances that should be kept in sync)
 */
export interface InstanceGroup {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    sourceConnectionId?: string;
    syncSchema: boolean;
    syncData: boolean;
    syncTargetSchema?: string; // Schema to sync (overrides connection defaultSchema)
    createdAt: Date;
    updatedAt: Date;
    // Populated from joins
    projectName?: string;
    sourceConnectionName?: string;
    connectionCount?: number;
}

export interface InstanceGroupCreateInput {
    projectId: string;
    name: string;
    description?: string;
    sourceConnectionId?: string;
    syncSchema?: boolean;
    syncData?: boolean;
    syncTargetSchema?: string;
}

export interface InstanceGroupUpdateInput {
    name?: string;
    description?: string;
    sourceConnectionId?: string | null;
    syncSchema?: boolean;
    syncData?: boolean;
    syncTargetSchema?: string | null;
}

/**
 * Sync status for an instance group
 */
export interface InstanceGroupSyncStatus {
    groupId: string;
    groupName: string;
    sourceConnectionId?: string;
    sourceConnectionName?: string;
    targets: InstanceGroupTargetStatus[];
    lastChecked?: Date;
}

export interface TableDataDiff {
    table: string;
    sourceCount: number;
    targetCount: number;
    missingInTarget: number;
    missingInSource: number;
}

export interface InstanceGroupTargetStatus {
    connectionId: string;
    connectionName: string;
    schemaStatus: 'in_sync' | 'out_of_sync' | 'error' | 'unchecked';
    schemaDiffCount?: number;
    schemaDiff?: import('./schema.js').SchemaDiff; // Full schema diff data
    migrationSql?: string[]; // Migration SQL statements
    dataStatus: 'in_sync' | 'out_of_sync' | 'error' | 'unchecked';
    dataDiffSummary?: string;
    dataDiff?: TableDataDiff[]; // Full data diff
    error?: string;
}

// Backwards compatibility aliases
export type DatabaseGroup = InstanceGroup;
export type DatabaseGroupCreateInput = InstanceGroupCreateInput;
export type DatabaseGroupUpdateInput = InstanceGroupUpdateInput;

export interface ConnectionConfig {
    id: string;
    name: string;
    engine: DatabaseEngine;
    host: string;
    port: number;
    database: string;
    username: string;
    // Password stored separately in secrets
    ssl?: boolean;
    defaultSchema?: string; // Default schema to use (e.g., 'public', 'dsops')
    tags: ConnectionTag[];
    readOnly: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Organization
    projectId?: string;
    groupId?: string;
    // Populated from joins
    projectName?: string;
    groupName?: string;
}

export interface ConnectionCreateInput {
    name: string;
    engine: DatabaseEngine;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    defaultSchema?: string;
    tags?: ConnectionTag[];
    readOnly?: boolean;
    projectId?: string;
    groupId?: string;
}

export interface ConnectionUpdateInput {
    name?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
    defaultSchema?: string;
    tags?: ConnectionTag[];
    readOnly?: boolean;
    projectId?: string | null;
    groupId?: string | null;
}

export interface ConnectionTestResult {
    success: boolean;
    message: string;
    latencyMs?: number;
    serverVersion?: string;
}
