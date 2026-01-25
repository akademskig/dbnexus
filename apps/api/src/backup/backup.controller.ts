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
import type { BackupType } from '@dbnexus/shared';
import { BackupService } from './backup.service.js';
import { RestoreService } from './restore.service.js';
import { BackupToolsSetup } from './setup-tools.js';

@Controller('backups')
export class BackupController {
    constructor(
        private readonly backupService: BackupService,
        private readonly restoreService: RestoreService
    ) {}

    @Post()
    async createBackup(
        @Body()
        body: {
            connectionId: string;
            backupType?: BackupType;
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
    async restoreBackup(
        @Param('id') id: string,
        @Body('connectionId') connectionId: string,
        @Body('method') method?: 'native' | 'sql'
    ) {
        return this.restoreService.restoreBackup({
            connectionId,
            backupId: id,
            method,
        });
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async deleteBackup(@Param('id') id: string) {
        return this.backupService.deleteBackup(id);
    }

    @Get('tools/status')
    async getToolsStatus() {
        const tools = await BackupToolsSetup.checkTools();
        const instructions = BackupToolsSetup.getInstallInstructions();

        return {
            tools,
            allInstalled: tools.every((t) => t.installed),
            instructions,
        };
    }

    @Post('tools/install')
    @HttpCode(HttpStatus.OK)
    async installTools() {
        return BackupToolsSetup.autoInstall();
    }
}
