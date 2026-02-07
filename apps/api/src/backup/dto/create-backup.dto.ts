import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';
import type { BackupType } from '@dbnexus/shared';

const BACKUP_TYPES = ['full', 'schema', 'data'] as const;

export class CreateBackupDto {
    @IsString()
    @IsNotEmpty({ message: 'Connection ID is required' })
    connectionId!: string;

    @IsOptional()
    @IsIn([...BACKUP_TYPES], { message: 'Backup type must be full, schema, or data' })
    backupType?: BackupType;

    @IsOptional()
    @IsBoolean()
    compression?: boolean;
}
