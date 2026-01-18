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
    },
}));

// Mock fs
vi.mock('fs', () => ({
    default: {
        writeFileSync: vi.fn(),
    },
}));

describe('exportCommand', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.resetModules();
        global.fetch = mockFetch;
        mockFetch.mockReset();
        vi.mocked(fs.writeFileSync).mockReset();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should export data to JSON format', async () => {
        const mockResult = {
            rows: [
                { id: 1, name: 'Test 1' },
                { id: 2, name: 'Test 2' },
            ],
            columns: [{ name: 'id' }, { name: 'name' }],
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResult),
        });

        const { exportCommand } = await import('../commands/export.js');
        await exportCommand({
            conn: 'test-conn',
            table: 'users',
            format: 'json',
            output: 'output.json',
        });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/query'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('SELECT * FROM users'),
            })
        );

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            'output.json',
            JSON.stringify(mockResult.rows, null, 2)
        );
    });

    it('should export data to CSV format', async () => {
        const mockResult = {
            rows: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
            ],
            columns: [{ name: 'id' }, { name: 'name' }],
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResult),
        });

        const { exportCommand } = await import('../commands/export.js');
        await exportCommand({
            conn: 'test-conn',
            table: 'users',
            format: 'csv',
            output: 'output.csv',
        });

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            'output.csv',
            'id,name\n1,Alice\n2,Bob'
        );
    });

    it('should escape CSV values with commas', async () => {
        const mockResult = {
            rows: [{ id: 1, description: 'Hello, World' }],
            columns: [{ name: 'id' }, { name: 'description' }],
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResult),
        });

        const { exportCommand } = await import('../commands/export.js');
        await exportCommand({
            conn: 'test-conn',
            table: 'items',
            format: 'csv',
            output: 'output.csv',
        });

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            'output.csv',
            'id,description\n1,"Hello, World"'
        );
    });

    it('should use custom SQL query when provided', async () => {
        const mockResult = {
            rows: [{ count: 10 }],
            columns: [{ name: 'count' }],
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResult),
        });

        const { exportCommand } = await import('../commands/export.js');
        await exportCommand({
            conn: 'test-conn',
            sql: 'SELECT COUNT(*) as count FROM users',
            format: 'json',
            output: 'output.json',
        });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/query'),
            expect.objectContaining({
                body: expect.stringContaining('SELECT COUNT(*) as count FROM users'),
            })
        );
    });

    it('should require either table or sql option', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit');
        });

        const { exportCommand } = await import('../commands/export.js');

        await expect(
            exportCommand({
                conn: 'test-conn',
                format: 'csv',
                output: 'output.csv',
            })
        ).rejects.toThrow('process.exit');

        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle empty results', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ rows: [], columns: [] }),
        });

        const { exportCommand } = await import('../commands/export.js');
        await exportCommand({
            conn: 'test-conn',
            table: 'empty_table',
            format: 'json',
            output: 'output.json',
        });

        // Should not write file for empty results
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ message: 'Query failed' }),
        });

        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit');
        });

        const { exportCommand } = await import('../commands/export.js');

        await expect(
            exportCommand({
                conn: 'test-conn',
                table: 'users',
                format: 'json',
                output: 'output.json',
            })
        ).rejects.toThrow('process.exit');
    });
});
