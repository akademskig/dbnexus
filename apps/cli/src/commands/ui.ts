import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';

interface UiOptions {
    port: string;
    uiPort: string;
}

export async function uiCommand(options: UiOptions) {
    const cwd = process.cwd();
    const dbnexusDir = path.join(cwd, '.dbnexus');

    // Check if workspace is initialized
    if (!fs.existsSync(dbnexusDir)) {
        console.error(chalk.red('Error: Workspace not initialized.'));
        console.error(`Run ${chalk.yellow('dbnexus init')} first.`);
        process.exit(1);
    }

    console.log(chalk.cyan.bold('\n  🚀 DB Nexus\n'));
    console.log(`  ${chalk.dim('Workspace:')} ${cwd}`);
    console.log(`  ${chalk.dim('API Port:')} ${options.port}`);
    console.log(`  ${chalk.dim('UI Port:')} ${options.uiPort}`);
    console.log('');

    const spinner = ora('Starting services...').start();

    // In development, we'd start both API and web servers
    // For now, just show instructions
    spinner.succeed('Ready to start');

    console.log('');
    console.log(chalk.cyan('To start in development mode:'));
    console.log('');
    console.log(`  ${chalk.dim('# Terminal 1 - API')}`);
    console.log(`  ${chalk.yellow('cd apps/api && pnpm start:dev')}`);
    console.log('');
    console.log(`  ${chalk.dim('# Terminal 2 - Web UI')}`);
    console.log(`  ${chalk.yellow('cd apps/web && pnpm dev')}`);
    console.log('');
    console.log(`  ${chalk.dim('Then open:')} ${chalk.cyan(`http://localhost:${options.uiPort}`)}`);
    console.log('');

    // In production, this would:
    // 1. Start the NestJS API server
    // 2. Serve the built React app
    // 3. Open the browser
}
