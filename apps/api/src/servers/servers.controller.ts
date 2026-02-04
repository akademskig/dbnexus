import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import type {
    ServerConfig,
    ServerCreateInput,
    ServerUpdateInput,
    DatabaseEngine,
    ConnectionConfig,
} from '@dbnexus/shared';

@Controller('servers')
export class ServersController {
    constructor(private readonly metadataService: MetadataService) { }

    @Get()
    getServers(@Query('engine') engine?: DatabaseEngine): ServerConfig[] {
        if (engine) {
            return this.metadataService.serverRepository.findByEngine(engine);
        }
        return this.metadataService.serverRepository.findAll();
    }

    @Get(':id')
    getServer(@Param('id') id: string): ServerConfig | null {
        return this.metadataService.serverRepository.findById(id);
    }

    @Get(':id/databases')
    getServerDatabases(@Param('id') id: string): ConnectionConfig[] {
        return this.metadataService.connectionRepository.findByServerId(id);
    }

    @Post()
    createServer(@Body() input: ServerCreateInput): ServerConfig {
        const server = this.metadataService.serverRepository.create(input);

        // Audit log
        this.metadataService.auditLogRepository.create({
            action: 'server_created',
            entityType: 'server',
            entityId: server.id,
            details: {
                name: server.name,
                engine: server.engine,
                host: server.host,
                port: server.port,
            },
        });

        return server;
    }

    @Put(':id')
    updateServer(
        @Param('id') id: string,
        @Body() input: ServerUpdateInput
    ): ServerConfig | null {
        const server = this.metadataService.serverRepository.update(id, input);

        if (server) {
            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'server_updated',
                entityType: 'server',
                entityId: id,
                details: {
                    name: server.name,
                    changes: input,
                },
            });
        }

        return server;
    }

    @Delete(':id')
    deleteServer(@Param('id') id: string): { success: boolean; message?: string } {
        const server = this.metadataService.serverRepository.findById(id);

        // Check if server has linked databases
        const linkedDatabases = this.metadataService.connectionRepository.findByServerId(id);
        if (linkedDatabases.length > 0) {
            return {
                success: false,
                message: `Cannot delete server with ${linkedDatabases.length} linked database(s). Remove or reassign them first.`,
            };
        }

        const success = this.metadataService.serverRepository.delete(id);

        if (success && server) {
            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'server_deleted',
                entityType: 'server',
                entityId: id,
                details: {
                    name: server.name,
                    engine: server.engine,
                },
            });
        }

        return { success };
    }

    @Post(':id/test')
    async testServerConnection(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
        const server = this.metadataService.serverRepository.findById(id);
        if (!server) {
            return { success: false, message: 'Server not found' };
        }

        // TODO: Implement actual connection test using server credentials
        // For now, we just validate that the server configuration exists
        return { success: true, message: 'Server configuration is valid' };
    }
}
