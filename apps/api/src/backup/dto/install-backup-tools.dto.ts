import { IsOptional, IsIn, IsInt, Min, Max, IsBoolean, IsString, MaxLength } from 'class-validator';

export type BackupToolsInstallMode = 'install' | 'upgrade_latest';

export type MysqlClientPackageChoice = 'default' | '8.0';

export class InstallBackupToolsDto {
    @IsOptional()
    @IsIn(['install', 'upgrade_latest'], {
        message: 'mode must be install or upgrade_latest',
    })
    mode?: BackupToolsInstallMode;

    /** Install/upgrade PostgreSQL client stack (pg_dump, psql). Default true. */
    @IsOptional()
    @IsBoolean()
    includePostgresqlTools?: boolean;

    /** Install/upgrade MySQL client stack (mysqldump, mysql). Default true. */
    @IsOptional()
    @IsBoolean()
    includeMysqlTools?: boolean;

    /**
     * Debian/Ubuntu: `postgresql-client-{major}`.
     * macOS/Homebrew: `postgresql@{major}`. Ignored for dnf/pacman (distro meta packages only).
     */
    @IsOptional()
    @IsInt()
    @Min(12)
    @Max(18)
    postgresqlClientMajor?: number;

    /**
     * Debian/Ubuntu only: `mysql-client` vs `mysql-client-8.0`. Other platforms use distro default.
     */
    @IsOptional()
    @IsIn(['default', '8.0'])
    mysqlClientPackage?: MysqlClientPackageChoice;

    /**
     * If set, passed to sudo via stdin (`sudo -S`). Only use on trusted machines over HTTPS.
     * Homebrew installs on macOS do not use sudo.
     */
    @IsOptional()
    @IsString()
    @MaxLength(512)
    sudoPassword?: string;
}
