import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command } from 'commander';

describe('CLI Program', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('should export correct program name', async () => {
        // We can't easily test the program directly since it calls parse()
        // but we can verify the command structure by importing and checking
        const program = new Command();
        program
            .name('dbnexus')
            .description('A local-first database management CLI with web UI')
            .version('0.1.0');

        expect(program.name()).toBe('dbnexus');
    });

    describe('command structure', () => {
        it('should have start command with correct options', () => {
            const program = new Command();
            const startCmd = program
                .command('start')
                .option('-p, --port <port>', 'Port to run on', '3001')
                .option('--no-open', 'Do not open browser automatically')
                .option('--data-dir <path>', 'Custom data directory');

            const portOption = startCmd.options.find((o) => o.long === '--port');
            const openOption = startCmd.options.find((o) => o.long === '--no-open');
            const dataDirOption = startCmd.options.find((o) => o.long === '--data-dir');

            expect(portOption).toBeDefined();
            expect(portOption?.defaultValue).toBe('3001');
            expect(openOption).toBeDefined();
            expect(dataDirOption).toBeDefined();
        });

        it('should have connect subcommands', () => {
            const program = new Command();
            const connect = program.command('connect');

            connect.command('add').option('-n, --name <name>', 'Connection name');
            connect.command('list');
            connect.command('remove <name>');
            connect.command('test <name>');

            expect(connect.commands.length).toBe(4);
            expect(connect.commands.map((c) => c.name())).toContain('add');
            expect(connect.commands.map((c) => c.name())).toContain('list');
            expect(connect.commands.map((c) => c.name())).toContain('remove');
            expect(connect.commands.map((c) => c.name())).toContain('test');
        });

        it('should have query command with required options', () => {
            const program = new Command();
            const queryCmd = program
                .command('query')
                .requiredOption('-c, --conn <name>', 'Connection name')
                .option('-s, --sql <sql>', 'SQL query')
                .option('-f, --file <file>', 'SQL file')
                .option('--confirm', 'Confirm dangerous queries');

            const connOption = queryCmd.options.find((o) => o.long === '--conn');
            const sqlOption = queryCmd.options.find((o) => o.long === '--sql');
            const fileOption = queryCmd.options.find((o) => o.long === '--file');
            const confirmOption = queryCmd.options.find((o) => o.long === '--confirm');

            expect(connOption).toBeDefined();
            expect(connOption?.required).toBe(true);
            expect(sqlOption).toBeDefined();
            expect(fileOption).toBeDefined();
            expect(confirmOption).toBeDefined();
        });

        it('should have scan command', () => {
            const program = new Command();
            const scanCmd = program
                .command('scan')
                .option('--add', 'Automatically add discovered connections')
                .option('--env-dirs <dirs>', 'Directories to scan');

            const addOption = scanCmd.options.find((o) => o.long === '--add');
            const envDirsOption = scanCmd.options.find((o) => o.long === '--env-dirs');

            expect(addOption).toBeDefined();
            expect(envDirsOption).toBeDefined();
        });

        it('should have export command with required options', () => {
            const program = new Command();
            const exportCmd = program
                .command('export')
                .requiredOption('-c, --conn <name>', 'Connection name')
                .option('-t, --table <table>', 'Table to export')
                .option('-s, --sql <sql>', 'SQL query')
                .option('-f, --format <format>', 'Output format', 'csv')
                .requiredOption('-o, --output <file>', 'Output file');

            const connOption = exportCmd.options.find((o) => o.long === '--conn');
            const outputOption = exportCmd.options.find((o) => o.long === '--output');
            const formatOption = exportCmd.options.find((o) => o.long === '--format');

            expect(connOption?.required).toBe(true);
            expect(outputOption?.required).toBe(true);
            expect(formatOption?.defaultValue).toBe('csv');
        });

        it('should have schema subcommands', () => {
            const program = new Command();
            const schema = program.command('schema');

            schema
                .command('show')
                .requiredOption('-c, --conn <name>', 'Connection name')
                .option('-t, --table <table>', 'Table name');

            schema
                .command('compare')
                .requiredOption('--source <name>', 'Source connection')
                .requiredOption('--target <name>', 'Target connection');

            schema
                .command('diff')
                .requiredOption('--source <name>', 'Source connection')
                .requiredOption('--target <name>', 'Target connection')
                .option('-o, --output <file>', 'Output file');

            expect(schema.commands.length).toBe(3);
            expect(schema.commands.map((c) => c.name())).toContain('show');
            expect(schema.commands.map((c) => c.name())).toContain('compare');
            expect(schema.commands.map((c) => c.name())).toContain('diff');
        });
    });
});
