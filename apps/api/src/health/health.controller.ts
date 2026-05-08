import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('health')
@Public()
export class HealthController {
    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };
    }

    @Get('live')
    liveness() {
        return { status: 'ok' };
    }

    @Get('ready')
    readiness() {
        // Add database connectivity checks here if needed
        return { status: 'ok' };
    }
}
