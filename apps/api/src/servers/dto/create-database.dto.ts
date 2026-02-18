import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches } from 'class-validator';
import { IDENTIFIER_PATTERN, IDENTIFIER_MESSAGE } from './constants.js';

export class CreateDatabaseDto {
    @IsString()
    @IsNotEmpty({ message: 'Database name is required' })
    @Matches(IDENTIFIER_PATTERN, { message: IDENTIFIER_MESSAGE })
    databaseName!: string;

    @IsOptional()
    @IsString()
    @Matches(IDENTIFIER_PATTERN, { message: IDENTIFIER_MESSAGE })
    username?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsBoolean()
    grantSchemaAccess?: boolean;
}
