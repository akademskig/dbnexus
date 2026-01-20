import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { MetadataModule } from '../metadata/metadata.module.js';

@Module({
    imports: [MetadataModule],
    controllers: [AuditController],
})
export class AuditModule {}
