import { Controller, Get, Post, Put, Delete, Body, Param, ForbiddenException } from '@nestjs/common';
import { ConnectionsService } from './connections.service.js';
import type { ConnectionConfig, ConnectionTestResult } from '@dbnexus/shared';
import type { User, UserContext } from '@dbnexus/metadata';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('connections')
export class ConnectionsController {
    constructor(private readonly connectionsService: ConnectionsService) {}

    private getUserContext(user: User | null): UserContext {
        return {
            userId: user?.id || null,
            isAdmin: user?.role === 'admin',
        };
    }

    @Get()
    findAll(@CurrentUser() user: User | null): ConnectionConfig[] {
        return this.connectionsService.findAll(this.getUserContext(user));
    }

    @Get(':id')
    findById(@Param('id') id: string, @CurrentUser() user: User | null): ConnectionConfig {
        const userContext = this.getUserContext(user);
        if (!this.connectionsService.canAccess(id, userContext)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        return this.connectionsService.findById(id);
    }

    @Post()
    async create(
        @Body() input: CreateConnectionDto,
        @CurrentUser() user: User | null
    ): Promise<ConnectionConfig> {
        return this.connectionsService.create(input, user?.id);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() input: UpdateConnectionDto,
        @CurrentUser() user: User | null
    ): Promise<ConnectionConfig> {
        const userContext = this.getUserContext(user);
        if (!this.connectionsService.canAccess(id, userContext)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        return this.connectionsService.update(id, input);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: User | null
    ): Promise<{ success: boolean }> {
        const userContext = this.getUserContext(user);
        if (!this.connectionsService.canAccess(id, userContext)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        await this.connectionsService.delete(id);
        return { success: true };
    }

    @Post(':id/test')
    async test(
        @Param('id') id: string,
        @CurrentUser() user: User | null
    ): Promise<ConnectionTestResult> {
        const userContext = this.getUserContext(user);
        if (!this.connectionsService.canAccess(id, userContext)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        return this.connectionsService.test(id);
    }

    @Post('test')
    async testSettings(@Body() settings: CreateConnectionDto): Promise<ConnectionTestResult> {
        return this.connectionsService.testSettings(settings);
    }

    @Post(':id/connect')
    async connect(
        @Param('id') id: string,
        @CurrentUser() user: User | null
    ): Promise<{ success: boolean }> {
        const userContext = this.getUserContext(user);
        if (!this.connectionsService.canAccess(id, userContext)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        await this.connectionsService.getConnector(id);
        return { success: true };
    }

    @Post(':id/disconnect')
    async disconnect(
        @Param('id') id: string,
        @CurrentUser() user: User | null
    ): Promise<{ success: boolean }> {
        const userContext = this.getUserContext(user);
        if (!this.connectionsService.canAccess(id, userContext)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        await this.connectionsService.disconnect(id);
        return { success: true };
    }

    @Get(':id/status')
    async getStatus(
        @Param('id') id: string,
        @CurrentUser() user: User | null
    ): Promise<{ connected: boolean }> {
        const userContext = this.getUserContext(user);
        if (!this.connectionsService.canAccess(id, userContext)) {
            throw new ForbiddenException('Access denied to this connection');
        }
        const result = await this.connectionsService.test(id);
        return { connected: result?.success ?? false };
    }
}
