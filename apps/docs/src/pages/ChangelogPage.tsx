import styled from '@emotion/styled';
import { motion } from 'framer-motion';
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

const Version = styled(motion.section)`
    margin-bottom: 2.5rem;
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
`;

const VersionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
`;

const VersionNumber = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary-light);
`;

const VersionDate = styled.span`
    color: var(--color-text-secondary);
    font-size: 0.9rem;
`;

const VersionTag = styled.span<{ type: 'latest' | 'breaking' }>`
    background: ${(props) =>
        props.type === 'latest' ? 'var(--color-accent-green)' : 'var(--color-accent-orange)'};
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
`;

const ChangeList = styled.ul`
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const ChangeItem = styled.li<{ type: 'added' | 'changed' | 'fixed' | 'removed' }>`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;

    &::before {
        content: ${(props) => {
            switch (props.type) {
                case 'added':
                    return '"+"';
                case 'changed':
                    return '"~"';
                case 'fixed':
                    return '"✓"';
                case 'removed':
                    return '"-"';
            }
        }};
        color: ${(props) => {
            switch (props.type) {
                case 'added':
                    return 'var(--color-accent-green)';
                case 'changed':
                    return 'var(--color-accent-orange)';
                case 'fixed':
                    return 'var(--color-primary-light)';
                case 'removed':
                    return '#ef4444';
            }
        }};
        font-weight: 700;
        font-family: var(--font-mono);
    }
`;

const changelog = [
    {
        version: '0.1.12',
        date: 'January 2026',
        latest: true,
        changes: [
            { type: 'added' as const, text: 'Data Sync Logs tab in Logs page for tracking sync operations' },
            { type: 'added' as const, text: 'SQL statement logging for sync operations with actual values' },
            { type: 'added' as const, text: 'Auto-refresh of sync logs when operations complete' },
            { type: 'changed' as const, text: 'Sync runs now tracked in Activity log alongside queries' },
        ],
    },
    {
        version: '0.1.11',
        date: 'January 2026',
        changes: [
            { type: 'added' as const, text: 'StatusAlert component for consistent alert styling' },
            { type: 'added' as const, text: 'Dynamic CLI version from package.json' },
            { type: 'changed' as const, text: 'License changed from MIT to AGPL-3.0' },
            { type: 'changed' as const, text: 'Docs site configured for GitHub Pages deployment' },
            { type: 'fixed' as const, text: 'CLI bundle duplicate createRequire error' },
            { type: 'fixed' as const, text: 'CLI --port option now correctly passed to server' },
        ],
    },
    {
        version: '0.1.10',
        date: 'January 2026',
        changes: [
            { type: 'added' as const, text: 'Connection details tooltip in navigation sidebar' },
            {
                type: 'added' as const,
                text: 'Reusable OperationResult component for operation feedback',
            },
            { type: 'added' as const, text: 'CLI and API test suites' },
            {
                type: 'changed' as const,
                text: 'Unified operation results styling across all pages',
            },
        ],
    },
    {
        version: '0.1.9',
        date: 'January 2026',
        changes: [
            { type: 'added' as const, text: 'Local CLI development script (pnpm cli)' },
            {
                type: 'added' as const,
                text: 'Full CLI commands in published package (connect, scan, query, export, schema)',
            },
            { type: 'changed' as const, text: 'Published package now uses CLI as entry point' },
        ],
    },
    {
        version: '0.1.8',
        date: 'January 2026',
        changes: [
            { type: 'added' as const, text: 'Accent color selector in Settings with dynamic logo' },
            { type: 'added' as const, text: 'Dynamic app version display in Settings' },
            {
                type: 'added' as const,
                text: 'Shared Add/Edit Column dialog with PK and FK options',
            },
            { type: 'added' as const, text: 'Icons on Settings page tabs' },
            {
                type: 'changed' as const,
                text: 'Standardized tooltips and dialog padding across the app',
            },
            { type: 'fixed' as const, text: 'Tag chips rendering with rounded corners' },
        ],
    },
    {
        version: '0.1.7',
        date: 'January 2026',
        changes: [
            { type: 'added' as const, text: 'Interactive onboarding tour for new users' },
            { type: 'added' as const, text: 'Drag and drop connections into projects and groups' },
            { type: 'added' as const, text: 'Auto-select first connection and table' },
            {
                type: 'changed' as const,
                text: 'Disabled navigation items when no connections exist',
            },
            { type: 'fixed' as const, text: 'Drag state persisting after drop' },
        ],
    },
    {
        version: '0.1.6',
        date: 'January 2026',
        changes: [
            {
                type: 'added' as const,
                text: 'Foreign key navigation - click FK values to jump to referenced rows',
            },
            { type: 'added' as const, text: 'Page not found handling with redirect to dashboard' },
            { type: 'fixed' as const, text: 'Connection switching on query page' },
            { type: 'fixed' as const, text: 'Schema diagram infinite loop when no connections' },
        ],
    },
    {
        version: '0.1.5',
        date: 'January 2026',
        changes: [
            { type: 'added' as const, text: 'Automated release tooling with version bump scripts' },
            { type: 'added' as const, text: 'GitHub Actions workflow for npm publishing' },
            { type: 'added' as const, text: 'Clickable foreign key values in query results' },
            { type: 'fixed' as const, text: 'Infinite loop in schema diagram' },
        ],
    },
    {
        version: '0.1.4',
        date: 'January 2026',
        changes: [
            {
                type: 'added' as const,
                text: 'Auto-discovery of databases (port scanning, Docker, .env files)',
            },
            { type: 'added' as const, text: 'SQLite file scanning' },
            { type: 'added' as const, text: 'Edit column functionality in Schema Diagram' },
            { type: 'changed' as const, text: 'Improved scanner to prioritize Docker sources' },
            { type: 'fixed' as const, text: 'Dangerous operation confirmation for DROP TABLE' },
        ],
    },
    {
        version: '0.1.0',
        date: 'January 2026',
        changes: [
            { type: 'added' as const, text: 'Initial release' },
            {
                type: 'added' as const,
                text: 'Query editor with syntax highlighting and auto-completion',
            },
            {
                type: 'added' as const,
                text: 'Multi-database support (PostgreSQL, MySQL, MariaDB, SQLite)',
            },
            {
                type: 'added' as const,
                text: 'Connection management with secure credential storage',
            },
            { type: 'added' as const, text: 'Interactive schema diagram with React Flow' },
            { type: 'added' as const, text: 'Schema comparison and sync functionality' },
            { type: 'added' as const, text: 'Projects and groups for organizing connections' },
        ],
    },
];

export function ChangelogPage() {
    return (
        <DocsLayout>
            <Title>Changelog</Title>
            <Subtitle>See what's new in each version of DB Nexus.</Subtitle>

            {changelog.map((release, index) => (
                <Version
                    key={release.version}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <VersionHeader>
                        <VersionNumber>v{release.version}</VersionNumber>
                        <VersionDate>{release.date}</VersionDate>
                        {release.latest && <VersionTag type="latest">Latest</VersionTag>}
                    </VersionHeader>
                    <ChangeList>
                        {release.changes.map((change, i) => (
                            <ChangeItem key={i} type={change.type}>
                                {change.text}
                            </ChangeItem>
                        ))}
                    </ChangeList>
                </Version>
            ))}
        </DocsLayout>
    );
}
