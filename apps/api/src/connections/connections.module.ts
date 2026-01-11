import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller.js';
import { ConnectionsService } from './connections.service.js';

@Module({
    controllers: [ConnectionsController],
    providers: [ConnectionsService],
    exports: [ConnectionsService],
})
export class ConnectionsModule {}
