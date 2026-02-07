import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RestoreBackupDto {
    @IsString()
    @IsNotEmpty({ message: 'Connection ID is required' })
    connectionId!: string;

    @IsOptional()
    @IsIn(['native', 'sql'], { message: 'Method must be native or sql' })
    method?: 'native' | 'sql';
}
