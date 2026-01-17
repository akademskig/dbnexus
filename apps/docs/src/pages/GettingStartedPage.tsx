import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { DocsLayout } from '../components/DocsLayout';

const Title = styled.h1`
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 1rem;
`;

const Subtitle = styled.p`
    color: var(--color-text-secondary);
    font-size: 1.25rem;
    margin-bottom: 2rem;
`;

const Section = styled.section`
    margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1rem;
    padding-top: 1rem;
`;

const Paragraph = styled.p`
    color: var(--color-text-secondary);
    font-size: 1rem;
    line-height: 1.8;
    margin-bottom: 1rem;
`;

const InlineLink = styled(Link)`
    color: var(--color-primary-light);
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
        color: var(--color-accent);
    }
`;

const List = styled.ul`
    color: var(--color-text-secondary);
    margin: 1rem 0;
    padding-left: 1.5rem;

    li {
        margin-bottom: 0.5rem;
        line-height: 1.7;
    }
`;

const Note = styled.div`
    background: rgba(99, 102, 241, 0.1);
    border-left: 4px solid var(--color-primary);
    padding: 1rem 1.5rem;
    border-radius: 0 8px 8px 0;
    margin: 1.5rem 0;

    p {
        margin: 0;
    }
`;

export function GettingStartedPage() {
    return (
        <DocsLayout>
            <Title>Getting Started</Title>
            <Subtitle>Get up and running with DB Nexus in minutes.</Subtitle>

            <Section>
                <SectionTitle>Installation</SectionTitle>
                <Paragraph>
                    The easiest way to run DB Nexus is using npx, which requires no installation:
                </Paragraph>
                <CodeBlock language="bash">npx dbnexus</CodeBlock>
                <Paragraph>Or install it globally for faster startup:</Paragraph>
                <CodeBlock language="bash">{`npm install -g dbnexus
dbnexus`}</CodeBlock>
                <Paragraph>
                    This will start the API server and open the web UI in your default browser.
                </Paragraph>
            </Section>

            <Section id="cli">
                <SectionTitle>CLI Options</SectionTitle>
                <Paragraph>DB Nexus provides several CLI commands:</Paragraph>
                <CodeBlock language="bash">{`# Start the UI (default)
dbnexus

# Start with a custom port
dbnexus --port 4000

# Add a connection
dbnexus connect add --name mydb --host localhost --database myapp

# Execute a query
dbnexus query --conn mydb --sql "SELECT * FROM users"`}</CodeBlock>
                <Paragraph>
                    See the full <InlineLink to="/docs/cli">CLI Reference</InlineLink> for all
                    available commands.
                </Paragraph>
            </Section>

            <Section>
                <SectionTitle>Adding Your First Connection</SectionTitle>
                <Paragraph>Once the UI is open, you have two options:</Paragraph>
                <List>
                    <li>
                        <strong>Scan for Databases:</strong> Click "Scan for Connections" to
                        automatically discover databases running on your machine, in Docker
                        containers, or configured in environment files.
                    </li>
                    <li>
                        <strong>Add Manually:</strong> Click "Add Connection" and enter your
                        database credentials.
                    </li>
                </List>
                <Note>
                    <Paragraph>
                        💡 The scanner checks common ports (5432 for PostgreSQL, 3306 for MySQL),
                        inspects Docker containers, and parses .env files automatically.
                    </Paragraph>
                </Note>
            </Section>

            <Section id="configuration">
                <SectionTitle>Configuration</SectionTitle>
                <Paragraph>
                    DB Nexus stores its configuration in <code>~/.dbnexus/</code>:
                </Paragraph>
                <List>
                    <li>
                        <code>connections.db</code> - SQLite database storing your connections
                        (credentials are encrypted)
                    </li>
                    <li>
                        <code>queries.db</code> - Query history and saved queries
                    </li>
                </List>
                <Paragraph>
                    You can customize the theme (dark/light) and keyboard shortcuts from the
                    Settings page in the UI.
                </Paragraph>
            </Section>

            <Section>
                <SectionTitle>Next Steps</SectionTitle>
                <Paragraph>Now that you're set up, explore what DB Nexus can do:</Paragraph>
                <List>
                    <li>Write and execute queries with syntax highlighting</li>
                    <li>Visualize your schema with the interactive diagram</li>
                    <li>Compare schemas between environments</li>
                    <li>Organize connections into projects and groups</li>
                </List>
            </Section>
        </DocsLayout>
    );
}
