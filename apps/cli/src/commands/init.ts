import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import chalk from 'chalk';
import ora from 'ora';
import { MetadataDatabase } from '@dbnexus/metadata';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

export async function initCommand() {
    const spinner = ora('Initializing DB Nexus workspace...').start();

    try {
        const cwd = process.cwd();
        const dbnexusDir = path.join(cwd, '.dbnexus');
        const configPath = path.join(cwd, 'dbnexus.config.json');

        // Check if already initialized
        if (fs.existsSync(dbnexusDir)) {
            spinner.warn('Workspace already initialized');
            return;
        }

        // Create .dbnexus directory
        fs.mkdirSync(dbnexusDir, { recursive: true });
        fs.mkdirSync(path.join(dbnexusDir, 'logs'), { recursive: true });

        // Initialize metadata database
        const dbPath = path.join(dbnexusDir, 'metadata.db');
        const db = new MetadataDatabase(dbPath);
        db.initialize();
        db.close();

        // Create config file
        const config = {
            version: packageJson.version,
            name: path.basename(cwd),
            createdAt: new Date().toISOString(),
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Add to .gitignore if it exists
        const gitignorePath = path.join(cwd, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
            if (!gitignore.includes('.dbnexus')) {
                fs.appendFileSync(gitignorePath, '\n# DB Nexus\n.dbnexus/\n');
            }
        }

        spinner.succeed('Workspace initialized successfully');

        console.log('');
        console.log(chalk.cyan('Created:'));
        console.log(`  ${chalk.dim('•')} .dbnexus/metadata.db`);
        console.log(`  ${chalk.dim('•')} .dbnexus/logs/`);
        console.log(`  ${chalk.dim('•')} dbnexus.config.json`);
        console.log('');
        console.log(chalk.cyan('Next steps:'));
        console.log(
            `  ${chalk.dim('1.')} Add a connection: ${chalk.yellow('dbnexus connect add')}`
        );
        console.log(`  ${chalk.dim('2.')} Start the UI: ${chalk.yellow('dbnexus ui')}`);
    } catch (error) {
        spinner.fail('Failed to initialize workspace');
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}
