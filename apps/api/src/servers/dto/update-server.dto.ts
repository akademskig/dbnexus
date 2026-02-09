import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsBoolean,
    IsIn,
    IsArray,
    Min,
    Max,
} from 'class-validator';
import type { ConnectionType, ConnectionTag } from '@dbnexus/shared';
import { CONNECTION_TYPES } from './constants.js';

export class UpdateServerDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Server name cannot be empty' })
    name?: string;

    @IsOptional()
    @IsString()
    @IsIn([...CONNECTION_TYPES], { message: 'Connection type must be local, docker, or remote' })
    connectionType?: ConnectionType;

    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Host cannot be empty' })
    host?: string;

    @IsOptional()
    @IsNumber()
    @Min(1, { message: 'Port must be between 1 and 65535' })
    @Max(65535, { message: 'Port must be between 1 and 65535' })
    port?: number;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsBoolean()
    ssl?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: ConnectionTag[];

    @IsOptional()
    @IsString()
    startCommand?: string;

    @IsOptional()
    @IsString()
    stopCommand?: string;
}
