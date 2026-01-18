import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Container = styled.div`
    max-width: 2000px;
    margin: 0 auto;
    padding: 2.5rem 2rem;
`;

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

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
`;

const Card = styled(motion(Link))`
    background: var(--color-bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 2rem;
    transition:
        border-color 0.2s,
        transform 0.2s;

    &:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
    }
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
`;

const CardIcon = styled.div`
    font-size: 3rem;
    line-height: 1;

    .material-symbols-outlined {
        font-size: 3rem;
        line-height: 1;
    }
`;

const CardTitle = styled.h3`
    font-size: 1.25rem;
    font-weight: 600;
`;

const CardDescription = styled.p`
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.6;
`;

const sections = [
    {
        icon: <span className="material-symbols-outlined">rocket_launch</span>,
        title: 'Getting Started',
        description: 'Install DB Nexus and connect your first database in under 5 minutes.',
        link: '/docs/getting-started',
    },
    {
        icon: <span className="material-symbols-outlined">auto_awesome</span>,
        title: 'Features',
        description: 'Explore all the features: query editor, schema diagram, compare & sync.',
        link: '/docs/features',
    },
    {
        icon: <span className="material-symbols-outlined">keyboard</span>,
        title: 'CLI Reference',
        description: 'Command-line options and configuration for power users.',
        link: '/docs/cli',
    },
    {
        icon: <span className="material-symbols-outlined">shortcut</span>,
        title: 'Keyboard Shortcuts',
        description: 'Master DB Nexus with keyboard shortcuts for faster workflows.',
        link: '/docs/shortcuts',
    },
    {
        icon: <span className="material-symbols-outlined">receipt_long</span>,
        title: 'Changelog',
        description: "See what's new in each release of DB Nexus.",
        link: '/changelog',
    },
    {
        icon: <span className="material-symbols-outlined">tune</span>,
        title: 'Configuration',
        description: 'Customize themes, shortcuts, and connection settings.',
        link: '/docs/getting-started#configuration',
    },
];

export function DocsPage() {
    return (
        <Container>
            <Title>Documentation</Title>
            <Subtitle>Learn how to use DB Nexus to manage your databases efficiently.</Subtitle>
            <Grid>
                {sections.map((section, index) => (
                    <Card
                        key={section.title}
                        to={section.link}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <CardHeader>
                            <CardIcon>{section.icon}</CardIcon>
                            <CardTitle>{section.title}</CardTitle>
                        </CardHeader>
                        <CardDescription>{section.description}</CardDescription>
                    </Card>
                ))}
            </Grid>
        </Container>
    );
}
