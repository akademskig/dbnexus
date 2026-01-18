import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

// Mock chalk to return plain strings
vi.mock('chalk', () => ({
    default: {
        green: (s: string) => s,
        red: (s: string) => s,
        yellow: (s: string) => s,
        blue: (s: string) => s,
        gray: (s: string) => s,
        bold: (s: string) => s,
    },
}));

describe('scanCommand', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.resetModules();
        global.fetch = mockFetch;
        mockFetch.mockReset();
        // Suppress console output
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should display found connections', async () => {
        const mockConnections = {
            connections: [
                {
                    name: 'postgres-local',
                    engine: 'postgres',
                    host: 'localhost',
                    port: 5432,
                    database: 'testdb',
                    source: 'port-scan',
                    connectionType: 'local',
                },
                {
                    name: 'mysql-docker',
                    engine: 'mysql',
                    host: 'localhost',
                    port: 3306,
                    database: 'myapp',
                    source: 'docker',
                    connectionType: 'docker',
                },
            ],
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockConnections),
        });

        const { scanCommand } = await import('../commands/scan.js');
        await scanCommand({});

        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/scanner/scan'));
    });

    it('should handle no connections found', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ connections: [] }),
        });

        const { scanCommand } = await import('../commands/scan.js');
        await scanCommand({});

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should add connections when --add flag is used', async () => {
        const mockConnections = {
            connections: [
                {
                    name: 'postgres-local',
                    engine: 'postgres',
                    host: 'localhost',
                    port: 5432,
                    database: 'testdb',
                    connectionType: 'local',
                },
            ],
        };

        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockConnections),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

        const { scanCommand } = await import('../commands/scan.js');
        await scanCommand({ add: true });

        // Should call fetch twice: once for scan, once for add
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenLastCalledWith(
            expect.stringContaining('/api/connections'),
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })
        );
    });

    it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Internal Server Error',
        });

        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit');
        });

        const { scanCommand } = await import('../commands/scan.js');

        await expect(scanCommand({})).rejects.toThrow('process.exit');
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit');
        });

        const { scanCommand } = await import('../commands/scan.js');

        await expect(scanCommand({})).rejects.toThrow('process.exit');
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});
