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
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { DatabaseEngine, ConnectionType, ConnectionTag } from '@dbnexus/shared';
import { ConnectionTagDto } from '../../servers/dto/connection-tag.dto.js';
import { DATABASE_ENGINES, CONNECTION_TYPES } from '../../servers/dto/constants.js';

export class CreateConnectionDto {
    @IsString()
    @IsNotEmpty({ message: 'Connection name is required' })
    name!: string;

    @IsString()
    @IsIn([...DATABASE_ENGINES], { message: 'Engine must be postgres, mysql, mariadb, or sqlite' })
    engine!: DatabaseEngine;

    @IsOptional()
    @IsString()
    @IsIn([...CONNECTION_TYPES], { message: 'Connection type must be local, docker, or remote' })
    connectionType?: ConnectionType;

    @IsString()
    @IsNotEmpty({ message: 'Host is required' })
    host!: string;

    @IsNumber()
    @Min(1, { message: 'Port must be between 1 and 65535' })
    @Max(65535, { message: 'Port must be between 1 and 65535' })
    port!: number;

    @IsString()
    @IsNotEmpty({ message: 'Database name is required' })
    database!: string;

    @IsString()
    @IsNotEmpty({ message: 'Username is required' })
    username!: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password!: string;

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
    @ValidateNested({ each: true })
    @Type(() => ConnectionTagDto)
    tags?: ConnectionTag[];
}
