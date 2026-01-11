/**
 * Database connection types
 */

// Tags are now dynamic strings (managed in Settings)
export type ConnectionTag = string;

export type DatabaseEngine = 'postgres' | 'sqlite';

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
    tags: ConnectionTag[];
    readOnly: boolean;
    createdAt: Date;
    updatedAt: Date;
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
    tags?: ConnectionTag[];
    readOnly?: boolean;
}

export interface ConnectionUpdateInput {
    name?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
    tags?: ConnectionTag[];
    readOnly?: boolean;
}

export interface ConnectionTestResult {
    success: boolean;
    message: string;
    latencyMs?: number;
    serverVersion?: string;
}
