/**
 * Database schema introspection types
 */

export interface TableInfo {
    schema: string;
    name: string;
    type: 'table' | 'view';
    rowCount?: number;
    sizeBytes?: number;
}

export interface ColumnInfo {
    name: string;
    dataType: string;
    nullable: boolean;
    defaultValue: string | null;
    isPrimaryKey: boolean;
    isUnique: boolean;
    comment?: string;
}

export interface IndexInfo {
    name: string;
    columns: string[];
    isUnique: boolean;
    isPrimary: boolean;
    type: string;
}

export interface ForeignKeyInfo {
    name: string;
    columns: string[];
    referencedTable: string;
    referencedSchema: string;
    referencedColumns: string[];
    onDelete: string;
    onUpdate: string;
}

export interface TableSchema {
    schema: string;
    name: string;
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    foreignKeys: ForeignKeyInfo[];
    primaryKey: string[];
}

export interface SchemaSnapshot {
    id: string;
    connectionId: string;
    capturedAt: Date;
    tables: TableSchema[];
}

export type DiffType =
    | 'table_added'
    | 'table_removed'
    | 'column_added'
    | 'column_removed'
    | 'column_modified'
    | 'index_added'
    | 'index_removed'
    | 'index_modified'
    | 'fk_added'
    | 'fk_removed'
    | 'fk_modified';

export interface SchemaDiffItem {
    type: DiffType;
    schema: string;
    table: string;
    name?: string; // column, index, or FK name
    source?: ColumnInfo | IndexInfo | ForeignKeyInfo | TableSchema;
    target?: ColumnInfo | IndexInfo | ForeignKeyInfo | TableSchema;
    migrationSql?: string[];
}

export interface SchemaDiff {
    sourceConnectionId: string;
    targetConnectionId: string;
    sourceSchema: string;
    targetSchema: string;
    generatedAt: string;
    items: SchemaDiffItem[];
    summary: {
        tablesAdded: number;
        tablesRemoved: number;
        columnsAdded: number;
        columnsRemoved: number;
        columnsModified: number;
        indexesAdded: number;
        indexesRemoved: number;
        indexesModified: number;
        fksAdded: number;
        fksRemoved: number;
        fksModified: number;
    };
}

export interface MigrationHistoryEntry {
    id: string;
    sourceConnectionId: string;
    targetConnectionId: string;
    sourceSchema: string;
    targetSchema: string;
    description?: string;
    sqlStatements: string[];
    appliedAt: string;
    success: boolean;
    error?: string;
    // Populated from joins
    sourceConnectionName?: string;
    targetConnectionName?: string;
}
