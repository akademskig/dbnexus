import { Controller, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import { CurrentUser } from '../auth/decorators/index.js';

interface SetPreferenceDto {
    value: unknown;
}

@Controller('preferences')
export class PreferencesController {
    constructor(private readonly metadataService: MetadataService) {}

    /**
     * Get all preferences for the current user
     */
    @Get()
    getAllPreferences(@CurrentUser('id') userId: string): Record<string, unknown> {
        if (!userId) {
            return {};
        }
        return this.metadataService.userPreferencesRepository.getAllForUser(userId);
    }

    /**
     * Get a specific preference for the current user
     */
    @Get(':key')
    getPreference(
        @CurrentUser('id') userId: string,
        @Param('key') key: string
    ): { value: unknown } {
        if (!userId) {
            return { value: null };
        }
        const value = this.metadataService.userPreferencesRepository.get(userId, key);
        return { value };
    }

    /**
     * Set a preference for the current user
     */
    @Put(':key')
    setPreference(
        @CurrentUser('id') userId: string,
        @Param('key') key: string,
        @Body() body: SetPreferenceDto
    ): { success: boolean } {
        if (!userId) {
            return { success: false };
        }
        this.metadataService.userPreferencesRepository.set(userId, key, body.value);
        return { success: true };
    }

    /**
     * Delete a preference for the current user
     */
    @Delete(':key')
    deletePreference(
        @CurrentUser('id') userId: string,
        @Param('key') key: string
    ): { success: boolean } {
        if (!userId) {
            return { success: false };
        }
        const success = this.metadataService.userPreferencesRepository.delete(userId, key);
        return { success };
    }
}
