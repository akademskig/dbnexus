import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController, GroupsController } from './projects.controller.js';
import { MetadataService } from '../metadata/metadata.service.js';
import type { Project, InstanceGroup, ConnectionConfig } from '@dbnexus/shared';

describe('ProjectsController', () => {
    let controller: ProjectsController;

    const mockProject: Project = {
        id: 'project-123',
        name: 'Test Project',
        description: 'A test project',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockGroup: InstanceGroup = {
        id: 'group-123',
        projectId: 'project-123',
        name: 'Development',
        description: 'Dev databases',
        databaseEngine: 'postgres',
        syncSchema: false,
        syncData: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockConnection: ConnectionConfig = {
        id: 'conn-123',
        name: 'Test DB',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        ssl: false,
        readOnly: false,
        tags: [],
        connectionType: 'local',
        projectId: 'project-123',
        groupId: 'group-123',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockMetadataService: any = {
        projectRepository: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        databaseGroupRepository: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        connectionRepository: {
            findByProject: jest.fn(),
            findByGroup: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProjectsController],
            providers: [
                { provide: MetadataService, useValue: mockMetadataService },
            ],
        }).compile();

        controller = module.get<ProjectsController>(ProjectsController);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('Projects', () => {
        describe('getProjects', () => {
            it('should return all projects', () => {
                mockMetadataService.projectRepository.findAll.mockReturnValue([mockProject]);

                const result = controller.getProjects();

                expect(result).toEqual([mockProject]);
            });

            it('should return empty array when no projects', () => {
                mockMetadataService.projectRepository.findAll.mockReturnValue([]);

                const result = controller.getProjects();

                expect(result).toEqual([]);
            });
        });

        describe('getProject', () => {
            it('should return a project by id', () => {
                mockMetadataService.projectRepository.findById.mockReturnValue(mockProject);

                const result = controller.getProject('project-123');

                expect(result).toEqual(mockProject);
            });

            it('should return null for non-existent project', () => {
                mockMetadataService.projectRepository.findById.mockReturnValue(null);

                const result = controller.getProject('non-existent');

                expect(result).toBeNull();
            });
        });

        describe('createProject', () => {
            it('should create a new project', () => {
                mockMetadataService.projectRepository.create.mockReturnValue(mockProject);

                const result = controller.createProject({
                    name: 'Test Project',
                    description: 'A test project',
                });

                expect(result).toEqual(mockProject);
            });
        });

        describe('updateProject', () => {
            it('should update a project', () => {
                const updatedProject = { ...mockProject, name: 'Updated Project' };
                mockMetadataService.projectRepository.update.mockReturnValue(updatedProject);

                const result = controller.updateProject('project-123', {
                    name: 'Updated Project',
                });

                expect(result).toEqual(updatedProject);
            });
        });

        describe('deleteProject', () => {
            it('should delete a project', () => {
                mockMetadataService.projectRepository.delete.mockReturnValue(true);

                const result = controller.deleteProject('project-123');

                expect(result).toEqual({ success: true });
            });

            it('should return false when project not found', () => {
                mockMetadataService.projectRepository.delete.mockReturnValue(false);

                const result = controller.deleteProject('non-existent');

                expect(result).toEqual({ success: false });
            });
        });
    });

    describe('Database Groups', () => {
        describe('getGroups', () => {
            it('should return groups for a project', () => {
                mockMetadataService.databaseGroupRepository.findAll.mockReturnValue([mockGroup]);

                const result = controller.getGroups('project-123');

                expect(result).toEqual([mockGroup]);
                expect(mockMetadataService.databaseGroupRepository.findAll).toHaveBeenCalledWith(
                    'project-123'
                );
            });
        });

        describe('getGroup', () => {
            it('should return a group by id', () => {
                mockMetadataService.databaseGroupRepository.findById.mockReturnValue(mockGroup);

                const result = controller.getGroup('project-123', 'group-123');

                expect(result).toEqual(mockGroup);
            });
        });

        describe('createGroup', () => {
            it('should create a new group', () => {
                mockMetadataService.databaseGroupRepository.create.mockReturnValue(mockGroup);

                const result = controller.createGroup('project-123', {
                    name: 'Development',
                    description: 'Dev databases',
                    databaseEngine: 'postgres',
                });

                expect(result).toEqual(mockGroup);
                expect(mockMetadataService.databaseGroupRepository.create).toHaveBeenCalledWith({
                    name: 'Development',
                    description: 'Dev databases',
                    databaseEngine: 'postgres',
                    projectId: 'project-123',
                });
            });
        });

        describe('updateGroup', () => {
            it('should update a group', () => {
                const updatedGroup = { ...mockGroup, name: 'Production' };
                mockMetadataService.databaseGroupRepository.update.mockReturnValue(updatedGroup);

                const result = controller.updateGroup('project-123', 'group-123', {
                    name: 'Production',
                });

                expect(result).toEqual(updatedGroup);
            });
        });

        describe('deleteGroup', () => {
            it('should delete a group', () => {
                mockMetadataService.databaseGroupRepository.delete.mockReturnValue(true);

                const result = controller.deleteGroup('project-123', 'group-123');

                expect(result).toEqual({ success: true });
            });
        });
    });

    describe('Connections in Project/Group', () => {
        describe('getProjectConnections', () => {
            it('should return connections for a project', () => {
                mockMetadataService.connectionRepository.findByProject.mockReturnValue([
                    mockConnection,
                ]);

                const result = controller.getProjectConnections('project-123');

                expect(result).toEqual([mockConnection]);
            });
        });

        describe('getGroupConnections', () => {
            it('should return connections for a group', () => {
                mockMetadataService.connectionRepository.findByGroup.mockReturnValue([
                    mockConnection,
                ]);

                const result = controller.getGroupConnections('project-123', 'group-123');

                expect(result).toEqual([mockConnection]);
            });
        });
    });
});

describe('GroupsController', () => {
    let controller: GroupsController;

    const mockGroup: InstanceGroup = {
        id: 'group-123',
        projectId: 'project-123',
        name: 'Development',
        description: 'Dev databases',
        databaseEngine: 'postgres',
        syncSchema: false,
        syncData: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockConnection: ConnectionConfig = {
        id: 'conn-123',
        name: 'Test DB',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        ssl: false,
        readOnly: false,
        tags: [],
        connectionType: 'local',
        groupId: 'group-123',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockMetadataService = {
        databaseGroupRepository: {
            findAll: jest.fn(),
            findById: jest.fn(),
        },
        connectionRepository: {
            findByGroup: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GroupsController],
            providers: [
                { provide: MetadataService, useValue: mockMetadataService },
            ],
        }).compile();

        controller = module.get<GroupsController>(GroupsController);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllGroups', () => {
        it('should return all groups', () => {
            mockMetadataService.databaseGroupRepository.findAll.mockReturnValue([mockGroup]);

            const result = controller.getAllGroups();

            expect(result).toEqual([mockGroup]);
        });

        it('should filter by projectId', () => {
            mockMetadataService.databaseGroupRepository.findAll.mockReturnValue([mockGroup]);

            controller.getAllGroups('project-123');

            expect(mockMetadataService.databaseGroupRepository.findAll).toHaveBeenCalledWith(
                'project-123'
            );
        });
    });

    describe('getGroup', () => {
        it('should return a group by id', () => {
            mockMetadataService.databaseGroupRepository.findById.mockReturnValue(mockGroup);

            const result = controller.getGroup('group-123');

            expect(result).toEqual(mockGroup);
        });
    });

    describe('getGroupConnections', () => {
        it('should return connections for a group', () => {
            mockMetadataService.connectionRepository.findByGroup.mockReturnValue([mockConnection]);

            const result = controller.getGroupConnections('group-123');

            expect(result).toEqual([mockConnection]);
        });
    });
});
