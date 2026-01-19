import { Command } from 'commander';
import { createRequire } from 'module';
import { initCommand } from './commands/init.js';
import { uiCommand } from './commands/ui.js';
import { connectCommand } from './commands/connect.js';
import { queryCommand } from './commands/query.js';
import { scanCommand } from './commands/scan.js';
import { exportCommand } from './commands/export.js';
import { schemaCommand } from './commands/schema.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

const program = new Command();

program
    .name('dbnexus')
    .description('A local-first database management CLI with web UI')
    .version(packageJson.version);

// Init command
program.command('init').description('Initialize a new DB Nexus workspace').action(initCommand);

// Start/UI command - also the default when no command is specified
program
    .command('start', { isDefault: true })
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

// Scan command
program
    .command('scan')
    .description('Scan for databases on your machine')
    .option('--add', 'Automatically add discovered connections')
    .option('--env-dirs <dirs>', 'Comma-separated directories to scan for .env files')
    .action(scanCommand);

// Export command
program
    .command('export')
    .description('Export data to CSV or JSON')
    .requiredOption('-c, --conn <name>', 'Connection name')
    .option('-t, --table <table>', 'Table to export')
    .option('-s, --sql <sql>', 'SQL query to export results from')
    .option('-f, --format <format>', 'Output format (csv, json)', 'csv')
    .requiredOption('-o, --output <file>', 'Output file path')
    .action(exportCommand);

// Schema commands
const schema = program.command('schema').description('View and compare database schemas');

schema
    .command('show')
    .description('Show schema for a connection')
    .requiredOption('-c, --conn <name>', 'Connection name')
    .option('-t, --table <table>', 'Show specific table details')
    .action(schemaCommand.show);

schema
    .command('compare')
    .description('Compare schemas between two connections')
    .requiredOption('--source <name>', 'Source connection name')
    .requiredOption('--target <name>', 'Target connection name')
    .action(schemaCommand.compare);

schema
    .command('diff')
    .description('Generate migration SQL between two schemas')
    .requiredOption('--source <name>', 'Source connection name')
    .requiredOption('--target <name>', 'Target connection name')
    .option('-o, --output <file>', 'Output file for migration SQL')
    .action(schemaCommand.diff);

// Parse arguments
program.parse();
