/**
 * CLI Configuration
 */

// Get API port from environment or use default
const port = process.env['DBNEXUS_PORT'] || process.env['PORT'] || '3001';

export const API_BASE_URL = `http://localhost:${port}/api`;

export function getApiUrl(path: string): string {
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
