import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getApiUrl', () => {
        it('should use default port 3001 when no env vars set', async () => {
            delete process.env['DBNEXUS_PORT'];
            delete process.env['PORT'];

            const { getApiUrl, API_BASE_URL } = await import('../config.js');

            expect(API_BASE_URL).toBe('http://localhost:3001/api');
            expect(getApiUrl('/test')).toBe('http://localhost:3001/api/test');
        });

        it('should use DBNEXUS_PORT when set', async () => {
            process.env['DBNEXUS_PORT'] = '4000';
            delete process.env['PORT'];

            const { getApiUrl, API_BASE_URL } = await import('../config.js');

            expect(API_BASE_URL).toBe('http://localhost:4000/api');
            expect(getApiUrl('/scanner/scan')).toBe('http://localhost:4000/api/scanner/scan');
        });

        it('should use PORT when DBNEXUS_PORT not set', async () => {
            delete process.env['DBNEXUS_PORT'];
            process.env['PORT'] = '5000';

            const { API_BASE_URL } = await import('../config.js');

            expect(API_BASE_URL).toBe('http://localhost:5000/api');
        });

        it('should prefer DBNEXUS_PORT over PORT', async () => {
            process.env['DBNEXUS_PORT'] = '4000';
            process.env['PORT'] = '5000';

            const { API_BASE_URL } = await import('../config.js');

            expect(API_BASE_URL).toBe('http://localhost:4000/api');
        });

        it('should handle paths without leading slash', async () => {
            delete process.env['DBNEXUS_PORT'];
            delete process.env['PORT'];

            const { getApiUrl } = await import('../config.js');

            expect(getApiUrl('connections')).toBe('http://localhost:3001/api/connections');
        });

        it('should handle paths with leading slash', async () => {
            delete process.env['DBNEXUS_PORT'];
            delete process.env['PORT'];

            const { getApiUrl } = await import('../config.js');

            expect(getApiUrl('/connections')).toBe('http://localhost:3001/api/connections');
        });
    });
});
