import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Hero = styled.section`
    min-height: calc(100vh - 72px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4rem 2rem;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(
            ellipse at center,
            rgba(99, 102, 241, 0.15) 0%,
            transparent 50%
        );
        animation: rotate 30s linear infinite;
    }

    @keyframes rotate {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
`;

const HeroContent = styled.div`
    position: relative;
    z-index: 1;
    max-width: 900px;
`;

const Badge = styled(motion.div)`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 50px;
    font-size: 0.875rem;
    color: var(--color-primary-light);
    margin-bottom: 2rem;

    .logo-text {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--color-primary-light);
        font-family: var(--jetbrains-mono);
    }
`;

const Title = styled(motion.h1)`
    font-size: clamp(2.5rem, 8vw, 4.5rem);
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const Highlight = styled.span`
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const Subtitle = styled(motion.p)`
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    max-width: 600px;
    margin: 0 auto 2.5rem;
    line-height: 1.7;
`;

const ButtonGroup = styled(motion.div)`
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
`;

const PrimaryButton = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    background: var(--color-primary-light);
    color: white;
    font-weight: 600;
    transition:
        transform 0.2s,
        box-shadow 0.2s;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(99, 102, 241, 0.4);
    }
`;

const SecondaryButton = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    background: var(--color-bg-tertiary);
    color: var(--color-text);
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition:
        background 0.2s,
        border-color 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
    }
`;

const InstallCommand = styled(motion.div)`
    margin-top: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: var(--color-bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: var(--font-mono);
    font-size: 0.95rem;

    span:first-of-type {
        color: var(--color-text-secondary);
    }
`;

const ScreenshotsSection = styled.section`
    padding: 5rem 2rem;
`;

const ScreenshotsGrid = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 2rem;
`;

const ScreenshotCard = styled(motion.div)`
    background: var(--color-bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.06);
    overflow: hidden;
`;

const ScreenshotImage = styled.img`
    width: 100%;
    height: auto;
    display: block;
`;

const ScreenshotCaption = styled.div`
    padding: 1rem 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.95rem;
`;

const FeaturesSection = styled.section`
    padding: 6rem 2rem;
    background: var(--color-bg-secondary);
`;

const SectionTitle = styled.h2`
    font-size: 2.5rem;
    font-weight: 700;
    text-align: center;
    margin-bottom: 1rem;
`;

const SectionSubtitle = styled.p`
    color: var(--color-text-secondary);
    text-align: center;
    max-width: 600px;
    margin: 0 auto 4rem;
    font-size: 1.1rem;
`;

const FeaturesGrid = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
`;

const FeatureHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
`;

const FeatureCard = styled(motion.div)`
    background: var(--color-bg);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 2rem;
    transition:
        border-color 0.2s,
        transform 0.2s;

    &:hover {
        border-color: rgba(99, 102, 241, 0.3);
        transform: translateY(-4px);
    }
`;

const FeatureIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    color: var(--color-text);
`;

const FeatureTitle = styled.h3`
    font-size: 1.25rem;
    font-weight: 600;
`;

const FeatureDescription = styled.p`
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.6;
`;

const DatabasesSection = styled.section`
    padding: 6rem 2rem;
`;

const DatabasesGrid = styled.div`
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    gap: 3rem;
    flex-wrap: wrap;
`;

const DatabaseLogo = styled(motion.div)`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    opacity: 0.7;
    transition: opacity 0.2s;

    &:hover {
        opacity: 1;
    }

    span {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
    }
`;

const DbIcon = styled.div<{ bg: string }>`
    width: 80px;
    height: 80px;
    border-radius: 16px;
    background: ${(props) => props.bg};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 700;
    color: white;
`;

const CTASection = styled.section`
    padding: 6rem 2rem;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%);
    text-align: center;
`;

const features = [
    {
        icon: <span className="material-symbols-outlined">terminal</span>,
        color: '#f59e0b',
        title: 'Query Editor',
        description:
            'Write and execute SQL with syntax highlighting, auto-completion, and instant results. Support for multiple tabs and query history.',
    },
    {
        icon: <span className="material-symbols-outlined">schema</span>,
        color: '#6366f1',
        title: 'Schema Diagram',
        description:
            'Visualize your database structure with an interactive diagram. Drag tables, see relationships, and modify schema directly.',
    },
    {
        icon: <span className="material-symbols-outlined">compare_arrows</span>,
        color: '#22c55e',
        title: 'Compare & Sync',
        description:
            'Compare schemas across environments and generate migration scripts. Keep dev, staging, and production in sync.',
    },
    {
        icon: <span className="material-symbols-outlined">travel_explore</span>,
        color: '#22d3ee',
        title: 'Auto-Discovery',
        description:
            'Automatically find databases via port scanning, Docker inspection, and environment files. No manual configuration needed.',
    },
    {
        icon: <span className="material-symbols-outlined">folder_open</span>,
        color: '#ec4899',
        title: 'Projects & Groups',
        description:
            'Organize connections by project and instance groups. Drag and drop to reorganize. Perfect for multi-environment setups.',
    },
    {
        icon: <span className="material-symbols-outlined">link</span>,
        color: '#8b5cf6',
        title: 'FK Navigation',
        description:
            'Click on foreign key values to instantly navigate to referenced rows. Follow relationships across your data model.',
    },
];

const databases = [
    { name: 'PostgreSQL', icon: 'P', bg: '#336791' },
    { name: 'MySQL', icon: 'M', bg: '#00758f' },
    { name: 'MariaDB', icon: 'Ma', bg: '#c0765a' },
    { name: 'SQLite', icon: 'S', bg: '#003b57' },
];

export function LandingPage() {
    return (
        <>
            <Hero>
                <HeroContent>
                    <Badge
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <img src="/logo-light.svg" alt="DB Nexus logo" width={58} height={58} />
                        <span className="logo-text">DB Nexus</span>
                    </Badge>
                    <Title
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        The Modern Way to
                        <br />
                        <Highlight>Manage Databases</Highlight>
                    </Title>
                    <Subtitle
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        Query, visualize, compare, and sync your databases with a powerful CLI tool
                        and beautiful web UI. Open source and runs locally.
                    </Subtitle>
                    <ButtonGroup
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <PrimaryButton to="/docs/getting-started">Get Started →</PrimaryButton>
                        <SecondaryButton
                            href="https://github.com/akademskig/dbnexus"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            View on GitHub
                        </SecondaryButton>
                    </ButtonGroup>
                    <InstallCommand
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <span>$</span>
                        <code>npx dbnexus</code>
                    </InstallCommand>
                </HeroContent>
            </Hero>

            <ScreenshotsSection>
                <SectionTitle>See it in action</SectionTitle>
                <SectionSubtitle>
                    A quick look at the query editor, schema tools, compare view, and projects
                    dashboard.
                </SectionSubtitle>
                <ScreenshotsGrid>
                    {[
                        { src: '/screenshots/querypage.png', label: 'Query Editor' },
                        { src: '/screenshots/schemadiagrampage.png', label: 'Schema Diagram' },
                        { src: '/screenshots/comparepage-schema.png', label: 'Compare & Sync' },
                        { src: '/screenshots/projectspage.png', label: 'Projects & Groups' },
                    ].map((shot, index) => (
                        <ScreenshotCard
                            key={shot.label}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <ScreenshotImage src={shot.src} alt={`${shot.label} screenshot`} />
                            <ScreenshotCaption>{shot.label}</ScreenshotCaption>
                        </ScreenshotCard>
                    ))}
                </ScreenshotsGrid>
            </ScreenshotsSection>

            <FeaturesSection>
                <SectionTitle>Everything you need</SectionTitle>
                <SectionSubtitle>
                    A complete toolkit for database development, from quick queries to complex
                    schema migrations.
                </SectionSubtitle>
                <FeaturesGrid>
                    {features.map((feature, index) => (
                        <FeatureCard
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <FeatureHeader>
                                <FeatureIcon>{feature.icon}</FeatureIcon>
                                <FeatureTitle>{feature.title}</FeatureTitle>
                            </FeatureHeader>
                            <FeatureDescription>{feature.description}</FeatureDescription>
                        </FeatureCard>
                    ))}
                </FeaturesGrid>
            </FeaturesSection>

            <DatabasesSection>
                <SectionTitle>Works with your stack</SectionTitle>
                <SectionSubtitle>
                    Connect to PostgreSQL, MySQL, MariaDB, and SQLite databases. More coming soon.
                </SectionSubtitle>
                <DatabasesGrid>
                    {databases.map((db, index) => (
                        <DatabaseLogo
                            key={db.name}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 0.7, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <DbIcon bg={db.bg}>{db.icon}</DbIcon>
                            <span>{db.name}</span>
                        </DatabaseLogo>
                    ))}
                </DatabasesGrid>
            </DatabasesSection>

            <CTASection>
                <SectionTitle>Ready to get started?</SectionTitle>
                <SectionSubtitle>
                    Install DB Nexus in seconds and start managing your databases like a pro.
                </SectionSubtitle>
                <ButtonGroup
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <PrimaryButton to="/docs/getting-started">Read the Docs →</PrimaryButton>
                </ButtonGroup>
            </CTASection>
        </>
    );
}
