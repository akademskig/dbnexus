import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Button, IconButton, CircularProgress, Chip } from '@mui/material';
import {
    Storage as StorageIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    MoreHoriz as MoreHorizIcon,
    Add as AddIcon,
    Circle as CircleIcon,
    Refresh as RefreshIcon,
    Hub as HubIcon,
    Bolt as BoltIcon,
    Speed as SpeedIcon,
    Warning as WarningIcon,
    Sync as SyncIcon,
    Layers as LayersIcon,
} from '@mui/icons-material';
import { connectionsApi, queriesApi, syncApi } from '../lib/api';
import { GlassCard } from '../components/GlassCard';
import type { ConnectionConfig, QueryHistoryEntry, InstanceGroup } from '@dbnexus/shared';

// Stat Card - clean with subtle icon color
function StatCard({
    label,
    value,
    change,
    changeType,
    loading = false,
    icon,
    color,
}: {
    label: string;
    value: string;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    loading?: boolean;
    icon?: React.ReactNode;
    color?: string;
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
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontSize: 11,
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 1 }}>
                        {loading ? (
                            <CircularProgress size={24} sx={{ color: 'text.disabled' }} />
                        ) : (
                            <>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    {value}
                                </Typography>
                                {change && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {changeType === 'up' && (
                                            <TrendingUpIcon
                                                sx={{ fontSize: 14, color: 'success.main' }}
                                            />
                                        )}
                                        {changeType === 'down' && (
                                            <TrendingDownIcon
                                                sx={{ fontSize: 14, color: 'error.main' }}
                                            />
                                        )}
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    changeType === 'up'
                                                        ? 'success.main'
                                                        : changeType === 'down'
                                                          ? 'error.main'
                                                          : 'text.secondary',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {change}
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
                {icon && color && (
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
                )}
            </Box>
        </GlassCard>
    );
}

// Connection Row
function ConnectionRow({
    connection,
    status,
    isFirst = false,
    onClick,
}: {
    connection: ConnectionConfig;
    status: 'online' | 'offline' | 'checking';
    isFirst?: boolean;
    onClick: () => void;
}) {
    const statusColors = {
        online: '#10b981',
        offline: '#71717a',
        checking: '#f59e0b',
    };

    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 100px 40px',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                borderTop: isFirst ? 'none' : '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': {
                    bgcolor: 'action.hover',
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StorageIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        {connection.name}
                    </Typography>
                    <Chip
                        label={connection.engine.toUpperCase()}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 600,
                            bgcolor:
                                connection.engine === 'postgres'
                                    ? 'rgba(51, 103, 145, 0.25)'
                                    : 'rgba(0, 122, 204, 0.25)',
                            color: connection.engine === 'postgres' ? '#6BA3D6' : '#47A3F3',
                            border: '1px solid',
                            borderColor:
                                connection.engine === 'postgres'
                                    ? 'rgba(51, 103, 145, 0.5)'
                                    : 'rgba(0, 122, 204, 0.5)',
                        }}
                    />
                </Box>
            </Box>
            <Typography
                variant="body2"
                sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 13 }}
            >
                {connection.host}:{connection.port}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {status === 'checking' ? (
                    <CircularProgress size={8} sx={{ color: statusColors.checking }} />
                ) : (
                    <CircleIcon sx={{ fontSize: 8, color: statusColors[status] }} />
                )}
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', textTransform: 'capitalize' }}
                >
                    {status === 'checking' ? 'checking...' : status}
                </Typography>
            </Box>
            <IconButton
                size="small"
                sx={{ color: 'text.disabled' }}
                onClick={(e) => e.stopPropagation()}
            >
                <MoreHorizIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

// Activity Item
function ActivityItem({ entry }: { entry: QueryHistoryEntry }) {
    const isSuccess = entry.success;
    const isError = !entry.success;
    const timeAgo = getTimeAgo(new Date(entry.executedAt));

    return (
        <Box sx={{ display: 'flex', gap: 2, py: 1.5 }}>
            <Box sx={{ pt: 0.25 }}>
                {isSuccess && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                {isError && <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.primary',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {entry.sql.substring(0, 50)}
                    {entry.sql.length > 50 ? '...' : ''}
                </Typography>
                {entry.executionTimeMs > 0 && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {entry.executionTimeMs}ms
                    </Typography>
                )}
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                {timeAgo}
            </Typography>
        </Box>
    );
}

function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

// Sync Status Row
function SyncGroupRow({ group, onClick }: { group: InstanceGroup; onClick: () => void }) {
    const hasSource = !!group.sourceConnectionId;
    const syncEnabled = group.syncSchema || group.syncData;

    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            <LayersIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {group.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {group.projectName}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                {group.syncSchema && (
                    <Chip label="Schema" size="small" sx={{ height: 20, fontSize: 10 }} />
                )}
                {group.syncData && (
                    <Chip label="Data" size="small" sx={{ height: 20, fontSize: 10 }} />
                )}
            </Box>
            {!hasSource ? (
                <Chip
                    label="No source"
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                        color: '#f59e0b',
                    }}
                />
            ) : !syncEnabled ? (
                <Chip
                    label="Disabled"
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: 'rgba(107, 114, 128, 0.1)',
                        color: '#6b7280',
                    }}
                />
            ) : (
                <Chip
                    label="Active"
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                    }}
                />
            )}
        </Box>
    );
}

// Main Dashboard Page
export function DashboardPage() {
    const navigate = useNavigate();
    const [connections, setConnections] = useState<ConnectionConfig[]>([]);
    const [connectionStatuses, setConnectionStatuses] = useState<
        Record<string, 'online' | 'offline' | 'checking'>
    >({});
    const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
    const [syncGroups, setSyncGroups] = useState<InstanceGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const checkConnectionStatus = async (id: string) => {
        setConnectionStatuses((prev) => ({ ...prev, [id]: 'checking' }));
        try {
            const result = await connectionsApi.getStatus(id);
            setConnectionStatuses((prev) => ({
                ...prev,
                [id]: result.connected ? 'online' : 'offline',
            }));
        } catch {
            setConnectionStatuses((prev) => ({ ...prev, [id]: 'offline' }));
        }
    };

    const loadData = async () => {
        try {
            const [conns, hist, groups] = await Promise.all([
                connectionsApi.getAll(),
                queriesApi.getHistory(undefined, 10),
                syncApi.getSyncEnabledGroups().catch(() => []),
            ]);
            setConnections(conns);
            setHistory(hist);
            setSyncGroups(groups);

            // Check status for each connection
            conns.forEach((conn) => {
                checkConnectionStatus(conn.id);
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const totalQueries = history.length;
    const successfulQueries = history.filter((h) => h.success).length;
    const failedQueries = history.filter((h) => !h.success).length;
    const avgDuration =
        history.length > 0
            ? Math.round(history.reduce((acc, h) => acc + h.executionTimeMs, 0) / history.length)
            : 0;

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box
                sx={{
                    mb: 5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            mb: 1,
                        }}
                    >
                        Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Overview of your database connections and activity
                    </Typography>
                </Box>
                <IconButton
                    onClick={handleRefresh}
                    disabled={refreshing}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                    <RefreshIcon
                        sx={{
                            animation: refreshing ? 'spin 1s linear infinite' : 'none',
                            '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                        }}
                    />
                </IconButton>
            </Box>

            {/* Stats Row */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={6} md={3}>
                    <StatCard
                        label="Connections"
                        value={loading ? '-' : String(connections.length)}
                        loading={loading}
                        icon={<HubIcon />}
                        color="#0ea5e9"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        label="Recent Queries"
                        value={loading ? '-' : String(totalQueries)}
                        loading={loading}
                        icon={<BoltIcon />}
                        color="#8b5cf6"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        label="Avg Response"
                        value={loading ? '-' : `${avgDuration}ms`}
                        loading={loading}
                        icon={<SpeedIcon />}
                        color="#10b981"
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatCard
                        label="Errors"
                        value={loading ? '-' : String(failedQueries)}
                        change={failedQueries > 0 ? `+${failedQueries}` : undefined}
                        changeType={failedQueries > 0 ? 'down' : 'neutral'}
                        loading={loading}
                        icon={<WarningIcon />}
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
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{ color: 'text.primary', fontWeight: 600 }}
                            >
                                Connections
                            </Typography>
                            <Button
                                size="small"
                                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                                onClick={() => navigate('/connections')}
                                sx={{
                                    color: 'primary.main',
                                    textTransform: 'none',
                                    fontSize: 13,
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                Add new
                            </Button>
                        </Box>
                        {/* Table header */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 100px 40px',
                                px: 2,
                                py: 1,
                                bgcolor: 'background.default',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontWeight: 500 }}
                            >
                                NAME
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontWeight: 500 }}
                            >
                                HOST
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontWeight: 500 }}
                            >
                                STATUS
                            </Typography>
                            <Box />
                        </Box>
                        {loading ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <CircularProgress size={24} sx={{ color: 'text.disabled' }} />
                            </Box>
                        ) : connections.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    No connections yet
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={() => navigate('/connections')}
                                    sx={{
                                        mt: 1,
                                        color: 'text.primary',
                                        textTransform: 'none',
                                    }}
                                >
                                    Add your first connection
                                </Button>
                            </Box>
                        ) : (
                            connections.map((conn, i) => (
                                <ConnectionRow
                                    key={conn.id}
                                    connection={conn}
                                    status={connectionStatuses[conn.id] || 'checking'}
                                    isFirst={i === 0}
                                    onClick={() => navigate(`/query/${conn.id}`)}
                                />
                            ))
                        )}
                    </GlassCard>
                </Grid>

                {/* Activity */}
                <Grid item xs={12} lg={4}>
                    <GlassCard>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 2,
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{ color: 'text.primary', fontWeight: 600 }}
                            >
                                Recent Activity
                            </Typography>
                            {history.length > 0 && (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {successfulQueries}/{totalQueries} successful
                                </Typography>
                            )}
                        </Box>
                        {loading ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <CircularProgress size={24} sx={{ color: 'text.disabled' }} />
                            </Box>
                        ) : history.length === 0 ? (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    No recent activity
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    '& > *:not(:last-child)': {
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    },
                                }}
                            >
                                {history.slice(0, 5).map((entry) => (
                                    <ActivityItem key={entry.id} entry={entry} />
                                ))}
                            </Box>
                        )}
                    </GlassCard>
                </Grid>

                {/* Instance Group Sync Status */}
                {syncGroups.length > 0 && (
                    <Grid item xs={12}>
                        <GlassCard noPadding>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    px: 2,
                                    py: 1.5,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <SyncIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ color: 'text.primary', fontWeight: 600 }}
                                    >
                                        Instance Groups with Sync
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {syncGroups.length} group{syncGroups.length !== 1 ? 's' : ''}
                                </Typography>
                            </Box>
                            {syncGroups.map((group) => (
                                <SyncGroupRow
                                    key={group.id}
                                    group={group}
                                    onClick={() => navigate(`/groups/${group.id}/sync`)}
                                />
                            ))}
                        </GlassCard>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
