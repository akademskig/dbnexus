/**
 * Integration Tests - Migration History with Group Tracking
 *
 * Tests migration history recording and retrieval with instance group tracking.
 * Run with: pnpm test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { createTestApp, TEST_CONNECTIONS, checkDockerContainers } from './setup.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { MetadataService } from '../metadata/metadata.service.js';

describe('Migration History Integration Tests', () => {
    let app: INestApplication;
    let connectionsService: ConnectionsService;
    let metadataService: MetadataService;
    let dockerAvailable: { postgres: boolean; staging: boolean; mysql: boolean };
    let postgresConnectionId: string;
    let postgres2ConnectionId: string;
    let groupId: string;
    let groupName: string;
    const timestamp = Date.now();

    beforeAll(async () => {
        // Check Docker availability
        dockerAvailable = await checkDockerContainers();

        if (!dockerAvailable.postgres) {
            console.warn('⚠️  PostgreSQL container not available. Run: docker compose up -d');
        }

        // Create the app
        app = await createTestApp();
        connectionsService = app.get(ConnectionsService);
        metadataService = app.get(MetadataService);

        if (dockerAvailable.postgres) {
            // Create two test connections
            const conn1 = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresEcommerce,
                name: `Migration Test Postgres 1 ${timestamp}`,
            });
            postgresConnectionId = conn1.id;

            const conn2 = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresEcommerce,
                name: `Migration Test Postgres 2 ${timestamp}`,
            });
            postgres2ConnectionId = conn2.id;

            // Create a test group
            groupName = `Migration Test Group ${timestamp}`;
            const group = metadataService.databaseGroupRepository.create({
                projectId: 'test-project',
                name: groupName,
                databaseEngine: 'postgres',
                sourceConnectionId: postgresConnectionId,
                syncSchema: true,
                syncData: false,
            });
            groupId = group.id;
        }
    });

    afterAll(async () => {
        if (dockerAvailable.postgres && metadataService) {
            // Clean up test group
            try {
                if (groupId) {
                    metadataService.databaseGroupRepository.delete(groupId);
                }
            } catch {
                // Ignore errors during cleanup
            }

            // Clean up test connections
            try {
                if (postgresConnectionId) await connectionsService.delete(postgresConnectionId);
                if (postgres2ConnectionId) await connectionsService.delete(postgres2ConnectionId);
            } catch {
                // Ignore errors during cleanup
            }
        }
        if (app) {
            await app.close();
        }
    });

    describe('Migration History with Group Tracking', () => {
        it('should record manual migration without group', () => {
            if (!dockerAvailable.postgres) {
                console.warn('⚠️  Skipping test: PostgreSQL not available');
                return;
            }

            const migration = metadataService.migrationHistoryRepository.create({
                sourceConnectionId: postgresConnectionId,
                targetConnectionId: postgres2ConnectionId,
                sourceSchema: 'public',
                targetSchema: 'public',
                sqlStatements: ['CREATE TABLE test_manual (id SERIAL PRIMARY KEY)'],
                description: 'Manual migration test',
                success: true,
            });

            expect(migration).toHaveProperty('id');
            expect(migration.groupId).toBeUndefined();
            expect(migration.groupName).toBeUndefined();
            expect(migration.sourceConnectionId).toBe(postgresConnectionId);
            expect(migration.targetConnectionId).toBe(postgres2ConnectionId);
        });

        it('should record group migration with groupId', () => {
            if (!dockerAvailable.postgres) {
                console.warn('⚠️  Skipping test: PostgreSQL not available');
                return;
            }

            const migration = metadataService.migrationHistoryRepository.create({
                sourceConnectionId: postgresConnectionId,
                targetConnectionId: postgres2ConnectionId,
                sourceSchema: 'public',
                targetSchema: 'public',
                groupId: groupId,
                sqlStatements: ['CREATE TABLE test_group (id SERIAL PRIMARY KEY)'],
                description: 'Group migration test',
                success: true,
            });

            expect(migration).toHaveProperty('id');
            expect(migration.groupId).toBe(groupId);
            expect(migration.groupName).toBe(groupName);
            expect(migration.sourceConnectionId).toBe(postgresConnectionId);
            expect(migration.targetConnectionId).toBe(postgres2ConnectionId);
        });

        it('should retrieve migration history with group names populated', () => {
            if (!dockerAvailable.postgres) {
                console.warn('⚠️  Skipping test: PostgreSQL not available');
                return;
            }

            const migrations = metadataService.migrationHistoryRepository.findAll({
                limit: 10,
            });

            expect(Array.isArray(migrations)).toBe(true);
            expect(migrations.length).toBeGreaterThan(0);

            // Find our group migration
            const groupMigration = migrations.find((m) => m.description === 'Group migration test');
            expect(groupMigration).toBeDefined();
            expect(groupMigration?.groupId).toBe(groupId);
            expect(groupMigration?.groupName).toBe(groupName);

            // Find our manual migration
            const manualMigration = migrations.find(
                (m) => m.description === 'Manual migration test'
            );
            expect(manualMigration).toBeDefined();
            expect(manualMigration?.groupId).toBeUndefined();
            expect(manualMigration?.groupName).toBeUndefined();
        });

        it('should filter migration history by connection', () => {
            if (!dockerAvailable.postgres) {
                console.warn('⚠️  Skipping test: PostgreSQL not available');
                return;
            }

            const migrations = metadataService.migrationHistoryRepository.findAll({
                targetConnectionId: postgres2ConnectionId,
                limit: 10,
            });

            expect(Array.isArray(migrations)).toBe(true);
            expect(migrations.length).toBeGreaterThan(0);

            // All migrations should have the target connection
            migrations.forEach((migration) => {
                expect(migration.targetConnectionId).toBe(postgres2ConnectionId);
            });
        });

        it('should retrieve individual migration with group info', () => {
            if (!dockerAvailable.postgres) {
                console.warn('⚠️  Skipping test: PostgreSQL not available');
                return;
            }

            // First get all migrations
            const migrations = metadataService.migrationHistoryRepository.findAll({
                limit: 10,
            });

            const groupMigration = migrations.find((m) => m.description === 'Group migration test');

            if (!groupMigration) {
                throw new Error('Group migration not found');
            }

            // Get individual migration
            const migration = metadataService.migrationHistoryRepository.findById(
                groupMigration.id
            );

            expect(migration).not.toBeNull();
            expect(migration?.id).toBe(groupMigration.id);
            expect(migration?.groupId).toBe(groupId);
            expect(migration?.groupName).toBe(groupName);
            expect(migration?.sqlStatements).toEqual([
                'CREATE TABLE test_group (id SERIAL PRIMARY KEY)',
            ]);
        });

        it('should handle migration with invalid groupId gracefully', () => {
            if (!dockerAvailable.postgres) {
                console.warn('⚠️  Skipping test: PostgreSQL not available');
                return;
            }

            const migration = metadataService.migrationHistoryRepository.create({
                sourceConnectionId: postgresConnectionId,
                targetConnectionId: postgres2ConnectionId,
                sourceSchema: 'public',
                targetSchema: 'public',
                groupId: 'invalid-group-id',
                sqlStatements: ['CREATE TABLE test_invalid (id SERIAL PRIMARY KEY)'],
                description: 'Invalid group migration test',
                success: true,
            });

            // Should still create migration even with invalid group
            expect(migration).toHaveProperty('id');
            expect(migration.groupId).toBe('invalid-group-id');
            expect(migration.groupName).toBeUndefined();
        });

        it('should delete migration history', () => {
            if (!dockerAvailable.postgres) {
                console.warn('⚠️  Skipping test: PostgreSQL not available');
                return;
            }

            // Create a migration to delete
            const migration = metadataService.migrationHistoryRepository.create({
                sourceConnectionId: postgresConnectionId,
                targetConnectionId: postgres2ConnectionId,
                sourceSchema: 'public',
                targetSchema: 'public',
                sqlStatements: ['CREATE TABLE test_delete (id SERIAL PRIMARY KEY)'],
                description: 'To be deleted',
                success: true,
            });

            const migrationId = migration.id;

            // Delete it
            const deleted = metadataService.migrationHistoryRepository.delete(migrationId);
            expect(deleted).toBe(true);

            // Verify it's gone
            const retrieved = metadataService.migrationHistoryRepository.findById(migrationId);
            expect(retrieved).toBeNull();
        });
    });
});
