/**
 * Data sync types
 */

export type ConflictStrategy = 'source_wins' | 'target_wins' | 'newest_wins';

export interface DataSyncConfig {
    id: string;
    name: string;
    sourceConnectionId: string;
    targetConnectionId: string;
    sourceTable: string;
    targetTable: string;
    primaryKeyColumns: string[];
    conflictStrategy: ConflictStrategy;
    timestampColumn?: string; // For 'newest_wins' strategy
    batchSize: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface DataSyncPreview {
    inserts: number;
    updates: number;
    deletes: number;
    conflicts: number;
    sampleChanges: DataSyncChange[];
}

export interface DataSyncChange {
    type: 'insert' | 'update' | 'delete';
    primaryKey: Record<string, unknown>;
    sourceRow?: Record<string, unknown>;
    targetRow?: Record<string, unknown>;
    changedColumns?: string[];
}

export interface DataSyncResult {
    id: string;
    syncConfigId: string;
    startedAt: Date;
    completedAt: Date;
    status: 'success' | 'partial' | 'failed';
    inserts: number;
    updates: number;
    deletes: number;
    errors: DataSyncError[];
}

export interface DataSyncError {
    type: 'insert' | 'update' | 'delete';
    primaryKey: Record<string, unknown>;
    message: string;
}

export interface SchemaSyncJob {
    id: string;
    sourceConnectionId: string;
    targetConnectionId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    diff?: SchemaDiffSummary;
    migrationSql?: string[];
    appliedAt?: Date;
    createdAt: Date;
}

export interface SchemaDiffSummary {
    tablesAdded: number;
    tablesRemoved: number;
    columnsAdded: number;
    columnsRemoved: number;
    columnsChanged: number;
    indexesAdded: number;
    indexesRemoved: number;
}
