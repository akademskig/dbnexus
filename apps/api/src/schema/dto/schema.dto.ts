import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { IDENTIFIER_PATTERN, IDENTIFIER_MESSAGE } from '../../servers/dto/constants.js';

export class CreateSchemaDto {
    @IsString()
    @IsNotEmpty({ message: 'Schema name is required' })
    @Matches(IDENTIFIER_PATTERN, { message: IDENTIFIER_MESSAGE })
    name!: string;
}

export class ApplyMigrationDto {
    @IsOptional()
    @IsString()
    description?: string;
}
