import { BadRequestException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import * as fs from 'node:fs';

export interface ToolStatus {
    name: string;
    command: string;
    installed: boolean;
    version?: string;
}

export type BackupToolsInstallMode = 'install' | 'upgrade_latest';

export type MysqlClientPackageChoice = 'default' | '8.0';

export interface BackupToolsInstallOptions {
    mode?: BackupToolsInstallMode;
    includePostgresqlTools?: boolean;
    includeMysqlTools?: boolean;
    postgresqlClientMajor?: number;
    mysqlClientPackage?: MysqlClientPackageChoice;
    /** Passed to sudo -S (Linux package installs only). */
    sudoPassword?: string;
}

export class BackupToolsSetup {
    /**
     * Check if a command is available in the system
     */
    private static async checkCommand(
        command: string
    ): Promise<{ installed: boolean; version?: string }> {
        return new Promise((resolve) => {
            const proc = spawn(command, ['--version']);
            let output = '';

            proc.stdout?.on('data', (data) => {
                output += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    // Extract version from output (first line usually)
                    const version = output.split('\n')[0]?.trim() || 'unknown';
                    resolve({ installed: true, version });
                } else {
                    resolve({ installed: false });
                }
            });

            proc.on('error', () => {
                resolve({ installed: false });
            });
        });
    }

    /**
     * Check status of all database client tools
     */
    static async checkTools(): Promise<ToolStatus[]> {
        const tools = [
            { name: 'PostgreSQL Client', command: 'pg_dump' },
            { name: 'PostgreSQL Client (psql)', command: 'psql' },
            { name: 'MySQL Client', command: 'mysqldump' },
            { name: 'MySQL Client (mysql)', command: 'mysql' },
        ];

        const results: ToolStatus[] = [];

        for (const tool of tools) {
            const status = await this.checkCommand(tool.command);
            results.push({
                name: tool.name,
                command: tool.command,
                installed: status.installed,
                version: status.version,
            });
        }

        return results;
    }

    /**
     * Short guidance when native CLI tools are present — client major version must match server
     * expectations (e.g. pg_dump "server version mismatch").
     */
    static getToolCompatibilityNotes(tools: ToolStatus[]): string[] {
        const notes: string[] = [];
        const cmd = (name: string) => tools.find((t) => t.command === name);

        if (cmd('pg_dump')?.installed) {
            notes.push(
                'PostgreSQL: backups run pg_dump on this host. Use a client major version compatible with each server (if you see "server version mismatch", upgrade postgresql-client to match or exceed the server version, e.g. server 16 → client 16+).'
            );
        }
        if (cmd('mysqldump')?.installed) {
            notes.push(
                'MySQL: backups use mysqldump on this host. Keep client tools in line with your MySQL/MariaDB server versions.'
            );
        }
        return notes;
    }

    /**
     * Detect Linux distribution
     */
    private static detectLinuxDistro(): string {
        try {
            if (fs.existsSync('/etc/os-release')) {
                const content = fs.readFileSync('/etc/os-release', 'utf8');
                if (content.includes('Ubuntu') || content.includes('Debian')) {
                    return 'debian';
                } else if (content.includes('Fedora') || content.includes('Red Hat')) {
                    return 'fedora';
                } else if (content.includes('Arch')) {
                    return 'arch';
                }
            }
        } catch {
            // Ignore errors
        }
        return 'unknown';
    }

    /**
     * Get installation instructions based on the operating system
     */
    static getInstallInstructions(): {
        platform: string;
        instructions: string[];
        canAutoInstall: boolean;
    } {
        const os = platform();
        switch (os) {
            case 'linux': {
                const distro = this.detectLinuxDistro();
                if (distro === 'debian') {
                    return {
                        platform: 'Ubuntu/Debian',
                        instructions: [
                            'sudo apt-get update',
                            'sudo apt-get install -y postgresql-client mysql-client',
                        ],
                        canAutoInstall: true,
                    };
                } else if (distro === 'fedora') {
                    return {
                        platform: 'Fedora/RHEL',
                        instructions: ['sudo dnf install -y postgresql mysql'],
                        canAutoInstall: true,
                    };
                } else if (distro === 'arch') {
                    return {
                        platform: 'Arch Linux',
                        instructions: ['sudo pacman -S postgresql-libs mysql-clients'],
                        canAutoInstall: true,
                    };
                } else {
                    return {
                        platform: 'Linux',
                        instructions: [
                            'For Ubuntu/Debian:',
                            '  sudo apt-get update',
                            '  sudo apt-get install -y postgresql-client mysql-client',
                            '',
                            'For Fedora/RHEL:',
                            '  sudo dnf install -y postgresql mysql',
                            '',
                            'For Arch Linux:',
                            '  sudo pacman -S postgresql-libs mysql-clients',
                        ],
                        canAutoInstall: true,
                    };
                }
            }

            case 'darwin':
                return {
                    platform: 'macOS',
                    instructions: ['brew install postgresql mysql-client'],
                    canAutoInstall: true,
                };

            case 'win32':
                return {
                    platform: 'Windows',
                    instructions: [
                        'Using Chocolatey:',
                        '  choco install postgresql mysql',
                        '',
                        'Or download installers from:',
                        '  PostgreSQL: https://www.postgresql.org/download/windows/',
                        '  MySQL: https://dev.mysql.com/downloads/installer/',
                        '',
                        'Make sure to add the bin directories to your PATH',
                    ],
                    canAutoInstall: false,
                };

            default:
                return {
                    platform: os,
                    instructions: [
                        'Please install PostgreSQL and MySQL client tools manually.',
                        'Refer to your operating system documentation.',
                    ],
                    canAutoInstall: false,
                };
        }
    }

    /**
     * Attempt to auto-install or upgrade tools (requires sudo/admin privileges where applicable).
     */
    static async autoInstall(
        options: BackupToolsInstallOptions = {}
    ): Promise<{ success: boolean; message: string; output?: string }> {
        const incPg = options.includePostgresqlTools !== false;
        const incMysql = options.includeMysqlTools !== false;
        if (!incPg && !incMysql) {
            throw new BadRequestException(
                'Select at least one client stack: PostgreSQL (pg_dump, psql) and/or MySQL (mysqldump, mysql).'
            );
        }

        const os = platform();

        if (os === 'linux') {
            return this.installLinux({
                ...options,
                includePostgresqlTools: incPg,
                includeMysqlTools: incMysql,
            });
        }
        if (os === 'darwin') {
            return this.installMacOS({
                ...options,
                includePostgresqlTools: incPg,
                includeMysqlTools: incMysql,
            });
        }
        return {
            success: false,
            message:
                'Auto-installation is not supported on this platform. Please install manually.',
        };
    }

    private static buildAptPackages(options: BackupToolsInstallOptions): string[] {
        const pkgs: string[] = [];
        if (options.includePostgresqlTools !== false) {
            pkgs.push(
                options.postgresqlClientMajor != null
                    ? `postgresql-client-${options.postgresqlClientMajor}`
                    : 'postgresql-client'
            );
        }
        if (options.includeMysqlTools !== false) {
            pkgs.push(options.mysqlClientPackage === '8.0' ? 'mysql-client-8.0' : 'mysql-client');
        }
        return pkgs;
    }

    private static mysqlAptOnlyHint(options: BackupToolsInstallOptions): string {
        return options.mysqlClientPackage === '8.0'
            ? ' MySQL 8.0 client package selection applies on apt (Debian/Ubuntu) only; other package managers use their default MySQL/MariaDB client packages.'
            : '';
    }

    private static async installLinux(
        options: BackupToolsInstallOptions
    ): Promise<{ success: boolean; message: string; output?: string }> {
        const hasApt = await this.checkCommand('apt-get').then((r) => r.installed);
        const hasDnf = await this.checkCommand('dnf').then((r) => r.installed);
        const hasPacman = await this.checkCommand('pacman').then((r) => r.installed);

        const mode = options.mode ?? 'install';
        const pw = options.sudoPassword;

        if (hasApt) {
            const pkgs = this.buildAptPackages(options);
            const pkgStr = pkgs.join(' ');
            const script =
                mode === 'upgrade_latest'
                    ? `apt-get update -qq && apt-get install -y --only-upgrade ${pkgStr} || apt-get install -y ${pkgStr}`
                    : `apt-get update -qq && apt-get install -y ${pkgStr}`;
            const result = await this.runSudoShell(script, pw);
            if (result.success && options.mysqlClientPackage === '8.0') {
                return {
                    ...result,
                    message: `${result.message} (MySQL apt package: mysql-client-8.0 where available.)`,
                };
            }
            return result;
        }

        const incPg = options.includePostgresqlTools !== false;
        const incMysql = options.includeMysqlTools !== false;
        const major = options.postgresqlClientMajor;
        const pgSuffix =
            major != null
                ? ' PostgreSQL client major is applied on apt only; dnf/pacman use distro PostgreSQL client packages.'
                : '';

        if (hasDnf) {
            const dnfPkgs: string[] = [];
            if (incPg) dnfPkgs.push('postgresql');
            if (incMysql) dnfPkgs.push('mysql');
            if (dnfPkgs.length === 0) {
                return { success: false, message: 'No packages selected for dnf.' };
            }
            const op = mode === 'upgrade_latest' ? 'upgrade' : 'install';
            const result = await this.runSudoArgv(['dnf', op, '-y', ...dnfPkgs], pw);
            return result.success
                ? {
                      ...result,
                      message: result.message + pgSuffix + this.mysqlAptOnlyHint(options),
                  }
                : result;
        }

        if (hasPacman) {
            const pacPkgs: string[] = [];
            if (incPg) pacPkgs.push('postgresql-libs');
            if (incMysql) pacPkgs.push('mysql-clients');
            if (pacPkgs.length === 0) {
                return { success: false, message: 'No packages selected for pacman.' };
            }
            const result =
                mode === 'upgrade_latest'
                    ? await this.runSudoArgv(['pacman', '-Sy', '--noconfirm', ...pacPkgs], pw)
                    : await this.runSudoArgv(['pacman', '-S', '--noconfirm', ...pacPkgs], pw);
            return result.success
                ? {
                      ...result,
                      message: result.message + pgSuffix + this.mysqlAptOnlyHint(options),
                  }
                : result;
        }

        return {
            success: false,
            message: 'Could not detect package manager. Please install manually.',
        };
    }

    private static async installMacOS(
        options: BackupToolsInstallOptions
    ): Promise<{ success: boolean; message: string; output?: string }> {
        const hasBrew = await this.checkCommand('brew').then((r) => r.installed);

        if (!hasBrew) {
            return {
                success: false,
                message:
                    'Homebrew is not installed. Please install Homebrew first or install tools manually.',
            };
        }

        const mode = options.mode ?? 'install';
        const incPg = options.includePostgresqlTools !== false;
        const incMysql = options.includeMysqlTools !== false;
        const major = options.postgresqlClientMajor;
        const mysqlHint =
            options.mysqlClientPackage === '8.0'
                ? ' For MySQL 8.0-style clients on macOS, try: brew install mysql@8.0 (formula names vary; mysql-client may be enough).'
                : '';

        if (mode === 'upgrade_latest') {
            const parts: string[] = ['brew update'];
            if (incPg) {
                parts.push(
                    major != null
                        ? `brew upgrade postgresql@${major} || brew upgrade postgresql`
                        : 'brew upgrade postgresql'
                );
            }
            if (incMysql) {
                parts.push('brew upgrade mysql-client');
            }
            const result = await this.runShellCommand(parts.join(' && '));
            return result.success
                ? {
                      ...result,
                      message: result.message + mysqlHint,
                  }
                : result;
        }

        const installParts: string[] = [];
        if (incPg) {
            installParts.push(
                major != null ? `brew install postgresql@${major}` : 'brew install postgresql'
            );
        }
        if (incMysql) {
            installParts.push('brew install mysql-client');
        }
        if (installParts.length === 0) {
            return { success: false, message: 'No Homebrew packages selected.' };
        }
        const result = await this.runShellCommand(installParts.join(' && '));
        let message = result.message;
        if (result.success && major != null && incPg) {
            message += ` You may need: brew link --overwrite postgresql@${major} so pg_dump/psql match that version.`;
        }
        if (result.success) {
            message += mysqlHint;
        }
        return { ...result, message };
    }

    /**
     * Turns generic "exit code 100" into guidance when apt/brew output explains the failure.
     */
    private static formatToolInstallFailure(
        baseMessage: string,
        exitCode: number | null,
        combined: string
    ): string {
        const out = combined;
        const locateMatch = out.match(/Unable to locate package\s+(\S+)/i);
        if (locateMatch) {
            const pkg = locateMatch[1];
            return (
                `${baseMessage} (exit ${exitCode}). Apt could not find "${pkg}" in your current sources. ` +
                'Try "Distro default" or a PostgreSQL major your distribution actually ships (on Debian/Ubuntu, search with apt-cache search postgresql-client). ' +
                'For newer majors (e.g. 17–18) you often need the PostgreSQL PGDG apt repository: https://wiki.postgresql.org/wiki/Apt'
            );
        }
        if (/No available formula|Could not find formula/i.test(out)) {
            return (
                `${baseMessage} (exit ${exitCode}). Homebrew did not find a matching formula. ` +
                `Run brew update, choose "Distro default" for PostgreSQL, or install the version you need manually.`
            );
        }
        if (
            /Sorry, try again|incorrect password|authentication failure/i.test(out) &&
            /sudo/i.test(out)
        ) {
            return (
                `${baseMessage} (exit ${exitCode}). Sudo rejected the password or requires a TTY. ` +
                `Double-check the password or configure passwordless sudo for these package commands.`
            );
        }
        return `${baseMessage} (exit ${exitCode}).`;
    }

    /**
     * Run `sudo sh -c '<script>'`. If `password` is set, uses `sudo -S -k` and writes the password to stdin.
     */
    private static async runSudoShell(
        script: string,
        password?: string
    ): Promise<{ success: boolean; message: string; output?: string }> {
        return this.runSudoArgv(['sh', '-c', script], password);
    }

    /** Run `sudo [ -S -k ] arg0 arg1 ...` */
    private static async runSudoArgv(
        args: string[],
        password?: string
    ): Promise<{ success: boolean; message: string; output?: string }> {
        const usePw = password != null && password.length > 0;
        const sudoArgs = usePw ? (['-S', '-k', ...args] as const) : (args as readonly string[]);
        return new Promise((resolve) => {
            const proc = spawn('sudo', [...sudoArgs], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env },
            });
            let output = '';
            let errorOutput = '';

            if (usePw) {
                proc.stdin?.write(`${password}\n`);
                proc.stdin?.end();
            }

            proc.stdout?.on('data', (data) => {
                output += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            proc.on('close', (code) => {
                const combined = output + errorOutput;
                if (code === 0) {
                    resolve({
                        success: true,
                        message: 'Command completed successfully',
                        output: combined,
                    });
                } else {
                    resolve({
                        success: false,
                        message: this.formatToolInstallFailure('Command failed', code, combined),
                        output: combined,
                    });
                }
            });

            proc.on('error', (error) => {
                resolve({
                    success: false,
                    message: `Failed to run sudo: ${error.message}`,
                });
            });
        });
    }

    private static async runShellCommand(script: string): Promise<{
        success: boolean;
        message: string;
        output?: string;
    }> {
        return new Promise((resolve) => {
            const proc = spawn('sh', ['-c', script], {
                stdio: 'pipe',
                env: { ...process.env },
            });
            let output = '';
            let errorOutput = '';

            proc.stdout?.on('data', (data) => {
                output += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            proc.on('close', (code) => {
                const combined = output + errorOutput;
                if (code === 0) {
                    resolve({
                        success: true,
                        message: 'Command completed successfully',
                        output: combined,
                    });
                } else {
                    resolve({
                        success: false,
                        message: this.formatToolInstallFailure('Command failed', code, combined),
                        output: combined,
                    });
                }
            });

            proc.on('error', (error) => {
                resolve({
                    success: false,
                    message: `Failed to run command: ${error.message}`,
                });
            });
        });
    }
}
