import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller.js';
import { ScannerService } from './scanner.service.js';

@Module({
    controllers: [ScannerController],
    providers: [ScannerService],
    exports: [ScannerService],
})
export class ScannerModule {}
