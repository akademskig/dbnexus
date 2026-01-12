import { Module } from '@nestjs/common';
import { ProjectsController, GroupsController } from './projects.controller.js';
import { MetadataModule } from '../metadata/metadata.module.js';

@Module({
    imports: [MetadataModule],
    controllers: [ProjectsController, GroupsController],
})
export class ProjectsModule {}
