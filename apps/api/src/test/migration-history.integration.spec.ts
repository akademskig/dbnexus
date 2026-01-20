import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, cleanupTestApp, createTestConnection } from './setup';
import request from 'supertest';

describe('Migration History Integration Tests', () => {
    let app: INestApplication;
    let postgresConnectionId: string;
    let postgres2ConnectionId: string;
    let groupId: string;

    beforeAll(async () => {
        app = await setupTestApp();

        // Create two test connections
        const conn1Response = await createTestConnection(
            app,
            'test-postgres-migration-1',
            'postgres'
        );
        postgresConnectionId = conn1Response.body.id;

        const conn2Response = await createTestConnection(
            app,
            'test-postgres-migration-2',
            'postgres'
        );
        postgres2ConnectionId = conn2Response.body.id;

        // Create a test group
        const groupResponse = await request(app.getHttpServer())
            .post('/groups')
            .send({
                name: 'Test Migration Group',
                databaseEngine: 'postgres',
                sourceConnectionId: postgresConnectionId,
                syncSchema: true,
                syncData: false,
            })
            .expect(201);

        groupId = groupResponse.body.id;
    });

    afterAll(async () => {
        await cleanupTestApp(app);
    });

    describe('Migration History with Group Tracking', () => {
        it('should record manual migration without group', async () => {
            const response = await request(app.getHttpServer())
                .post('/schema/migrate')
                .send({
                    sourceConnectionId: postgresConnectionId,
                    targetConnectionId: postgres2ConnectionId,
                    sourceSchema: 'public',
                    targetSchema: 'public',
                    sqlStatements: ['CREATE TABLE test_manual (id SERIAL PRIMARY KEY)'],
                    description: 'Manual migration test',
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.groupId).toBeUndefined();
            expect(response.body.groupName).toBeUndefined();
            expect(response.body.sourceConnectionId).toBe(postgresConnectionId);
            expect(response.body.targetConnectionId).toBe(postgres2ConnectionId);
        });

        it('should record group migration with groupId', async () => {
            const response = await request(app.getHttpServer())
                .post('/schema/migrate')
                .send({
                    sourceConnectionId: postgresConnectionId,
                    targetConnectionId: postgres2ConnectionId,
                    sourceSchema: 'public',
                    targetSchema: 'public',
                    groupId: groupId,
                    sqlStatements: ['CREATE TABLE test_group (id SERIAL PRIMARY KEY)'],
                    description: 'Group migration test',
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.groupId).toBe(groupId);
            expect(response.body.groupName).toBe('Test Migration Group');
            expect(response.body.sourceConnectionId).toBe(postgresConnectionId);
            expect(response.body.targetConnectionId).toBe(postgres2ConnectionId);
        });

        it('should retrieve migration history with group names populated', async () => {
            const response = await request(app.getHttpServer())
                .get('/schema/migration-history')
                .query({ limit: 10 })
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            // Find our group migration
            const groupMigration = response.body.find(
                (m: any) => m.description === 'Group migration test'
            );
            expect(groupMigration).toBeDefined();
            expect(groupMigration.groupId).toBe(groupId);
            expect(groupMigration.groupName).toBe('Test Migration Group');

            // Find our manual migration
            const manualMigration = response.body.find(
                (m: any) => m.description === 'Manual migration test'
            );
            expect(manualMigration).toBeDefined();
            expect(manualMigration.groupId).toBeUndefined();
            expect(manualMigration.groupName).toBeUndefined();
        });

        it('should filter migration history by connection', async () => {
            const response = await request(app.getHttpServer())
                .get('/schema/migration-history')
                .query({ targetConnectionId: postgres2ConnectionId, limit: 10 })
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            // All migrations should have the target connection
            response.body.forEach((migration: any) => {
                expect(migration.targetConnectionId).toBe(postgres2ConnectionId);
            });
        });

        it('should retrieve individual migration with group info', async () => {
            // First get all migrations
            const listResponse = await request(app.getHttpServer())
                .get('/schema/migration-history')
                .query({ limit: 10 })
                .expect(200);

            const groupMigration = listResponse.body.find(
                (m: any) => m.description === 'Group migration test'
            );

            // Get individual migration
            const response = await request(app.getHttpServer())
                .get(`/schema/migration-history/${groupMigration.id}`)
                .expect(200);

            expect(response.body.id).toBe(groupMigration.id);
            expect(response.body.groupId).toBe(groupId);
            expect(response.body.groupName).toBe('Test Migration Group');
            expect(response.body.sqlStatements).toEqual([
                'CREATE TABLE test_group (id SERIAL PRIMARY KEY)',
            ]);
        });

        it('should handle migration with invalid groupId gracefully', async () => {
            const response = await request(app.getHttpServer())
                .post('/schema/migrate')
                .send({
                    sourceConnectionId: postgresConnectionId,
                    targetConnectionId: postgres2ConnectionId,
                    sourceSchema: 'public',
                    targetSchema: 'public',
                    groupId: 'invalid-group-id',
                    sqlStatements: ['CREATE TABLE test_invalid (id SERIAL PRIMARY KEY)'],
                    description: 'Invalid group migration test',
                })
                .expect(201);

            // Should still create migration even with invalid group
            expect(response.body).toHaveProperty('id');
            expect(response.body.groupId).toBe('invalid-group-id');
            expect(response.body.groupName).toBeUndefined();
        });

        it('should delete migration history', async () => {
            // Create a migration to delete
            const createResponse = await request(app.getHttpServer())
                .post('/schema/migrate')
                .send({
                    sourceConnectionId: postgresConnectionId,
                    targetConnectionId: postgres2ConnectionId,
                    sourceSchema: 'public',
                    targetSchema: 'public',
                    sqlStatements: ['CREATE TABLE test_delete (id SERIAL PRIMARY KEY)'],
                    description: 'To be deleted',
                })
                .expect(201);

            const migrationId = createResponse.body.id;

            // Delete it
            await request(app.getHttpServer())
                .delete(`/schema/migration-history/${migrationId}`)
                .expect(200);

            // Verify it's gone
            await request(app.getHttpServer())
                .get(`/schema/migration-history/${migrationId}`)
                .expect(404);
        });
    });
});
