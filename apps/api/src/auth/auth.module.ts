import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { ApiKeyStrategy } from './strategies/api-key.strategy.js';
import { CombinedAuthGuard } from './guards/combined-auth.guard.js';
import { MetadataModule } from '../metadata/metadata.module.js';

@Module({
    imports: [
        MetadataModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
            secret: process.env['JWT_SECRET'] || 'dbnexus-dev-secret-change-in-production',
            signOptions: {
                expiresIn: '15m',
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, ApiKeyStrategy, CombinedAuthGuard],
    exports: [AuthService, JwtModule, CombinedAuthGuard],
})
export class AuthModule {}
