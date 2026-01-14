import { Box, Typography, Button, Container, Grid, Paper, useTheme, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    Storage as DatabaseIcon,
    CompareArrows as CompareIcon,
    Sync as SyncIcon,
    Code as CodeIcon,
    Speed as SpeedIcon,
    Security as SecurityIcon,
    GitHub as GitHubIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';

interface FeatureCardProps {
    readonly icon: React.ReactNode;
    readonly title: string;
    readonly description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    const theme = useTheme();
    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                height: '100%',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.1),
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
            }}
        >
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    color: 'primary.main',
                }}
            >
                {icon}
            </Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {description}
            </Typography>
        </Paper>
    );
}

const features = [
    {
        icon: <DatabaseIcon />,
        title: 'Multi-Database Support',
        description:
            'Connect to PostgreSQL, MySQL, MariaDB, and SQLite databases. Manage all your databases from a single interface.',
    },
    {
        icon: <CompareIcon />,
        title: 'Schema Comparison',
        description:
            'Compare schemas between databases and generate migration scripts automatically. Keep environments in sync.',
    },
    {
        icon: <SyncIcon />,
        title: 'Data Synchronization',
        description:
            'Sync data between database instances with conflict resolution. Perfect for dev/staging/prod workflows.',
    },
    {
        icon: <CodeIcon />,
        title: 'Powerful Query Editor',
        description:
            'Write and execute SQL with syntax highlighting, autocomplete, and query history. Export results to CSV or JSON.',
    },
    {
        icon: <SpeedIcon />,
        title: 'Fast & Local',
        description:
            'Runs entirely on your machine. No cloud required, no data leaves your computer. Lightning fast performance.',
    },
    {
        icon: <SecurityIcon />,
        title: 'Secure by Design',
        description:
            'Your credentials stay local. Connections are encrypted. No telemetry, no tracking, no accounts required.',
    },
];

const databases = [
    { name: 'PostgreSQL', color: '#336791' },
    { name: 'MySQL', color: '#4479A1' },
    { name: 'MariaDB', color: '#003545' },
    { name: 'SQLite', color: '#003B57' },
];

export function LandingPage() {
    const theme = useTheme();
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Hero Section */}
            <Box
                sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    pt: { xs: 8, md: 12 },
                    pb: { xs: 10, md: 16 },
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `radial-gradient(ellipse at 50% 0%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                        pointerEvents: 'none',
                    },
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        {/* Logo */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                mb: 4,
                            }}
                        >
                            <Box
                                component="img"
                                src={
                                    theme.palette.mode === 'dark'
                                        ? '/logo-dark.svg'
                                        : '/logo-light.svg'
                                }
                                alt="DB Nexus"
                                sx={{ width: 72, height: 72 }}
                            />
                            <Typography
                                variant="h3"
                                sx={{
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontWeight: 700,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1,
                                        mr: 0.5,
                                    }}
                                >
                                    DB
                                </Box>
                                Nexus
                            </Typography>
                        </Box>

                        {/* Tagline */}
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                maxWidth: 700,
                                mx: 'auto',
                                lineHeight: 1.3,
                            }}
                        >
                            The Modern Database Manager
                            <br />
                            <Box component="span" sx={{ color: 'primary.main' }}>
                                for Developers
                            </Box>
                        </Typography>

                        <Typography
                            variant="h6"
                            color="text.secondary"
                            sx={{
                                mb: 4,
                                maxWidth: 600,
                                mx: 'auto',
                                fontWeight: 400,
                            }}
                        >
                            Connect, query, compare, and sync your databases. All from a beautiful,
                            local-first interface. No cloud required.
                        </Typography>

                        {/* CTA Buttons */}
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 6 }}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<DownloadIcon />}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    borderRadius: 2,
                                }}
                                onClick={() => navigate('/dashboard')}
                            >
                                Get Started
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<GitHubIcon />}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    borderRadius: 2,
                                }}
                                href="https://github.com/dbnexus/db-nexus"
                                target="_blank"
                            >
                                View on GitHub
                            </Button>
                        </Box>

                        {/* Database badges */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1.5,
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            {databases.map((db) => (
                                <Box
                                    key={db.name}
                                    sx={{
                                        px: 2,
                                        py: 0.75,
                                        borderRadius: 1,
                                        bgcolor: alpha(db.color, 0.1),
                                        border: '1px solid',
                                        borderColor: alpha(db.color, 0.2),
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 500, color: db.color }}
                                    >
                                        {db.name}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
                <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography variant="h4" fontWeight={600} gutterBottom>
                        Everything you need to manage databases
                    </Typography>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ maxWidth: 600, mx: 'auto' }}
                    >
                        A complete toolkit for database development, from schema design to data
                        synchronization.
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {features.map((feature) => (
                        <Grid item xs={12} sm={6} md={4} key={feature.title}>
                            <FeatureCard {...feature} />
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Screenshot Section */}
            <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03), py: { xs: 8, md: 12 } }}>
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center', mb: 6 }}>
                        <Typography variant="h4" fontWeight={600} gutterBottom>
                            Beautiful, intuitive interface
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Designed for productivity with dark and light themes.
                        </Typography>
                    </Box>

                    <Paper
                        elevation={0}
                        sx={{
                            p: 1,
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            sx={{
                                height: 400,
                                borderRadius: 2,
                                bgcolor: 'background.default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Typography color="text.secondary">
                                [Screenshot placeholder - Add actual app screenshot here]
                            </Typography>
                        </Box>
                    </Paper>
                </Container>
            </Box>

            {/* CTA Section */}
            <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 4, md: 6 },
                        textAlign: 'center',
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.1)} 100%)`,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                    }}
                >
                    <Typography variant="h4" fontWeight={600} gutterBottom>
                        Ready to get started?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Download DB Nexus for free and take control of your databases.
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<DownloadIcon />}
                        sx={{
                            px: 4,
                            py: 1.5,
                            fontSize: 16,
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: 2,
                        }}
                        onClick={() => navigate('/dashboard')}
                    >
                        Launch DB Nexus
                    </Button>
                </Paper>
            </Container>

            {/* Footer */}
            <Box
                sx={{
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    py: 4,
                }}
            >
                <Container maxWidth="lg">
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            © 2026 DB Nexus. Open source under MIT license.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3 }}>
                            <Typography
                                variant="body2"
                                component="a"
                                href="https://github.com/dbnexus/db-nexus"
                                target="_blank"
                                sx={{
                                    color: 'text.secondary',
                                    textDecoration: 'none',
                                    '&:hover': { color: 'primary.main' },
                                }}
                            >
                                GitHub
                            </Typography>
                            <Typography
                                variant="body2"
                                component="a"
                                href="#"
                                sx={{
                                    color: 'text.secondary',
                                    textDecoration: 'none',
                                    '&:hover': { color: 'primary.main' },
                                }}
                            >
                                Documentation
                            </Typography>
                            <Typography
                                variant="body2"
                                component="a"
                                href="#"
                                sx={{
                                    color: 'text.secondary',
                                    textDecoration: 'none',
                                    '&:hover': { color: 'primary.main' },
                                }}
                            >
                                Releases
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}
