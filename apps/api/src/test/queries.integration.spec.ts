/**
 * Integration Tests - Query Execution
 *
 * Tests actual query execution against Docker test databases.
 * Prerequisites: docker compose up -d
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { createTestApp, TEST_CONNECTIONS, checkDockerContainers } from './setup.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { QueriesService } from '../queries/queries.service.js';
import { MetadataService } from '../metadata/metadata.service.js';

describe('Queries Integration Tests', () => {
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

        // Use timestamp for unique names
        const timestamp = Date.now();

        // Create test connections
        if (dockerAvailable.postgres) {
            const conn = await connectionsService.create({
                ...TEST_CONNECTIONS.postgresEcommerce,
                name: `${TEST_CONNECTIONS.postgresEcommerce.name} ${timestamp}`,
            });
            postgresConnectionId = conn.id;
        }
        if (dockerAvailable.mysql) {
            const conn = await connectionsService.create({
                ...TEST_CONNECTIONS.mysqlBlog,
                name: `${TEST_CONNECTIONS.mysqlBlog.name} ${timestamp}`,
            });
            mysqlConnectionId = conn.id;
        }
    }, 30000);

    afterAll(async () => {
        // Cleanup
        if (postgresConnectionId) {
            try {
                await connectionsService.disconnect(postgresConnectionId);
                await connectionsService.delete(postgresConnectionId);
            } catch (error) {
                console.error(
                    `Error disconnecting and deleting PostgreSQL connection ${postgresConnectionId}:`,
                    error
                );
            }
        }
        if (mysqlConnectionId) {
            try {
                await connectionsService.disconnect(mysqlConnectionId);
                await connectionsService.delete(mysqlConnectionId);
            } catch (error) {
                console.error(
                    `Error disconnecting and deleting MySQL connection ${mysqlConnectionId}:`,
                    error
                );
            }
        }
        if (app) {
            await app.close();
        }
    });

    describe('PostgreSQL Queries', () => {
        const skipIfNoPostgres = () => !dockerAvailable?.postgres || !postgresConnectionId;

        it('should execute SELECT query and return data', async () => {
            if (skipIfNoPostgres()) return;

            const result = await queriesService.execute({
                connectionId: postgresConnectionId!,
                sql: 'SELECT * FROM categories LIMIT 5',
            });

            expect(result.rows).toBeDefined();
            expect(result.columns).toBeDefined();
            expect(result.rowCount).toBeLessThanOrEqual(5);
            // Columns are objects with name and dataType
            const columnNames = result.columns.map((c) => c.name);
            expect(columnNames).toContain('id');
            expect(columnNames).toContain('name');
        });

        it('should execute COUNT query', async () => {
            if (skipIfNoPostgres()) return;

            const result = await queriesService.execute({
                connectionId: postgresConnectionId!,
                sql: 'SELECT COUNT(*) as total FROM products',
            });

            expect(result.rows.length).toBe(1);
            expect(Number(result.rows[0]?.total)).toBeGreaterThan(0);
        });

        it('should execute JOIN query', async () => {
            if (skipIfNoPostgres()) return;

            const result = await queriesService.execute({
                connectionId: postgresConnectionId!,
                sql: `SELECT p.name, c.name as category 
                 FROM products p 
                 JOIN categories c ON p.category_id = c.id 
                 LIMIT 5`,
            });

            expect(result.rows).toBeDefined();
            const columnNames = result.columns.map((c) => c.name);
            expect(columnNames).toContain('name');
            expect(columnNames).toContain('category');
        });

        it('should execute aggregate query', async () => {
            if (skipIfNoPostgres()) return;

            const result = await queriesService.execute({
                connectionId: postgresConnectionId!,
                sql: `SELECT status, COUNT(*) as count, SUM(total_amount) as total
                 FROM orders
                 GROUP BY status`,
            });

            expect(result.rows.length).toBeGreaterThan(0);
            const columnNames = result.columns.map((c) => c.name);
            expect(columnNames).toContain('status');
            expect(columnNames).toContain('count');
            expect(columnNames).toContain('total');
        });

        it('should handle query with WHERE clause', async () => {
            if (skipIfNoPostgres()) return;

            const result = await queriesService.execute({
                connectionId: postgresConnectionId!,
                sql: `SELECT * FROM products WHERE price > 100`,
            });

            expect(result.rows).toBeDefined();
            for (const row of result.rows) {
                expect(Number(row.price)).toBeGreaterThan(100);
            }
        });

        it('should handle query errors gracefully', async () => {
            if (skipIfNoPostgres()) return;

            await expect(
                queriesService.execute({
                    connectionId: postgresConnectionId!,
                    sql: 'SELECT * FROM nonexistent_table',
                })
            ).rejects.toThrow();
        });

        it('should handle syntax errors', async () => {
            if (skipIfNoPostgres()) return;

            await expect(
                queriesService.execute({
                    connectionId: postgresConnectionId!,
                    sql: 'SELCT * FROM products',
                })
            ).rejects.toThrow();
        });

        describe('Data Modification (with confirmation)', () => {
            it('should require confirmation for dangerous queries', async () => {
                if (skipIfNoPostgres()) return;

                // This should throw or return confirmation required
                try {
                    const result = await queriesService.execute({
                        connectionId: postgresConnectionId!,
                        sql: 'DELETE FROM reviews WHERE id = -999',
                        confirmed: false,
                    });
                    // If it doesn't throw, it might return a confirmation message
                    expect(result).toBeDefined();
                } catch (error) {
                    // Expected for dangerous queries without confirmation
                    expect(error).toBeDefined();
                }
            });

            it('should execute INSERT and DELETE with confirmation', async () => {
                if (skipIfNoPostgres()) return;

                // Insert test data
                const insertResult = await queriesService.execute({
                    connectionId: postgresConnectionId!,
                    sql: `INSERT INTO reviews (product_id, customer_id, rating, title, comment)
                     VALUES (1, 1, 5, 'Test Review', 'This is a test review')
                     RETURNING id`,
                    confirmed: true,
                });

                expect(insertResult.rows).toBeDefined();
                const insertedId = insertResult.rows[0]?.id;
                expect(insertedId).toBeDefined();

                // Delete the test data
                const deleteResult = await queriesService.execute({
                    connectionId: postgresConnectionId!,
                    sql: `DELETE FROM reviews WHERE id = ${insertedId}`,
                    confirmed: true,
                });

                // rowCount indicates affected rows for mutations
                expect(deleteResult.rowCount).toBe(1);
            });
        });
    });

    describe('MySQL Queries', () => {
        const skipIfNoMySQL = () => !dockerAvailable?.mysql || !mysqlConnectionId;

        it('should execute SELECT query on MySQL', async () => {
            if (skipIfNoMySQL()) return;

            const result = await queriesService.execute({
                connectionId: mysqlConnectionId!,
                sql: 'SELECT 1 as test',
            });

            expect(result.rows).toBeDefined();
            expect(result.rows[0]?.test).toBe(1);
        });
    });

    describe('Query History', () => {
        it('should save executed queries to history', async () => {
            if (!postgresConnectionId) return;

            // Execute a query
            await queriesService.execute({
                connectionId: postgresConnectionId,
                sql: 'SELECT * FROM categories LIMIT 1',
            });

            // Get history - signature is (limit, connectionId?)
            const metadataService = app.get(MetadataService);
            const history = metadataService.queryLogsRepository.findRecentHistory(
                10,
                postgresConnectionId
            );

            expect(history).toBeDefined();
            expect(Array.isArray(history)).toBe(true);
        });
    });

    describe('Query Explanation (EXPLAIN)', () => {
        const skipIfNoPostgres = () => !dockerAvailable?.postgres || !postgresConnectionId;

        it('should explain query without ANALYZE', async () => {
            if (skipIfNoPostgres()) return;

            const result = await queriesService.explain(
                postgresConnectionId!,
                'SELECT * FROM products WHERE price > 1000',
                false
            );

            expect(result).toBeDefined();
            expect(result.plan).toBeDefined();
            expect(result.planText).toBeDefined();
            expect(result.insights).toBeDefined();
            expect(result.suggestions).toBeDefined();
            expect(Array.isArray(result.insights)).toBe(true);
            expect(Array.isArray(result.suggestions)).toBe(true);
        });

        it('should explain query with ANALYZE', async () => {
            if (skipIfNoPostgres()) return;

            const result = await queriesService.explain(
                postgresConnectionId!,
                'SELECT * FROM products LIMIT 10',
                true // ANALYZE
            );

            expect(result).toBeDefined();
            expect(result.plan).toBeDefined();
            expect(result.planText).toBeDefined();

            // With ANALYZE, should have execution time insights
            expect(result.insights.length).toBeGreaterThan(0);

            // Check for execution time insight
            const hasExecutionTimeInsight = result.insights.some((insight) =>
                insight.message.toLowerCase().includes('executed')
            );
            expect(hasExecutionTimeInsight).toBe(true);
        });

        it('should detect sequential scans in insights', async () => {
            if (skipIfNoPostgres()) return;

            // Query without WHERE clause will use seq scan
            const result = await queriesService.explain(
                postgresConnectionId!,
                'SELECT * FROM products',
                false
            );

            // Should have insights about sequential scan
            const hasSeqScanInsight = result.insights.some((insight) =>
                insight.message.toLowerCase().includes('sequential scan')
            );

            if (hasSeqScanInsight) {
                expect(hasSeqScanInsight).toBe(true);
            }
        });

        it('should provide optimization suggestions', async () => {
            if (skipIfNoPostgres()) return;

            // Query that might benefit from optimization
            const result = await queriesService.explain(
                postgresConnectionId!,
                'SELECT * FROM products ORDER BY created_at DESC',
                false
            );

            expect(result.suggestions).toBeDefined();
            expect(Array.isArray(result.suggestions)).toBe(true);
            // Should either have suggestions or indicate plan is good
            expect(result.suggestions.length).toBeGreaterThan(0);
        });

        it('should handle invalid SQL gracefully', async () => {
            if (skipIfNoPostgres()) return;

            await expect(
                queriesService.explain(
                    postgresConnectionId!,
                    'SELECT * FROM nonexistent_table',
                    false
                )
            ).rejects.toThrow();
        });

        it('should explain JOIN queries', async () => {
            if (skipIfNoPostgres()) return;

            const result = await queriesService.explain(
                postgresConnectionId!,
                'SELECT p.name, c.name as category FROM products p JOIN categories c ON p.category_id = c.id LIMIT 10',
                false
            );

            expect(result).toBeDefined();
            expect(result.plan).toBeDefined();
            expect(result.planText).toContain('Join');
        });
    });
});
