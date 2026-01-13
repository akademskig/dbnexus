import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: true,
    });

    // Increase body size limit for large row data sync
    app.useBodyParser('json', { limit: '50mb' });
    app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

    // Enable CORS for the web UI
    app.enableCors({
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
    });

    // Global prefix for API routes
    app.setGlobalPrefix('api');

    const port = process.env['PORT'] ?? 3001;
    await app.listen(port);

    logger.log(`🚀 DB Nexus API running on http://localhost:${port}`);
}

bootstrap();
