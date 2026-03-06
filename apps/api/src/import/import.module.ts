import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ImportController } from './import.controller.js';
import { ImportService } from './import.service.js';
import { ConnectionsModule } from '../connections/connections.module.js';

@Module({
    imports: [
        ConnectionsModule,
        MulterModule.register({
            limits: {
                fileSize: 100 * 1024 * 1024, // 100MB max file size for imports
            },
        }),
    ],
    controllers: [ImportController],
    providers: [ImportService],
    exports: [ImportService],
})
export class ImportModule {}
