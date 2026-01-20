/**
 * Integration Tests - Connections
 *
 * Tests actual database connections against Docker test databases.
 * Run with: pnpm test:integration
 *
 * Prerequisites:
 *   docker compose up -d
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { createTestApp, TEST_CONNECTIONS, checkDockerContainers } from './setup.js';
import { ConnectionsService } from '../connections/connections.service.js';

describe('Connections Integration Tests', () => {
    let app: INestApplication;
    let connectionsService: ConnectionsService;
    let dockerAvailable: { postgres: boolean; staging: boolean; mysql: boolean };
    const createdConnectionIds: string[] = [];

    beforeAll(async () => {
        // Check Docker availability
        dockerAvailable = await checkDockerContainers();

        if (!dockerAvailable.postgres && !dockerAvailable.mysql) {
            console.warn('⚠️  No Docker containers available. Run: docker compose up -d');
        }

        // Create the app
        app = await createTestApp();
        connectionsService = app.get(ConnectionsService);
    }, 30000);

    afterAll(async () => {
        // Cleanup created connections
        for (const id of createdConnectionIds) {
            try {
                await connectionsService.delete(id);
            } catch {
                // Ignore cleanup errors
            }
        }

        if (app) {
            await app.close();
        }
    });

    describe('PostgreSQL Connection', () => {
        const skipIfNoPostgres = () => !dockerAvailable?.postgres;

        it('should test PostgreSQL connection settings successfully', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            const result = await connectionsService.testSettings(
                TEST_CONNECTIONS.postgresEcommerce
            );

            expect(result.success).toBe(true);
            expect(result.message).toContain('successful');
            expect(result.latencyMs).toBeGreaterThan(0);
            expect(result.serverVersion).toContain('PostgreSQL');
        });

        it('should fail with wrong credentials', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            const badConfig = {
                ...TEST_CONNECTIONS.postgresEcommerce,
                password: 'wrong_password',
            };

            const result = await connectionsService.testSettings(badConfig);

            expect(result.success).toBe(false);
            expect(result.message).toBeTruthy();
        });

        it('should fail with wrong host', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            const badConfig = {
                ...TEST_CONNECTIONS.postgresEcommerce,
                host: 'nonexistent.host',
            };

            const result = await connectionsService.testSettings(badConfig);

            expect(result.success).toBe(false);
        });

        it('should create, retrieve and delete a PostgreSQL connection', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            // Create with unique name to avoid conflicts
            const uniqueName = `Test Ecommerce ${Date.now()}`;
            const created = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresEcommerce,
                name: uniqueName,
            });
            createdConnectionIds.push(created.id);

            expect(created.id).toBeDefined();
            expect(created.name).toBe(uniqueName);
            expect(created.engine).toBe('postgres');

            // Retrieve - use try/catch since findById throws if not found
            let retrieved;
            try {
                retrieved = connectionsService.findById(created.id);
            } catch {
                retrieved = null;
            }
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe(created.name);

            // Test the saved connection
            const testResult = await connectionsService.test(created.id);
            expect(testResult.success).toBe(true);

            // Update
            const updatedName = `Updated PostgreSQL Connection ${Date.now()}`;
            const updated = await connectionsService.update(created.id, {
                name: updatedName,
            });
            expect(updated.name).toBe(updatedName);

            // Delete
            await connectionsService.delete(created.id);

            // Verify deleted - findById throws NotFoundException
            let afterDelete = null;
            try {
                afterDelete = connectionsService.findById(created.id);
            } catch {
                // Expected - connection should not exist
            }
            expect(afterDelete).toBeNull();

            // Remove from cleanup list since we already deleted
            const idx = createdConnectionIds.indexOf(created.id);
            if (idx > -1) createdConnectionIds.splice(idx, 1);
        });

        it('should connect and execute queries', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            // Create connection
            const created = await connectionsService.create(TEST_CONNECTIONS.postgresEcommerce);
            createdConnectionIds.push(created.id);

            // Get connector
            const connector = await connectionsService.getConnector(created.id);
            expect(connector).toBeDefined();

            // Execute a simple query
            const result = await connector.query('SELECT COUNT(*) as count FROM products');
            expect(result.rows).toBeDefined();
            expect(result.rows.length).toBe(1);
            expect(Number(result.rows[0]?.count)).toBeGreaterThan(0);

            // Disconnect
            await connectionsService.disconnect(created.id);
        });
    });

    describe('MySQL Connection', () => {
        const skipIfNoMySQL = () => !dockerAvailable?.mysql;

        it('should test MySQL connection settings successfully', async () => {
            if (skipIfNoMySQL()) {
                console.warn('⚠️  Skipping: MySQL container not available');
                return;
            }

            const result = await connectionsService.testSettings(TEST_CONNECTIONS.mysqlBlog);

            expect(result.success).toBe(true);
            expect(result.message).toContain('successful');
            expect(result.latencyMs).toBeGreaterThan(0);
        });

        it('should create and test a MySQL connection', async () => {
            if (skipIfNoMySQL()) {
                console.warn('⚠️  Skipping: MySQL container not available');
                return;
            }

            // Create
            const created = await connectionsService.create(TEST_CONNECTIONS.mysqlBlog);
            createdConnectionIds.push(created.id);

            expect(created.id).toBeDefined();
            expect(created.engine).toBe('mysql');

            // Test
            const testResult = await connectionsService.test(created.id);
            expect(testResult.success).toBe(true);

            // Get connector and execute query
            const connector = await connectionsService.getConnector(created.id);
            const result = await connector.query('SELECT 1 as test');
            expect(result.rows).toBeDefined();
        });
    });

    describe('Connection List', () => {
        it('should return all connections', async () => {
            const connections = connectionsService.findAll();
            expect(Array.isArray(connections)).toBe(true);
        });
    });
});
