import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { createHash } from 'crypto';
import { Request } from 'express';
import { MetadataService } from '../../metadata/metadata.service.js';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(private metadataService: MetadataService) {
        super();
    }

    async validate(req: Request) {
        const apiKey = this.extractApiKey(req);

        if (!apiKey) {
            throw new UnauthorizedException('API key is required');
        }

        const keyHash = this.hashKey(apiKey);
        const storedKey = this.metadataService.userRepository.findApiKeyByHash(keyHash);

        if (!storedKey) {
            throw new UnauthorizedException('Invalid API key');
        }

        if (storedKey.expiresAt && new Date(storedKey.expiresAt) < new Date()) {
            throw new UnauthorizedException('API key has expired');
        }

        const user = this.metadataService.userRepository.findById(storedKey.userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        this.metadataService.userRepository.updateApiKeyLastUsed(storedKey.id);

        return user;
    }

    private extractApiKey(req: Request): string | null {
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token.startsWith('dbnx_')) {
                return token;
            }
        }

        const apiKeyHeader = req.headers['x-api-key'];
        if (typeof apiKeyHeader === 'string') {
            return apiKeyHeader;
        }

        return null;
    }

    private hashKey(key: string): string {
        return createHash('sha256').update(key).digest('hex');
    }
}
