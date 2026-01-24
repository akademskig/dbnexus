/**
 * Test Setup for Integration Tests
 *
 * This module provides utilities for integration tests that run against
 * real Docker databases defined in docker-compose.yml
 *
 * Before running integration tests, ensure Docker containers are up:
 *   docker compose up -d
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Set test-specific metadata database path
const TEST_DATA_DIR = path.join(process.cwd(), '.dbnexus-test');
process.env['DBNEXUS_DATA_DIR'] = TEST_DATA_DIR;

/**
 * Clean up test database before running tests
 * This ensures a fresh start for each test run
 */
export function cleanupTestDatabase(): void {
    if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
}

// Docker container connection configs
export const TEST_CONNECTIONS = {
    postgresEcommerce: {
        name: 'Test Ecommerce (Postgres)',
        engine: 'postgres' as const,
        host: 'localhost',
        port: 5450,
        database: 'ecommerce',
        username: 'demo',
        password: 'demo123',
        ssl: false,
        readOnly: false,
        tags: ['test', 'postgres'],
        connectionType: 'local' as const,
    },
    postgresStaging: {
        name: 'Test Staging (Postgres)',
        engine: 'postgres' as const,
        host: 'localhost',
        port: 5451,
        database: 'ecommerce_staging',
        username: 'demo',
        password: 'demo123',
        ssl: false,
        readOnly: false,
        tags: ['test', 'postgres', 'staging'],
        connectionType: 'local' as const,
    },
    mysqlBlog: {
        name: 'Test Blog (MySQL)',
        engine: 'mysql' as const,
        host: 'localhost',
        port: 3350,
        database: 'blog',
        username: 'demo',
        password: 'demo123',
        ssl: false,
        readOnly: false,
        tags: ['test', 'mysql'],
        connectionType: 'local' as const,
    },
};

// Create NestJS app for integration tests
export async function createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();
    return app;
}

// Check if Docker containers are running
export async function checkDockerContainers(): Promise<{
    postgres: boolean;
    staging: boolean;
    mysql: boolean;
}> {
    const results = {
        postgres: false,
        staging: false,
        mysql: false,
    };

    // Try connecting to each
    const { Client } = await import('pg');

    // Check Postgres Ecommerce
    try {
        const client = new Client({
            host: TEST_CONNECTIONS.postgresEcommerce.host,
            port: TEST_CONNECTIONS.postgresEcommerce.port,
            database: TEST_CONNECTIONS.postgresEcommerce.database,
            user: TEST_CONNECTIONS.postgresEcommerce.username,
            password: TEST_CONNECTIONS.postgresEcommerce.password,
        });
        await client.connect();
        await client.end();
        results.postgres = true;
    } catch {
        results.postgres = false;
    }

    // Check Postgres Staging
    try {
        const client = new Client({
            host: TEST_CONNECTIONS.postgresStaging.host,
            port: TEST_CONNECTIONS.postgresStaging.port,
            database: TEST_CONNECTIONS.postgresStaging.database,
            user: TEST_CONNECTIONS.postgresStaging.username,
            password: TEST_CONNECTIONS.postgresStaging.password,
        });
        await client.connect();
        await client.end();
        results.staging = true;
    } catch {
        results.staging = false;
    }

    // Check MySQL
    try {
        const mysql = await import('mysql2/promise');
        const connection = await mysql.createConnection({
            host: TEST_CONNECTIONS.mysqlBlog.host,
            port: TEST_CONNECTIONS.mysqlBlog.port,
            database: TEST_CONNECTIONS.mysqlBlog.database,
            user: TEST_CONNECTIONS.mysqlBlog.username,
            password: TEST_CONNECTIONS.mysqlBlog.password,
        });
        await connection.end();
        results.mysql = true;
    } catch {
        results.mysql = false;
    }

    return results;
}

// Skip test if required container is not running
export function skipIfNoDocker(containerType: 'postgres' | 'staging' | 'mysql') {
    return async () => {
        const status = await checkDockerContainers();
        if (!status[containerType]) {
            // eslint-disable-next-line no-console
            console.log(
                `⚠️  Skipping test: ${containerType} container not running. Run 'docker compose up -d' first.`
            );
            return true;
        }
        return false;
    };
}

// Cleanup utility for tests
export async function cleanupTestData(
    app: INestApplication,
    connectionIds: string[]
): Promise<void> {
    const connectionsService = app.get('ConnectionsService');
    for (const id of connectionIds) {
        try {
            await connectionsService.delete(id);
        } catch {
            // Ignore errors during cleanup
        }
    }
}
