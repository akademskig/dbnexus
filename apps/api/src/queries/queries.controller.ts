import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { QueriesService } from './queries.service.js';
import type { QueryResult, QueryValidationResult, SavedQuery, QueryHistoryEntry } from '@dbnexus/shared';
import {
    ExecuteQueryDto,
    MaintenanceDto,
    ExplainQueryDto,
    ValidateQueryDto,
    CreateSavedQueryDto,
    UpdateSavedQueryDto,
} from './dto/index.js';

@Controller('queries')
export class QueriesController {
    constructor(private readonly queriesService: QueriesService) { }

    @Post('execute')
    async execute(@Body() input: ExecuteQueryDto): Promise<QueryResult> {
        return this.queriesService.execute(input);
    }

    @Post('maintenance')
    async executeMaintenance(
        @Body() input: MaintenanceDto
    ): Promise<{ success: boolean; message: string; details?: string[]; duration: number }> {
        return this.queriesService.executeMaintenance(
            input.connectionId,
            input.operation,
            input.target,
            input.scope
        );
    }

    @Post('explain')
    async explain(@Body() input: ExplainQueryDto): Promise<{
        plan: unknown;
        planText: string;
        insights: { type: string; message: string }[];
        suggestions: string[];
    }> {
        return this.queriesService.explain(input.connectionId, input.sql, input.analyze);
    }

    @Post('validate')
    validate(@Body() input: ValidateQueryDto): QueryValidationResult {
        return this.queriesService.validate(input.connectionId, input.sql);
    }

    // ============ Saved Queries ============

    @Get('saved')
    getSavedQueries(): SavedQuery[] {
        return this.queriesService.getSavedQueries();
    }

    @Get('saved/:id')
    getSavedQuery(@Param('id') id: string): SavedQuery | null {
        return this.queriesService.getSavedQuery(id);
    }

    @Post('saved')
    createSavedQuery(@Body() input: CreateSavedQueryDto): SavedQuery {
        return this.queriesService.createSavedQuery(input);
    }

    @Put('saved/:id')
    updateSavedQuery(
        @Param('id') id: string,
        @Body() input: UpdateSavedQueryDto
    ): SavedQuery | null {
        return this.queriesService.updateSavedQuery(id, input);
    }

    @Delete('saved/:id')
    deleteSavedQuery(@Param('id') id: string): { success: boolean } {
        const deleted = this.queriesService.deleteSavedQuery(id);
        return { success: deleted };
    }

    // ============ Query History ============

    @Get('history')
    getHistory(
        @Query('connectionId') connectionId?: string,
        @Query('limit') limit?: string
    ): QueryHistoryEntry[] {
        return this.queriesService.getHistory(
            connectionId,
            limit ? parseInt(limit, 10) : undefined
        );
    }

    @Delete('history')
    clearHistory(@Query('connectionId') connectionId?: string): { cleared: number } {
        const cleared = this.queriesService.clearHistory(connectionId);
        return { cleared };
    }
}
