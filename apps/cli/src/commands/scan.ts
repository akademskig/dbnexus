import chalk from 'chalk';
import ora from 'ora';

interface ScanOptions {
    add?: boolean;
    envDirs?: string;
}

export async function scanCommand(options: ScanOptions) {
    const spinner = ora('Scanning for databases...').start();

    try {
        // Make request to the API scanner endpoint
        const response = await fetch('http://localhost:3001/api/scanner/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`Scanner failed: ${response.statusText}`);
        }

        const result = await response.json();
        spinner.stop();

        if (result.connections.length === 0) {
            console.log(chalk.yellow('\n⚠ No databases found.'));
            console.log(chalk.gray('Make sure databases are running on standard ports or in Docker containers.'));
            return;
        }

        console.log(chalk.green(`\n✓ Found ${result.connections.length} database(s):\n`));

        for (const conn of result.connections) {
            const typeLabel = conn.connectionType === 'docker' 
                ? chalk.blue('[Docker]') 
                : conn.connectionType === 'remote'
                    ? chalk.yellow('[Remote]')
                    : chalk.gray('[Local]');

            console.log(`  ${typeLabel} ${chalk.bold(conn.name)}`);
            console.log(chalk.gray(`    ${conn.engine} @ ${conn.host}:${conn.port}/${conn.database || ''}`));
            
            if (conn.source) {
                console.log(chalk.gray(`    Source: ${conn.source}`));
            }
            console.log();
        }

        if (options.add) {
            const addSpinner = ora('Adding connections...').start();
            
            for (const conn of result.connections) {
                try {
                    await fetch('http://localhost:3001/api/connections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(conn),
                    });
                } catch {
                    // Ignore errors for individual connections
                }
            }
            
            addSpinner.succeed(`Added ${result.connections.length} connection(s)`);
        } else {
            console.log(chalk.gray('Run with --add to automatically add these connections.'));
        }
    } catch (error) {
        spinner.fail('Scan failed');
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        console.log(chalk.gray('\nMake sure DB Nexus server is running (dbnexus start)'));
        process.exit(1);
    }
}
