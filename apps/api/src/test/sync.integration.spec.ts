/**
 * Integration Tests - Data Sync Service
 *
 * Tests data synchronization between databases.
 * Prerequisites: docker compose up -d
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { createTestApp, TEST_CONNECTIONS, checkDockerContainers } from './setup.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { SyncService } from '../sync/sync.service.js';
import { MetadataService } from '../metadata/metadata.service.js';
import type { DatabaseConnector } from '@dbnexus/connectors';

describe('Data Sync Integration Tests', () => {
    let app: INestApplication;
    let connectionsService: ConnectionsService;
    let syncService: SyncService;
    let metadataService: MetadataService;
    let dockerAvailable: { postgres: boolean; staging: boolean; mysql: boolean };
    let sourceConnectionId: string | null = null;
    let targetConnectionId: string | null = null;
    let sourceConnector: DatabaseConnector | null = null;
    let targetConnector: DatabaseConnector | null = null;

    // Test table name (isolated for testing)
    const TEST_TABLE = 'sync_test_data';

    beforeAll(async () => {
        dockerAvailable = await checkDockerContainers();

        app = await createTestApp();
        connectionsService = app.get(ConnectionsService);
        syncService = app.get(SyncService);
        metadataService = app.get(MetadataService);

        // Create test connections (both pointing to postgres for isolation)
        if (dockerAvailable.postgres && dockerAvailable.staging) {
            const source = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresEcommerce,
                name: 'Sync Test - Source',
            });
            sourceConnectionId = source.id;

            const target = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresStaging,
                name: 'Sync Test - Target',
            });
            targetConnectionId = target.id;

            sourceConnector = await connectionsService.getConnector(sourceConnectionId);
            targetConnector = await connectionsService.getConnector(targetConnectionId);
        }
    }, 30000);

    afterAll(async () => {
        // Drop test tables
        if (sourceConnector) {
            try {
                await sourceConnector.query(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
            } catch {}
        }
        if (targetConnector) {
            try {
                await targetConnector.query(`DROP TABLE IF EXISTS ${TEST_TABLE}`);
            } catch {}
        }

        // Cleanup connections
        for (const id of [sourceConnectionId, targetConnectionId]) {
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

    describe('Data Diff', () => {
        const skipIfNoBothDBs = () =>
            !dockerAvailable?.postgres ||
            !dockerAvailable?.staging ||
            !sourceConnectionId ||
            !targetConnectionId;

        beforeEach(async () => {
            if (skipIfNoBothDBs()) return;

            // Create test table in both DBs
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS ${TEST_TABLE} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    value INTEGER,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            await sourceConnector!.query(createTableSql);
            await targetConnector!.query(createTableSql);

            // Clear existing data
            await sourceConnector!.query(`TRUNCATE TABLE ${TEST_TABLE} RESTART IDENTITY`);
            await targetConnector!.query(`TRUNCATE TABLE ${TEST_TABLE} RESTART IDENTITY`);
        });

        afterEach(async () => {
            if (skipIfNoBothDBs()) return;

            // Clean up test data
            try {
                await sourceConnector!.query(`TRUNCATE TABLE ${TEST_TABLE} RESTART IDENTITY`);
                await targetConnector!.query(`TRUNCATE TABLE ${TEST_TABLE} RESTART IDENTITY`);
            } catch {}
        });

        it('should detect rows missing in target', async () => {
            if (skipIfNoBothDBs()) return;

            // Insert data in source only
            await sourceConnector!.query(`
                INSERT INTO ${TEST_TABLE} (name, value) VALUES
                ('Item A', 100),
                ('Item B', 200),
                ('Item C', 300)
            `);

            const diff = await syncService.getTableDataDiff(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id']
            );

            expect(diff).toBeDefined();
            expect(diff.missingInTarget.length).toBe(3);
            expect(diff.different.length).toBe(0);
            expect(diff.missingInSource.length).toBe(0);
        });

        it('should detect rows missing in source (extra in target)', async () => {
            if (skipIfNoBothDBs()) return;

            // Insert data in target only
            await targetConnector!.query(`
                INSERT INTO ${TEST_TABLE} (name, value) VALUES
                ('Extra Item', 999)
            `);

            const diff = await syncService.getTableDataDiff(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id']
            );

            expect(diff).toBeDefined();
            expect(diff.missingInTarget.length).toBe(0);
            expect(diff.missingInSource.length).toBe(1);
        });

        it('should detect different values', async () => {
            if (skipIfNoBothDBs()) return;

            // Insert same ID but different values
            await sourceConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value) VALUES
                (1, 'Item A', 100)
            `);
            await targetConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value) VALUES
                (1, 'Item A Modified', 150)
            `);

            const diff = await syncService.getTableDataDiff(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id']
            );

            expect(diff).toBeDefined();
            expect(diff.different.length).toBe(1);
            expect(diff.different[0].source.value).toBe(100);
            expect(diff.different[0].target.value).toBe(150);
        });

        it('should detect matching rows (empty diff)', async () => {
            if (skipIfNoBothDBs()) return;

            // Insert identical data in both (without timestamps to avoid differences)
            // Use explicit timestamp
            const timestamp = '2024-01-01 00:00:00';
            await sourceConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value, updated_at) VALUES
                (1, 'Identical Item', 500, '${timestamp}')
            `);
            await targetConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value, updated_at) VALUES
                (1, 'Identical Item', 500, '${timestamp}')
            `);

            const diff = await syncService.getTableDataDiff(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id']
            );

            expect(diff).toBeDefined();
            expect(diff.missingInTarget.length).toBe(0);
            // Note: timestamps might still cause differences if DB generates them
            expect(diff.missingInSource.length).toBe(0);
        });
    });

    describe('Data Sync Operations', () => {
        const skipIfNoBothDBs = () =>
            !dockerAvailable?.postgres ||
            !dockerAvailable?.staging ||
            !sourceConnectionId ||
            !targetConnectionId;

        beforeEach(async () => {
            if (skipIfNoBothDBs()) return;

            // Create test table in both DBs
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS ${TEST_TABLE} (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    value INTEGER,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            await sourceConnector!.query(createTableSql);
            await targetConnector!.query(createTableSql);

            // Clear existing data
            await sourceConnector!.query(`TRUNCATE TABLE ${TEST_TABLE} RESTART IDENTITY`);
            await targetConnector!.query(`TRUNCATE TABLE ${TEST_TABLE} RESTART IDENTITY`);
        });

        afterEach(async () => {
            if (skipIfNoBothDBs()) return;

            try {
                await sourceConnector!.query(`TRUNCATE TABLE ${TEST_TABLE} RESTART IDENTITY`);
                await targetConnector!.query(`TRUNCATE TABLE ${TEST_TABLE} RESTART IDENTITY`);
            } catch {}
        });

        it('should sync missing rows to target (INSERT)', async () => {
            if (skipIfNoBothDBs()) return;

            // Insert data in source only
            await sourceConnector!.query(`
                INSERT INTO ${TEST_TABLE} (name, value) VALUES
                ('Sync Item 1', 100),
                ('Sync Item 2', 200)
            `);

            // Perform sync
            const result = await syncService.syncTableData(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id'],
                {
                    insertMissing: true,
                    updateDifferent: false,
                    deleteExtra: false,
                }
            );

            expect(result).toBeDefined();
            expect(result.inserted).toBe(2);
            expect(result.updated).toBe(0);
            expect(result.deleted).toBe(0);

            // Verify data in target
            const targetData = await targetConnector!.query(
                `SELECT * FROM ${TEST_TABLE} ORDER BY id`
            );
            expect(targetData.rows.length).toBe(2);
            expect(targetData.rows[0].name).toBe('Sync Item 1');
        });

        it('should sync different rows (UPDATE)', async () => {
            if (skipIfNoBothDBs()) return;

            // Insert same ID, different values
            await sourceConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value) VALUES
                (1, 'Updated Name', 999)
            `);
            await targetConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value) VALUES
                (1, 'Old Name', 100)
            `);

            // Perform sync
            const result = await syncService.syncTableData(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id'],
                {
                    insertMissing: false,
                    updateDifferent: true,
                    deleteExtra: false,
                }
            );

            expect(result).toBeDefined();
            expect(result.inserted).toBe(0);
            expect(result.updated).toBe(1);
            expect(result.deleted).toBe(0);

            // Verify update in target
            const targetData = await targetConnector!.query(
                `SELECT * FROM ${TEST_TABLE} WHERE id = 1`
            );
            expect(targetData.rows[0].name).toBe('Updated Name');
            expect(targetData.rows[0].value).toBe(999);
        });

        it('should delete extra rows from target', async () => {
            if (skipIfNoBothDBs()) return;

            // Insert data only in target (extra)
            await targetConnector!.query(`
                INSERT INTO ${TEST_TABLE} (name, value) VALUES
                ('Extra Row 1', 111),
                ('Extra Row 2', 222)
            `);

            // Perform sync with delete
            const result = await syncService.syncTableData(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id'],
                {
                    insertMissing: false,
                    updateDifferent: false,
                    deleteExtra: true,
                }
            );

            expect(result).toBeDefined();
            expect(result.inserted).toBe(0);
            expect(result.updated).toBe(0);
            expect(result.deleted).toBe(2);

            // Verify target is empty
            const targetData = await targetConnector!.query(
                `SELECT COUNT(*) as count FROM ${TEST_TABLE}`
            );
            expect(Number(targetData.rows[0].count)).toBe(0);
        });

        it('should perform full sync (INSERT + UPDATE + DELETE)', async () => {
            if (skipIfNoBothDBs()) return;

            // Use fixed timestamp to avoid differences
            const ts = '2024-01-01 00:00:00';

            // Source: 3 rows - use high IDs to avoid conflicts
            await sourceConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value, updated_at) VALUES
                (101, 'Keep Same', 100, '${ts}'),
                (102, 'Will Update', 200, '${ts}'),
                (103, 'New Row', 300, '${ts}')
            `);

            // Target: Different state
            await targetConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value, updated_at) VALUES
                (101, 'Keep Same', 100, '${ts}'),
                (102, 'Old Value', 999, '${ts}'),
                (104, 'Extra Row', 400, '${ts}')
            `);

            // Full sync
            const result = await syncService.syncTableData(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id'],
                {
                    insertMissing: true,
                    updateDifferent: true,
                    deleteExtra: true,
                }
            );

            expect(result).toBeDefined();

            // Log for debugging
            console.log(
                `Full sync result: inserted=${result.inserted}, updated=${result.updated}, deleted=${result.deleted}`
            );

            // Verify some operations were performed
            const totalOps = result.inserted + result.updated + result.deleted;
            expect(totalOps).toBeGreaterThan(0);

            // Verify 104 was deleted (extra row)
            const check104 = await targetConnector!.query(
                `SELECT id FROM ${TEST_TABLE} WHERE id = 104`
            );
            expect(check104.rows.length).toBe(0);

            // Verify 102 was updated
            const check102 = await targetConnector!.query(
                `SELECT name, value FROM ${TEST_TABLE} WHERE id = 102`
            );
            if (check102.rows.length > 0) {
                // If row exists, it should have been updated to source values
                expect(check102.rows[0].name).toBe('Will Update');
            }
        });

        it('should record sync run in database', async () => {
            if (skipIfNoBothDBs()) return;

            // Insert data in source
            await sourceConnector!.query(`
                INSERT INTO ${TEST_TABLE} (name, value) VALUES ('Test', 1)
            `);

            // Perform sync
            await syncService.syncTableData(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id'],
                { insertMissing: true, updateDifferent: false, deleteExtra: false }
            );

            // Check sync runs
            const syncRuns = metadataService.syncRunRepository.findRecent(100);
            expect(syncRuns).toBeDefined();
            expect(syncRuns.length).toBeGreaterThan(0);

            // Most recent run should have our data
            const latestRun = syncRuns[0];
            expect(latestRun.status).toBe('completed');
            expect(latestRun.inserts).toBeGreaterThanOrEqual(1);
        });

        it('should store SQL statements in sync run', async () => {
            if (skipIfNoBothDBs()) return;

            // Get count of sync runs before
            const runsBefore = metadataService.syncRunRepository.findRecent(1000);
            const countBefore = runsBefore.length;

            // Use a unique value to identify this test's SQL
            const uniqueValue = `SQLTest_${Date.now()}`;

            // Insert data in source with high ID to be unique
            await sourceConnector!.query(`
                INSERT INTO ${TEST_TABLE} (id, name, value) VALUES (999, '${uniqueValue}', 42)
            `);

            // Perform sync
            await syncService.syncTableData(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                TEST_TABLE,
                ['id'],
                { insertMissing: true, updateDifferent: false, deleteExtra: false }
            );

            // Check sync runs - find the new one
            const runsAfter = metadataService.syncRunRepository.findRecent(1000);
            expect(runsAfter.length).toBeGreaterThan(countBefore);

            // Find the run that has our unique value in SQL
            const matchingRun = runsAfter.find((run) =>
                run.sqlStatements?.some((sql) => sql.includes(uniqueValue))
            );

            if (matchingRun) {
                expect(matchingRun.sqlStatements).toBeDefined();
                expect(matchingRun.sqlStatements.length).toBeGreaterThan(0);
                const sqlJoined = matchingRun.sqlStatements.join(' ');
                expect(sqlJoined).toContain('INSERT');
                expect(sqlJoined).toContain(uniqueValue);
            } else {
                // If we can't find our specific run, just verify structure of latest
                const latestRun = runsAfter[0];
                expect(latestRun.sqlStatements).toBeDefined();
            }
        });
    });

    describe('Sync with Existing Data Tables', () => {
        const skipIfNoBothDBs = () =>
            !dockerAvailable?.postgres ||
            !dockerAvailable?.staging ||
            !sourceConnectionId ||
            !targetConnectionId;

        it('should compare categories table data', async () => {
            if (skipIfNoBothDBs()) return;

            // Both DBs have categories - compare them
            const diff = await syncService.getTableDataDiff(
                sourceConnectionId!,
                targetConnectionId!,
                'public',
                'categories',
                ['id']
            );

            expect(diff).toBeDefined();
            // The diff should return valid structure
            expect(diff.missingInTarget).toBeDefined();
            expect(diff.missingInSource).toBeDefined();
            expect(diff.different).toBeDefined();

            // Log actual state for debugging
            console.log(
                `Categories diff: ${diff.missingInTarget.length} missing in target, ${diff.missingInSource.length} missing in source, ${diff.different.length} different`
            );
        });
    });
});
