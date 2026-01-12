import { Injectable, Logger } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { SchemaDiffService } from '../schema/schema-diff.service.js';
import type {
    InstanceGroup,
    InstanceGroupSyncStatus,
    InstanceGroupTargetStatus,
    ConnectionConfig,
    DatabaseEngine,
} from '@dbnexus/shared';

// Helper to quote identifiers based on database engine
function quoteIdentifier(name: string, engine: DatabaseEngine): string {
    if (engine === 'mysql' || engine === 'mariadb') {
        return `\`${name}\``;
    }
    return `"${name}"`;
}

function quoteTableRef(schema: string, table: string, engine: DatabaseEngine): string {
    if (engine === 'sqlite') {
        return quoteIdentifier(table, engine);
    }
    return `${quoteIdentifier(schema, engine)}.${quoteIdentifier(table, engine)}`;
}

// Helper to get placeholder syntax for parameterized queries
function getPlaceholder(index: number, engine: DatabaseEngine): string {
    if (engine === 'mysql' || engine === 'mariadb') {
        return '?';
    }
    return `$${index}`;
}

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

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(
        private readonly metadataService: MetadataService,
        private readonly connectionsService: ConnectionsService,
        private readonly schemaDiffService: SchemaDiffService
    ) {}

    /**
     * Get sync status for an instance group
     */
    async getGroupSyncStatus(groupId: string): Promise<InstanceGroupSyncStatus | null> {
        const group = this.metadataService.databaseGroupRepository.findById(groupId);
        if (!group) return null;

        const connections = this.metadataService.connectionRepository.findByGroup(groupId);
        if (connections.length === 0) {
            return {
                groupId: group.id,
                groupName: group.name,
                sourceConnectionId: group.sourceConnectionId,
                sourceConnectionName: group.sourceConnectionName,
                targets: [],
                lastChecked: new Date(),
            };
        }

        // If no source is set, return unchecked status
        if (!group.sourceConnectionId) {
            return {
                groupId: group.id,
                groupName: group.name,
                targets: connections.map((conn) => ({
                    connectionId: conn.id,
                    connectionName: conn.name,
                    schemaStatus: 'unchecked' as const,
                    dataStatus: 'unchecked' as const,
                })),
                lastChecked: new Date(),
            };
        }

        const sourceConnection = connections.find((c) => c.id === group.sourceConnectionId);
        const targetConnections = connections.filter((c) => c.id !== group.sourceConnectionId);

        const targets: InstanceGroupTargetStatus[] = [];

        for (const target of targetConnections) {
            const status = await this.checkTargetStatus(group, sourceConnection!, target);
            targets.push(status);
        }

        return {
            groupId: group.id,
            groupName: group.name,
            sourceConnectionId: group.sourceConnectionId,
            sourceConnectionName: sourceConnection?.name,
            targets,
            lastChecked: new Date(),
        };
    }

    /**
     * Check sync status for a single target
     */
    private async checkTargetStatus(
        group: InstanceGroup,
        source: ConnectionConfig,
        target: ConnectionConfig
    ): Promise<InstanceGroupTargetStatus> {
        const status: InstanceGroupTargetStatus = {
            connectionId: target.id,
            connectionName: target.name,
            schemaStatus: 'unchecked',
            dataStatus: 'unchecked',
        };

        // Use group's syncTargetSchema if set, otherwise fall back to connection's defaultSchema
        // For MySQL/MariaDB, the database name is the schema
        const getDefaultSchema = (conn: ConnectionConfig) => {
            if (conn.engine === 'mysql' || conn.engine === 'mariadb') {
                return conn.database;
            }
            return conn.defaultSchema || 'public';
        };
        const sourceSchema = group.syncTargetSchema || getDefaultSchema(source);
        const targetSchema = group.syncTargetSchema || getDefaultSchema(target);

        // Check schema if enabled
        if (group.syncSchema) {
            try {
                const schemaDiff = await this.schemaDiffService.compareSchemas(
                    source.id,
                    target.id,
                    sourceSchema,
                    targetSchema
                );

                if (schemaDiff.items.length === 0) {
                    status.schemaStatus = 'in_sync';
                    status.schemaDiffCount = 0;
                } else {
                    status.schemaStatus = 'out_of_sync';
                    status.schemaDiffCount = schemaDiff.items.length;
                }
            } catch (error) {
                status.schemaStatus = 'error';
                status.error = error instanceof Error ? error.message : 'Schema check failed';
            }
        }

        // Check data if enabled
        if (group.syncData) {
            try {
                const dataDiff = await this.getTableRowCounts(source.id, target.id, sourceSchema);
                const outOfSync = dataDiff.filter(
                    (d) => d.sourceCount !== d.targetCount || d.missingInTarget > 0
                );

                if (outOfSync.length === 0) {
                    status.dataStatus = 'in_sync';
                    status.dataDiffSummary = 'All tables in sync';
                } else {
                    status.dataStatus = 'out_of_sync';
                    status.dataDiffSummary = `${outOfSync.length} table(s) out of sync`;
                }
            } catch (error) {
                status.dataStatus = 'error';
                status.error =
                    (status.error ? status.error + '; ' : '') +
                    (error instanceof Error ? error.message : 'Data check failed');
            }
        }

        return status;
    }

    /**
     * Get row counts for all tables in source vs target
     */
    async getTableRowCounts(
        sourceConnectionId: string,
        targetConnectionId: string,
        schema: string = 'public'
    ): Promise<TableDataDiff[]> {
        const sourceConnection = this.connectionsService.findById(sourceConnectionId);
        const targetConnection = this.connectionsService.findById(targetConnectionId);
        const sourceConnector = await this.connectionsService.getConnector(sourceConnectionId);
        const targetConnector = await this.connectionsService.getConnector(targetConnectionId);

        // Get tables from source
        const sourceTables = await sourceConnector.getTables(schema);
        const results: TableDataDiff[] = [];

        for (const table of sourceTables) {
            try {
                const sourceTableRef = quoteTableRef(schema, table.name, sourceConnection.engine);
                const targetTableRef = quoteTableRef(schema, table.name, targetConnection.engine);
                
                const sourceCountResult = await sourceConnector.query(
                    `SELECT COUNT(*) as count FROM ${sourceTableRef}`
                );
                const targetCountResult = await targetConnector.query(
                    `SELECT COUNT(*) as count FROM ${targetTableRef}`
                );

                const sourceCount = Number(sourceCountResult.rows[0]?.count ?? 0);
                const targetCount = Number(targetCountResult.rows[0]?.count ?? 0);

                results.push({
                    table: table.name,
                    schema,
                    sourceCount,
                    targetCount,
                    missingInTarget: Math.max(0, sourceCount - targetCount),
                    missingInSource: Math.max(0, targetCount - sourceCount),
                    different: 0, // Would need primary key comparison to determine
                });
            } catch (error) {
                this.logger.warn(`Failed to get row count for ${schema}.${table.name}: ${error}`);
            }
        }

        return results;
    }

    /**
     * Get detailed data diff for a specific table
     */
    async getTableDataDiff(
        sourceConnectionId: string,
        targetConnectionId: string,
        schema: string,
        table: string,
        primaryKeyColumns: string[]
    ): Promise<{
        missingInTarget: Record<string, unknown>[];
        missingInSource: Record<string, unknown>[];
        different: { source: Record<string, unknown>; target: Record<string, unknown> }[];
    }> {
        const sourceConnection = this.connectionsService.findById(sourceConnectionId);
        const targetConnection = this.connectionsService.findById(targetConnectionId);
        const sourceConnector = await this.connectionsService.getConnector(sourceConnectionId);
        const targetConnector = await this.connectionsService.getConnector(targetConnectionId);

        const sourceTableRef = quoteTableRef(schema, table, sourceConnection.engine);
        const targetTableRef = quoteTableRef(schema, table, targetConnection.engine);
        const sourceOrderBy = primaryKeyColumns.map((c) => quoteIdentifier(c, sourceConnection.engine)).join(', ');
        const targetOrderBy = primaryKeyColumns.map((c) => quoteIdentifier(c, targetConnection.engine)).join(', ');

        // Get all rows from both
        const sourceResult = await sourceConnector.query(
            `SELECT * FROM ${sourceTableRef} ORDER BY ${sourceOrderBy}`
        );
        const targetResult = await targetConnector.query(
            `SELECT * FROM ${targetTableRef} ORDER BY ${targetOrderBy}`
        );

        // Create maps by primary key
        const getPkValue = (row: Record<string, unknown>) =>
            primaryKeyColumns.map((c) => String(row[c])).join('|');

        const sourceMap = new Map<string, Record<string, unknown>>();
        const targetMap = new Map<string, Record<string, unknown>>();

        for (const row of sourceResult.rows) {
            sourceMap.set(getPkValue(row), row);
        }
        for (const row of targetResult.rows) {
            targetMap.set(getPkValue(row), row);
        }

        const missingInTarget: Record<string, unknown>[] = [];
        const missingInSource: Record<string, unknown>[] = [];
        const different: { source: Record<string, unknown>; target: Record<string, unknown> }[] =
            [];

        // Find missing in target and different
        for (const [pk, sourceRow] of sourceMap) {
            const targetRow = targetMap.get(pk);
            if (!targetRow) {
                missingInTarget.push(sourceRow);
            } else if (JSON.stringify(sourceRow) !== JSON.stringify(targetRow)) {
                different.push({ source: sourceRow, target: targetRow });
            }
        }

        // Find missing in source
        for (const [pk, targetRow] of targetMap) {
            if (!sourceMap.has(pk)) {
                missingInSource.push(targetRow);
            }
        }

        return { missingInTarget, missingInSource, different };
    }

    /**
     * Sync data from source to target for a specific table
     */
    async syncTableData(
        sourceConnectionId: string,
        targetConnectionId: string,
        schema: string,
        table: string,
        primaryKeyColumns: string[],
        options: {
            insertMissing?: boolean;
            updateDifferent?: boolean;
            deleteExtra?: boolean;
        } = { insertMissing: true, updateDifferent: true, deleteExtra: false }
    ): Promise<DataSyncResult> {
        const result: DataSyncResult = {
            table,
            schema,
            inserted: 0,
            updated: 0,
            deleted: 0,
            errors: [],
        };

        const targetConnection = this.connectionsService.findById(targetConnectionId);
        const targetConnector = await this.connectionsService.getConnector(targetConnectionId);
        const diff = await this.getTableDataDiff(
            sourceConnectionId,
            targetConnectionId,
            schema,
            table,
            primaryKeyColumns
        );

        // Get column info
        const tableSchema = await targetConnector.getTableSchema(schema, table);
        const columns = tableSchema.columns.map((c) => c.name);
        const engine = targetConnection.engine;
        const tableRef = quoteTableRef(schema, table, engine);

        // Insert missing rows
        if (options.insertMissing && diff.missingInTarget.length > 0) {
            for (const row of diff.missingInTarget) {
                try {
                    const values = columns.map((c) => row[c]);
                    const placeholders = columns.map((_, i) => getPlaceholder(i + 1, engine)).join(', ');
                    const quotedColumns = columns.map((c) => quoteIdentifier(c, engine)).join(', ');
                    await targetConnector.execute(
                        `INSERT INTO ${tableRef} (${quotedColumns}) VALUES (${placeholders})`,
                        values
                    );
                    result.inserted++;
                } catch (error) {
                    result.errors.push(
                        `Insert failed: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }
        }

        // Update different rows
        if (options.updateDifferent && diff.different.length > 0) {
            for (const { source } of diff.different) {
                try {
                    const nonPkColumns = columns.filter((c) => !primaryKeyColumns.includes(c));
                    const setClause = nonPkColumns
                        .map((c, i) => `${quoteIdentifier(c, engine)} = ${getPlaceholder(i + 1, engine)}`)
                        .join(', ');
                    const whereClause = primaryKeyColumns
                        .map((c, i) => `${quoteIdentifier(c, engine)} = ${getPlaceholder(nonPkColumns.length + i + 1, engine)}`)
                        .join(' AND ');
                    const values = [
                        ...nonPkColumns.map((c) => source[c]),
                        ...primaryKeyColumns.map((c) => source[c]),
                    ];

                    await targetConnector.execute(
                        `UPDATE ${tableRef} SET ${setClause} WHERE ${whereClause}`,
                        values
                    );
                    result.updated++;
                } catch (error) {
                    result.errors.push(
                        `Update failed: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }
        }

        // Delete extra rows
        if (options.deleteExtra && diff.missingInSource.length > 0) {
            for (const row of diff.missingInSource) {
                try {
                    const whereClause = primaryKeyColumns
                        .map((c, i) => `${quoteIdentifier(c, engine)} = ${getPlaceholder(i + 1, engine)}`)
                        .join(' AND ');
                    const values = primaryKeyColumns.map((c) => row[c]);

                    await targetConnector.execute(
                        `DELETE FROM ${tableRef} WHERE ${whereClause}`,
                        values
                    );
                    result.deleted++;
                } catch (error) {
                    result.errors.push(
                        `Delete failed: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }
        }

        return result;
    }

    /**
     * Sync specific rows from source to target
     */
    async syncRows(
        _sourceConnectionId: string, // Kept for API consistency, rows are passed directly
        targetConnectionId: string,
        schema: string,
        table: string,
        rows: Record<string, unknown>[],
        primaryKeyColumns: string[],
        mode: 'insert' | 'upsert' = 'upsert'
    ): Promise<{ inserted: number; updated: number; errors: string[] }> {
        const result = { inserted: 0, updated: 0, errors: [] as string[] };

        if (rows.length === 0 || primaryKeyColumns.length === 0) {
            return result;
        }

        const targetConnection = this.connectionsService.findById(targetConnectionId);
        const targetConnector = await this.connectionsService.getConnector(targetConnectionId);
        const engine = targetConnection.engine;
        const tableRef = quoteTableRef(schema, table, engine);

        // Get column info from target
        const tableSchema = await targetConnector.getTableSchema(schema, table);
        const columns = tableSchema.columns.map((c) => c.name);

        for (const row of rows) {
            try {
                // Check if row exists in target
                const whereClause = primaryKeyColumns
                    .map((c, i) => `${quoteIdentifier(c, engine)} = ${getPlaceholder(i + 1, engine)}`)
                    .join(' AND ');
                const pkValues = primaryKeyColumns.map((c) => row[c]);

                const existsResult = await targetConnector.query(
                    `SELECT 1 FROM ${tableRef} WHERE ${whereClause} LIMIT 1`,
                    pkValues
                );
                const exists = existsResult.rows.length > 0;

                if (exists && mode === 'upsert') {
                    // Update existing row
                    const nonPkColumns = columns.filter((c) => !primaryKeyColumns.includes(c));
                    if (nonPkColumns.length > 0) {
                        const setClause = nonPkColumns
                            .map((c, i) => `${quoteIdentifier(c, engine)} = ${getPlaceholder(i + 1, engine)}`)
                            .join(', ');
                        const updateWhereClause = primaryKeyColumns
                            .map((c, i) => `${quoteIdentifier(c, engine)} = ${getPlaceholder(nonPkColumns.length + i + 1, engine)}`)
                            .join(' AND ');
                        const updateValues = [
                            ...nonPkColumns.map((c) => row[c]),
                            ...primaryKeyColumns.map((c) => row[c]),
                        ];

                        await targetConnector.execute(
                            `UPDATE ${tableRef} SET ${setClause} WHERE ${updateWhereClause}`,
                            updateValues
                        );
                        result.updated++;
                    }
                } else if (!exists) {
                    // Insert new row
                    const rowColumns = columns.filter((c) => row[c] !== undefined);
                    const values = rowColumns.map((c) => row[c]);
                    const placeholders = rowColumns.map((_, i) => getPlaceholder(i + 1, engine)).join(', ');
                    const quotedColumns = rowColumns.map((c) => quoteIdentifier(c, engine)).join(', ');

                    await targetConnector.execute(
                        `INSERT INTO ${tableRef} (${quotedColumns}) VALUES (${placeholders})`,
                        values
                    );
                    result.inserted++;
                }
            } catch (error) {
                result.errors.push(
                    `Row sync failed: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        return result;
    }

    /**
     * Get groups with sync enabled for dashboard
     */
    getGroupsWithSyncEnabled(): InstanceGroup[] {
        return this.metadataService.databaseGroupRepository.findWithSyncEnabled();
    }
}
