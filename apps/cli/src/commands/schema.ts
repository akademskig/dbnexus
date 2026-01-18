import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import { getApiUrl } from '../config.js';

interface ShowOptions {
    conn: string;
    table?: string;
}

interface CompareOptions {
    source: string;
    target: string;
}

interface DiffOptions {
    source: string;
    target: string;
    output?: string;
}

interface ColumnInfo {
    name: string;
    dataType: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    defaultValue?: string | null;
}

interface TableInfo {
    name: string;
    schema?: string;
}

interface CompareResult {
    migrationSql?: string[];
}

async function fetchSchema(connectionId: string): Promise<TableInfo[]> {
    const response = await fetch(getApiUrl(`/connections/${connectionId}/tables`));
    if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }
    return response.json() as Promise<TableInfo[]>;
}

async function fetchTableDetails(
    connectionId: string,
    tableName: string,
    schema?: string
): Promise<ColumnInfo[]> {
    const params = new URLSearchParams({ table: tableName });
    if (schema) params.set('schema', schema);

    const response = await fetch(getApiUrl(`/connections/${connectionId}/columns?${params}`));
    if (!response.ok) {
        throw new Error(`Failed to fetch table: ${response.statusText}`);
    }
    return response.json() as Promise<ColumnInfo[]>;
}

export const schemaCommand = {
    async show(options: ShowOptions) {
        const spinner = ora('Fetching schema...').start();

        try {
            if (options.table) {
                // Show specific table
                const columns = await fetchTableDetails(options.conn, options.table);
                spinner.stop();

                console.log(chalk.bold(`\nTable: ${options.table}\n`));
                console.log(chalk.gray('─'.repeat(60)));

                for (const col of columns) {
                    const nullable = col.isNullable ? chalk.gray('NULL') : chalk.yellow('NOT NULL');
                    const pk = col.isPrimaryKey ? chalk.green(' PK') : '';
                    const def = col.defaultValue ? chalk.gray(` = ${col.defaultValue}`) : '';

                    console.log(
                        `  ${chalk.cyan(col.name.padEnd(25))} ${col.dataType.padEnd(15)} ${nullable}${pk}${def}`
                    );
                }
                console.log();
            } else {
                // Show all tables
                const tables = await fetchSchema(options.conn);
                spinner.stop();

                console.log(chalk.bold(`\nSchema for connection: ${options.conn}\n`));

                const grouped: Record<string, string[]> = {};
                for (const table of tables) {
                    const schema = table.schema || 'default';
                    const entries = grouped[schema] ?? [];
                    entries.push(table.name);
                    grouped[schema] = entries;
                }

                for (const [schema, tableNames] of Object.entries(grouped)) {
                    console.log(chalk.yellow(`  [${schema}]`));
                    for (const name of tableNames) {
                        console.log(`    ${name}`);
                    }
                    console.log();
                }

                console.log(chalk.gray(`Total: ${tables.length} table(s)`));
            }
        } catch (error) {
            spinner.fail('Failed to fetch schema');
            console.error(
                chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
            );
            process.exit(1);
        }
    },

    async compare(options: CompareOptions) {
        const spinner = ora('Comparing schemas...').start();

        try {
            const [sourceSchema, targetSchema] = await Promise.all([
                fetchSchema(options.source),
                fetchSchema(options.target),
            ]);

            spinner.stop();

            const sourceNames = new Set(sourceSchema.map((t: { name: string }) => t.name));
            const targetNames = new Set(targetSchema.map((t: { name: string }) => t.name));

            const added = [...sourceNames].filter((t) => !targetNames.has(t));
            const removed = [...targetNames].filter((t) => !sourceNames.has(t));
            const common = [...sourceNames].filter((t) => targetNames.has(t));

            console.log(chalk.bold('\nSchema Comparison\n'));
            console.log(chalk.gray(`Source: ${options.source}`));
            console.log(chalk.gray(`Target: ${options.target}\n`));

            if (added.length > 0) {
                console.log(chalk.green(`+ Tables only in source (${added.length}):`));
                added.forEach((t) => console.log(chalk.green(`    + ${t}`)));
                console.log();
            }

            if (removed.length > 0) {
                console.log(chalk.red(`- Tables only in target (${removed.length}):`));
                removed.forEach((t) => console.log(chalk.red(`    - ${t}`)));
                console.log();
            }

            console.log(chalk.gray(`= Common tables: ${common.length}`));
            console.log();

            if (added.length === 0 && removed.length === 0) {
                console.log(chalk.green('✓ Schemas are identical (table-level)'));
            }
        } catch (error) {
            spinner.fail('Comparison failed');
            console.error(
                chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
            );
            process.exit(1);
        }
    },

    async diff(options: DiffOptions) {
        const spinner = ora('Generating migration...').start();

        try {
            // Use the compare API to get the diff
            const response = await fetch(getApiUrl('/compare'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceConnectionId: options.source,
                    targetConnectionId: options.target,
                }),
            });

            if (!response.ok) {
                throw new Error(`Compare failed: ${response.statusText}`);
            }

            const result = (await response.json()) as CompareResult;
            spinner.stop();

            if (!result.migrationSql || result.migrationSql.length === 0) {
                console.log(chalk.green('\n✓ No migration needed - schemas are identical'));
                return;
            }

            const sql = result.migrationSql.join('\n\n');

            if (options.output) {
                fs.writeFileSync(options.output, sql);
                console.log(chalk.green(`\n✓ Migration saved to ${options.output}`));
            } else {
                console.log(chalk.bold('\nGenerated Migration SQL:\n'));
                console.log(chalk.gray('─'.repeat(60)));
                console.log(sql);
                console.log(chalk.gray('─'.repeat(60)));
            }
        } catch (error) {
            spinner.fail('Diff generation failed');
            console.error(
                chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
            );
            process.exit(1);
        }
    },
};
