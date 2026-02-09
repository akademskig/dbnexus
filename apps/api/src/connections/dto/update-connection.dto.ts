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
import { CONNECTION_TYPES } from '../../servers/dto/constants.js';

export class UpdateConnectionDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Connection name cannot be empty' })
    name?: string;

    @IsOptional()
    @IsString()
    @IsIn([...CONNECTION_TYPES], { message: 'Connection type must be local, docker, or remote' })
    connectionType?: ConnectionType;

    @IsOptional()
    @IsString()
    host?: string;

    @IsOptional()
    @IsNumber()
    @Min(1, { message: 'Port must be between 1 and 65535' })
    @Max(65535, { message: 'Port must be between 1 and 65535' })
    port?: number;

    @IsOptional()
    @IsString()
    database?: string;

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
    @IsString()
    filepath?: string;

    @IsOptional()
    @IsString()
    projectId?: string;

    @IsOptional()
    @IsString()
    groupId?: string;

    @IsOptional()
    @IsString()
    serverId?: string;

    @IsOptional()
    @IsString()
    defaultSchema?: string;

    @IsOptional()
    @IsBoolean()
    readOnly?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: ConnectionTag[];
}
