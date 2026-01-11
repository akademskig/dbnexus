import { Controller, Get, Param, Query } from '@nestjs/common';
import { SchemaService } from './schema.service.js';
import type { TableInfo, TableSchema } from '@dbnexus/shared';

@Controller('schema')
export class SchemaController {
    constructor(private readonly schemaService: SchemaService) {}

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
}
