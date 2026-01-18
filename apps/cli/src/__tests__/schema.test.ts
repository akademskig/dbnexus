import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';

// Mock ora
vi.mock('ora', () => ({
    default: () => ({
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
        warn: vi.fn().mockReturnThis(),
    }),
}));

// Mock chalk
vi.mock('chalk', () => ({
    default: {
        green: (s: string) => s,
        red: (s: string) => s,
        yellow: (s: string) => s,
        gray: (s: string) => s,
        cyan: (s: string) => s,
        bold: (s: string) => s,
        dim: (s: string) => s,
    },
}));

// Mock fs
vi.mock('fs', () => ({
    default: {
        writeFileSync: vi.fn(),
    },
}));

describe('schemaCommand', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.resetModules();
        global.fetch = mockFetch;
        mockFetch.mockReset();
        vi.mocked(fs.writeFileSync).mockReset();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('show', () => {
        it('should list all tables when no table specified', async () => {
            const mockTables = [
                { name: 'users', schema: 'public' },
                { name: 'posts', schema: 'public' },
                { name: 'audit_logs', schema: 'internal' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTables),
            });

            const { schemaCommand } = await import('../commands/schema.js');
            await schemaCommand.show({ conn: 'test-conn' });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/connections/test-conn/tables')
            );
        });

        it('should show specific table details when table specified', async () => {
            const mockColumns = [
                {
                    name: 'id',
                    dataType: 'integer',
                    isNullable: false,
                    isPrimaryKey: true,
                },
                {
                    name: 'name',
                    dataType: 'varchar(255)',
                    isNullable: false,
                    isPrimaryKey: false,
                },
                {
                    name: 'email',
                    dataType: 'varchar(255)',
                    isNullable: true,
                    isPrimaryKey: false,
                    defaultValue: null,
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockColumns),
            });

            const { schemaCommand } = await import('../commands/schema.js');
            await schemaCommand.show({ conn: 'test-conn', table: 'users' });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/connections/test-conn/columns?table=users')
            );
        });

        it('should handle API errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });

            const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('process.exit');
            });

            const { schemaCommand } = await import('../commands/schema.js');

            await expect(schemaCommand.show({ conn: 'test-conn' })).rejects.toThrow(
                'process.exit'
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe('compare', () => {
        it('should compare schemas between two connections', async () => {
            const sourceTables = [
                { name: 'users', schema: 'public' },
                { name: 'posts', schema: 'public' },
            ];
            const targetTables = [
                { name: 'users', schema: 'public' },
                { name: 'comments', schema: 'public' },
            ];

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(sourceTables),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(targetTables),
                });

            const { schemaCommand } = await import('../commands/schema.js');
            await schemaCommand.compare({
                source: 'source-conn',
                target: 'target-conn',
            });

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/connections/source-conn/tables')
            );
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/connections/target-conn/tables')
            );
        });

        it('should identify tables only in source', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            const sourceTables = [
                { name: 'users' },
                { name: 'new_table' },
            ];
            const targetTables = [{ name: 'users' }];

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(sourceTables),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(targetTables),
                });

            const { schemaCommand } = await import('../commands/schema.js');
            await schemaCommand.compare({
                source: 'source-conn',
                target: 'target-conn',
            });

            // Check that "new_table" was mentioned as added
            const calls = consoleSpy.mock.calls.flat().join(' ');
            expect(calls).toContain('new_table');
        });

        it('should identify identical schemas', async () => {
            const tables = [{ name: 'users' }, { name: 'posts' }];

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(tables),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(tables),
                });

            const { schemaCommand } = await import('../commands/schema.js');
            await schemaCommand.compare({
                source: 'source-conn',
                target: 'target-conn',
            });

            // No assertions needed - just verify it doesn't error
        });
    });

    describe('diff', () => {
        it('should generate migration SQL', async () => {
            const mockResult = {
                migrationSql: [
                    'CREATE TABLE new_table (id INTEGER PRIMARY KEY);',
                    'ALTER TABLE users ADD COLUMN email VARCHAR(255);',
                ],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResult),
            });

            const { schemaCommand } = await import('../commands/schema.js');
            await schemaCommand.diff({
                source: 'source-conn',
                target: 'target-conn',
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/compare'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('source-conn'),
                })
            );
        });

        it('should save migration to file when output specified', async () => {
            const mockResult = {
                migrationSql: ['CREATE TABLE new_table (id INTEGER PRIMARY KEY);'],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResult),
            });

            const { schemaCommand } = await import('../commands/schema.js');
            await schemaCommand.diff({
                source: 'source-conn',
                target: 'target-conn',
                output: 'migration.sql',
            });

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'migration.sql',
                expect.stringContaining('CREATE TABLE')
            );
        });

        it('should handle identical schemas (no migration needed)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ migrationSql: [] }),
            });

            const { schemaCommand } = await import('../commands/schema.js');
            await schemaCommand.diff({
                source: 'source-conn',
                target: 'target-conn',
            });

            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Internal Server Error',
            });

            const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('process.exit');
            });

            const { schemaCommand } = await import('../commands/schema.js');

            await expect(
                schemaCommand.diff({
                    source: 'source-conn',
                    target: 'target-conn',
                })
            ).rejects.toThrow('process.exit');
        });
    });
});
