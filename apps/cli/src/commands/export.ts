import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import { getApiUrl } from '../config.js';

interface ExportOptions {
    conn: string;
    table?: string;
    sql?: string;
    format: 'csv' | 'json';
    output: string;
}

interface QueryResult {
    rows: Record<string, unknown>[];
    columns: { name: string }[];
}

export async function exportCommand(options: ExportOptions) {
    if (!options.table && !options.sql) {
        console.error(chalk.red('Error: Either --table or --sql is required'));
        process.exit(1);
    }

    const spinner = ora(`Exporting data to ${options.output}...`).start();

    try {
        // Build the query
        const query = options.sql || `SELECT * FROM ${options.table}`;

        // Execute the query via API
        const response = await fetch(getApiUrl('/query'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                connectionId: options.conn,
                query,
            }),
        });

        if (!response.ok) {
            const error = (await response.json()) as { message?: string };
            throw new Error(error.message || 'Query failed');
        }

        const result = (await response.json()) as QueryResult;

        if (!result.rows || result.rows.length === 0) {
            spinner.warn('No data to export');
            return;
        }

        let output: string;

        if (options.format === 'json') {
            output = JSON.stringify(result.rows, null, 2);
        } else {
            // CSV format
            const columns = result.columns.map((c: { name: string }) => c.name);
            const header = columns.join(',');
            const rows = result.rows.map((row: Record<string, unknown>) =>
                columns
                    .map((col: string) => {
                        const value = row[col];
                        if (value === null || value === undefined) return '';
                        const str = String(value);
                        // Escape quotes and wrap in quotes if contains comma or newline
                        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                            return `"${str.replace(/"/g, '""')}"`;
                        }
                        return str;
                    })
                    .join(',')
            );
            output = [header, ...rows].join('\n');
        }

        fs.writeFileSync(options.output, output);
        spinner.succeed(`Exported ${result.rows.length} rows to ${options.output}`);
    } catch (error) {
        spinner.fail('Export failed');
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
    }
}
