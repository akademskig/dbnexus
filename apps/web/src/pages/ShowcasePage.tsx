import { Box, Typography, Grid, Button, Chip, Avatar, Divider, Stack } from '@mui/material';
import {
    Storage as StorageIcon,
    Speed as SpeedIcon,
    Security as SecurityIcon,
    CloudSync as CloudSyncIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Bolt as BoltIcon,
    Hub as HubIcon,
} from '@mui/icons-material';

// Glassmorphism Card Component
function GlassCard({
    children,
    gradient = false,
}: {
    children: React.ReactNode;
    gradient?: boolean;
}) {
    return (
        <Box
            sx={{
                background: gradient
                    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                p: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                },
            }}
        >
            {children}
        </Box>
    );
}

// Stat Card with animated gradient
function StatCard({
    title,
    value,
    change,
    changeType,
    icon,
    color,
}: {
    title: string;
    value: string;
    change: string;
    changeType: 'up' | 'down';
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <GlassCard>
            <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
                <Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        {value}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {changeType === 'up' ? (
                            <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />
                        ) : (
                            <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                        )}
                        <Typography
                            variant="caption"
                            sx={{ color: changeType === 'up' ? '#10b981' : '#ef4444' }}
                        >
                            {change}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            vs last week
                        </Typography>
                    </Box>
                </Box>
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${color}40 0%, ${color}20 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color,
                    }}
                >
                    {icon}
                </Box>
            </Box>
        </GlassCard>
    );
}

// Connection Card with neon glow effect
function NeonConnectionCard({
    name,
    status,
    database,
    queries,
    color,
}: {
    name: string;
    status: 'connected' | 'disconnected' | 'warning';
    database: string;
    queries: number;
    color: string;
}) {
    const statusColors = {
        connected: '#10b981',
        disconnected: '#6b7280',
        warning: '#f59e0b',
    };

    return (
        <Box
            sx={{
                position: 'relative',
                borderRadius: 3,
                p: 3,
                background: 'linear-gradient(145deg, #1a1a2e 0%, #16162a 100%)',
                border: `1px solid ${color}30`,
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                    boxShadow: `0 0 30px ${color}30, inset 0 0 30px ${color}10`,
                    border: `1px solid ${color}60`,
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                    sx={{
                        bgcolor: `${color}20`,
                        color: color,
                        width: 48,
                        height: 48,
                    }}
                >
                    <StorageIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {database}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: statusColors[status],
                        boxShadow: `0 0 10px ${statusColors[status]}`,
                    }}
                />
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    Queries today
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color }}>
                    {queries.toLocaleString()}
                </Typography>
            </Box>
        </Box>
    );
}

// Activity Timeline Item
function ActivityItem({
    icon,
    title,
    description,
    time,
    color,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    time: string;
    color: string;
}) {
    return (
        <Box sx={{ display: 'flex', gap: 2, py: 2 }}>
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: `${color}20`,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }} noWrap>
                    {description}
                </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                {time}
            </Typography>
        </Box>
    );
}

// Main Showcase Page
export function ShowcasePage() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
                p: 4,
            }}
        >
            {/* Header with gradient text */}
            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 800,
                        background:
                            'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 50%, #ec4899 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 2,
                    }}
                >
                    Design Showcase
                </Typography>
                <Typography
                    variant="body1"
                    sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 600, mx: 'auto' }}
                >
                    A collection of modern UI components and design patterns for DB Nexus
                </Typography>
            </Box>

            {/* Stats Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Queries"
                        value="24,521"
                        change="+12.5%"
                        changeType="up"
                        icon={<BoltIcon />}
                        color="#0ea5e9"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Active Connections"
                        value="8"
                        change="+2"
                        changeType="up"
                        icon={<HubIcon />}
                        color="#8b5cf6"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Avg Response"
                        value="42ms"
                        change="-8.3%"
                        changeType="up"
                        icon={<SpeedIcon />}
                        color="#10b981"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Data Synced"
                        value="1.2TB"
                        change="+24.1%"
                        changeType="up"
                        icon={<CloudSyncIcon />}
                        color="#f59e0b"
                    />
                </Grid>
            </Grid>

            {/* Main Content Grid */}
            <Grid container spacing={3}>
                {/* Connections Panel */}
                <Grid item xs={12} md={8}>
                    <GlassCard gradient>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 3,
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Database Connections
                            </Typography>
                            <Button
                                variant="contained"
                                size="small"
                                sx={{
                                    background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
                                    '&:hover': {
                                        background:
                                            'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
                                    },
                                }}
                            >
                                + Add New
                            </Button>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <NeonConnectionCard
                                    name="Production DB"
                                    status="connected"
                                    database="postgres@prod-cluster"
                                    queries={12453}
                                    color="#0ea5e9"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <NeonConnectionCard
                                    name="Staging DB"
                                    status="connected"
                                    database="postgres@staging"
                                    queries={3241}
                                    color="#8b5cf6"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <NeonConnectionCard
                                    name="Analytics"
                                    status="warning"
                                    database="postgres@analytics"
                                    queries={8721}
                                    color="#f59e0b"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <NeonConnectionCard
                                    name="Local Dev"
                                    status="disconnected"
                                    database="localhost:5432"
                                    queries={156}
                                    color="#10b981"
                                />
                            </Grid>
                        </Grid>
                    </GlassCard>
                </Grid>

                {/* Activity Panel */}
                <Grid item xs={12} md={4}>
                    <GlassCard>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            Recent Activity
                        </Typography>
                        <Box
                            sx={{
                                '& > *:not(:last-child)': {
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                },
                            }}
                        >
                            <ActivityItem
                                icon={<CheckCircleIcon fontSize="small" />}
                                title="Query executed"
                                description="SELECT * FROM users LIMIT 100"
                                time="2m ago"
                                color="#10b981"
                            />
                            <ActivityItem
                                icon={<CloudSyncIcon fontSize="small" />}
                                title="Schema synced"
                                description="Production → Staging"
                                time="15m ago"
                                color="#0ea5e9"
                            />
                            <ActivityItem
                                icon={<WarningIcon fontSize="small" />}
                                title="Slow query detected"
                                description="Query took 2.4s to execute"
                                time="1h ago"
                                color="#f59e0b"
                            />
                            <ActivityItem
                                icon={<SecurityIcon fontSize="small" />}
                                title="Connection secured"
                                description="SSL enabled for prod-cluster"
                                time="3h ago"
                                color="#8b5cf6"
                            />
                            <ActivityItem
                                icon={<ErrorIcon fontSize="small" />}
                                title="Connection failed"
                                description="Unable to reach analytics DB"
                                time="5h ago"
                                color="#ef4444"
                            />
                        </Box>
                    </GlassCard>
                </Grid>

                {/* Query Editor Preview */}
                <Grid item xs={12}>
                    <GlassCard>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 3,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Query Editor
                                </Typography>
                                <Chip
                                    label="Production DB"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(14, 165, 233, 0.2)',
                                        color: '#0ea5e9',
                                        border: '1px solid rgba(14, 165, 233, 0.3)',
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    sx={{ borderColor: 'rgba(255,255,255,0.2)' }}
                                >
                                    Format
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    sx={{
                                        background:
                                            'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        '&:hover': {
                                            background:
                                                'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                        },
                                    }}
                                >
                                    ▶ Run Query
                                </Button>
                            </Box>
                        </Box>

                        {/* Fake code editor */}
                        <Box
                            sx={{
                                bgcolor: '#0d0d12',
                                borderRadius: 2,
                                p: 3,
                                fontFamily: 'monospace',
                                fontSize: 14,
                                lineHeight: 1.8,
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                SELECT
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                u.id
                            </Box>
                            ,{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                u.name
                            </Box>
                            ,{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                u.email
                            </Box>
                            ,{' '}
                            <Box component="span" sx={{ color: '#dcdcaa' }}>
                                COUNT
                            </Box>
                            <Box component="span" sx={{ color: '#ffd700' }}>
                                (
                            </Box>
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                o.id
                            </Box>
                            <Box component="span" sx={{ color: '#ffd700' }}>
                                )
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                AS
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                order_count
                            </Box>
                            <br />
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                FROM
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#4ec9b0' }}>
                                dsops
                            </Box>
                            .
                            <Box component="span" sx={{ color: '#4ec9b0' }}>
                                user
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                u
                            </Box>
                            <br />
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                LEFT JOIN
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#4ec9b0' }}>
                                dsops
                            </Box>
                            .
                            <Box component="span" sx={{ color: '#4ec9b0' }}>
                                orders
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                o
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                ON
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                u.id
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#d4d4d4' }}>
                                =
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                o.user_id
                            </Box>
                            <br />
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                GROUP BY
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                u.id
                            </Box>
                            ,{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                u.name
                            </Box>
                            ,{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                u.email
                            </Box>
                            <br />
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                ORDER BY
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#9cdcfe' }}>
                                order_count
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                DESC
                            </Box>
                            <br />
                            <Box component="span" sx={{ color: '#c586c0' }}>
                                LIMIT
                            </Box>{' '}
                            <Box component="span" sx={{ color: '#b5cea8' }}>
                                100
                            </Box>
                            ;
                            <Box
                                component="span"
                                sx={{
                                    display: 'inline-block',
                                    width: 2,
                                    height: 18,
                                    bgcolor: '#0ea5e9',
                                    ml: 0.5,
                                    animation: 'blink 1s infinite',
                                    '@keyframes blink': {
                                        '0%, 50%': { opacity: 1 },
                                        '51%, 100%': { opacity: 0 },
                                    },
                                }}
                            />
                        </Box>

                        {/* Results preview */}
                        <Box sx={{ mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                                <Typography variant="body2" sx={{ color: '#10b981' }}>
                                    Query completed in 42ms
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                    • 100 rows returned
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    bgcolor: '#0d0d12',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    overflow: 'hidden',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '80px 1fr 1fr 120px',
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    {['id', 'name', 'email', 'order_count'].map((col) => (
                                        <Box
                                            key={col}
                                            sx={{ px: 2, py: 1.5, fontWeight: 600, fontSize: 13 }}
                                        >
                                            {col}
                                        </Box>
                                    ))}
                                </Box>
                                {[
                                    {
                                        id: 1,
                                        name: 'Alice Johnson',
                                        email: 'alice@example.com',
                                        orders: 156,
                                    },
                                    {
                                        id: 2,
                                        name: 'Bob Smith',
                                        email: 'bob@example.com',
                                        orders: 142,
                                    },
                                    {
                                        id: 3,
                                        name: 'Carol White',
                                        email: 'carol@example.com',
                                        orders: 128,
                                    },
                                ].map((row, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '80px 1fr 1fr 120px',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                        }}
                                    >
                                        <Box
                                            sx={{ px: 2, py: 1.5, fontSize: 13, color: '#b5cea8' }}
                                        >
                                            {row.id}
                                        </Box>
                                        <Box sx={{ px: 2, py: 1.5, fontSize: 13 }}>{row.name}</Box>
                                        <Box
                                            sx={{
                                                px: 2,
                                                py: 1.5,
                                                fontSize: 13,
                                                color: 'rgba(255,255,255,0.6)',
                                            }}
                                        >
                                            {row.email}
                                        </Box>
                                        <Box
                                            sx={{ px: 2, py: 1.5, fontSize: 13, color: '#0ea5e9' }}
                                        >
                                            {row.orders}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </GlassCard>
                </Grid>

                {/* Color Palette */}
                <Grid item xs={12} md={6}>
                    <GlassCard>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                            Color Palette
                        </Typography>
                        <Grid container spacing={2}>
                            {[
                                { name: 'Primary', color: '#0ea5e9', label: 'Sky Blue' },
                                { name: 'Secondary', color: '#8b5cf6', label: 'Violet' },
                                { name: 'Success', color: '#10b981', label: 'Emerald' },
                                { name: 'Warning', color: '#f59e0b', label: 'Amber' },
                                { name: 'Error', color: '#ef4444', label: 'Red' },
                                { name: 'Accent', color: '#ec4899', label: 'Pink' },
                            ].map((item) => (
                                <Grid item xs={4} key={item.name}>
                                    <Box
                                        sx={{
                                            height: 80,
                                            borderRadius: 2,
                                            bgcolor: item.color,
                                            mb: 1,
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            p: 1,
                                            boxShadow: `0 4px 20px ${item.color}40`,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{ color: 'white', fontWeight: 500 }}
                                        >
                                            {item.color}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {item.name}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                                    >
                                        {item.label}
                                    </Typography>
                                </Grid>
                            ))}
                        </Grid>
                    </GlassCard>
                </Grid>

                {/* Buttons & Components */}
                <Grid item xs={12} md={6}>
                    <GlassCard>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                            Button Styles
                        </Typography>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    sx={{
                                        background:
                                            'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                        boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)',
                                    }}
                                >
                                    Primary Action
                                </Button>
                                <Button
                                    variant="contained"
                                    sx={{
                                        background:
                                            'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                                    }}
                                >
                                    Secondary
                                </Button>
                                <Button
                                    variant="contained"
                                    sx={{
                                        background:
                                            'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                                    }}
                                >
                                    Success
                                </Button>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    sx={{
                                        borderColor: '#0ea5e9',
                                        color: '#0ea5e9',
                                        '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.1)' },
                                    }}
                                >
                                    Outlined
                                </Button>
                                <Button
                                    variant="outlined"
                                    sx={{
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        color: 'rgba(255,255,255,0.8)',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                                    }}
                                >
                                    Ghost
                                </Button>
                                <Button
                                    sx={{
                                        color: '#0ea5e9',
                                        '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.1)' },
                                    }}
                                >
                                    Text Only
                                </Button>
                            </Box>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                Chips & Tags
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    label="Production"
                                    sx={{
                                        bgcolor: 'rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                    }}
                                />
                                <Chip
                                    label="Staging"
                                    sx={{
                                        bgcolor: 'rgba(245, 158, 11, 0.2)',
                                        color: '#f59e0b',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                    }}
                                />
                                <Chip
                                    label="Development"
                                    sx={{
                                        bgcolor: 'rgba(16, 185, 129, 0.2)',
                                        color: '#10b981',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                    }}
                                />
                                <Chip
                                    label="Read-only"
                                    sx={{
                                        bgcolor: 'rgba(139, 92, 246, 0.2)',
                                        color: '#8b5cf6',
                                        border: '1px solid rgba(139, 92, 246, 0.3)',
                                    }}
                                />
                            </Box>
                        </Stack>
                    </GlassCard>
                </Grid>
            </Grid>
        </Box>
    );
}
