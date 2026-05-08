import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { MetadataModule } from '../metadata/metadata.module.js';

@Module({
    imports: [MetadataModule],
    controllers: [SettingsController],
})
export class SettingsModule {}
