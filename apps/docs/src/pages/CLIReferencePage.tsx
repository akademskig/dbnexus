import styled from '@emotion/styled';
import { CodeBlock } from '../components/CodeBlock';
import { DocsLayout } from '../components/DocsLayout';

const Title = styled.h1`
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
`;

const Subtitle = styled.p`
    color: var(--color-text);
    font-size: 1.25rem;
    margin-bottom: 2rem;
`;

const Section = styled.section`
    margin-bottom: 2.5rem;
`;

const SectionTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: var(--color-text);
`;

const Paragraph = styled.p`
    color: var(--color-text);
    font-size: 1rem;
    line-height: 1.7;
    margin-bottom: 1rem;
`;

const OptionTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;

    th,
    td {
        text-align: left;
        padding: 0.75rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    th {
        color: var(--color-text);
        font-weight: 600;
        font-size: 0.9rem;
    }

    td {
        color: var(--color-text);
        font-size: 0.9rem;
    }

    code {
        background: var(--color-bg-tertiary);
        padding: 0.15rem 0.4rem;
        font-size: 0.85rem;
    }
`;

export function CLIReferencePage() {
    return (
        <DocsLayout>
            <Title>CLI Reference</Title>
            <Subtitle>Complete command-line interface documentation for DB Nexus.</Subtitle>

            <Section>
                <SectionTitle>Installation</SectionTitle>
                <Paragraph>Run without installing using npx:</Paragraph>
                <CodeBlock language="bash">npx dbnexus</CodeBlock>
                <Paragraph>Or install globally:</Paragraph>
                <CodeBlock language="bash">{`npm install -g dbnexus
dbnexus`}</CodeBlock>
            </Section>

            <Section>
                <SectionTitle>dbnexus (start)</SectionTitle>
                <Paragraph>
                    Start the DB Nexus UI. This is the default command when no arguments are
                    provided.
                </Paragraph>
                <CodeBlock language="bash">{`# Start with defaults
dbnexus

# Start on a custom port
dbnexus --port 4000

# Start without opening browser
dbnexus --no-open

# Use a custom data directory
dbnexus --data-dir ~/my-dbnexus-data`}</CodeBlock>
                <OptionTable>
                    <thead>
                        <tr>
                            <th>Option</th>
                            <th>Description</th>
                            <th>Default</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>-p, --port</code>
                            </td>
                            <td>Port to run the server on</td>
                            <td>3001</td>
                        </tr>
                        <tr>
                            <td>
                                <code>--no-open</code>
                            </td>
                            <td>Don't open browser automatically</td>
                            <td>false</td>
                        </tr>
                        <tr>
                            <td>
                                <code>--data-dir</code>
                            </td>
                            <td>Custom directory for metadata</td>
                            <td>~/.dbnexus</td>
                        </tr>
                    </tbody>
                </OptionTable>
            </Section>

            <Section>
                <SectionTitle>dbnexus connect</SectionTitle>
                <Paragraph>Manage database connections from the command line.</Paragraph>

                <CodeBlock language="bash">{`# Add a new PostgreSQL connection
dbnexus connect add \\
  --name prod-db \\
  --host db.example.com \\
  --port 5432 \\
  --database myapp \\
  --user admin \\
  --password secret \\
  --ssl \\
  --tags prod,main

# List all connections
dbnexus connect list

# Test a connection
dbnexus connect test prod-db

# Remove a connection
dbnexus connect remove prod-db`}</CodeBlock>

                <OptionTable>
                    <thead>
                        <tr>
                            <th>Option</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>-n, --name</code>
                            </td>
                            <td>Connection name (required for add)</td>
                        </tr>
                        <tr>
                            <td>
                                <code>-h, --host</code>
                            </td>
                            <td>Database host (default: localhost)</td>
                        </tr>
                        <tr>
                            <td>
                                <code>-p, --port</code>
                            </td>
                            <td>Database port (default: 5432)</td>
                        </tr>
                        <tr>
                            <td>
                                <code>-d, --database</code>
                            </td>
                            <td>Database name</td>
                        </tr>
                        <tr>
                            <td>
                                <code>-u, --user</code>
                            </td>
                            <td>Database user</td>
                        </tr>
                        <tr>
                            <td>
                                <code>--password</code>
                            </td>
                            <td>Database password</td>
                        </tr>
                        <tr>
                            <td>
                                <code>--ssl</code>
                            </td>
                            <td>Use SSL connection</td>
                        </tr>
                        <tr>
                            <td>
                                <code>--read-only</code>
                            </td>
                            <td>Mark connection as read-only</td>
                        </tr>
                        <tr>
                            <td>
                                <code>-t, --tags</code>
                            </td>
                            <td>Comma-separated tags</td>
                        </tr>
                    </tbody>
                </OptionTable>
            </Section>

            <Section>
                <SectionTitle>dbnexus query</SectionTitle>
                <Paragraph>Execute SQL queries from the command line.</Paragraph>

                <CodeBlock language="bash">{`# Execute a simple query
dbnexus query --conn prod-db --sql "SELECT * FROM users LIMIT 10"

# Execute a query from a file
dbnexus query --conn prod-db --file ./migrations/001.sql

# Execute a dangerous query (requires --confirm)
dbnexus query --conn prod-db --sql "DROP TABLE temp_data" --confirm`}</CodeBlock>

                <OptionTable>
                    <thead>
                        <tr>
                            <th>Option</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>-c, --conn</code>
                            </td>
                            <td>Connection name (required)</td>
                        </tr>
                        <tr>
                            <td>
                                <code>-s, --sql</code>
                            </td>
                            <td>SQL query to execute</td>
                        </tr>
                        <tr>
                            <td>
                                <code>-f, --file</code>
                            </td>
                            <td>SQL file to execute</td>
                        </tr>
                        <tr>
                            <td>
                                <code>--confirm</code>
                            </td>
                            <td>Confirm dangerous queries (DROP, DELETE, etc.)</td>
                        </tr>
                    </tbody>
                </OptionTable>
            </Section>

            <Section>
                <SectionTitle>dbnexus scan</SectionTitle>
                <Paragraph>
                    Scan for databases on your machine. Checks common ports, Docker containers, and
                    environment files.
                </Paragraph>

                <CodeBlock language="bash">{`# Scan for all databases
dbnexus scan

# Scan and auto-add discovered connections
dbnexus scan --add

# Scan specific directories for .env files
dbnexus scan --env-dirs ~/projects,/var/www`}</CodeBlock>
            </Section>

            <Section>
                <SectionTitle>dbnexus export</SectionTitle>
                <Paragraph>Export data from a table or query result.</Paragraph>

                <CodeBlock language="bash">{`# Export a table to CSV
dbnexus export --conn prod-db --table users --format csv --output users.csv

# Export query results to JSON
dbnexus export --conn prod-db --sql "SELECT * FROM orders WHERE status = 'pending'" --format json --output pending.json`}</CodeBlock>
            </Section>

            <Section>
                <SectionTitle>dbnexus schema</SectionTitle>
                <Paragraph>View and compare database schemas.</Paragraph>

                <CodeBlock language="bash">{`# Show schema for a connection
dbnexus schema show --conn prod-db

# Show schema for a specific table
dbnexus schema show --conn prod-db --table users

# Compare two schemas
dbnexus schema compare --source dev-db --target prod-db

# Generate migration SQL
dbnexus schema diff --source dev-db --target prod-db --output migration.sql`}</CodeBlock>
            </Section>

            <Section>
                <SectionTitle>Environment Variables</SectionTitle>
                <Paragraph>DB Nexus respects the following environment variables:</Paragraph>

                <OptionTable>
                    <thead>
                        <tr>
                            <th>Variable</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>DBNEXUS_PORT</code>
                            </td>
                            <td>Default port for the server</td>
                        </tr>
                        <tr>
                            <td>
                                <code>DBNEXUS_DATA_DIR</code>
                            </td>
                            <td>Custom data directory</td>
                        </tr>
                        <tr>
                            <td>
                                <code>DBNEXUS_NO_OPEN</code>
                            </td>
                            <td>Set to "1" to disable auto-opening browser</td>
                        </tr>
                    </tbody>
                </OptionTable>
            </Section>
        </DocsLayout>
    );
}
