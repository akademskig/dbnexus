import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ConnectionsService } from './connections.service.js';
import type { ConnectionConfig, ConnectionTestResult } from '@dbnexus/shared';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/index.js';

@Controller('connections')
export class ConnectionsController {
    constructor(private readonly connectionsService: ConnectionsService) {}

    @Get()
    findAll(): ConnectionConfig[] {
        return this.connectionsService.findAll();
    }

    @Get(':id')
    findById(@Param('id') id: string): ConnectionConfig {
        return this.connectionsService.findById(id);
    }

    @Post()
    async create(@Body() input: CreateConnectionDto): Promise<ConnectionConfig> {
        return this.connectionsService.create(input);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() input: UpdateConnectionDto
    ): Promise<ConnectionConfig> {
        return this.connectionsService.update(id, input);
    }

    @Delete(':id')
    async delete(@Param('id') id: string): Promise<{ success: boolean }> {
        await this.connectionsService.delete(id);
        return { success: true };
    }

    @Post(':id/test')
    async test(@Param('id') id: string): Promise<ConnectionTestResult> {
        return this.connectionsService.test(id);
    }

    @Post('test')
    async testSettings(@Body() settings: CreateConnectionDto): Promise<ConnectionTestResult> {
        return this.connectionsService.testSettings(settings);
    }

    @Post(':id/connect')
    async connect(@Param('id') id: string): Promise<{ success: boolean }> {
        await this.connectionsService.getConnector(id);
        return { success: true };
    }

    @Post(':id/disconnect')
    async disconnect(@Param('id') id: string): Promise<{ success: boolean }> {
        await this.connectionsService.disconnect(id);
        return { success: true };
    }

    @Get(':id/status')
    async getStatus(@Param('id') id: string): Promise<{ connected: boolean }> {
        const result = await this.connectionsService.test(id);
        return { connected: result?.success ?? false };
    }
}
