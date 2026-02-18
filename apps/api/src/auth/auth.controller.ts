import { Controller, Post, Get, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, AuthResponse, AuthTokens } from './auth.service.js';
import {
    RegisterDto,
    LoginDto,
    RefreshTokenDto,
    CreateApiKeyDto,
    ChangePasswordDto,
} from './dto/index.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { User } from '@dbnexus/metadata';

interface ApiKeyResponse {
    id: string;
    name: string;
    key?: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
}

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Public()
    @Post('register')
    async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
        return this.authService.register(dto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto): Promise<AuthResponse> {
        return this.authService.login(dto);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshTokens(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
        return this.authService.refreshTokens(dto.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
        await this.authService.logout(dto.refreshToken);
        return { message: 'Logged out successfully' };
    }

    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    async logoutAll(@CurrentUser('id') userId: string): Promise<{ message: string }> {
        await this.authService.logoutAll(userId);
        return { message: 'All sessions terminated' };
    }

    @Get('me')
    getMe(@CurrentUser() user: User): Omit<User, 'passwordHash'> {
        const { passwordHash: _, ...sanitized } = user;
        return sanitized;
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @CurrentUser('id') userId: string,
        @Body() dto: ChangePasswordDto
    ): Promise<{ message: string }> {
        await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
        return { message: 'Password changed successfully. Please log in again.' };
    }

    @Post('update-profile')
    @HttpCode(HttpStatus.OK)
    async updateProfile(
        @CurrentUser('id') userId: string,
        @Body() dto: { name?: string }
    ): Promise<Omit<User, 'passwordHash'>> {
        return this.authService.updateProfile(userId, dto);
    }

    @Public()
    @Get('status')
    getAuthStatus(): { authEnabled: boolean; hasUsers: boolean } {
        const hasUsers = this.authService.isAuthEnabled();
        return {
            authEnabled: hasUsers,
            hasUsers,
        };
    }

    // API Key endpoints
    @Post('api-keys')
    async createApiKey(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateApiKeyDto
    ): Promise<ApiKeyResponse> {
        const result = await this.authService.createApiKey(
            userId,
            dto.name,
            dto.expiresAt ? new Date(dto.expiresAt) : undefined
        );
        return result;
    }

    @Get('api-keys')
    async getApiKeys(@CurrentUser('id') userId: string): Promise<ApiKeyResponse[]> {
        return this.authService.getApiKeys(userId);
    }

    @Delete('api-keys/:id')
    @HttpCode(HttpStatus.OK)
    async deleteApiKey(
        @CurrentUser('id') userId: string,
        @Param('id') keyId: string
    ): Promise<{ success: boolean; message: string }> {
        const deleted = await this.authService.deleteApiKey(keyId, userId);
        return {
            success: deleted,
            message: deleted ? 'API key deleted' : 'API key not found',
        };
    }
}
