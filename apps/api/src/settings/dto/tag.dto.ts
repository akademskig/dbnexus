import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTagDto {
    @IsString()
    @IsNotEmpty({ message: 'Tag name is required' })
    name!: string;

    @IsString()
    @IsNotEmpty({ message: 'Tag color is required' })
    color!: string;
}

export class UpdateTagDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Tag name cannot be empty' })
    name?: string;

    @IsOptional()
    @IsString()
    color?: string;
}
