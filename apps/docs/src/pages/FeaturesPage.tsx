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

const FeatureSection = styled(motion.section)`
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.05);
`;

const FeatureHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
`;

const FeatureIcon = styled.div<{ color: string }>`
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: ${(props) => props.color}20;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
`;

const FeatureTitle = styled.h2`
    font-size: 1.75rem;
    font-weight: 700;
`;

const FeatureDescription = styled.p`
    color: var(--color-text-secondary);
    font-size: 1.05rem;
    line-height: 1.8;
    margin-bottom: 1.5rem;
`;

const FeatureList = styled.ul`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.75rem;
`;

const FeatureImage = styled.img`
    width: 100%;
    margin-top: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
`;

const FeatureItem = styled.li`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    color: var(--color-text-secondary);
    font-size: 0.95rem;

    &::before {
        content: '✓';
        color: var(--color-accent-green);
        font-weight: 600;
    }
`;

const features = [
    {
        icon: '⚡',
        color: '#f59e0b',
        title: 'Query Editor',
        description:
            'A powerful SQL editor with everything you need to write and execute queries efficiently.',
        screenshot: '/screenshots/querypage.png',
        items: [
            'Syntax highlighting for SQL',
            'Auto-completion for tables & columns',
            'Multiple query tabs',
            'Query history with search',
            'Save frequently used queries',
            'Keyboard shortcuts (Ctrl+Enter)',
            'Export results to CSV/JSON',
            'Inline cell editing',
        ],
    },
    {
        icon: '🗺️',
        color: '#6366f1',
        title: 'Schema Diagram',
        description:
            'Visualize your database structure with an interactive, editable diagram.',
        screenshot: '/screenshots/schemadiagrampage.png',
        items: [
            'Drag and drop table positioning',
            'Foreign key relationship lines',
            'Column details on hover',
            'Right-click context menu',
            'Add/edit/delete columns',
            'Create and drop tables',
            'Zoom and pan controls',
            'Auto-layout option',
        ],
    },
    {
        icon: '🔄',
        color: '#22c55e',
        title: 'Compare & Sync',
        description:
            'Compare database schemas across environments and keep them in sync.',
        screenshot: '/screenshots/comparepage-schema.png',
        items: [
            'Side-by-side schema comparison',
            'Highlight added/removed/modified',
            'Generate migration scripts',
            'Compare specific tables',
            'Instance groups for environments',
            'One-click sync preview',
            'Safe dry-run mode',
            'Rollback support',
        ],
    },
    {
        icon: '🔍',
        color: '#22d3ee',
        title: 'Auto-Discovery',
        description:
            'Automatically find and connect to databases without manual configuration.',
        screenshot: '/screenshots/connectionmanagement.png',
        items: [
            'Port scanning (5432, 3306, etc.)',
            'Docker container inspection',
            'Docker Compose parsing',
            'Environment file parsing (.env)',
            'SQLite file discovery',
            'Duplicate detection',
            'Connection type labels',
            'One-click add',
        ],
    },
    {
        icon: '📁',
        color: '#ec4899',
        title: 'Projects & Groups',
        description:
            'Organize your connections into logical projects and instance groups.',
        screenshot: '/screenshots/projectspage.png',
        items: [
            'Create projects for apps',
            'Instance groups (dev/staging/prod)',
            'Drag and drop organization',
            'Color-coded projects',
            'Connection tagging',
            'Quick search and filter',
            'Bulk operations',
            'Export/import configs',
        ],
    },
    {
        icon: '🔗',
        color: '#8b5cf6',
        title: 'Foreign Key Navigation',
        description:
            'Follow relationships in your data with clickable foreign key values.',
        screenshot: '/screenshots/querypage.png',
        items: [
            'Click FK values to navigate',
            'Jump to referenced row',
            'Visual FK indicators',
            'Relationship breadcrumbs',
            'Multi-column FK support',
            'Works with any table',
            'Instant data preview',
            'Back navigation',
        ],
    },
];

export function FeaturesPage() {
    return (
        <DocsLayout>
            <Title>Features</Title>
            <Subtitle>
                Explore all the capabilities that make DB Nexus a complete database management
                solution.
            </Subtitle>

            {features.map((feature, index) => (
                <FeatureSection
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                >
                    <FeatureHeader>
                        <FeatureIcon color={feature.color}>{feature.icon}</FeatureIcon>
                        <FeatureTitle>{feature.title}</FeatureTitle>
                    </FeatureHeader>
                    <FeatureDescription>{feature.description}</FeatureDescription>
                    <FeatureList>
                        {feature.items.map((item) => (
                            <FeatureItem key={item}>{item}</FeatureItem>
                        ))}
                    </FeatureList>
                    {feature.screenshot && (
                        <FeatureImage
                            src={feature.screenshot}
                            alt={`${feature.title} screenshot`}
                        />
                    )}
                </FeatureSection>
            ))}
        </DocsLayout>
    );
}
