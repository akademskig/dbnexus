import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BackupController } from './backup.controller.js';
import { BackupService } from './backup.service.js';
import { RestoreService } from './restore.service.js';
import { MetadataModule } from '../metadata/metadata.module.js';
import { ConnectionsModule } from '../connections/connections.module.js';

@Module({
    imports: [
        MetadataModule,
        ConnectionsModule,
        MulterModule.register({
            limits: {
                fileSize: 1024 * 1024 * 1024, // 1GB max file size
            },
        }),
    ],
    controllers: [BackupController],
    providers: [BackupService, RestoreService],
    exports: [BackupService, RestoreService],
})
export class BackupModule {}
