import { Box, Typography, Grid, Button, Chip, Divider, Stack, IconButton } from '@mui/material';
import {
    Storage as StorageIcon,
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
} from '@mui/icons-material';

// Minimal Card Component - sharp corners, subtle borders
function MinimalCard({
    children,
    noPadding = false,
}: {
    children: React.ReactNode;
    noPadding?: boolean;
}) {
    return (
        <Box
            sx={{
                background: '#141418',
                border: '1px solid #232329',
                borderRadius: 1,
                p: noPadding ? 0 : 2.5,
                transition: 'border-color 0.15s ease',
                '&:hover': {
                    borderColor: '#333338',
                },
            }}
        >
            {children}
        </Box>
    );
}

// Stat Card - clean, monochromatic
function StatCard({
    label,
    value,
    change,
    changeType,
}: {
    label: string;
    value: string;
    change: string;
    changeType: 'up' | 'down' | 'neutral';
}) {
    return (
        <MinimalCard>
            <Typography
                variant="caption"
                sx={{
                    color: '#6b6b76',
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
                        <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} />
                    )}
                    {changeType === 'down' && (
                        <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                    )}
                    <Typography
                        variant="caption"
                        sx={{
                            color:
                                changeType === 'up'
                                    ? '#22c55e'
                                    : changeType === 'down'
                                      ? '#ef4444'
                                      : '#6b6b76',
                            fontWeight: 500,
                        }}
                    >
                        {change}
                    </Typography>
                </Box>
            </Box>
        </MinimalCard>
    );
}

// Connection Row - table-like layout
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
        online: '#22c55e',
        offline: '#52525b',
        warning: '#eab308',
    };

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 100px 100px 40px',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                borderTop: isFirst ? 'none' : '1px solid #232329',
                '&:hover': {
                    bgcolor: '#1a1a1f',
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StorageIcon sx={{ fontSize: 18, color: '#52525b' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#e4e4e7' }}>
                    {name}
                </Typography>
            </Box>
            <Typography
                variant="body2"
                sx={{ color: '#6b6b76', fontFamily: 'monospace', fontSize: 13 }}
            >
                {host}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircleIcon sx={{ fontSize: 8, color: statusColors[status] }} />
                <Typography
                    variant="caption"
                    sx={{ color: '#6b6b76', textTransform: 'capitalize' }}
                >
                    {status}
                </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#6b6b76', textAlign: 'right' }}>
                {queries.toLocaleString()}
            </Typography>
            <IconButton size="small" sx={{ color: '#52525b' }}>
                <MoreHorizIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

// Activity Item - minimal timeline
function ActivityItem({
    type,
    message,
    time,
}: {
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    time: string;
}) {
    const icons = {
        success: <CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} />,
        warning: <WarningIcon sx={{ fontSize: 16, color: '#eab308' }} />,
        error: <ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} />,
        info: <CloudSyncIcon sx={{ fontSize: 16, color: '#6b6b76' }} />,
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, py: 1.5 }}>
            <Box sx={{ pt: 0.25 }}>{icons[type]}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: '#a1a1aa' }} noWrap>
                    {message}
                </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#52525b', flexShrink: 0 }}>
                {time}
            </Typography>
        </Box>
    );
}

// Main Showcase Page 2
export function ShowcasePage2() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0c0c0f',
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
                    Design Showcase v2
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b6b76' }}>
                    Minimal, monochromatic design with sharp edges
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
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard label="Connections" value="8" change="+2" changeType="up" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard label="Avg Response" value="42ms" change="-8ms" changeType="up" />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard label="Errors" value="3" change="+1" changeType="down" />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Connections Table */}
                <Grid item xs={12} lg={8}>
                    <MinimalCard noPadding>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 2,
                                py: 1.5,
                                borderBottom: '1px solid #232329',
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
                                    color: '#a1a1aa',
                                    textTransform: 'none',
                                    fontSize: 13,
                                    '&:hover': { bgcolor: '#1a1a1f' },
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
                                bgcolor: '#111114',
                                borderBottom: '1px solid #232329',
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color: '#52525b', fontWeight: 500 }}
                            >
                                NAME
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: '#52525b', fontWeight: 500 }}
                            >
                                HOST
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: '#52525b', fontWeight: 500 }}
                            >
                                STATUS
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: '#52525b', fontWeight: 500, textAlign: 'right' }}
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
                    </MinimalCard>
                </Grid>

                {/* Activity */}
                <Grid item xs={12} lg={4}>
                    <MinimalCard>
                        <Typography
                            variant="subtitle2"
                            sx={{ color: '#e4e4e7', fontWeight: 600, mb: 2 }}
                        >
                            Activity
                        </Typography>
                        <Box
                            sx={{ '& > *:not(:last-child)': { borderBottom: '1px solid #1f1f24' } }}
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
                    </MinimalCard>
                </Grid>

                {/* Query Editor */}
                <Grid item xs={12}>
                    <MinimalCard noPadding>
                        {/* Editor toolbar */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 2,
                                py: 1,
                                borderBottom: '1px solid #232329',
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
                                        bgcolor: 'transparent',
                                        border: '1px solid #333338',
                                        color: '#6b6b76',
                                        borderRadius: 0.5,
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton size="small" sx={{ color: '#52525b' }}>
                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        bgcolor: '#22c55e',
                                        color: '#000',
                                        textTransform: 'none',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        borderRadius: 0.5,
                                        px: 2,
                                        '&:hover': { bgcolor: '#16a34a' },
                                    }}
                                >
                                    Run
                                </Button>
                            </Box>
                        </Box>

                        {/* Code editor - colorful syntax */}
                        <Box
                            sx={{
                                bgcolor: '#0a0a0c',
                                p: 2.5,
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                fontSize: 13,
                                lineHeight: 1.7,
                                borderBottom: '1px solid #232329',
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
                                        bgcolor: '#e4e4e7',
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
                                borderBottom: '1px solid #232329',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                            <Typography variant="caption" sx={{ color: '#6b6b76' }}>
                                <Box component="span" sx={{ color: '#22c55e' }}>
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
                                    bgcolor: '#111114',
                                    borderBottom: '1px solid #232329',
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
                                            color: '#52525b',
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
                                        borderBottom: '1px solid #1a1a1f',
                                        '&:hover': { bgcolor: '#111114' },
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
                                            color: '#6b6b76',
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
                                            color: '#e4e4e7',
                                        }}
                                    >
                                        {row.orders}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </MinimalCard>
                </Grid>

                {/* UI Elements */}
                <Grid item xs={12} md={6}>
                    <MinimalCard>
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
                                        bgcolor: '#e4e4e7',
                                        color: '#0c0c0f',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: '#d4d4d8' },
                                    }}
                                >
                                    Primary
                                </Button>
                                <Button
                                    variant="contained"
                                    sx={{
                                        bgcolor: '#22c55e',
                                        color: '#000',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: '#16a34a' },
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
                                        borderColor: '#333338',
                                        color: '#a1a1aa',
                                        textTransform: 'none',
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: '#1a1a1f', borderColor: '#52525b' },
                                    }}
                                >
                                    Secondary
                                </Button>
                                <Button
                                    sx={{
                                        color: '#6b6b76',
                                        textTransform: 'none',
                                        borderRadius: 0.5,
                                        '&:hover': { bgcolor: '#1a1a1f', color: '#a1a1aa' },
                                    }}
                                >
                                    Ghost
                                </Button>
                            </Box>
                        </Stack>
                    </MinimalCard>
                </Grid>

                <Grid item xs={12} md={6}>
                    <MinimalCard>
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
                                    bgcolor: 'rgba(239, 68, 68, 0.15)',
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
                                    bgcolor: 'rgba(234, 179, 8, 0.15)',
                                    color: '#eab308',
                                    border: '1px solid rgba(234, 179, 8, 0.3)',
                                    borderRadius: 0.5,
                                    fontWeight: 500,
                                }}
                            />
                            <Chip
                                label="development"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(34, 197, 94, 0.15)',
                                    color: '#22c55e',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: 0.5,
                                    fontWeight: 500,
                                }}
                            />
                            <Chip
                                label="read-only"
                                size="small"
                                sx={{
                                    bgcolor: 'transparent',
                                    color: '#6b6b76',
                                    border: '1px solid #333338',
                                    borderRadius: 0.5,
                                    fontWeight: 500,
                                }}
                            />
                        </Box>
                        <Divider sx={{ borderColor: '#232329', my: 3 }} />
                        <Typography
                            variant="subtitle2"
                            sx={{ color: '#e4e4e7', fontWeight: 600, mb: 2 }}
                        >
                            Colors
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {['#e4e4e7', '#22c55e', '#eab308', '#ef4444', '#6b6b76'].map(
                                (color) => (
                                    <Box
                                        key={color}
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            bgcolor: color,
                                            borderRadius: 0.5,
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            justifyContent: 'center',
                                            pb: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: 8,
                                                color:
                                                    color === '#e4e4e7' || color === '#eab308'
                                                        ? '#000'
                                                        : '#fff',
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            {color}
                                        </Typography>
                                    </Box>
                                )
                            )}
                        </Box>
                    </MinimalCard>
                </Grid>
            </Grid>
        </Box>
    );
}
