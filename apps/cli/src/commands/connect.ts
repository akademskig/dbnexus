import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { MetadataDatabase, ConnectionRepository } from '@dbnexus/metadata';
import { PostgresConnector } from '@dbnexus/connectors';
import type { ConnectionTag } from '@dbnexus/shared';

function getWorkspace() {
    const cwd = process.cwd();
    const dbnexusDir = path.join(cwd, '.dbnexus');

    if (!fs.existsSync(dbnexusDir)) {
        console.error(chalk.red('Error: Workspace not initialized.'));
        console.error(`Run ${chalk.yellow('dbnexus init')} first.`);
        process.exit(1);
    }

    const dbPath = path.join(dbnexusDir, 'metadata.db');
    const db = new MetadataDatabase(dbPath);
    db.initialize();

    return { db, dbnexusDir };
}

async function prompt(question: string, hidden = false): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        if (hidden) {
            process.stdout.write(question);
            let input = '';
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', (char) => {
                const c = char.toString();
                if (c === '\n' || c === '\r') {
                    process.stdin.setRawMode(false);
                    process.stdout.write('\n');
                    rl.close();
                    resolve(input);
                } else if (c === '\u0003') {
                    process.exit();
                } else if (c === '\u007F') {
                    if (input.length > 0) {
                        input = input.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                } else {
                    input += c;
                    process.stdout.write('*');
                }
            });
        } else {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer);
            });
        }
    });
}

interface AddOptions {
    name?: string;
    host?: string;
    port?: string;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    readOnly?: boolean;
    tags?: string;
}

export const connectCommand = {
    async add(options: AddOptions) {
        const { db } = getWorkspace();
        const repo = new ConnectionRepository(db);

        console.log(chalk.cyan.bold('\n  Add Database Connection\n'));

        // Gather connection details
        const name = options.name ?? (await prompt('  Connection name: '));
        const host = options.host ?? ((await prompt('  Host [localhost]: ')) || 'localhost');
        const port = parseInt(options.port ?? ((await prompt('  Port [5432]: ')) || '5432'), 10);
        const database = options.database ?? (await prompt('  Database: '));
        const username = options.user ?? (await prompt('  Username: '));
        const password = options.password ?? (await prompt('  Password: ', true));
        const ssl = options.ssl ?? (await prompt('  Use SSL? (y/N): ')).toLowerCase() === 'y';
        const readOnly =
            options.readOnly ?? (await prompt('  Read-only mode? (y/N): ')).toLowerCase() === 'y';
        const tagsInput =
            options.tags ?? (await prompt('  Tags (comma-separated, e.g., dev,stage,prod): '));
        const tags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter((t) =>
                ['dev', 'stage', 'prod', 'local', 'test'].includes(t)
            ) as ConnectionTag[];

        console.log('');

        // Test connection
        const spinner = ora('Testing connection...').start();

        const connector = new PostgresConnector({
            host,
            port,
            database,
            username,
            password,
            ssl,
        });

        const testResult = await connector.testConnection();

        if (!testResult.success) {
            spinner.fail('Connection test failed');
            console.error(chalk.red(`  ${testResult.message}`));
            db.close();
            process.exit(1);
        }

        spinner.succeed(`Connection successful (${testResult.latencyMs}ms)`);

        // Save connection
        const saveSpinner = ora('Saving connection...').start();

        try {
            // Check for duplicate name
            const existing = repo.findByName(name);
            if (existing) {
                saveSpinner.fail('Connection name already exists');
                db.close();
                process.exit(1);
            }

            repo.create({
                name,
                engine: 'postgres',
                host,
                port,
                database,
                username,
                password,
                ssl,
                tags,
                readOnly,
            });

            saveSpinner.succeed('Connection saved');

            console.log('');
            console.log(chalk.green(`  ✓ Connection "${name}" added successfully`));
            console.log('');
        } catch (error) {
            saveSpinner.fail('Failed to save connection');
            console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        }

        db.close();
    },

    async list() {
        const { db } = getWorkspace();
        const repo = new ConnectionRepository(db);

        const connections = repo.findAll();

        if (connections.length === 0) {
            console.log(chalk.yellow('\n  No connections configured.\n'));
            console.log(`  Run ${chalk.cyan('dbnexus connect add')} to add one.\n`);
            db.close();
            return;
        }

        console.log(chalk.cyan.bold('\n  Database Connections\n'));

        for (const conn of connections) {
            const tags = conn.tags
                .map((t) => {
                    if (t === 'prod') return chalk.red(t);
                    if (t === 'stage') return chalk.yellow(t);
                    return chalk.green(t);
                })
                .join(', ');

            console.log(`  ${chalk.white.bold(conn.name)}`);
            console.log(`    ${chalk.dim('Host:')} ${conn.host}:${conn.port}`);
            console.log(`    ${chalk.dim('Database:')} ${conn.database}`);
            console.log(`    ${chalk.dim('User:')} ${conn.username}`);
            if (conn.tags.length > 0) {
                console.log(`    ${chalk.dim('Tags:')} ${tags}`);
            }
            if (conn.readOnly) {
                console.log(`    ${chalk.dim('Mode:')} ${chalk.yellow('read-only')}`);
            }
            console.log('');
        }

        db.close();
    },

    async remove(name: string) {
        const { db } = getWorkspace();
        const repo = new ConnectionRepository(db);

        const connection = repo.findByName(name);
        if (!connection) {
            console.error(chalk.red(`\n  Connection "${name}" not found.\n`));
            db.close();
            process.exit(1);
        }

        const spinner = ora(`Removing connection "${name}"...`).start();

        try {
            repo.delete(connection.id);
            spinner.succeed(`Connection "${name}" removed`);
        } catch (error) {
            spinner.fail('Failed to remove connection');
            console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        }

        db.close();
    },

    async test(name: string) {
        const { db } = getWorkspace();
        const repo = new ConnectionRepository(db);

        const connection = repo.findByName(name);
        if (!connection) {
            console.error(chalk.red(`\n  Connection "${name}" not found.\n`));
            db.close();
            process.exit(1);
        }

        // Get password from database
        const password = repo.getPassword(connection.id);
        if (!password) {
            console.error(chalk.red(`\n  Password not found for "${name}".\n`));
            db.close();
            process.exit(1);
        }

        const spinner = ora(`Testing connection "${name}"...`).start();

        const connector = new PostgresConnector({
            host: connection.host,
            port: connection.port,
            database: connection.database,
            username: connection.username,
            password,
            ssl: connection.ssl,
        });

        const result = await connector.testConnection();

        if (result.success) {
            spinner.succeed(`Connection successful (${result.latencyMs}ms)`);
            if (result.serverVersion) {
                console.log(chalk.dim(`  ${result.serverVersion}`));
            }
        } else {
            spinner.fail('Connection failed');
            console.error(chalk.red(`  ${result.message}`));
        }

        db.close();
    },
};
