import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import type { Tag } from '@dbnexus/metadata';

interface TagInput {
    name: string;
    color: string;
}

@Controller('settings')
export class SettingsController {
    constructor(private readonly metadataService: MetadataService) {}

    // ============ Generic Settings ============

    @Get()
    getAllSettings(): Record<string, unknown> {
        return this.metadataService.settingsRepository.getAll();
    }

    @Get(':key')
    getSetting(@Param('key') key: string): unknown {
        return this.metadataService.settingsRepository.get(key);
    }

    @Put(':key')
    setSetting(@Param('key') key: string, @Body() body: { value: unknown }): { success: boolean } {
        this.metadataService.settingsRepository.set(key, body.value);
        return { success: true };
    }

    @Delete(':key')
    deleteSetting(@Param('key') key: string): { success: boolean } {
        const success = this.metadataService.settingsRepository.delete(key);
        return { success };
    }

    // ============ Tags ============

    @Get('tags/all')
    getTags(): Tag[] {
        return this.metadataService.settingsRepository.getTags();
    }

    @Post('tags')
    createTag(@Body() input: TagInput): Tag {
        return this.metadataService.settingsRepository.addTag(input);
    }

    @Put('tags/:id')
    updateTag(@Param('id') id: string, @Body() input: Partial<TagInput>): Tag | null {
        return this.metadataService.settingsRepository.updateTag(id, input);
    }

    @Delete('tags/:id')
    deleteTag(@Param('id') id: string): { success: boolean } {
        const success = this.metadataService.settingsRepository.deleteTag(id);
        return { success };
    }

    @Post('tags/reset')
    resetTags(): Tag[] {
        return this.metadataService.settingsRepository.resetTags();
    }
}
