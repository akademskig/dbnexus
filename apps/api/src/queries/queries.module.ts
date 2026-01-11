import { Module } from '@nestjs/common';
import { QueriesController } from './queries.controller.js';
import { QueriesService } from './queries.service.js';
import { ConnectionsModule } from '../connections/connections.module.js';

@Module({
    imports: [ConnectionsModule],
    controllers: [QueriesController],
    providers: [QueriesService],
    exports: [QueriesService],
})
export class QueriesModule {}
