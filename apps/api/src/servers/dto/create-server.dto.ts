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
import type { DatabaseEngine, ConnectionType, ConnectionTag } from '@dbnexus/shared';
import { DATABASE_ENGINES, CONNECTION_TYPES } from './constants.js';

export class CreateServerDto {
    @IsString()
    @IsNotEmpty({ message: 'Server name is required' })
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
    @IsNotEmpty({ message: 'Username is required' })
    username!: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password!: string;

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
