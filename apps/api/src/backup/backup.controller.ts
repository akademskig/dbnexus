import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    Res,
    UploadedFile,
    UseInterceptors,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BackupService } from './backup.service.js';

@Controller('backups')
export class BackupController {
    constructor(private backupService: BackupService) {}

    @Post()
    async createBackup(
        @Body()
        body: {
            connectionId: string;
            backupType?: 'full' | 'schema' | 'data';
            compression?: boolean;
        }
    ) {
        return this.backupService.createBackup(body);
    }

    @Get()
    async getBackups(@Query('connectionId') connectionId?: string) {
        return this.backupService.getBackups(connectionId);
    }

    @Get(':id')
    async getBackup(@Param('id') id: string) {
        return this.backupService.getBackupById(id);
    }

    @Get(':id/download')
    async downloadBackup(@Param('id') id: string, @Res() res: Response) {
        const filePath = await this.backupService.getBackupFilePath(id);
        const backup = await this.backupService.getBackupById(id);

        if (!backup) {
            return res.status(404).json({ message: 'Backup not found' });
        }

        res.download(filePath, backup.filename);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadBackup(
        @UploadedFile() file: { originalname: string; buffer: Buffer },
        @Body('connectionId') connectionId: string
    ) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        return this.backupService.uploadBackup(connectionId, file.originalname, file.buffer);
    }

    @Post(':id/restore')
    @HttpCode(HttpStatus.OK)
    async restoreBackup(@Param('id') id: string, @Body('connectionId') connectionId: string) {
        return this.backupService.restoreBackup({
            connectionId,
            backupId: id,
        });
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async deleteBackup(@Param('id') id: string) {
        return this.backupService.deleteBackup(id);
    }
}
