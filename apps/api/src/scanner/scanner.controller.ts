import { Controller, Get, Query } from '@nestjs/common';
import { ScannerService, ScanResult } from './scanner.service.js';

@Controller('scanner')
export class ScannerController {
    constructor(private readonly scannerService: ScannerService) {}

    @Get('scan')
    async scanForConnections(@Query('workspace') workspace?: string): Promise<ScanResult> {
        return this.scannerService.scanAll(workspace);
    }

    @Get('scan/ports')
    async scanPorts() {
        return this.scannerService.scanPorts();
    }

    @Get('scan/docker')
    async scanDocker() {
        return this.scannerService.scanDockerContainers();
    }

    @Get('scan/env')
    async scanEnvFiles(@Query('workspace') workspace?: string) {
        return this.scannerService.scanEnvFiles(workspace);
    }

    @Get('scan/compose')
    async scanDockerCompose(@Query('workspace') workspace?: string) {
        return this.scannerService.scanDockerCompose(workspace);
    }

    @Get('scan/sqlite')
    async scanSqliteFiles(@Query('workspace') workspace?: string) {
        return this.scannerService.scanSqliteFiles(workspace);
    }
}
