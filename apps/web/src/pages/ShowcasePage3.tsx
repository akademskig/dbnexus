import { Box, Typography, Grid, Button, Chip, Stack, IconButton } from '@mui/material';
import {
    CloudSync as CloudSyncIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    MoreHoriz as MoreHorizIcon,
    PlayArrow as PlayArrowIcon,
    ContentCopy as ContentCopyIcon,
    Add as AddIcon,
    Circle as CircleIcon,
    Bolt as BoltIcon,
    Hub as HubIcon,
    Speed as SpeedIcon,
} from '@mui/icons-material';
import { GlassCard } from '../components/GlassCard';

// Stat Card - clean with subtle icon color
function StatCard({
    label,
    value,
    change,
    changeType,
    icon,
    color,
}: {
    label: string;
    value: string;
    change: string;
    changeType: 'up' | 'down' | 'neutral';
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <GlassCard>
            <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'rgba(255,255,255,0.5)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontSize: 11,
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 1 }}>
                        <Typography
                            variant="h4"
                            sx={{ fontWeight: 600, color: '#e4e4e7', letterSpacing: '-0.02em' }}
                        >
                            {value}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {changeType === 'up' && (
                                <TrendingUpIcon sx={{ fontSize: 14, color: '#10b981' }} />
                            )}
                            {changeType === 'down' && (
                                <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                            )}
                            <Typography
                                variant="caption"
                                sx={{
                                    color:
                                        changeType === 'up'
                                            ? '#10b981'
                                            : changeType === 'down'
                                              ? '#ef4444'
                                              : 'rgba(255,255,255,0.4)',
                                    fontWeight: 500,
                                }}
                            >
                                {change}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1,
                        bgcolor: `${color}20`,
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

// Connection Row
function ConnectionRow({
    name,
    host,
    status,
    queries,
    isFirst = false,
}: {
    name: string;
    host: string;
    status: 'online' | 'offline' | 'warning';
    queries: number;
    isFirst?: boolean;
}) {
    const statusColors = {
        online: '#10b981',
        offline: 'rgba(255,255,255,0.3)',
        warning: '#f59e0b',
    };

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 100px 100px 40px',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.08)',
                '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.03)',
                },
            }}
        >
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#e4e4e7' }}>
                {name}
            </Typography>
            <Typography
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 13 }}
            >
                {host}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircleIcon sx={{ fontSize: 8, color: statusColors[status] }} />
                <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}
                >
                    {status}
                </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
                {queries.toLocaleString()}
            </Typography>
            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                <MoreHorizIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

// Activity Item
function ActivityItem({
    type,
    message,
    time,
}: {
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    time: string;
}) {
    const iconColors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#0ea5e9',
    };

    const icons = {
        success: <CheckCircleIcon sx={{ fontSize: 16, color: iconColors.success }} />,
        warning: <WarningIcon sx={{ fontSize: 16, color: iconColors.warning }} />,
        error: <ErrorIcon sx={{ fontSize: 16, color: iconColors.error }} />,
        info: <CloudSyncIcon sx={{ fontSize: 16, color: iconColors.info }} />,
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, py: 1.5 }}>
            <Box sx={{ pt: 0.25 }}>{icons[type]}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }} noWrap>
                    {message}
                </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                {time}
            </Typography>
        </Box>
    );
}

// Main Showcase Page 3
export function ShowcasePage3() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
                p: 4,
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 5 }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 600,
                        color: '#e4e4e7',
                        letterSpacing: '-0.02em',
                        mb: 1,
                    }}
                >
                    Design Showcase v3
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Sharp edges + glassmorphism + configurable colors (see Settings)
                </Typography>
            </Box>

            {/* Stats Row */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={6} md={3}>
                    <StatCard
                        label="Total Queries"
                        value="24,521"
                        change="+12.5%"
                        changeType="up"
                        icon={<BoltIcon />}
                        color="#0ea5e9"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        label="Connections"
                        value="8"
                        change="+2"
                        changeType="up"
                        icon={<HubIcon />}
                        color="#8b5cf6"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        label="Avg Response"
                        value="42ms"
                        change="-8ms"
                        changeType="up"
                        icon={<SpeedIcon />}
                        color="#10b981"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        label="Errors"
                        value="3"
                        change="+1"
                        changeType="down"
                        icon={<ErrorIcon />}
                        color="#ef4444"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Connections Table */}
                <Grid item xs={12} lg={8}>
                    <GlassCard noPadding>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 2,
                                py: 1.5,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{ color: '#e4e4e7', fontWeight: 600 }}
                            >
                                Connections
                            </Typography>
                            <Button
                                size="small"
                                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                                sx={{
                                    color: '#0ea5e9',
                                    textTransform: 'none',
                                    fontSize: 13,
                                    borderRadius: 0.5,
                                    '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.1)' },
                                }}
                            >
                                Add new
                            </Button>
                        </Box>
                        {/* Table header */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 100px 100px 40px',
                                px: 2,
                                py: 1,
                                bgcolor: 'rgba(0,0,0,0.2)',
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}
                            >
                                NAME
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}
                            >
                                HOST
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}
                            >
                                STATUS
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'rgba(255,255,255,0.4)',
                                    fontWeight: 500,
                                    textAlign: 'right',
                                }}
                            >
                                QUERIES
                            </Typography>
                            <Box />
                        </Box>
                        <ConnectionRow
                            name="Production"
                            host="prod.db.internal:5432"
                            status="online"
                            queries={12453}
                            isFirst
                        />
                        <ConnectionRow
                            name="Staging"
                            host="staging.db.internal:5432"
                            status="online"
                            queries={3241}
                        />
                        <ConnectionRow
                            name="Analytics"
                            host="analytics.db.internal:5432"
                            status="warning"
                            queries={8721}
                        />
                        <ConnectionRow
                            name="Local Dev"
                            host="localhost:5432"
                            status="offline"
                            queries={156}
                        />
                    </GlassCard>
                </Grid>

                {/* Activity */}
                <Grid item xs={12} lg={4}>
                    <GlassCard>
                        <Typography
                            variant="subtitle2"
                            sx={{ color: '#e4e4e7', fontWeight: 600, mb: 2 }}
                        >
                            Activity
                        </Typography>
                        <Box
                            sx={{
                                '& > *:not(:last-child)': {
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                },
                            }}
                        >
                            <ActivityItem
                                type="success"
                                message="Query executed successfully"
                                time="2m"
                            />
                            <ActivityItem
                                type="info"
                                message="Schema synced to staging"
                                time="15m"
                            />
                            <ActivityItem
                                type="warning"
                                message="Slow query detected (2.4s)"
                                time="1h"
                            />
                            <ActivityItem type="error" message="Connection timeout" time="3h" />
                        </Box>
                    </GlassCard>
                </Grid>

                {/* Query Editor */}
                <Grid item xs={12}>
                    <GlassCard noPadding>
                        {/* Editor toolbar */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 2,
                                py: 1,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{ color: '#e4e4e7', fontWeight: 600 }}
                                >
                                    Query
                                </Typography>
                                <Chip
                                    label="production"
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: 11,
                                        bgcolor: 'rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: 0.5,
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        bgcolor: '#10b981',
                                        color: '#000',
                                        textTransform: 'none',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        borderRadius: 0.5,
                                        px: 2,
                                        '&:hover': { bgcolor: '#059669' },
                                    }}
                                >
                                    Run
                                </Button>
                            </Box>
                        </Box>

                        {/* Code editor - colorful syntax */}
                        <Box
                            sx={{
                                bgcolor: 'rgba(0,0,0,0.3)',
                                p: 2.5,
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                fontSize: 13,
                                lineHeight: 1.7,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                overflow: 'auto',
                            }}
                        >
                            <Box component="pre" sx={{ m: 0 }}>
                                <Box component="span" sx={{ color: '#c586c0' }}>
                                    SELECT
                                </Box>
                                {'\n'}
                                {'  '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    u
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    id
                                </Box>
                                ,{'\n'}
                                {'  '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    u
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    name
                                </Box>
                                ,{'\n'}
                                {'  '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    u
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    email
                                </Box>
                                ,{'\n'}
                                {'  '}
                                <Box component="span" sx={{ color: '#dcdcaa' }}>
                                    COUNT
                                </Box>
                                <Box component="span" sx={{ color: '#ffd700' }}>
                                    (
                                </Box>
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    o
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    id
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
                                {'\n'}
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
                                {'\n'}
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
                                </Box>
                                {'\n'}
                                {'  '}
                                <Box component="span" sx={{ color: '#c586c0' }}>
                                    ON
                                </Box>{' '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    u
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    id
                                </Box>{' '}
                                <Box component="span" sx={{ color: '#d4d4d4' }}>
                                    =
                                </Box>{' '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    o
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    user_id
                                </Box>
                                {'\n'}
                                <Box component="span" sx={{ color: '#c586c0' }}>
                                    GROUP BY
                                </Box>{' '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    u
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    id
                                </Box>
                                ,{' '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    u
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    name
                                </Box>
                                ,{' '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    u
                                </Box>
                                .
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    email
                                </Box>
                                {'\n'}
                                <Box component="span" sx={{ color: '#c586c0' }}>
                                    ORDER BY
                                </Box>{' '}
                                <Box component="span" sx={{ color: '#9cdcfe' }}>
                                    order_count
                                </Box>{' '}
                                <Box component="span" sx={{ color: '#c586c0' }}>
                                    DESC
                                </Box>
                                {'\n'}
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
                                        height: 16,
                                        bgcolor: '#0ea5e9',
                                        ml: 0.5,
                                        verticalAlign: 'middle',
                                        animation: 'blink 1s step-end infinite',
                                        '@keyframes blink': {
                                            '0%, 100%': { opacity: 1 },
                                            '50%': { opacity: 0 },
                                        },
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* Results */}
                        <Box
                            sx={{
                                px: 2,
                                py: 1.5,
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                <Box component="span" sx={{ color: '#10b981' }}>
                                    42ms
                                </Box>{' '}
                                · 100 rows
                            </Typography>
                        </Box>

                        {/* Results table */}
                        <Box sx={{ overflow: 'auto' }}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '80px 180px 240px 120px',
                                    minWidth: 620,
                                    bgcolor: 'rgba(0,0,0,0.2)',
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                {['id', 'name', 'email', 'order_count'].map((col) => (
                                    <Box
                                        key={col}
                                        sx={{
                                            px: 2,
                                            py: 1,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: 'rgba(255,255,255,0.4)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }}
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
                                { id: 2, name: 'Bob Smith', email: 'bob@example.com', orders: 142 },
                                {
                                    id: 3,
                                    name: 'Carol White',
                                    email: 'carol@example.com',
                                    orders: 128,
                                },
                                {
                                    id: 4,
                                    name: 'David Brown',
                                    email: 'david@example.com',
                                    orders: 97,
                                },
                            ].map((row, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '80px 180px 240px 120px',
                                        minWidth: 620,
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            fontSize: 13,
                                            fontFamily: 'monospace',
                                            color: '#b5cea8',
                                        }}
                                    >
                                        {row.id}
                                    </Box>
                                    <Box sx={{ px: 2, py: 1.5, fontSize: 13, color: '#e4e4e7' }}>
                                        {row.name}
                                    </Box>
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            fontSize: 13,
                                            fontFamily: 'monospace',
                                            color: 'rgba(255,255,255,0.5)',
                                        }}
                                    >
                                        {row.email}
                                    </Box>
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1.5,
                                            fontSize: 13,
                                            fontFamily: 'monospace',
                                            color: '#0ea5e9',
                                        }}
                                    >
                                        {row.orders}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </GlassCard>
                </Grid>

                {/* UI Elements */}
                <Grid item xs={12} md={6}>
                    <GlassCard>
                        <Typography
                            variant="subtitle2"
                            sx={{ color: '#e4e4e7', fontWeight: 600, mb: 3 }}
                        >
                            Buttons
                        </Typography>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    sx={{
                                        bgcolor: '#0ea5e9',
                                        color: '#fff',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: '#0284c7' },
                                    }}
                                >
                                    Primary
                                </Button>
                                <Button
                                    variant="contained"
                                    sx={{
                                        bgcolor: '#8b5cf6',
                                        color: '#fff',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: '#7c3aed' },
                                    }}
                                >
                                    Secondary
                                </Button>
                                <Button
                                    variant="contained"
                                    sx={{
                                        bgcolor: '#10b981',
                                        color: '#000',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: '#059669' },
                                    }}
                                >
                                    Success
                                </Button>
                                <Button
                                    variant="contained"
                                    sx={{
                                        bgcolor: '#ef4444',
                                        color: '#fff',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: '#dc2626' },
                                    }}
                                >
                                    Danger
                                </Button>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    sx={{
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        color: 'rgba(255,255,255,0.8)',
                                        textTransform: 'none',
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                                    }}
                                >
                                    Outlined
                                </Button>
                                <Button
                                    sx={{
                                        color: 'rgba(255,255,255,0.6)',
                                        textTransform: 'none',
                                        borderRadius: 0.5,
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.05)',
                                            color: '#fff',
                                        },
                                    }}
                                >
                                    Ghost
                                </Button>
                            </Box>
                        </Stack>
                    </GlassCard>
                </Grid>

                <Grid item xs={12} md={6}>
                    <GlassCard>
                        <Typography
                            variant="subtitle2"
                            sx={{ color: '#e4e4e7', fontWeight: 600, mb: 3 }}
                        >
                            Tags
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                                label="production"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: 0.5,
                                    fontWeight: 500,
                                }}
                            />
                            <Chip
                                label="staging"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(245, 158, 11, 0.2)',
                                    color: '#f59e0b',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    borderRadius: 0.5,
                                    fontWeight: 500,
                                }}
                            />
                            <Chip
                                label="development"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(16, 185, 129, 0.2)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: 0.5,
                                    fontWeight: 500,
                                }}
                            />
                            <Chip
                                label="read-only"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(139, 92, 246, 0.2)',
                                    color: '#8b5cf6',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    borderRadius: 0.5,
                                    fontWeight: 500,
                                }}
                            />
                        </Box>
                    </GlassCard>
                </Grid>
            </Grid>
        </Box>
    );
}
