import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionsController } from './connections.controller.js';
import { ConnectionsService } from './connections.service.js';
import type { ConnectionConfig, ConnectionTestResult } from '@dbnexus/shared';

describe('ConnectionsController', () => {
    let controller: ConnectionsController;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockConnectionsService: any;

    const mockConnection: ConnectionConfig = {
        id: 'test-id-123',
        name: 'Test Connection',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        ssl: false,
        readOnly: false,
        tags: ['dev'],
        connectionType: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        mockConnectionsService = {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            test: jest.fn(),
            testSettings: jest.fn(),
            getConnector: jest.fn(),
            disconnect: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ConnectionsController],
            providers: [
                {
                    provide: ConnectionsService,
                    useValue: mockConnectionsService,
                },
            ],
        }).compile();

        controller = module.get<ConnectionsController>(ConnectionsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('should return an array of connections', () => {
            const connections = [mockConnection];
            mockConnectionsService.findAll.mockReturnValue(connections);

            const result = controller.findAll();

            expect(result).toEqual(connections);
            expect(mockConnectionsService.findAll).toHaveBeenCalled();
        });

        it('should return empty array when no connections', () => {
            mockConnectionsService.findAll.mockReturnValue([]);

            const result = controller.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should return a connection by id', () => {
            mockConnectionsService.findById.mockReturnValue(mockConnection);

            const result = controller.findById('test-id-123');

            expect(result).toEqual(mockConnection);
            expect(mockConnectionsService.findById).toHaveBeenCalledWith('test-id-123');
        });
    });

    describe('create', () => {
        it('should create a new connection', async () => {
            const input = {
                name: 'New Connection',
                engine: 'postgres' as const,
                host: 'localhost',
                port: 5432,
                database: 'newdb',
                username: 'user',
                password: 'pass',
                ssl: false,
                readOnly: false,
                tags: [] as string[],
            };
            mockConnectionsService.create.mockResolvedValue(mockConnection);

            const result = await controller.create(input);

            expect(result).toEqual(mockConnection);
            expect(mockConnectionsService.create).toHaveBeenCalledWith(input);
        });
    });

    describe('update', () => {
        it('should update a connection', async () => {
            const input = { name: 'Updated Name' };
            const updatedConnection = { ...mockConnection, name: 'Updated Name' };
            mockConnectionsService.update.mockResolvedValue(updatedConnection);

            const result = await controller.update('test-id-123', input);

            expect(result).toEqual(updatedConnection);
            expect(mockConnectionsService.update).toHaveBeenCalledWith('test-id-123', input);
        });
    });

    describe('delete', () => {
        it('should delete a connection', async () => {
            mockConnectionsService.delete.mockResolvedValue(undefined);

            const result = await controller.delete('test-id-123');

            expect(result).toEqual({ success: true });
            expect(mockConnectionsService.delete).toHaveBeenCalledWith('test-id-123');
        });
    });

    describe('test', () => {
        it('should test a connection successfully', async () => {
            const testResult: ConnectionTestResult = {
                success: true,
                message: 'Connection successful',
                latencyMs: 15,
                serverVersion: 'PostgreSQL 15.0',
            };
            mockConnectionsService.test.mockResolvedValue(testResult);

            const result = await controller.test('test-id-123');

            expect(result).toEqual(testResult);
            expect(mockConnectionsService.test).toHaveBeenCalledWith('test-id-123');
        });

        it('should return failure for failed connection test', async () => {
            const testResult: ConnectionTestResult = {
                success: false,
                message: 'Connection refused',
            };
            mockConnectionsService.test.mockResolvedValue(testResult);

            const result = await controller.test('test-id-123');

            expect(result.success).toBe(false);
        });
    });

    describe('testSettings', () => {
        it('should test connection settings without saving', async () => {
            const settings = {
                name: 'Test',
                engine: 'postgres' as const,
                host: 'localhost',
                port: 5432,
                database: 'testdb',
                username: 'user',
                password: 'pass',
                ssl: false,
                readOnly: false,
                tags: [] as string[],
            };
            const testResult: ConnectionTestResult = {
                success: true,
                message: 'Connection successful',
                latencyMs: 10,
            };
            mockConnectionsService.testSettings.mockResolvedValue(testResult);

            const result = await controller.testSettings(settings);

            expect(result).toEqual(testResult);
            expect(mockConnectionsService.testSettings).toHaveBeenCalledWith(settings);
        });
    });

    describe('connect', () => {
        it('should connect to a database', async () => {
            mockConnectionsService.getConnector.mockResolvedValue({});

            const result = await controller.connect('test-id-123');

            expect(result).toEqual({ success: true });
            expect(mockConnectionsService.getConnector).toHaveBeenCalledWith('test-id-123');
        });
    });

    describe('disconnect', () => {
        it('should disconnect from a database', async () => {
            mockConnectionsService.disconnect.mockResolvedValue(undefined);

            const result = await controller.disconnect('test-id-123');

            expect(result).toEqual({ success: true });
            expect(mockConnectionsService.disconnect).toHaveBeenCalledWith('test-id-123');
        });
    });

    describe('getStatus', () => {
        it('should return connected status when connection is active', async () => {
            mockConnectionsService.test.mockResolvedValue({ success: true });

            const result = await controller.getStatus('test-id-123');

            expect(result).toEqual({ connected: true });
        });

        it('should return disconnected status when connection is inactive', async () => {
            mockConnectionsService.test.mockResolvedValue({ success: false });

            const result = await controller.getStatus('test-id-123');

            expect(result).toEqual({ connected: false });
        });
    });
});
