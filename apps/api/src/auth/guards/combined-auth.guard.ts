import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { MetadataService } from '../../metadata/metadata.service.js';

@Injectable()
export class CombinedAuthGuard extends AuthGuard(['jwt', 'api-key']) {
    constructor(
        private reflector: Reflector,
        private metadataService: MetadataService
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const hasUsers = this.metadataService.userRepository.count() > 0;
        if (!hasUsers) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        const apiKeyHeader = request.headers['x-api-key'];

        if (apiKeyHeader || authHeader?.startsWith('Bearer dbnx_')) {
            return this.activateApiKey(context);
        }

        if (authHeader?.startsWith('Bearer ')) {
            return this.activateJwt(context);
        }

        throw new UnauthorizedException('Authentication required');
    }

    private async activateJwt(context: ExecutionContext): Promise<boolean> {
        const jwtGuard = new (AuthGuard('jwt'))();
        try {
            await jwtGuard.canActivate(context);
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private async activateApiKey(context: ExecutionContext): Promise<boolean> {
        const apiKeyGuard = new (AuthGuard('api-key'))();
        try {
            await apiKeyGuard.canActivate(context);
            return true;
        } catch {
            throw new UnauthorizedException('Invalid API key');
        }
    }

    handleRequest<TUser = unknown>(err: Error | null, user: TUser): TUser {
        if (err || !user) {
            throw err || new UnauthorizedException();
        }
        return user;
    }
}
