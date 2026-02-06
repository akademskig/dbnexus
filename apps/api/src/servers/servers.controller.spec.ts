import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ServersController } from './servers.controller.js';
import { MetadataService } from '../metadata/metadata.service.js';
import type { ServerConfig, ConnectionConfig } from '@dbnexus/shared';

describe('ServersController', () => {
    let controller: ServersController;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockMetadataService: any;

    const mockServer: ServerConfig = {
        id: 'server-123',
        name: 'Test Server',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        connectionType: 'local',
        ssl: false,
        username: 'admin',
        tags: ['dev'],
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
        username: 'testuser',
        ssl: false,
        readOnly: false,
        tags: ['dev'],
        connectionType: 'local',
        serverId: 'server-123',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        mockMetadataService = {
            serverRepository: {
                findAll: jest.fn(),
                findById: jest.fn(),
                findByEngine: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                getPassword: jest.fn(),
            },
            connectionRepository: {
                findByServerId: jest.fn(),
                findAll: jest.fn(),
            },
            auditLogRepository: {
                create: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ServersController],
            providers: [
                {
                    provide: MetadataService,
                    useValue: mockMetadataService,
                },
            ],
        }).compile();

        controller = module.get<ServersController>(ServersController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getServers', () => {
        it('should return all servers when no engine filter', () => {
            const servers = [mockServer];
            mockMetadataService.serverRepository.findAll.mockReturnValue(servers);

            const result = controller.getServers();

            expect(result).toEqual(servers);
            expect(mockMetadataService.serverRepository.findAll).toHaveBeenCalled();
        });

        it('should return empty array when no servers', () => {
            mockMetadataService.serverRepository.findAll.mockReturnValue([]);

            const result = controller.getServers();

            expect(result).toEqual([]);
        });

        it('should filter servers by engine', () => {
            const postgresServers = [mockServer];
            mockMetadataService.serverRepository.findByEngine.mockReturnValue(postgresServers);

            const result = controller.getServers('postgres');

            expect(result).toEqual(postgresServers);
            expect(mockMetadataService.serverRepository.findByEngine).toHaveBeenCalledWith(
                'postgres'
            );
        });
    });

    describe('getServer', () => {
        it('should return a server by id', () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);

            const result = controller.getServer('server-123');

            expect(result).toEqual(mockServer);
            expect(mockMetadataService.serverRepository.findById).toHaveBeenCalledWith(
                'server-123'
            );
        });

        it('should return null for non-existent server', () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(null);

            const result = controller.getServer('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('getServerDatabases', () => {
        it('should return databases linked to a server', () => {
            const connections = [mockConnection];
            mockMetadataService.connectionRepository.findByServerId.mockReturnValue(connections);

            const result = controller.getServerDatabases('server-123');

            expect(result).toEqual(connections);
            expect(mockMetadataService.connectionRepository.findByServerId).toHaveBeenCalledWith(
                'server-123'
            );
        });

        it('should return empty array when no databases linked', () => {
            mockMetadataService.connectionRepository.findByServerId.mockReturnValue([]);

            const result = controller.getServerDatabases('server-123');

            expect(result).toEqual([]);
        });
    });

    describe('getServerPassword', () => {
        it('should return password for server', () => {
            mockMetadataService.serverRepository.getPassword.mockReturnValue('secret123');

            const result = controller.getServerPassword('server-123');

            expect(result).toEqual({ password: 'secret123' });
            expect(mockMetadataService.serverRepository.getPassword).toHaveBeenCalledWith(
                'server-123'
            );
        });

        it('should return null password when not configured', () => {
            mockMetadataService.serverRepository.getPassword.mockReturnValue(null);

            const result = controller.getServerPassword('server-123');

            expect(result).toEqual({ password: null });
        });
    });

    describe('createServer', () => {
        it('should create a new server', () => {
            const input = {
                name: 'New Server',
                engine: 'postgres' as const,
                host: 'localhost',
                port: 5432,
                connectionType: 'local' as const,
                ssl: false,
                username: 'admin',
                password: 'secret',
                tags: [],
            };
            mockMetadataService.serverRepository.create.mockReturnValue(mockServer);

            const result = controller.createServer(input);

            expect(result).toEqual(mockServer);
            expect(mockMetadataService.serverRepository.create).toHaveBeenCalledWith(input);
            expect(mockMetadataService.auditLogRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'server_created',
                    entityType: 'server',
                    entityId: mockServer.id,
                })
            );
        });
    });

    describe('updateServer', () => {
        it('should update a server', () => {
            const input = { name: 'Updated Server' };
            const updatedServer = { ...mockServer, name: 'Updated Server' };
            mockMetadataService.serverRepository.update.mockReturnValue(updatedServer);

            const result = controller.updateServer('server-123', input);

            expect(result).toEqual(updatedServer);
            expect(mockMetadataService.serverRepository.update).toHaveBeenCalledWith(
                'server-123',
                input
            );
            expect(mockMetadataService.auditLogRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'server_updated',
                    entityType: 'server',
                    entityId: 'server-123',
                })
            );
        });

        it('should return null for non-existent server', () => {
            mockMetadataService.serverRepository.update.mockReturnValue(null);

            const result = controller.updateServer('non-existent', { name: 'Test' });

            expect(result).toBeNull();
            expect(mockMetadataService.auditLogRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('deleteServer', () => {
        it('should delete a server without linked databases', () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);
            mockMetadataService.connectionRepository.findByServerId.mockReturnValue([]);
            mockMetadataService.serverRepository.delete.mockReturnValue(true);

            const result = controller.deleteServer('server-123');

            expect(result).toEqual({ success: true });
            expect(mockMetadataService.serverRepository.delete).toHaveBeenCalledWith('server-123');
            expect(mockMetadataService.auditLogRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: 'server_deleted',
                    entityType: 'server',
                    entityId: 'server-123',
                })
            );
        });

        it('should prevent deletion when server has linked databases', () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);
            mockMetadataService.connectionRepository.findByServerId.mockReturnValue([
                mockConnection,
            ]);

            const result = controller.deleteServer('server-123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('1 linked database');
            expect(mockMetadataService.serverRepository.delete).not.toHaveBeenCalled();
        });
    });

    describe('testServerConnection', () => {
        it('should return error when server not found', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(null);

            const result = await controller.testServerConnection('non-existent');

            expect(result).toEqual({ success: false, message: 'Server not found' });
        });

        it('should return error when password not configured', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);
            mockMetadataService.serverRepository.getPassword.mockReturnValue(null);

            const result = await controller.testServerConnection('server-123');

            expect(result).toEqual({
                success: false,
                message: 'Server admin credentials not configured',
            });
        });
    });

    describe('createDatabase', () => {
        it('should return error when server not found', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(null);

            const result = await controller.createDatabase('non-existent', {
                databaseName: 'newdb',
            });

            expect(result).toEqual({ success: false, message: 'Server not found' });
        });

        it('should return error when admin credentials not configured', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);
            mockMetadataService.serverRepository.getPassword.mockReturnValue(null);

            const result = await controller.createDatabase('server-123', { databaseName: 'newdb' });

            expect(result.success).toBe(false);
            expect(result.message).toContain('admin credentials not configured');
        });

        it('should reject invalid database names', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);
            mockMetadataService.serverRepository.getPassword.mockReturnValue('secret');

            await expect(
                controller.createDatabase('server-123', { databaseName: 'invalid-name!' })
            ).rejects.toThrow('Invalid database name');
        });
    });

    describe('listDatabases', () => {
        it('should return error when server not found', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(null);

            const result = await controller.listDatabases('non-existent');

            expect(result).toEqual({ success: false, message: 'Server not found' });
        });

        it('should return error when password not configured', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);
            mockMetadataService.serverRepository.getPassword.mockReturnValue(null);

            const result = await controller.listDatabases('server-123');

            expect(result).toEqual({
                success: false,
                message: 'Server admin credentials not configured',
            });
        });
    });

    describe('getServerInfo', () => {
        it('should return error when server not found', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(null);

            const result = await controller.getServerInfo('non-existent');

            expect(result).toEqual({ success: false, message: 'Server not found' });
        });

        it('should return error when admin credentials not configured', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);
            mockMetadataService.serverRepository.getPassword.mockReturnValue(null);

            const result = await controller.getServerInfo('server-123');

            expect(result).toEqual({
                success: false,
                message: 'Server admin credentials not configured',
            });
        });
    });

    describe('dropDatabase', () => {
        it('should return error when server not found', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(null);

            const result = await controller.dropDatabase('non-existent', 'testdb');

            expect(result).toEqual({ success: false, message: 'Server not found' });
        });

        it('should return error when admin credentials not configured', async () => {
            mockMetadataService.serverRepository.findById.mockReturnValue(mockServer);
            mockMetadataService.serverRepository.getPassword.mockReturnValue(null);

            const result = await controller.dropDatabase('server-123', 'testdb');

            expect(result).toEqual({
                success: false,
                message: 'Server admin credentials not configured',
            });
        });
    });
});
