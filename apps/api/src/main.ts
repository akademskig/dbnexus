import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: true,
    });

    // Increase body size limit for large row data sync
    app.useBodyParser('json', { limit: '50mb' });
    app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

    const isDev = process.env['NODE_ENV'] !== 'production';

    if (isDev) {
        // Enable CORS for the web UI in development
        app.enableCors({
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            credentials: true,
        });
    }

    // Global prefix for API routes
    app.setGlobalPrefix('api');

    // Serve static frontend files in production
    if (!isDev) {
        // Look for the web UI build in multiple possible locations
        const possiblePaths = [
            path.join(__dirname, 'web'), // When installed globally (api.js and web/ are siblings)
            path.join(__dirname, '..', 'web'), // Alternative: one level up
            path.join(__dirname, '..', '..', 'web', 'dist'), // When running from built CLI
            path.join(__dirname, '..', '..', '..', 'web', 'dist'), // Alternative structure
            path.join(process.cwd(), 'dist', 'web'), // When packaged
        ];

        let webDistPath: string | null = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                webDistPath = p;
                break;
            }
        }

        if (webDistPath) {
            logger.log(`📦 Serving static files from ${webDistPath}`);
            app.useStaticAssets(webDistPath, {
                index: false, // Don't serve index.html for all routes
            });

            // Serve index.html for all non-API routes (SPA fallback)
            app.use((req: any, res: any, next: any) => {
                if (req.path.startsWith('/api')) {
                    next();
                } else {
                    res.sendFile(path.join(webDistPath, 'index.html'));
                }
            });
        } else {
            logger.warn('⚠️  Web UI build not found. Only API will be available.');
        }
    }

    const port = process.env['DBNEXUS_PORT'] ?? process.env['PORT'] ?? 3001;
    await app.listen(port);

    logger.log(`🚀 DB Nexus running on http://localhost:${port}`);
    if (!isDev) {
        logger.log(`   Open http://localhost:${port} in your browser`);
    }
}

bootstrap();
