import { Module } from '@nestjs/common';
import { ConnectionsModule } from './connections/connections.module.js';
import { QueriesModule } from './queries/queries.module.js';
import { SchemaModule } from './schema/schema.module.js';
import { MetadataModule } from './metadata/metadata.module.js';

@Module({
    imports: [MetadataModule, ConnectionsModule, QueriesModule, SchemaModule],
})
export class AppModule {}
