import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { MetadataService } from '../metadata/metadata.service.js';
import type { User } from '@dbnexus/metadata';
import { RegisterDto, LoginDto } from './dto/index.js';

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AuthResponse {
    user: Omit<User, 'passwordHash'>;
    tokens: AuthTokens;
}

@Injectable()
export class AuthService {
    private readonly SALT_ROUNDS = 10;
    private readonly ACCESS_TOKEN_EXPIRY = '15m';
    private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;

    constructor(
        private metadataService: MetadataService,
        private jwtService: JwtService
    ) {}

    async register(dto: RegisterDto): Promise<AuthResponse> {
        const existingUser = this.metadataService.userRepository.findByEmail(dto.email);
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

        const isFirstUser = this.metadataService.userRepository.count() === 0;
        const role = isFirstUser ? 'admin' : 'viewer';

        const user = this.metadataService.userRepository.create({
            email: dto.email,
            passwordHash,
            name: dto.name,
            role,
        });

        const tokens = await this.generateTokens(user);

        this.logAuthEvent('user_registered', user.id, { email: user.email, role: user.role });

        return {
            user: this.sanitizeUser(user),
            tokens,
        };
    }

    async login(dto: LoginDto): Promise<AuthResponse> {
        const user = this.metadataService.userRepository.findByEmail(dto.email);
        if (!user) {
            this.logAuthEvent('login_failed', 'unknown', {
                email: dto.email,
                reason: 'user_not_found',
            });
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            this.logAuthEvent('login_failed', user.id, { reason: 'invalid_password' });
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(user);

        this.logAuthEvent('user_logged_in', user.id);

        return {
            user: this.sanitizeUser(user),
            tokens,
        };
    }

    async refreshTokens(refreshToken: string): Promise<AuthTokens> {
        const tokenHash = this.hashToken(refreshToken);
        const storedToken = this.metadataService.userRepository.findRefreshToken(tokenHash);

        if (!storedToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (new Date(storedToken.expiresAt) < new Date()) {
            this.metadataService.userRepository.deleteRefreshToken(tokenHash);
            throw new UnauthorizedException('Refresh token expired');
        }

        const user = this.metadataService.userRepository.findById(storedToken.userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        this.metadataService.userRepository.deleteRefreshToken(tokenHash);

        return this.generateTokens(user);
    }

    async logout(refreshToken: string): Promise<void> {
        const tokenHash = this.hashToken(refreshToken);
        this.metadataService.userRepository.deleteRefreshToken(tokenHash);
    }

    async logoutAll(userId: string): Promise<void> {
        this.metadataService.userRepository.deleteUserRefreshTokens(userId);
    }

    getMe(userId: string): Omit<User, 'passwordHash'> | null {
        const user = this.metadataService.userRepository.findById(userId);
        return user ? this.sanitizeUser(user) : null;
    }

    isAuthEnabled(): boolean {
        return this.metadataService.userRepository.count() > 0;
    }

    // API Key methods
    async createApiKey(
        userId: string,
        name: string,
        expiresAt?: Date
    ): Promise<{
        id: string;
        name: string;
        key: string;
        lastUsedAt: string | null;
        expiresAt: string | null;
        createdAt: string;
    }> {
        const key = this.generateApiKey();
        const keyHash = this.hashToken(key);

        const apiKey = this.metadataService.userRepository.createApiKey(
            userId,
            name,
            keyHash,
            expiresAt
        );

        return {
            id: apiKey.id,
            name: apiKey.name,
            key,
            lastUsedAt: apiKey.lastUsedAt,
            expiresAt: apiKey.expiresAt,
            createdAt: apiKey.createdAt,
        };
    }

    getApiKeys(userId: string): {
        id: string;
        name: string;
        lastUsedAt: string | null;
        expiresAt: string | null;
        createdAt: string;
    }[] {
        const apiKeys = this.metadataService.userRepository.findApiKeysByUser(userId);
        return apiKeys.map((key) => ({
            id: key.id,
            name: key.name,
            lastUsedAt: key.lastUsedAt,
            expiresAt: key.expiresAt,
            createdAt: key.createdAt,
        }));
    }

    deleteApiKey(keyId: string, userId: string): boolean {
        const deleted = this.metadataService.userRepository.deleteApiKey(keyId, userId);
        if (deleted) {
            this.logAuthEvent('api_key_deleted', userId, { keyId });
        }
        return deleted;
    }

    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        const user = this.metadataService.userRepository.findById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            this.logAuthEvent('password_change_failed', userId, {
                reason: 'invalid_current_password',
            });
            throw new BadRequestException('Current password is incorrect');
        }

        const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
        this.metadataService.userRepository.update(userId, { passwordHash: newPasswordHash });

        this.metadataService.userRepository.deleteUserRefreshTokens(userId);

        this.logAuthEvent('password_changed', userId);
    }

    async verifyPassword(userId: string, password: string): Promise<boolean> {
        const user = this.metadataService.userRepository.findById(userId);
        if (!user) {
            return false;
        }

        return bcrypt.compare(password, user.passwordHash);
    }

    async updateProfile(
        userId: string,
        updates: { name?: string }
    ): Promise<Omit<User, 'passwordHash'>> {
        const user = this.metadataService.userRepository.update(userId, updates);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }
        return this.sanitizeUser(user);
    }

    private logAuthEvent(
        action:
            | 'user_registered'
            | 'user_logged_in'
            | 'login_failed'
            | 'password_changed'
            | 'password_change_failed'
            | 'api_key_created'
            | 'api_key_deleted',
        userId: string,
        details?: Record<string, unknown>
    ): void {
        try {
            this.metadataService.auditLogRepository.create({
                action,
                entityType: 'user',
                entityId: userId,
                details,
            });
        } catch {
            // Silently fail - audit logging should not break auth flow
        }
    }

    private generateApiKey(): string {
        const randomBytes = new Uint8Array(24);
        crypto.getRandomValues(randomBytes);
        const base64 = btoa(String.fromCharCode(...randomBytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        return `dbnx_${base64}`;
    }

    private async generateTokens(user: User): Promise<AuthTokens> {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.ACCESS_TOKEN_EXPIRY,
        });

        const refreshToken = crypto.randomUUID();
        const refreshTokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

        this.metadataService.userRepository.createRefreshToken(
            user.id,
            refreshTokenHash,
            expiresAt
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60,
        };
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
        const { passwordHash: _, ...sanitized } = user;
        return sanitized;
    }
}
