import { Module } from '@nestjs/common';
import { PreferencesController } from './preferences.controller.js';
import { MetadataModule } from '../metadata/metadata.module.js';

@Module({
    imports: [MetadataModule],
    controllers: [PreferencesController],
})
export class PreferencesModule {}
