import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import * as fs from 'node:fs';

export interface ToolStatus {
    name: string;
    command: string;
    installed: boolean;
    version?: string;
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
     * Attempt to auto-install tools (requires sudo/admin privileges)
     */
    static async autoInstall(): Promise<{ success: boolean; message: string; output?: string }> {
        const os = platform();

        if (os === 'linux') {
            return this.installLinux();
        } else if (os === 'darwin') {
            return this.installMacOS();
        } else {
            return {
                success: false,
                message:
                    'Auto-installation is not supported on this platform. Please install manually.',
            };
        }
    }

    private static async installLinux(): Promise<{
        success: boolean;
        message: string;
        output?: string;
    }> {
        // Try to detect the package manager
        const hasApt = await this.checkCommand('apt-get').then((r) => r.installed);
        const hasDnf = await this.checkCommand('dnf').then((r) => r.installed);
        const hasPacman = await this.checkCommand('pacman').then((r) => r.installed);

        let command: string;
        let args: string[];

        if (hasApt) {
            command = 'sudo';
            args = ['apt-get', 'install', '-y', 'postgresql-client', 'mysql-client'];
        } else if (hasDnf) {
            command = 'sudo';
            args = ['dnf', 'install', '-y', 'postgresql', 'mysql'];
        } else if (hasPacman) {
            command = 'sudo';
            args = ['pacman', '-S', '--noconfirm', 'postgresql-libs', 'mysql-clients'];
        } else {
            return {
                success: false,
                message: 'Could not detect package manager. Please install manually.',
            };
        }

        return this.runInstallCommand(command, args);
    }

    private static async installMacOS(): Promise<{
        success: boolean;
        message: string;
        output?: string;
    }> {
        const hasBrew = await this.checkCommand('brew').then((r) => r.installed);

        if (!hasBrew) {
            return {
                success: false,
                message:
                    'Homebrew is not installed. Please install Homebrew first or install tools manually.',
            };
        }

        return this.runInstallCommand('brew', ['install', 'postgresql', 'mysql-client']);
    }

    private static async runInstallCommand(
        command: string,
        args: string[]
    ): Promise<{ success: boolean; message: string; output?: string }> {
        return new Promise((resolve) => {
            const proc = spawn(command, args, { stdio: 'pipe' });
            let output = '';
            let errorOutput = '';

            proc.stdout?.on('data', (data) => {
                output += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        message: 'Database client tools installed successfully',
                        output: output + errorOutput,
                    });
                } else {
                    resolve({
                        success: false,
                        message: `Installation failed with exit code ${code}`,
                        output: output + errorOutput,
                    });
                }
            });

            proc.on('error', (error) => {
                resolve({
                    success: false,
                    message: `Failed to run installation command: ${error.message}`,
                });
            });
        });
    }
}
