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

export interface SchemaDiffItem {
    type:
        | 'table_added'
        | 'table_removed'
        | 'column_added'
        | 'column_removed'
        | 'column_changed'
        | 'index_added'
        | 'index_removed';
    schema: string;
    table: string;
    column?: string;
    index?: string;
    details: Record<string, unknown>;
}

export interface SchemaDiff {
    sourceConnectionId: string;
    targetConnectionId: string;
    generatedAt: Date;
    items: SchemaDiffItem[];
    migrationSql: string[];
}
