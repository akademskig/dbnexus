import * as path from 'node:path';
import * as fs from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UiOptions {
    port: string;
    uiPort: string;
    open?: boolean;
    dataDir?: string;
}

export async function uiCommand(options: UiOptions) {
    console.log(chalk.cyan.bold('\n  🚀 DB Nexus\n'));

    // Set data directory if provided
    if (options.dataDir) {
        process.env['DBNEXUS_DATA_DIR'] = path.resolve(options.dataDir);
        console.log(`  ${chalk.dim('Data Directory:')} ${process.env['DBNEXUS_DATA_DIR']}`);
    } else {
        const homeDir = process.env['HOME'] || process.env['USERPROFILE'] || process.cwd();
        const defaultDataDir = path.join(homeDir, '.dbnexus');
        console.log(`  ${chalk.dim('Data Directory:')} ${defaultDataDir}`);
    }

    console.log(`  ${chalk.dim('Port:')} ${options.port}`);
    console.log('');

    const spinner = ora('Starting DB Nexus...').start();

    // Set environment variables
    process.env['DBNEXUS_PORT'] = options.port;
    process.env['PORT'] = options.port; // Also set PORT for backward compatibility
    process.env['NODE_ENV'] = 'production';

    // Find the API server entry point
    const possibleApiPaths = [
        path.join(__dirname, 'api.js'), // When bundled (cli.js and api.js in same dir)
        path.join(__dirname, '..', 'api.js'), // Alternative bundled structure
        path.join(__dirname, '..', '..', '..', 'api', 'dist', 'main.js'), // When running from built CLI in monorepo
        path.join(__dirname, '..', '..', 'api', 'dist', 'main.js'), // Alternative monorepo structure
    ];

    let apiPath: string | null = null;
    for (const p of possibleApiPaths) {
        if (fs.existsSync(p)) {
            apiPath = p;
            break;
        }
    }

    if (!apiPath) {
        spinner.fail('API server not found');
        console.error(chalk.red('\nError: Could not find the API server.'));
        console.error(chalk.dim('Make sure DB Nexus is properly installed.'));
        process.exit(1);
    }

    try {
        // Start the API server (which also serves the web UI in production)
        const apiProcess = spawn('node', [apiPath], {
            stdio: 'inherit',
            env: process.env,
        });

        spinner.succeed('DB Nexus started');
        console.log('');
        console.log(chalk.green(`  ✓ Running on http://localhost:${options.port}`));
        console.log('');
        console.log(chalk.dim('  Press Ctrl+C to stop'));
        console.log('');

        // Open browser if requested
        if (options.open !== false) {
            const open = await import('open');
            await open.default(`http://localhost:${options.port}`);
        }

        // Handle process termination
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\n\n  Shutting down...'));
            apiProcess.kill();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            apiProcess.kill();
            process.exit(0);
        });

        apiProcess.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                console.error(chalk.red(`\n  API server exited with code ${code}`));
                process.exit(code);
            }
        });
    } catch (error) {
        spinner.fail('Failed to start');
        console.error(chalk.red('\nError starting DB Nexus:'));
        console.error(error);
        process.exit(1);
    }
}
