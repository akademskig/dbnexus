import { Controller, Get } from '@nestjs/common';

@Controller('health')
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
