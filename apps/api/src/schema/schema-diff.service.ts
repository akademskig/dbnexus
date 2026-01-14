import { Injectable, Logger } from '@nestjs/common';
import { SchemaService } from './schema.service.js';
import type {
    SchemaDiff,
    SchemaDiffItem,
    TableSchema,
    ColumnInfo,
    IndexInfo,
    ForeignKeyInfo,
    DiffType,
    DatabaseEngine,
} from '@dbnexus/shared';
import { MetadataService } from '../metadata/metadata.service.js';
import {
    parseColumnArray,
    normalizeDefaultForComparison,
    generateCreateTableSql,
    generateDropTableSql,
    generateAddColumnSql,
    generateDropColumnSql,
    generateAlterColumnSql,
    generateCreateIndexSql,
    generateDropIndexSql,
    generateAddForeignKeySql,
    generateDropForeignKeySql,
} from './sql-generator.js';

@Injectable()
export class SchemaDiffService {
    private readonly logger = new Logger(SchemaDiffService.name);

    constructor(
        private readonly schemaService: SchemaService,
        private readonly metadataService: MetadataService
    ) {}

    /**
     * Compare schemas between two connections
     */
    async compareSchemas(
        sourceConnectionId: string,
        targetConnectionId: string,
        sourceSchema: string = 'public',
        targetSchema: string = 'public'
    ): Promise<SchemaDiff> {
        this.logger.log(
            `Comparing schemas: ${sourceConnectionId}:${sourceSchema} -> ${targetConnectionId}:${targetSchema}`
        );

        // Get connection info to determine engines
        const sourceConn = this.metadataService.connectionRepository.findById(sourceConnectionId);
        const targetConn = this.metadataService.connectionRepository.findById(targetConnectionId);

        if (!sourceConn || !targetConn) {
            throw new Error('One or both connections not found');
        }

        const engine = targetConn.engine;

        // Get tables from both schemas
        const sourceTables = await this.schemaService.getTables(sourceConnectionId, sourceSchema);
        const targetTables = await this.schemaService.getTables(targetConnectionId, targetSchema);

        const sourceTableNames = new Set(sourceTables.map((t) => t.name));
        const targetTableNames = new Set(targetTables.map((t) => t.name));

        const items: SchemaDiffItem[] = [];

        // Find tables only in source (to be added to target)
        for (const table of sourceTables) {
            if (!targetTableNames.has(table.name)) {
                const tableSchema = await this.schemaService.getTableSchema(
                    sourceConnectionId,
                    sourceSchema,
                    table.name
                );
                items.push({
                    type: 'table_added',
                    schema: targetSchema,
                    table: table.name,
                    source: tableSchema,
                    migrationSql: generateCreateTableSql(tableSchema, engine),
                });
            }
        }

        // Find tables only in target (to be removed)
        for (const table of targetTables) {
            if (!sourceTableNames.has(table.name)) {
                const tableSchema = await this.schemaService.getTableSchema(
                    targetConnectionId,
                    targetSchema,
                    table.name
                );
                items.push({
                    type: 'table_removed',
                    schema: targetSchema,
                    table: table.name,
                    target: tableSchema,
                    migrationSql: [generateDropTableSql(targetSchema, table.name, engine)],
                });
            }
        }

        // Compare tables that exist in both
        for (const table of sourceTables) {
            if (targetTableNames.has(table.name)) {
                const sourceTableSchema = await this.schemaService.getTableSchema(
                    sourceConnectionId,
                    sourceSchema,
                    table.name
                );
                const targetTableSchema = await this.schemaService.getTableSchema(
                    targetConnectionId,
                    targetSchema,
                    table.name
                );

                // Compare columns
                const columnDiffs = this.compareColumns(
                    sourceTableSchema,
                    targetTableSchema,
                    targetSchema,
                    engine
                );
                items.push(...columnDiffs);

                // Compare indexes
                const indexDiffs = this.compareIndexes(
                    sourceTableSchema,
                    targetTableSchema,
                    targetSchema,
                    engine
                );
                items.push(...indexDiffs);

                // Compare foreign keys
                const fkDiffs = this.compareForeignKeys(
                    sourceTableSchema,
                    targetTableSchema,
                    targetSchema,
                    engine
                );
                items.push(...fkDiffs);
            }
        }

        // Calculate summary
        const summary = {
            tablesAdded: items.filter((i) => i.type === 'table_added').length,
            tablesRemoved: items.filter((i) => i.type === 'table_removed').length,
            columnsAdded: items.filter((i) => i.type === 'column_added').length,
            columnsRemoved: items.filter((i) => i.type === 'column_removed').length,
            columnsModified: items.filter((i) => i.type === 'column_modified').length,
            indexesAdded: items.filter((i) => i.type === 'index_added').length,
            indexesRemoved: items.filter((i) => i.type === 'index_removed').length,
            indexesModified: items.filter((i) => i.type === 'index_modified').length,
            fksAdded: items.filter((i) => i.type === 'fk_added').length,
            fksRemoved: items.filter((i) => i.type === 'fk_removed').length,
            fksModified: items.filter((i) => i.type === 'fk_modified').length,
        };

        this.logger.log(`Schema diff complete: ${items.length} differences found`);

        return {
            sourceConnectionId,
            targetConnectionId,
            sourceSchema,
            targetSchema,
            generatedAt: new Date().toISOString(),
            items,
            summary,
        };
    }

    /**
     * Compare columns between two table schemas
     */
    private compareColumns(
        source: TableSchema,
        target: TableSchema,
        targetSchema: string,
        engine: DatabaseEngine
    ): SchemaDiffItem[] {
        const items: SchemaDiffItem[] = [];
        const sourceColumns = new Map(source.columns.map((c) => [c.name, c]));
        const targetColumns = new Map(target.columns.map((c) => [c.name, c]));

        // Columns to add
        for (const [name, col] of sourceColumns) {
            if (!targetColumns.has(name)) {
                items.push({
                    type: 'column_added',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    source: col,
                    migrationSql: [generateAddColumnSql(targetSchema, target.name, col, engine)],
                });
            }
        }

        // Columns to remove
        for (const [name, col] of targetColumns) {
            if (!sourceColumns.has(name)) {
                items.push({
                    type: 'column_removed',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    target: col,
                    migrationSql: [generateDropColumnSql(targetSchema, target.name, name, engine)],
                });
            }
        }

        // Columns that might be modified
        for (const [name, sourceCol] of sourceColumns) {
            const targetCol = targetColumns.get(name);
            if (targetCol && !this.columnsEqual(sourceCol, targetCol)) {
                items.push({
                    type: 'column_modified',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    source: sourceCol,
                    target: targetCol,
                    migrationSql: generateAlterColumnSql(
                        targetSchema,
                        target.name,
                        sourceCol,
                        targetCol,
                        engine
                    ),
                });
            }
        }

        return items;
    }

    /**
     * Compare indexes between two table schemas
     */
    private compareIndexes(
        source: TableSchema,
        target: TableSchema,
        targetSchema: string,
        engine: DatabaseEngine
    ): SchemaDiffItem[] {
        const items: SchemaDiffItem[] = [];

        // Filter out primary key indexes (handled separately)
        const sourceIndexes = source.indexes.filter((i) => !i.isPrimary);
        const targetIndexes = target.indexes.filter((i) => !i.isPrimary);

        const sourceIdxMap = new Map(sourceIndexes.map((i) => [i.name, i]));
        const targetIdxMap = new Map(targetIndexes.map((i) => [i.name, i]));

        // Indexes to add
        for (const [name, idx] of sourceIdxMap) {
            if (!targetIdxMap.has(name)) {
                items.push({
                    type: 'index_added',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    source: idx,
                    migrationSql: [generateCreateIndexSql(targetSchema, target.name, idx, engine)],
                });
            }
        }

        // Indexes to remove
        for (const [name, idx] of targetIdxMap) {
            if (!sourceIdxMap.has(name)) {
                items.push({
                    type: 'index_removed',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    target: idx,
                    migrationSql: [generateDropIndexSql(targetSchema, target.name, name, engine)],
                });
            }
        }

        // Indexes that might be modified
        for (const [name, sourceIdx] of sourceIdxMap) {
            const targetIdx = targetIdxMap.get(name);
            if (targetIdx && !this.indexesEqual(sourceIdx, targetIdx)) {
                items.push({
                    type: 'index_modified',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    source: sourceIdx,
                    target: targetIdx,
                    migrationSql: [
                        generateDropIndexSql(targetSchema, target.name, name, engine),
                        generateCreateIndexSql(targetSchema, target.name, sourceIdx, engine),
                    ],
                });
            }
        }

        return items;
    }

    /**
     * Compare foreign keys between two table schemas
     */
    private compareForeignKeys(
        source: TableSchema,
        target: TableSchema,
        targetSchema: string,
        engine: DatabaseEngine
    ): SchemaDiffItem[] {
        const items: SchemaDiffItem[] = [];
        const sourceFks = new Map(source.foreignKeys.map((fk) => [fk.name, fk]));
        const targetFks = new Map(target.foreignKeys.map((fk) => [fk.name, fk]));

        // FKs to add
        for (const [name, fk] of sourceFks) {
            if (!targetFks.has(name)) {
                items.push({
                    type: 'fk_added',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    source: fk,
                    migrationSql: [generateAddForeignKeySql(targetSchema, target.name, fk, engine)],
                });
            }
        }

        // FKs to remove
        for (const [name, fk] of targetFks) {
            if (!sourceFks.has(name)) {
                items.push({
                    type: 'fk_removed',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    target: fk,
                    migrationSql: [
                        generateDropForeignKeySql(targetSchema, target.name, name, engine),
                    ],
                });
            }
        }

        // FKs that might be modified
        for (const [name, sourceFk] of sourceFks) {
            const targetFk = targetFks.get(name);
            if (targetFk && !this.foreignKeysEqual(sourceFk, targetFk)) {
                items.push({
                    type: 'fk_modified',
                    schema: targetSchema,
                    table: target.name,
                    name,
                    source: sourceFk,
                    target: targetFk,
                    migrationSql: [
                        generateDropForeignKeySql(targetSchema, target.name, name, engine),
                        generateAddForeignKeySql(targetSchema, target.name, sourceFk, engine),
                    ],
                });
            }
        }

        return items;
    }

    /**
     * Check if two columns are equal
     */
    private columnsEqual(a: ColumnInfo, b: ColumnInfo): boolean {
        // Normalize defaults for comparison (e.g., now() vs CURRENT_TIMESTAMP are equivalent)
        const aDefault = normalizeDefaultForComparison(a.defaultValue);
        const bDefault = normalizeDefaultForComparison(b.defaultValue);

        return (
            a.dataType.toLowerCase() === b.dataType.toLowerCase() &&
            a.nullable === b.nullable &&
            aDefault === bDefault &&
            a.isPrimaryKey === b.isPrimaryKey &&
            a.isUnique === b.isUnique
        );
    }

    /**
     * Check if two indexes are equal
     */
    private indexesEqual(a: IndexInfo, b: IndexInfo): boolean {
        const aColumns = [...parseColumnArray(a.columns)].sort((x, y) => x.localeCompare(y));
        const bColumns = [...parseColumnArray(b.columns)].sort((x, y) => x.localeCompare(y));
        return a.isUnique === b.isUnique && JSON.stringify(aColumns) === JSON.stringify(bColumns);
    }

    /**
     * Check if two foreign keys are equal
     */
    private foreignKeysEqual(a: ForeignKeyInfo, b: ForeignKeyInfo): boolean {
        const aColumns = [...parseColumnArray(a.columns)].sort((x, y) => x.localeCompare(y));
        const bColumns = [...parseColumnArray(b.columns)].sort((x, y) => x.localeCompare(y));
        const aRefColumns = [...parseColumnArray(a.referencedColumns)].sort((x, y) =>
            x.localeCompare(y)
        );
        const bRefColumns = [...parseColumnArray(b.referencedColumns)].sort((x, y) =>
            x.localeCompare(y)
        );
        return (
            JSON.stringify(aColumns) === JSON.stringify(bColumns) &&
            a.referencedTable === b.referencedTable &&
            a.referencedSchema === b.referencedSchema &&
            JSON.stringify(aRefColumns) === JSON.stringify(bRefColumns) &&
            a.onDelete === b.onDelete &&
            a.onUpdate === b.onUpdate
        );
    }

    /**
     * Get all migration SQL from a diff
     */
    getMigrationSql(diff: SchemaDiff): string[] {
        const sql: string[] = [];

        // Order: drop FKs first, then drop indexes, then modify tables, then add tables, then add indexes, then add FKs
        const orderedTypes: DiffType[] = [
            'fk_removed',
            'fk_modified',
            'index_removed',
            'index_modified',
            'column_removed',
            'column_modified',
            'table_removed',
            'table_added',
            'column_added',
            'index_added',
            'fk_added',
        ];

        for (const type of orderedTypes) {
            for (const item of diff.items.filter((i) => i.type === type)) {
                if (item.migrationSql) {
                    sql.push(...item.migrationSql);
                }
            }
        }

        return sql;
    }
}
