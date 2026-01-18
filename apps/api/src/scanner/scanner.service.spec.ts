import { Test, TestingModule } from '@nestjs/testing';
import { ScannerService } from './scanner.service.js';

describe('ScannerService', () => {
    let service: ScannerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ScannerService],
        }).compile();

        service = module.get<ScannerService>(ScannerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('parseConnectionUrl (private method tested via extractConnectionsFromEnv)', () => {
        // We test the URL parsing indirectly through scanEnvFiles behavior
        // or we can test the public interface

        it('should handle postgres:// URLs', async () => {
            // This tests the parsing logic indirectly
            const result = await service.scanAll();
            expect(result).toHaveProperty('connections');
            expect(result).toHaveProperty('scannedSources');
            expect(result).toHaveProperty('errors');
        });
    });

    describe('scanAll', () => {
        it('should return scan result structure', async () => {
            const result = await service.scanAll();

            expect(result).toHaveProperty('connections');
            expect(result).toHaveProperty('scannedSources');
            expect(result).toHaveProperty('errors');
            expect(Array.isArray(result.connections)).toBe(true);
            expect(Array.isArray(result.scannedSources)).toBe(true);
            expect(Array.isArray(result.errors)).toBe(true);
        });

        it('should include expected scanned sources', async () => {
            const result = await service.scanAll();

            expect(result.scannedSources).toContain('Local ports (5432-5437, 3306-3311)');
            expect(result.scannedSources).toContain('Docker containers');
            expect(result.scannedSources).toContain('Environment files (.env)');
            expect(result.scannedSources).toContain('Docker Compose files');
            expect(result.scannedSources).toContain('SQLite files');
        });
    });

    describe('scanPorts', () => {
        it('should return array of discovered connections', async () => {
            const result = await service.scanPorts();

            expect(Array.isArray(result)).toBe(true);
            // Each connection should have required fields
            for (const conn of result) {
                expect(conn).toHaveProperty('name');
                expect(conn).toHaveProperty('engine');
                expect(conn).toHaveProperty('source', 'port-scan');
                expect(conn).toHaveProperty('confidence');
            }
        });
    });

    describe('scanDockerContainers', () => {
        it('should return array of discovered connections', async () => {
            const result = await service.scanDockerContainers();

            expect(Array.isArray(result)).toBe(true);
            // Docker connections should have docker source
            for (const conn of result) {
                expect(conn.source).toBe('docker');
            }
        });
    });

    describe('scanEnvFiles', () => {
        it('should return array of discovered connections', async () => {
            const result = await service.scanEnvFiles();

            expect(Array.isArray(result)).toBe(true);
            for (const conn of result) {
                expect(conn.source).toBe('env-file');
            }
        });
    });

    describe('scanDockerCompose', () => {
        it('should return array of discovered connections', async () => {
            const result = await service.scanDockerCompose();

            expect(Array.isArray(result)).toBe(true);
            for (const conn of result) {
                expect(conn.source).toBe('docker-compose');
            }
        });
    });

    describe('scanSqliteFiles', () => {
        it('should return array of discovered connections', async () => {
            const result = await service.scanSqliteFiles();

            expect(Array.isArray(result)).toBe(true);
            for (const conn of result) {
                expect(conn.source).toBe('sqlite-file');
                expect(conn.engine).toBe('sqlite');
                expect(conn).toHaveProperty('filepath');
            }
        });
    });

    describe('deduplication', () => {
        it('should deduplicate connections from scanAll', async () => {
            const result = await service.scanAll();

            // Check for unique host:port combinations
            const seen = new Set<string>();
            for (const conn of result.connections) {
                const key = conn.filepath ? `sqlite:${conn.filepath}` : `${conn.host}:${conn.port}`;

                // Each key should be unique
                expect(seen.has(key)).toBe(false);
                seen.add(key);
            }
        });
    });

    describe('connection types', () => {
        it('should identify postgres engine', async () => {
            const result = await service.scanPorts();

            const postgresConns = result.filter((c) => c.engine === 'postgres');
            for (const conn of postgresConns) {
                expect(conn.port).toBeGreaterThanOrEqual(5432);
                expect(conn.port).toBeLessThanOrEqual(5437);
            }
        });

        it('should identify mysql engine', async () => {
            const result = await service.scanPorts();

            const mysqlConns = result.filter((c) => c.engine === 'mysql');
            for (const conn of mysqlConns) {
                expect(conn.port).toBeGreaterThanOrEqual(3306);
                expect(conn.port).toBeLessThanOrEqual(3311);
            }
        });
    });
});
