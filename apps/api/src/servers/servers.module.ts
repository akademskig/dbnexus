import { Module } from '@nestjs/common';
import { ServersController } from './servers.controller.js';
import { MetadataModule } from '../metadata/metadata.module.js';

@Module({
    imports: [MetadataModule],
    controllers: [ServersController],
})
export class ServersModule { }
