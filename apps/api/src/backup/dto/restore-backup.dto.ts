import { IsString, IsNotEmpty, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class RestoreBackupDto {
    @IsString()
    @IsNotEmpty({ message: 'Connection ID is required' })
    connectionId!: string;

    @IsOptional()
    @IsIn(['native', 'sql'], { message: 'Method must be native or sql' })
    method?: 'native' | 'sql';

    /** Skip native pre-restore clean (drop schema / MySQL tables). Use only when your dump handles conflicts or you cleaned manually. */
    @IsOptional()
    @IsBoolean()
    skipPreClean?: boolean;
}
