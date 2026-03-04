import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import type { Tag } from '@dbnexus/metadata';
import { SetSettingDto, CreateTagDto, UpdateTagDto } from './dto/index.js';

@Controller('settings')
export class SettingsController {
    constructor(private readonly metadataService: MetadataService) {}

    // ============ System Settings (system-wide defaults) ============

    @Get()
    getAllSettings(): Record<string, unknown> {
        return this.metadataService.userPreferencesRepository.getAllForUser('system');
    }

    @Get(':key')
    getSetting(@Param('key') key: string): unknown {
        return this.metadataService.userPreferencesRepository.getSystemDefault(key);
    }

    @Put(':key')
    setSetting(@Param('key') key: string, @Body() body: SetSettingDto): { success: boolean } {
        this.metadataService.userPreferencesRepository.setSystemDefault(key, body.value);
        return { success: true };
    }

    @Delete(':key')
    deleteSetting(@Param('key') key: string): { success: boolean } {
        const success = this.metadataService.userPreferencesRepository.delete('system', key);
        return { success };
    }

    // ============ Tags (system-wide) ============

    @Get('tags/all')
    getTags(): Tag[] {
        return this.metadataService.userPreferencesRepository.getTags();
    }

    @Post('tags')
    createTag(@Body() input: CreateTagDto): Tag {
        return this.metadataService.userPreferencesRepository.addTag(input);
    }

    @Put('tags/:id')
    updateTag(@Param('id') id: string, @Body() input: UpdateTagDto): Tag | null {
        return this.metadataService.userPreferencesRepository.updateTag(id, input);
    }

    @Delete('tags/:id')
    deleteTag(@Param('id') id: string): { success: boolean } {
        const success = this.metadataService.userPreferencesRepository.deleteTag(id);
        return { success };
    }

    @Post('tags/reset')
    resetTags(): Tag[] {
        return this.metadataService.userPreferencesRepository.resetTags();
    }
}
