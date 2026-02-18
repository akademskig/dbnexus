/**
 * Integration Tests - Servers
 *
 * Tests server-level operations against Docker test databases.
 * Run with: pnpm test:integration
 *
 * Prerequisites:
 *   docker compose up -d
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_SERVERS, checkDockerContainers } from './setup.js';
import { MetadataService } from '../metadata/metadata.service.js';
import { ServersController } from '../servers/servers.controller.js';

describe('Servers Integration Tests', () => {
    let app: INestApplication;
    let metadataService: MetadataService;
    let serversController: ServersController;
    let dockerAvailable: { postgres: boolean; staging: boolean; mysql: boolean };
    const createdServerIds: string[] = [];

    beforeAll(async () => {
        // Check Docker availability
        dockerAvailable = await checkDockerContainers();

        if (!dockerAvailable.postgres && !dockerAvailable.mysql) {
            console.warn('⚠️  No Docker containers available. Run: docker compose up -d');
        }

        // Create the app
        app = await createTestApp();
        metadataService = app.get(MetadataService);
        serversController = app.get(ServersController);
    }, 30000);

    afterAll(async () => {
        // Cleanup created servers
        for (const id of createdServerIds) {
            try {
                metadataService.serverRepository.delete(id);
            } catch (error) {
                console.error(`Error cleaning up server ${id}:`, error);
            }
        }

        if (app) {
            await app.close();
        }
    });

    describe('Server CRUD Operations', () => {
        it('should create a server', () => {
            const uniqueName = `Test Server ${Date.now()}`;
            const serverInput = {
                ...TEST_SERVERS.postgresServer,
                name: uniqueName,
            };

            const server = serversController.createServer(serverInput);

            expect(server.id).toBeDefined();
            expect(server.name).toBe(uniqueName);
            expect(server.engine).toBe('postgres');
            expect(server.host).toBe('localhost');

            createdServerIds.push(server.id);
        });

        it('should get all servers', () => {
            const servers = serversController.getServers();

            expect(Array.isArray(servers)).toBe(true);
        });

        it('should get a server by id', () => {
            // First create a server
            const uniqueName = `Test Server Get ${Date.now()}`;
            const created = serversController.createServer({
                ...TEST_SERVERS.postgresServer,
                name: uniqueName,
            });
            createdServerIds.push(created.id);

            // Then get it
            const server = serversController.getServer(created.id);

            expect(server?.id).toBe(created.id);
            expect(server?.name).toBe(uniqueName);
        });

        it('should update a server', () => {
            // First create a server
            const created = serversController.createServer({
                ...TEST_SERVERS.postgresServer,
                name: `Test Server Update ${Date.now()}`,
            });
            createdServerIds.push(created.id);

            // Then update it
            const updatedName = `Updated Server ${Date.now()}`;
            const updated = serversController.updateServer(created.id, { name: updatedName });

            expect(updated?.name).toBe(updatedName);
        });

        it('should delete a server without linked databases', () => {
            // Create a server
            const created = serversController.createServer({
                ...TEST_SERVERS.postgresServer,
                name: `Test Server Delete ${Date.now()}`,
            });

            // Delete it
            const result = serversController.deleteServer(created.id);

            expect(result.success).toBe(true);

            // Verify it's deleted
            const server = serversController.getServer(created.id);
            expect(server).toBeNull();
        });

        it('should filter servers by engine', () => {
            // Create postgres server
            const postgresServer = serversController.createServer({
                ...TEST_SERVERS.postgresServer,
                name: `Filter Test Postgres ${Date.now()}`,
            });
            createdServerIds.push(postgresServer.id);

            // Create mysql server
            const mysqlServer = serversController.createServer({
                ...TEST_SERVERS.mysqlServer,
                name: `Filter Test MySQL ${Date.now()}`,
            });
            createdServerIds.push(mysqlServer.id);

            // Filter by postgres
            const postgresServers = serversController.getServers('postgres');

            expect(Array.isArray(postgresServers)).toBe(true);
            postgresServers.forEach((server) => {
                expect(server.engine).toBe('postgres');
            });
        });
    });

    describe('PostgreSQL Server Operations', () => {
        const skipIfNoPostgres = () => !dockerAvailable?.postgres;
        let postgresServerId: string;

        beforeAll(() => {
            if (!skipIfNoPostgres()) {
                // Create a postgres server for tests
                const server = serversController.createServer({
                    ...TEST_SERVERS.postgresServer,
                    name: `Postgres Integration Test ${Date.now()}`,
                });
                postgresServerId = server.id;
                createdServerIds.push(postgresServerId);
            }
        });

        it('should test PostgreSQL server connection', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            const result = await serversController.testServerConnection(postgresServerId);

            expect(result.success).toBe(true);
            expect(result.message).toContain('successful');
        });

        it('should list databases on PostgreSQL server', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            const result = await serversController.listDatabases(postgresServerId);

            expect(result.success).toBe(true);
            expect(Array.isArray(result.databases)).toBe(true);
            expect(result.databases!.length).toBeGreaterThan(0);

            // Check database structure
            const db = result.databases?.[0];
            expect(db).toBeDefined();
            if (db) {
                expect(db.name).toBeDefined();
                expect(db.size).toBeDefined();
                expect(typeof db.tracked).toBe('boolean');
            }
        });

        it('should get PostgreSQL server info', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            const result = await serversController.getServerInfo(postgresServerId);

            expect(result.success).toBe(true);
            expect(result.info).toBeDefined();
            expect(result.info!.version).toContain('PostgreSQL');
            expect(result.info!.uptime).toBeDefined();
            expect(typeof result.info!.activeConnections).toBe('number');
            expect(typeof result.info!.maxConnections).toBe('number');
        });

        it('should create and drop a database on PostgreSQL server', async () => {
            if (skipIfNoPostgres()) {
                console.warn('⚠️  Skipping: PostgreSQL container not available');
                return;
            }

            const testDbName = `test_db_${Date.now()}`;

            // Create database
            const createResult = await serversController.createDatabase(postgresServerId, {
                databaseName: testDbName,
            });

            expect(createResult.success).toBe(true);
            expect(createResult.message).toContain(testDbName);

            // Drop the created database
            const dropResult = await serversController.dropDatabase(postgresServerId, testDbName);

            expect(dropResult.success).toBe(true);
            expect(dropResult.message).toContain('dropped');
        });
    });

    describe('MySQL Server Operations', () => {
        const skipIfNoMySQL = () => !dockerAvailable?.mysql;
        let mysqlServerId: string;

        beforeAll(() => {
            if (!skipIfNoMySQL()) {
                // Create a mysql server for tests
                const server = serversController.createServer({
                    ...TEST_SERVERS.mysqlServer,
                    name: `MySQL Integration Test ${Date.now()}`,
                });
                mysqlServerId = server.id;
                createdServerIds.push(mysqlServerId);
            }
        });

        it('should test MySQL server connection', async () => {
            if (skipIfNoMySQL()) {
                console.warn('⚠️  Skipping: MySQL container not available');
                return;
            }

            const result = await serversController.testServerConnection(mysqlServerId);

            expect(result.success).toBe(true);
            expect(result.message).toContain('successful');
        });

        it('should list databases on MySQL server', async () => {
            if (skipIfNoMySQL()) {
                console.warn('⚠️  Skipping: MySQL container not available');
                return;
            }

            const result = await serversController.listDatabases(mysqlServerId);

            expect(result.success).toBe(true);
            expect(Array.isArray(result.databases)).toBe(true);
        });

        it('should get MySQL server info', async () => {
            if (skipIfNoMySQL()) {
                console.warn('⚠️  Skipping: MySQL container not available');
                return;
            }

            const result = await serversController.getServerInfo(mysqlServerId);

            expect(result.success).toBe(true);
            expect(result.info).toBeDefined();
            expect(result.info!.version).toBeDefined();
            expect(result.info!.uptime).toBeDefined();
        });

        it('should create and drop a database on MySQL server', async () => {
            if (skipIfNoMySQL()) {
                console.warn('⚠️  Skipping: MySQL container not available');
                return;
            }

            const testDbName = `test_db_${Date.now()}`;

            // Create database
            const createResult = await serversController.createDatabase(mysqlServerId, {
                databaseName: testDbName,
            });

            expect(createResult.success).toBe(true);

            // Drop the created database
            const dropResult = await serversController.dropDatabase(mysqlServerId, testDbName);

            expect(dropResult.success).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should return error for non-existent server', async () => {
            const result = await serversController.testServerConnection('non-existent-id');

            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });

        it('should return error when listing databases with wrong credentials', async () => {
            // Create a server with wrong password
            const server = serversController.createServer({
                name: `Wrong Creds Server ${Date.now()}`,
                engine: 'postgres',
                host: 'localhost',
                port: 5450,
                connectionType: 'local',
                ssl: false,
                tags: [],
                username: 'demo',
                password: 'wrong_password',
            });
            createdServerIds.push(server.id);

            // This should fail because the password is wrong
            const result = await serversController.listDatabases(server.id);

            // Will fail either way - no Docker or wrong creds
            if (!dockerAvailable?.postgres) {
                expect(result.success).toBe(false);
            } else {
                expect(result.success).toBe(false);
            }
        });

        it('should reject invalid database name', async () => {
            // Create a server (doesn't need Docker - testing validation only)
            const server = serversController.createServer({
                ...TEST_SERVERS.postgresServer,
                name: `Invalid DB Name Test ${Date.now()}`,
            });
            createdServerIds.push(server.id);

            // Try to create database with invalid name via HTTP (triggers DTO validation)
            const response = await request(app.getHttpServer())
                .post(`/api/servers/${server.id}/create-database`)
                .send({ databaseName: 'invalid-name!' })
                .expect(400);

            // message can be string or array depending on NestJS version
            const messages = Array.isArray(response.body.message)
                ? response.body.message
                : [response.body.message];
            expect(messages.some((m: string) => m.includes('Must start with a letter'))).toBe(true);
        });
    });
});
