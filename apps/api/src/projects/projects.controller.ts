import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import type {
    Project,
    ProjectCreateInput,
    ProjectUpdateInput,
    DatabaseGroup,
    DatabaseGroupCreateInput,
    DatabaseGroupUpdateInput,
    ConnectionConfig,
} from '@dbnexus/shared';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly metadataService: MetadataService) {}

    // ============ Projects ============

    @Get()
    getProjects(): Project[] {
        return this.metadataService.projectRepository.findAll();
    }

    @Get(':id')
    getProject(@Param('id') id: string): Project | null {
        return this.metadataService.projectRepository.findById(id);
    }

    @Post()
    createProject(@Body() input: ProjectCreateInput): Project {
        return this.metadataService.projectRepository.create(input);
    }

    @Put(':id')
    updateProject(@Param('id') id: string, @Body() input: ProjectUpdateInput): Project | null {
        return this.metadataService.projectRepository.update(id, input);
    }

    @Delete(':id')
    deleteProject(@Param('id') id: string): { success: boolean } {
        return { success: this.metadataService.projectRepository.delete(id) };
    }

    // ============ Database Groups ============

    @Get(':projectId/groups')
    getGroups(@Param('projectId') projectId: string): DatabaseGroup[] {
        return this.metadataService.databaseGroupRepository.findAll(projectId);
    }

    @Get(':projectId/groups/:groupId')
    getGroup(
        @Param('projectId') _projectId: string,
        @Param('groupId') groupId: string
    ): DatabaseGroup | null {
        return this.metadataService.databaseGroupRepository.findById(groupId);
    }

    @Post(':projectId/groups')
    createGroup(
        @Param('projectId') projectId: string,
        @Body() input: Omit<DatabaseGroupCreateInput, 'projectId'>
    ): DatabaseGroup {
        return this.metadataService.databaseGroupRepository.create({
            ...input,
            projectId,
        });
    }

    @Put(':projectId/groups/:groupId')
    updateGroup(
        @Param('projectId') _projectId: string,
        @Param('groupId') groupId: string,
        @Body() input: DatabaseGroupUpdateInput
    ): DatabaseGroup | null {
        return this.metadataService.databaseGroupRepository.update(groupId, input);
    }

    @Delete(':projectId/groups/:groupId')
    deleteGroup(
        @Param('projectId') _projectId: string,
        @Param('groupId') groupId: string
    ): { success: boolean } {
        return { success: this.metadataService.databaseGroupRepository.delete(groupId) };
    }

    // ============ Connections in Project/Group ============

    @Get(':projectId/connections')
    getProjectConnections(@Param('projectId') projectId: string): ConnectionConfig[] {
        return this.metadataService.connectionRepository.findByProject(projectId);
    }

    @Get(':projectId/groups/:groupId/connections')
    getGroupConnections(
        @Param('projectId') _projectId: string,
        @Param('groupId') groupId: string
    ): ConnectionConfig[] {
        return this.metadataService.connectionRepository.findByGroup(groupId);
    }
}

// Separate controller for all groups (without project context)
@Controller('groups')
export class GroupsController {
    constructor(private readonly metadataService: MetadataService) {}

    @Get()
    getAllGroups(@Query('projectId') projectId?: string): DatabaseGroup[] {
        return this.metadataService.databaseGroupRepository.findAll(projectId);
    }

    @Get(':id')
    getGroup(@Param('id') id: string): DatabaseGroup | null {
        return this.metadataService.databaseGroupRepository.findById(id);
    }

    @Get(':id/connections')
    getGroupConnections(@Param('id') groupId: string): ConnectionConfig[] {
        return this.metadataService.connectionRepository.findByGroup(groupId);
    }
}
