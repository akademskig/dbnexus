import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import type { Project, DatabaseGroup, ConnectionConfig } from '@dbnexus/shared';
import {
    CreateProjectDto,
    UpdateProjectDto,
    CreateDatabaseGroupDto,
    UpdateDatabaseGroupDto,
} from './dto/index.js';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly metadataService: MetadataService) { }

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
    createProject(@Body() input: CreateProjectDto): Project {
        const project = this.metadataService.projectRepository.create(input);

        // Audit log
        this.metadataService.auditLogRepository.create({
            action: 'project_created',
            entityType: 'project',
            entityId: project.id,
            details: {
                name: project.name,
                description: project.description,
            },
        });

        return project;
    }

    @Put(':id')
    updateProject(@Param('id') id: string, @Body() input: UpdateProjectDto): Project | null {
        const project = this.metadataService.projectRepository.update(id, input);

        if (project) {
            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'project_updated',
                entityType: 'project',
                entityId: id,
                details: {
                    name: project.name,
                    changes: input,
                },
            });
        }

        return project;
    }

    @Delete(':id')
    deleteProject(@Param('id') id: string): { success: boolean } {
        const project = this.metadataService.projectRepository.findById(id);
        const success = this.metadataService.projectRepository.delete(id);

        if (success && project) {
            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'project_deleted',
                entityType: 'project',
                entityId: id,
                details: {
                    name: project.name,
                },
            });
        }

        return { success };
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
        @Body() input: CreateDatabaseGroupDto
    ): DatabaseGroup {
        const group = this.metadataService.databaseGroupRepository.create({
            ...input,
            projectId,
        });

        // Audit log
        this.metadataService.auditLogRepository.create({
            action: 'database_group_created',
            entityType: 'database_group',
            entityId: group.id,
            details: {
                name: group.name,
                projectId: group.projectId,
            },
        });

        return group;
    }

    @Put(':projectId/groups/:groupId')
    updateGroup(
        @Param('projectId') _projectId: string,
        @Param('groupId') groupId: string,
        @Body() input: UpdateDatabaseGroupDto
    ): DatabaseGroup | null {
        const group = this.metadataService.databaseGroupRepository.update(groupId, input);

        if (group) {
            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'database_group_updated',
                entityType: 'database_group',
                entityId: groupId,
                details: {
                    name: group.name,
                    changes: input,
                },
            });
        }

        return group;
    }

    @Delete(':projectId/groups/:groupId')
    deleteGroup(
        @Param('projectId') _projectId: string,
        @Param('groupId') groupId: string
    ): { success: boolean } {
        const group = this.metadataService.databaseGroupRepository.findById(groupId);
        const success = this.metadataService.databaseGroupRepository.delete(groupId);

        if (success && group) {
            // Audit log
            this.metadataService.auditLogRepository.create({
                action: 'database_group_deleted',
                entityType: 'database_group',
                entityId: groupId,
                details: {
                    name: group.name,
                },
            });
        }

        return { success };
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
    constructor(private readonly metadataService: MetadataService) { }

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
