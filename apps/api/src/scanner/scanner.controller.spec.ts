import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ScannerController } from './scanner.controller.js';
import { ScannerService, ScanResult, DiscoveredConnection } from './scanner.service.js';

describe('ScannerController', () => {
    let controller: ScannerController;
    let service: ScannerService;

    const mockPostgresConnection: DiscoveredConnection = {
        name: 'PostgreSQL on localhost:5432',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        source: 'port-scan',
        confidence: 'medium',
        details: 'Found open port 5432',
    };

    const mockDockerConnection: DiscoveredConnection = {
        name: 'Docker: postgres-dev',
        engine: 'postgres',
        host: 'localhost',
        port: 5433,
        database: 'devdb',
        username: 'postgres',
        password: 'secret',
        source: 'docker',
        confidence: 'high',
        details: 'Container: postgres-dev (postgres:15)',
    };

    const mockScanResult: ScanResult = {
        connections: [mockPostgresConnection, mockDockerConnection],
        scannedSources: [
            'Local ports (5432-5437, 3306-3311)',
            'Docker containers',
            'Environment files (.env)',
            'Docker Compose files',
            'SQLite files',
        ],
        errors: [],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockScannerService: any = {
        scanAll: jest.fn(),
        scanPorts: jest.fn(),
        scanDockerContainers: jest.fn(),
        scanEnvFiles: jest.fn(),
        scanDockerCompose: jest.fn(),
        scanSqliteFiles: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ScannerController],
            providers: [
                {
                    provide: ScannerService,
                    useValue: mockScannerService,
                },
            ],
        }).compile();

        controller = module.get<ScannerController>(ScannerController);
        service = module.get<ScannerService>(ScannerService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('scanForConnections', () => {
        it('should return scan results', async () => {
            mockScannerService.scanAll.mockResolvedValue(mockScanResult);

            const result = await controller.scanForConnections();

            expect(result).toEqual(mockScanResult);
            expect(service.scanAll).toHaveBeenCalledWith(undefined);
        });

        it('should pass workspace parameter', async () => {
            mockScannerService.scanAll.mockResolvedValue(mockScanResult);

            await controller.scanForConnections('/home/user/project');

            expect(service.scanAll).toHaveBeenCalledWith('/home/user/project');
        });

        it('should handle empty results', async () => {
            const emptyResult: ScanResult = {
                connections: [],
                scannedSources: mockScanResult.scannedSources,
                errors: [],
            };
            mockScannerService.scanAll.mockResolvedValue(emptyResult);

            const result = await controller.scanForConnections();

            expect(result.connections).toHaveLength(0);
        });

        it('should include scan errors in results', async () => {
            const resultWithErrors: ScanResult = {
                connections: [mockPostgresConnection],
                scannedSources: mockScanResult.scannedSources,
                errors: ['Docker scan: Docker not available'],
            };
            mockScannerService.scanAll.mockResolvedValue(resultWithErrors);

            const result = await controller.scanForConnections();

            expect(result.errors).toContain('Docker scan: Docker not available');
        });
    });

    describe('scanPorts', () => {
        it('should scan local ports', async () => {
            mockScannerService.scanPorts.mockResolvedValue([mockPostgresConnection]);

            const result = await controller.scanPorts();

            expect(result).toEqual([mockPostgresConnection]);
            expect(service.scanPorts).toHaveBeenCalled();
        });

        it('should return empty array when no databases found', async () => {
            mockScannerService.scanPorts.mockResolvedValue([]);

            const result = await controller.scanPorts();

            expect(result).toEqual([]);
        });
    });

    describe('scanDocker', () => {
        it('should scan Docker containers', async () => {
            mockScannerService.scanDockerContainers.mockResolvedValue([mockDockerConnection]);

            const result = await controller.scanDocker();

            expect(result).toEqual([mockDockerConnection]);
            expect(service.scanDockerContainers).toHaveBeenCalled();
        });
    });

    describe('scanEnvFiles', () => {
        it('should scan environment files', async () => {
            const envConnection: DiscoveredConnection = {
                name: 'DATABASE_URL from .env',
                engine: 'postgres',
                host: 'localhost',
                port: 5432,
                database: 'myapp',
                username: 'user',
                password: 'pass',
                source: 'env-file',
                confidence: 'high',
                details: 'Found in /project/.env',
            };
            mockScannerService.scanEnvFiles.mockResolvedValue([envConnection]);

            const result = await controller.scanEnvFiles('/project');

            expect(result).toEqual([envConnection]);
            expect(service.scanEnvFiles).toHaveBeenCalledWith('/project');
        });
    });

    describe('scanDockerCompose', () => {
        it('should scan Docker Compose files', async () => {
            const composeConnection: DiscoveredConnection = {
                name: 'Docker Compose: postgres from docker-compose.yml',
                engine: 'postgres',
                host: 'localhost',
                port: 5432,
                database: 'app',
                username: 'postgres',
                password: 'secret',
                source: 'docker-compose',
                confidence: 'high',
                details: 'Found in docker-compose.yml',
            };
            mockScannerService.scanDockerCompose.mockResolvedValue([composeConnection]);

            const result = await controller.scanDockerCompose('/project');

            expect(result).toEqual([composeConnection]);
            expect(service.scanDockerCompose).toHaveBeenCalledWith('/project');
        });
    });

    describe('scanSqliteFiles', () => {
        it('should scan SQLite files', async () => {
            const sqliteConnection: DiscoveredConnection = {
                name: 'SQLite: app.db',
                engine: 'sqlite',
                filepath: '/project/data/app.db',
                source: 'sqlite-file',
                confidence: 'high',
                details: 'Found at /project/data/app.db',
            };
            mockScannerService.scanSqliteFiles.mockResolvedValue([sqliteConnection]);

            const result = await controller.scanSqliteFiles('/project');

            expect(result).toEqual([sqliteConnection]);
            expect(service.scanSqliteFiles).toHaveBeenCalledWith('/project');
        });
    });
});
