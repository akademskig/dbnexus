import { Controller, Get, Query } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import type { AuditLogEntry } from '@dbnexus/metadata';

@Controller('audit')
export class AuditController {
    constructor(private readonly metadataService: MetadataService) {}

    @Get('logs')
    getAuditLogs(
        @Query('connectionId') connectionId?: string,
        @Query('entityType') entityType?: string,
        @Query('action') action?: string,
        @Query('limit') limitStr?: string
    ): AuditLogEntry[] {
        const limit = limitStr ? parseInt(limitStr, 10) : 500;
        return this.metadataService.auditLogRepository.findAll({
            connectionId,
            entityType,
            action,
            limit,
        });
    }

    @Get('logs/:id')
    getAuditLog(@Query('id') id: string): AuditLogEntry | null {
        return this.metadataService.auditLogRepository.findById(id);
    }
}
