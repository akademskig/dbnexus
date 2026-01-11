import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller.js';
import { SchemaService } from './schema.service.js';
import { ConnectionsModule } from '../connections/connections.module.js';

@Module({
    imports: [ConnectionsModule],
    controllers: [SchemaController],
    providers: [SchemaService],
    exports: [SchemaService],
})
export class SchemaModule {}
