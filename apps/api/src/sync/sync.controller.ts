import { Controller, Get, Post, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { SyncService, TableDataDiff, DataSyncResult } from './sync.service.js';
import { MetadataService } from '../metadata/metadata.service.js';
import type { InstanceGroupSyncStatus, InstanceGroupTargetStatus } from '@dbnexus/shared';
import { SyncTableDto, SyncRowsDto, SyncAllDto, DumpRestoreDto } from './dto/index.js';

@Controller('sync')
export class SyncController {
    constructor(
        private readonly syncService: SyncService,
        private readonly metadataService: MetadataService
    ) { }

    /**
     * Get recent sync runs (for activity log)
     */
    @Get('runs')
    getSyncRuns(@Query('limit') limit?: string) {
        return this.metadataService.syncRunLogsRepository.findRecent(
            limit ? Number.parseInt(limit, 10) : 500
        );
    }

    /**
     * Get sync status for an instance group
     */
    @Get('groups/:groupId/status')
    async getGroupSyncStatus(
        @Param('groupId') groupId: string
    ): Promise<InstanceGroupSyncStatus | null> {
        return this.syncService.getGroupSyncStatus(groupId);
    }

    /**
     * Check sync status for a single target connection in a group
     */
    @Get('groups/:groupId/status/:targetConnectionId')
    async checkSingleTargetStatus(
        @Param('groupId') groupId: string,
        @Param('targetConnectionId') targetConnectionId: string
    ): Promise<InstanceGroupTargetStatus | null> {
        return this.syncService.checkSingleTargetStatus(groupId, targetConnectionId);
    }

    /**
     * Get all groups with sync enabled (for dashboard)
     */
    @Get('groups')
    getSyncEnabledGroups() {
        return this.syncService.getGroupsWithSyncEnabled();
    }

    /**
     * Get table row counts comparison
     */
    @Get('data/:sourceConnectionId/:targetConnectionId/counts')
    async getTableRowCounts(
        @Param('sourceConnectionId') sourceConnectionId: string,
        @Param('targetConnectionId') targetConnectionId: string,
        @Query('schema') schema: string = 'public'
    ): Promise<TableDataDiff[]> {
        return this.syncService.getTableRowCounts(sourceConnectionId, targetConnectionId, schema);
    }

    /**
     * Get detailed data diff for a table
     */
    @Get('data/:sourceConnectionId/:targetConnectionId/diff/:schema/:table')
    async getTableDataDiff(
        @Param('sourceConnectionId') sourceConnectionId: string,
        @Param('targetConnectionId') targetConnectionId: string,
        @Param('schema') schema: string,
        @Param('table') table: string,
        @Query('primaryKeys') primaryKeys: string
    ) {
        const primaryKeyColumns = primaryKeys.split(',').map((k) => k.trim());
        return this.syncService.getTableDataDiff(
            sourceConnectionId,
            targetConnectionId,
            schema,
            table,
            primaryKeyColumns
        );
    }

    /**
     * Sync data for a specific table
     */
    @Post('data/:sourceConnectionId/:targetConnectionId/sync/:schema/:table')
    async syncTableData(
        @Param('sourceConnectionId') sourceConnectionId: string,
        @Param('targetConnectionId') targetConnectionId: string,
        @Param('schema') schema: string,
        @Param('table') table: string,
        @Body() body: SyncTableDto
    ): Promise<DataSyncResult> {
        return this.syncService.syncTableData(
            sourceConnectionId,
            targetConnectionId,
            schema,
            table,
            body.primaryKeys,
            {
                insertMissing: body.insertMissing ?? true,
                updateDifferent: body.updateDifferent ?? true,
                deleteExtra: body.deleteExtra ?? false,
            }
        );
    }

    /**
     * Sync specific rows to a target connection by primary key values
     */
    @Post('rows/:targetConnectionId/:targetSchema/:table')
    async syncRows(
        @Param('targetConnectionId') targetConnectionId: string,
        @Param('targetSchema') targetSchema: string,
        @Param('table') table: string,
        @Body() body: SyncRowsDto
    ): Promise<{ inserted: number; updated: number; errors: string[] }> {
        return this.syncService.syncRows(
            body.sourceConnectionId,
            targetConnectionId,
            body.sourceSchema,
            targetSchema,
            table,
            body.rowIds,
            body.primaryKeys,
            body.mode ?? 'upsert'
        );
    }

    /**
     * Sync all tables in a group
     */
    @Post('groups/:groupId/sync-all')
    async syncAllTables(
        @Param('groupId') groupId: string,
        @Query('targetConnectionId') targetConnectionId: string,
        @Query('schema') schema: string = 'public',
        @Body() body?: SyncAllDto
    ): Promise<DataSyncResult[]> {
        // Get group and source
        const status = await this.syncService.getGroupSyncStatus(groupId);
        if (!status?.sourceConnectionId) {
            throw new NotFoundException('Group not found or no source connection set');
        }

        // Get table row counts to find tables
        const tableDiffs = await this.syncService.getTableRowCounts(
            status.sourceConnectionId,
            targetConnectionId,
            schema
        );

        const results: DataSyncResult[] = [];

        for (const tableDiff of tableDiffs) {
            // For now, we'll skip tables without knowing their primary keys
            // In a full implementation, we'd get this from schema introspection
            try {
                // This is a simplified version - in production you'd want to get PKs from schema
                const result = await this.syncService.syncTableData(
                    status.sourceConnectionId,
                    targetConnectionId,
                    schema,
                    tableDiff.table,
                    ['id'], // Assuming 'id' as default PK - should be improved
                    {
                        insertMissing: body?.insertMissing ?? true,
                        updateDifferent: body?.updateDifferent ?? true,
                        deleteExtra: body?.deleteExtra ?? false,
                    }
                );
                results.push(result);
            } catch (error) {
                results.push({
                    table: tableDiff.table,
                    schema,
                    inserted: 0,
                    updated: 0,
                    deleted: 0,
                    errors: [error instanceof Error ? error.message : String(error)],
                });
            }
        }

        return results;
    }

    /**
     * Dump and restore all data from source to target
     * This is a complete data copy that handles foreign key constraints properly
     */
    @Post('dump-restore/:sourceConnectionId/:targetConnectionId')
    async dumpAndRestore(
        @Param('sourceConnectionId') sourceConnectionId: string,
        @Param('targetConnectionId') targetConnectionId: string,
        @Query('schema') schema: string = 'public',
        @Body() body?: DumpRestoreDto
    ): Promise<{
        success: boolean;
        tablesProcessed: number;
        rowsCopied: number;
        errors: string[];
        tableResults: { table: string; rows: number; error?: string }[];
    }> {
        return this.syncService.dumpAndRestore(sourceConnectionId, targetConnectionId, schema, {
            truncateTarget: body?.truncateTarget ?? true,
            tables: body?.tables,
        });
    }
}
