import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { MetadataDatabase, ConnectionRepository } from '@dbnexus/metadata';
import { PostgresConnector, QueryValidator } from '@dbnexus/connectors';

interface QueryOptions {
    conn: string;
    sql?: string;
    file?: string;
    confirm?: boolean;
}

export async function queryCommand(options: QueryOptions) {
    const cwd = process.cwd();
    const dbnexusDir = path.join(cwd, '.dbnexus');

    // Check workspace
    if (!fs.existsSync(dbnexusDir)) {
        console.error(chalk.red('Error: Workspace not initialized.'));
        console.error(`Run ${chalk.yellow('dbnexus init')} first.`);
        process.exit(1);
    }

    // Get SQL
    let sql: string;
    if (options.sql) {
        sql = options.sql;
    } else if (options.file) {
        if (!fs.existsSync(options.file)) {
            console.error(chalk.red(`Error: File not found: ${options.file}`));
            process.exit(1);
        }
        sql = fs.readFileSync(options.file, 'utf-8');
    } else {
        console.error(chalk.red('Error: Either --sql or --file is required.'));
        process.exit(1);
    }

    // Get connection
    const dbPath = path.join(dbnexusDir, 'metadata.db');
    const db = new MetadataDatabase(dbPath);
    db.initialize();
    const repo = new ConnectionRepository(db);

    const connection = repo.findByName(options.conn);
    if (!connection) {
        console.error(chalk.red(`Error: Connection "${options.conn}" not found.`));
        db.close();
        process.exit(1);
    }

    // Get password from database
    const password = repo.getPassword(connection.id);
    if (!password) {
        console.error(chalk.red(`Error: Password not found for "${options.conn}".`));
        db.close();
        process.exit(1);
    }

    // Validate query
    const validator = new QueryValidator();
    const validation = validator.validate(sql, connection.readOnly);

    if (!validation.isValid) {
        console.error(chalk.red(`\n  Error: ${validation.message}\n`));
        db.close();
        process.exit(1);
    }

    if (validation.requiresConfirmation && !options.confirm) {
        console.log('');
        console.log(chalk.yellow(`  ⚠️  ${validation.message}`));
        console.log('');
        console.log(`  Use ${chalk.cyan('--confirm')} to execute this query.`);
        console.log('');
        db.close();
        process.exit(1);
    }

    // Execute query
    const spinner = ora('Executing query...').start();

    const connector = new PostgresConnector({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        password,
        ssl: connection.ssl,
    });

    try {
        await connector.connect();
        const result = await connector.query(sql);
        await connector.disconnect();

        spinner.succeed(`Query completed in ${result.executionTimeMs}ms`);

        console.log('');

        if (result.rows.length === 0) {
            console.log(chalk.dim('  No rows returned.'));
        } else {
            // Print results as table
            const columns = result.columns.map((c) => c.name);
            const colWidths = columns.map((col) => {
                const maxDataWidth = Math.max(
                    ...result.rows.map((row) => String(row[col] ?? 'NULL').length)
                );
                return Math.max(col.length, Math.min(maxDataWidth, 40));
            });

            // Header
            const header = columns.map((col, i) => col.padEnd(colWidths[i]!)).join(' │ ');
            const separator = colWidths.map((w) => '─'.repeat(w)).join('─┼─');

            console.log(chalk.dim('  ' + header));
            console.log(chalk.dim('  ' + separator));

            // Rows
            for (const row of result.rows.slice(0, 100)) {
                const rowStr = columns
                    .map((col, i) => {
                        let val = row[col];
                        if (val === null) val = chalk.dim('NULL');
                        else if (typeof val === 'object') val = JSON.stringify(val);
                        else val = String(val);
                        return String(val).slice(0, colWidths[i]).padEnd(colWidths[i]!);
                    })
                    .join(' │ ');
                console.log('  ' + rowStr);
            }

            if (result.rows.length > 100) {
                console.log(chalk.dim(`  ... and ${result.rows.length - 100} more rows`));
            }

            console.log('');
            console.log(chalk.dim(`  ${result.rowCount} row(s)`));
        }

        console.log('');
    } catch (error) {
        spinner.fail('Query failed');
        console.error(
            chalk.red(`\n  ${error instanceof Error ? error.message : 'Unknown error'}\n`)
        );
        process.exit(1);
    } finally {
        db.close();
    }
}
