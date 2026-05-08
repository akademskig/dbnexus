import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSavedQueryDto {
    @IsString()
    @IsNotEmpty({ message: 'Query name is required' })
    name!: string;

    @IsString()
    @IsNotEmpty({ message: 'SQL is required' })
    sql!: string;

    @IsOptional()
    @IsString()
    connectionId?: string;

    @IsOptional()
    @IsString()
    folderId?: string;
}

export class UpdateSavedQueryDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Query name cannot be empty' })
    name?: string;

    @IsOptional()
    @IsString()
    sql?: string;

    @IsOptional()
    @IsString()
    connectionId?: string;

    @IsOptional()
    @IsString()
    folderId?: string;
}
