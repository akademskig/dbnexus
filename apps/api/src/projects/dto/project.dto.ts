import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty({ message: 'Project name is required' })
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    color?: string;
}

export class UpdateProjectDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Project name cannot be empty' })
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    color?: string;
}
