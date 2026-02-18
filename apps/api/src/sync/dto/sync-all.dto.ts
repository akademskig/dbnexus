import { IsOptional, IsBoolean } from 'class-validator';

export class SyncAllDto {
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
