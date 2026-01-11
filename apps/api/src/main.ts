import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

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
