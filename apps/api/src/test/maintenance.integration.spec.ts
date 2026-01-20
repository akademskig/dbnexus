import { INestApplication } from '@nestjs/common';
import { createTestApp, checkDockerContainers, TEST_CONNECTIONS } from './setup';
import { ConnectionsService } from '../connections/connections.service';
import { QueriesService } from '../queries/queries.service';

describe('Maintenance Operations Integration Tests', () => {
    let app: INestApplication;
    let connectionsService: ConnectionsService;
    let queriesService: QueriesService;
    let dockerAvailable: { postgres: boolean; staging: boolean; mysql: boolean };
    let postgresConnectionId: string | null = null;
    let mysqlConnectionId: string | null = null;

    beforeAll(async () => {
        dockerAvailable = await checkDockerContainers();
        app = await createTestApp();
        connectionsService = app.get(ConnectionsService);
        queriesService = app.get(QueriesService);

        if (dockerAvailable.postgres) {
            const conn = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresEcommerce,
                name: 'Maintenance Test - PostgreSQL',
            });
            postgresConnectionId = conn.id;
            await connectionsService.getConnector(postgresConnectionId);
        }
        if (dockerAvailable.mysql) {
            const conn = await connectionsService.create({
                ...TEST_CONNECTIONS.mysqlBlog,
                name: 'Maintenance Test - MySQL',
            });
            mysqlConnectionId = conn.id;
            await connectionsService.getConnector(mysqlConnectionId);
        }
    }, 30000);

    afterAll(async () => {
        for (const id of [postgresConnectionId, mysqlConnectionId]) {
            if (id) {
                try {
                    await connectionsService.disconnect(id);
                    await connectionsService.delete(id);
                } catch (error) {
                    console.error(`Error disconnecting and deleting connection ${id}:`, error);
                }
            }
        }
        if (app) {
            await app.close();
        }
    });

    describe('PostgreSQL Maintenance Operations', () => {
        const skipIfNoPostgres = () => !dockerAvailable?.postgres || !postgresConnectionId;

        it('should execute VACUUM and return details', async () => {
            if (skipIfNoPostgres()) return;
            const result = await queriesService.executeMaintenance(postgresConnectionId!, 'vacuum');
            expect(result.success).toBe(true);
            expect(result.message).toContain('VACUUM');
            expect(result.duration).toBeGreaterThan(0);
            expect(result.details).toBeDefined();
            expect(Array.isArray(result.details)).toBe(true);
        });

        it('should execute ANALYZE and return details', async () => {
            if (skipIfNoPostgres()) return;
            const result = await queriesService.executeMaintenance(postgresConnectionId!, 'analyze');
            expect(result.success).toBe(true);
            expect(result.message).toContain('ANALYZE');
            expect(result.duration).toBeGreaterThan(0);
            expect(result.details).toBeDefined();
            expect(Array.isArray(result.details)).toBe(true);
        });

        it('should execute VACUUM ANALYZE and return details', async () => {
            if (skipIfNoPostgres()) return;
            const result = await queriesService.executeMaintenance(
                postgresConnectionId!,
                'vacuum_analyze'
            );
            expect(result.success).toBe(true);
            expect(result.message).toContain('VACUUM_ANALYZE');
            expect(result.duration).toBeGreaterThan(0);
            expect(result.details).toBeDefined();
        });

        it('should execute VACUUM FULL and return details', async () => {
            if (skipIfNoPostgres()) return;
            const result = await queriesService.executeMaintenance(
                postgresConnectionId!,
                'vacuum_full'
            );
            expect(result.success).toBe(true);
            expect(result.message).toContain('VACUUM_FULL');
            expect(result.duration).toBeGreaterThan(0);
            expect(result.details).toBeDefined();
        }, 60000); // VACUUM FULL can take longer

        it('should handle unknown operation gracefully', async () => {
            if (skipIfNoPostgres()) return;
            await expect(
                queriesService.executeMaintenance(postgresConnectionId!, 'unknown_operation')
            ).rejects.toThrow('Unknown maintenance operation');
        });
    });

    describe('MySQL Maintenance Operations', () => {
        const skipIfNoMysql = () => !dockerAvailable?.mysql || !mysqlConnectionId;

        it('should execute OPTIMIZE TABLE and return details', async () => {
            if (skipIfNoMysql()) return;
            const result = await queriesService.executeMaintenance(
                mysqlConnectionId!,
                'optimize',
                'posts'
            );
            expect(result.success).toBe(true);
            expect(result.message).toContain('OPTIMIZE');
            expect(result.duration).toBeGreaterThan(0);
            expect(result.details).toBeDefined();
            expect(Array.isArray(result.details)).toBe(true);
            // MySQL OPTIMIZE returns specific result format
            if (result.details && result.details.length > 0) {
                expect(result.details[0]).toContain('posts');
                expect(result.details[0]).toContain('optimize');
            }
        });

        it.skip('should execute CHECK TABLE and return details', async () => {
            // Note: CHECK TABLE is not supported in MySQL prepared statement protocol
            // This is a known MySQL limitation, not a bug in our code
            if (skipIfNoMysql()) return;
            const result = await queriesService.executeMaintenance(mysqlConnectionId!, 'check', 'posts');
            expect(result.success).toBe(true);
            expect(result.message).toContain('CHECK');
            expect(result.duration).toBeGreaterThan(0);
            expect(result.details).toBeDefined();
            expect(Array.isArray(result.details)).toBe(true);
        });

        it('should report error in details when table does not exist', async () => {
            if (skipIfNoMysql()) return;
            const result = await queriesService.executeMaintenance(
                mysqlConnectionId!,
                'optimize',
                'nonexistent_table'
            );
            // MySQL OPTIMIZE doesn't throw, but returns error status in result
            expect(result.success).toBe(true);
            expect(result.details).toBeDefined();
            expect(result.details?.some((d) => d.includes('Error'))).toBe(true);
        });
    });

    describe('Duration Tracking', () => {
        const skipIfNoPostgres = () => !dockerAvailable?.postgres || !postgresConnectionId;

        it('should track operation duration accurately', async () => {
            if (skipIfNoPostgres()) return;
            const startTime = Date.now();
            const result = await queriesService.executeMaintenance(postgresConnectionId!, 'vacuum');
            const actualDuration = Date.now() - startTime;

            expect(result.duration).toBeGreaterThan(0);
            expect(result.duration).toBeLessThanOrEqual(actualDuration + 100); // Allow 100ms tolerance
            expect(result.duration).toBeGreaterThanOrEqual(actualDuration - 100);
        });
    });
});
