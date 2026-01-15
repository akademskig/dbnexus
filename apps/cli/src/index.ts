#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { uiCommand } from './commands/ui.js';
import { connectCommand } from './commands/connect.js';
import { queryCommand } from './commands/query.js';

const program = new Command();

program
    .name('dbnexus')
    .description('A local-first database management CLI with web UI')
    .version('0.1.0');

// Default action - start the UI
program
    .option('-p, --port <port>', 'Port to run on', '3001')
    .option('--no-open', 'Do not open browser automatically')
    .option('--data-dir <path>', 'Custom data directory for metadata')
    .action((options) => {
        // If no command is specified, start the UI
        if (
            process.argv.length === 2 ||
            process.argv.slice(2).every((arg) => arg.startsWith('-'))
        ) {
            uiCommand(options);
        }
    });

// Init command
program.command('init').description('Initialize a new DB Nexus workspace').action(initCommand);

// Start/UI command (explicit)
program
    .command('start')
    .alias('ui')
    .description('Start DB Nexus (default command)')
    .option('-p, --port <port>', 'Port to run on', '3001')
    .option('--no-open', 'Do not open browser automatically')
    .option('--data-dir <path>', 'Custom data directory for metadata')
    .action(uiCommand);

// Connect commands
const connect = program.command('connect').description('Manage database connections');

connect
    .command('add')
    .description('Add a new database connection')
    .option('-n, --name <name>', 'Connection name')
    .option('-h, --host <host>', 'Database host', 'localhost')
    .option('-p, --port <port>', 'Database port', '5432')
    .option('-d, --database <database>', 'Database name')
    .option('-u, --user <user>', 'Database user')
    .option('--password <password>', 'Database password')
    .option('--ssl', 'Use SSL connection')
    .option('--read-only', 'Set connection as read-only')
    .option('-t, --tags <tags>', 'Comma-separated tags (dev,stage,prod)')
    .action(connectCommand.add);

connect.command('list').description('List all connections').action(connectCommand.list);

connect.command('remove <name>').description('Remove a connection').action(connectCommand.remove);

connect.command('test <name>').description('Test a connection').action(connectCommand.test);

// Query command
program
    .command('query')
    .description('Execute a SQL query')
    .requiredOption('-c, --conn <name>', 'Connection name')
    .option('-s, --sql <sql>', 'SQL query to execute')
    .option('-f, --file <file>', 'SQL file to execute')
    .option('--confirm', 'Confirm dangerous queries')
    .action(queryCommand);

// Parse arguments
program.parse();
