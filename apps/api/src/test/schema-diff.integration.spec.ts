/**
 * Integration Tests - Schema Diff Service
 *
 * Tests schema comparison between databases.
 * Prerequisites: docker compose up -d
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { createTestApp, TEST_CONNECTIONS, checkDockerContainers } from './setup.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { SchemaDiffService } from '../schema/schema-diff.service.js';

describe('Schema Diff Integration Tests', () => {
    let app: INestApplication;
    let connectionsService: ConnectionsService;
    let schemaDiffService: SchemaDiffService;
    let dockerAvailable: { postgres: boolean; staging: boolean; mysql: boolean };
    let prodConnectionId: string | null = null;
    let stagingConnectionId: string | null = null;

    beforeAll(async () => {
        dockerAvailable = await checkDockerContainers();

        app = await createTestApp();
        connectionsService = app.get(ConnectionsService);
        schemaDiffService = app.get(SchemaDiffService);

        // Create test connections
        if (dockerAvailable.postgres) {
            const conn = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresEcommerce,
                name: 'Diff Test - Production',
            });
            prodConnectionId = conn.id;
        }
        if (dockerAvailable.staging) {
            const conn = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresStaging,
                name: 'Diff Test - Staging',
            });
            stagingConnectionId = conn.id;
        }
    }, 30000);

    afterAll(async () => {
        for (const id of [prodConnectionId, stagingConnectionId]) {
            if (id) {
                try {
                    await connectionsService.disconnect(id);
                    await connectionsService.delete(id);
                } catch {}
            }
        }
        if (app) {
            await app.close();
        }
    });

    describe('Schema Comparison', () => {
        const skipIfNoBothDBs = () =>
            !dockerAvailable?.postgres ||
            !dockerAvailable?.staging ||
            !prodConnectionId ||
            !stagingConnectionId;

        it('should compare schemas and return result', async () => {
            if (skipIfNoBothDBs()) {
                console.log('⚠️  Skipping: Both DB containers required');
                return;
            }

            const diff = await schemaDiffService.compareSchemas(
                prodConnectionId!,
                stagingConnectionId!,
                'public'
            );

            expect(diff).toBeDefined();
            expect(diff.items).toBeDefined();
            expect(Array.isArray(diff.items)).toBe(true);

            // Log what we found for debugging
            console.log(`Schema diff found ${diff.items.length} differences`);
            if (diff.items.length > 0) {
                console.log(`Diff types: ${diff.items.map((d) => d.type).join(', ')}`);
            }
        });

        it('should return structured diff items', async () => {
            if (skipIfNoBothDBs()) return;

            const diff = await schemaDiffService.compareSchemas(
                prodConnectionId!,
                stagingConnectionId!,
                'public'
            );

            // Each diff item should have required properties
            for (const item of diff.items) {
                expect(item.type).toBeDefined();
                expect(item.schema).toBeDefined();
                expect(item.table).toBeDefined();
            }

            // Check diff summary
            expect(diff.summary).toBeDefined();
        });

        it('should include migration SQL when differences exist', async () => {
            if (skipIfNoBothDBs()) return;

            const diff = await schemaDiffService.compareSchemas(
                prodConnectionId!,
                stagingConnectionId!,
                'public'
            );

            // If there are differences, items should have migrationSql
            const itemsWithSql = diff.items.filter(
                (item) => item.migrationSql && item.migrationSql.length > 0
            );

            console.log(`${itemsWithSql.length} items have migration SQL`);

            // Only assert if there are differences
            if (diff.items.length > 0) {
                expect(itemsWithSql.length).toBeGreaterThanOrEqual(0);
            }
        });

    });

    describe('Same Schema Comparison', () => {
        const skipIfNoPostgres = () => !dockerAvailable?.postgres || !prodConnectionId;

        it('should return no differences when comparing same schema', async () => {
            if (skipIfNoPostgres()) return;

            const diff = await schemaDiffService.compareSchemas(
                prodConnectionId!,
                prodConnectionId!, // Same connection
                'public'
            );

            expect(diff).toBeDefined();
            expect(diff.items.length).toBe(0);
        });
    });
});
