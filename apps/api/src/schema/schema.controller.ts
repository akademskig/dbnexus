import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { SchemaService } from './schema.service.js';
import { SchemaDiffService } from './schema-diff.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { MetadataService } from '../metadata/metadata.service.js';
import type { TableInfo, TableSchema, SchemaDiff, MigrationHistoryEntry } from '@dbnexus/shared';

@Controller('schema')
export class SchemaController {
    constructor(
        private readonly schemaService: SchemaService,
        private readonly schemaDiffService: SchemaDiffService,
        private readonly connectionsService: ConnectionsService,
        private readonly metadataService: MetadataService
    ) {}

    @Get(':connectionId/schemas')
    async getSchemas(@Param('connectionId') connectionId: string): Promise<string[]> {
        return this.schemaService.getSchemas(connectionId);
    }

    @Get(':connectionId/tables')
    async getTables(
        @Param('connectionId') connectionId: string,
        @Query('schema') schema?: string
    ): Promise<TableInfo[]> {
        return this.schemaService.getTables(connectionId, schema);
    }

    @Get(':connectionId/tables/:schema/:table')
    async getTableSchema(
        @Param('connectionId') connectionId: string,
        @Param('schema') schema: string,
        @Param('table') table: string
    ): Promise<TableSchema> {
        return this.schemaService.getTableSchema(connectionId, schema, table);
    }

    @Get(':connectionId/version')
    async getServerVersion(
        @Param('connectionId') connectionId: string
    ): Promise<{ version: string }> {
        const version = await this.schemaService.getServerVersion(connectionId);
        return { version };
    }

    // ============ Schema Diff - Compare ============

    @Get('diff/:sourceConnectionId/:targetConnectionId')
    async compareSchemas(
        @Param('sourceConnectionId') sourceConnectionId: string,
        @Param('targetConnectionId') targetConnectionId: string,
        @Query('sourceSchema') sourceSchema?: string,
        @Query('targetSchema') targetSchema?: string
    ): Promise<SchemaDiff> {
        return this.schemaDiffService.compareSchemas(
            sourceConnectionId,
            targetConnectionId,
            sourceSchema || 'public',
            targetSchema || 'public'
        );
    }

    @Get('diff/:sourceConnectionId/:targetConnectionId/sql')
    async getMigrationSql(
        @Param('sourceConnectionId') sourceConnectionId: string,
        @Param('targetConnectionId') targetConnectionId: string,
        @Query('sourceSchema') sourceSchema?: string,
        @Query('targetSchema') targetSchema?: string
    ): Promise<{ sql: string[] }> {
        const diff = await this.schemaDiffService.compareSchemas(
            sourceConnectionId,
            targetConnectionId,
            sourceSchema || 'public',
            targetSchema || 'public'
        );
        return { sql: this.schemaDiffService.getMigrationSql(diff) };
    }

    // ============ Apply Migration ============

    @Post('diff/:sourceConnectionId/:targetConnectionId/apply')
    async applyMigration(
        @Param('sourceConnectionId') sourceConnectionId: string,
        @Param('targetConnectionId') targetConnectionId: string,
        @Query('sourceSchema') sourceSchema?: string,
        @Query('targetSchema') targetSchema?: string,
        @Body() body?: { description?: string }
    ): Promise<MigrationHistoryEntry> {
        const srcSchema = sourceSchema || 'public';
        const tgtSchema = targetSchema || 'public';

        // Get the diff and migration SQL
        const diff = await this.schemaDiffService.compareSchemas(
            sourceConnectionId,
            targetConnectionId,
            srcSchema,
            tgtSchema
        );
        const sqlStatements = this.schemaDiffService.getMigrationSql(diff);

        if (sqlStatements.length === 0) {
            throw new Error('No migration statements to apply - schemas are already in sync');
        }

        // Get connector for target database
        const connector = await this.connectionsService.getConnector(targetConnectionId);

        // Execute each statement
        let error: string | undefined;
        let success = true;

        try {
            for (const sql of sqlStatements) {
                // Skip comments
                if (sql.trim().startsWith('--')) continue;
                await connector.execute(sql);
            }
        } catch (err) {
            success = false;
            error = err instanceof Error ? err.message : String(err);
        }

        // Record the migration
        return this.metadataService.migrationHistoryRepository.create({
            sourceConnectionId,
            targetConnectionId,
            sourceSchema: srcSchema,
            targetSchema: tgtSchema,
            description: body?.description,
            sqlStatements,
            success,
            error,
        });
    }

    // ============ Migration History ============

    @Get('migrations')
    async getMigrationHistory(
        @Query('targetConnectionId') targetConnectionId?: string,
        @Query('limit') limit?: string
    ): Promise<MigrationHistoryEntry[]> {
        return this.metadataService.migrationHistoryRepository.findAll({
            targetConnectionId,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get('migrations/:id')
    async getMigration(@Param('id') id: string): Promise<MigrationHistoryEntry | null> {
        return this.metadataService.migrationHistoryRepository.findById(id);
    }

    @Delete('migrations/:id')
    async deleteMigration(@Param('id') id: string): Promise<{ success: boolean }> {
        return { success: this.metadataService.migrationHistoryRepository.delete(id) };
    }
}
