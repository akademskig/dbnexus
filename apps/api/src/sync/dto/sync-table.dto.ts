import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class SyncTableDto {
    @IsArray()
    @IsString({ each: true })
    primaryKeys!: string[];

    @IsOptional()
    @IsBoolean()
    insertMissing?: boolean;

    @IsOptional()
    @IsBoolean()
    updateDifferent?: boolean;

    @IsOptional()
    @IsBoolean()
    deleteExtra?: boolean;
}
