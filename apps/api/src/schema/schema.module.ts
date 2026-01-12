import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller.js';
import { SchemaService } from './schema.service.js';
import { SchemaDiffService } from './schema-diff.service.js';
import { ConnectionsModule } from '../connections/connections.module.js';
import { MetadataModule } from '../metadata/metadata.module.js';

@Module({
    imports: [ConnectionsModule, MetadataModule],
    controllers: [SchemaController],
    providers: [SchemaService, SchemaDiffService],
    exports: [SchemaService, SchemaDiffService],
})
export class SchemaModule {}
