export interface DatabaseBackup {
    id: string;
    connectionId: string;
    connectionName: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    format: 'sql' | 'custom' | 'tar' | 'directory';
    compressed: boolean;
    includeData: boolean;
    includeSchema: boolean;
    schemas?: string[];
    tables?: string[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    error?: string;
    createdAt: Date;
    completedAt?: Date;
    durationMs?: number;
}

export interface BackupCreateRequest {
    connectionId: string;
    includeData?: boolean;
    includeSchema?: boolean;
    schemas?: string[];
    tables?: string[];
    compressed?: boolean;
    format?: 'sql' | 'custom' | 'tar' | 'directory';
}

export interface BackupRestoreRequest {
    backupId: string;
    targetConnectionId?: string; // If not provided, restore to original connection
    dropExisting?: boolean;
}

export interface BackupStats {
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    backupsByConnection: Record<string, number>;
}
