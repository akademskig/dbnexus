import { IsOptional, IsBoolean, IsArray, IsString } from 'class-validator';

export class DumpRestoreDto {
    @IsOptional()
    @IsBoolean()
    truncateTarget?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tables?: string[];
}
