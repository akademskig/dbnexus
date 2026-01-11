/**
 * Query execution types
 */

export interface QueryResult {
    columns: QueryColumn[];
    rows: Record<string, unknown>[];
    rowCount: number;
    executionTimeMs: number;
    truncated: boolean;
}

export interface QueryColumn {
    name: string;
    dataType: string;
}

export interface SavedQuery {
    id: string;
    name: string;
    sql: string;
    connectionId?: string;
    folderId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface QueryFolder {
    id: string;
    name: string;
    parentId?: string;
    createdAt: Date;
}

export interface QueryHistoryEntry {
    id: string;
    connectionId: string;
    sql: string;
    executedAt: Date;
    executionTimeMs: number;
    rowCount: number;
    success: boolean;
    error?: string;
}

export type DangerousQueryType = 'UPDATE_NO_WHERE' | 'DELETE_NO_WHERE' | 'DROP' | 'TRUNCATE';

export interface QueryValidationResult {
    isValid: boolean;
    isDangerous: boolean;
    dangerousType?: DangerousQueryType;
    message?: string;
    requiresConfirmation: boolean;
}
