import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsIn } from 'class-validator';
import type { DatabaseEngine } from '@dbnexus/shared';
import { DATABASE_ENGINES } from '../../servers/dto/constants.js';

export class CreateDatabaseGroupDto {
    @IsString()
    @IsNotEmpty({ message: 'Group name is required' })
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    @IsIn([...DATABASE_ENGINES], { message: 'Engine must be postgres, mysql, mariadb, or sqlite' })
    databaseEngine!: DatabaseEngine;

    @IsOptional()
    @IsString()
    sourceConnectionId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetConnectionIds?: string[];

    @IsOptional()
    @IsBoolean()
    syncEnabled?: boolean;
}

export class UpdateDatabaseGroupDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Group name cannot be empty' })
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @IsIn([...DATABASE_ENGINES], { message: 'Engine must be postgres, mysql, mariadb, or sqlite' })
    databaseEngine?: DatabaseEngine;

    @IsOptional()
    @IsString()
    sourceConnectionId?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetConnectionIds?: string[];

    @IsOptional()
    @IsBoolean()
    syncEnabled?: boolean;
}
