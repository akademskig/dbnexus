import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { MetadataModule } from '../metadata/metadata.module.js';
import { ConnectionsModule } from '../connections/connections.module.js';
import { SchemaModule } from '../schema/schema.module.js';

@Module({
    imports: [MetadataModule, ConnectionsModule, SchemaModule],
    controllers: [SyncController],
    providers: [SyncService],
    exports: [SyncService],
})
export class SyncModule {}
