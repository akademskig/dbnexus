import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Button, IconButton, Tooltip } from '@mui/material';
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    Hub as HubIcon,
    Bolt as BoltIcon,
    Speed as SpeedIcon,
    Warning as WarningIcon,
    Sync as SyncIcon,
    Storage as StorageIcon,
    History as HistoryIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { connectionsApi, queriesApi, syncApi } from '../../lib/api';
import { GlassCard } from '../../components/GlassCard';
import type {
    ConnectionConfig,
    QueryHistoryEntry,
    InstanceGroup,
    InstanceGroupSyncStatus,
} from '@dbnexus/shared';
import { StatCard } from './StatCard';
import { ConnectionRow } from './ConnectionRow';
import { ActivityItem } from './ActivityItem';
import { SyncGroupRow } from './SyncGroupRow';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { useConnectionHealthStore } from '../../stores/connectionHealthStore';
import { ScanConnectionsDialog } from '../../components/ScanConnectionsDialog';

export function DashboardPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [connections, setConnections] = useState<ConnectionConfig[]>([]);
    const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
    const [syncGroups, setSyncGroups] = useState<InstanceGroup[]>([]);
    const [syncStatuses, setSyncStatuses] = useState<Record<string, InstanceGroupSyncStatus>>({});
    const [syncChecking, setSyncChecking] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [scanDialogOpen, setScanDialogOpen] = useState(false);

    // Use global connection health store
    const { healthStatus, checkAllConnections } = useConnectionHealthStore();

    // Check sync status for a group in background
    const checkGroupSyncStatus = async (groupId: string) => {
        setSyncChecking((prev) => ({ ...prev, [groupId]: true }));
        try {
            const status = await syncApi.getGroupSyncStatus(groupId);
            setSyncStatuses((prev) => ({ ...prev, [groupId]: status }));
            // Also update React Query cache so GroupSyncPage can use it
            queryClient.setQueryData(['groupSyncStatus', groupId], status);
        } catch (error) {
            console.error(`Failed to check sync status for group ${groupId}:`, error);
        } finally {
            setSyncChecking((prev) => ({ ...prev, [groupId]: false }));
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

            // Check health for all connections using global store
            checkAllConnections(conns.map((c) => c.id));

            // Check sync status for each group with sync enabled (in background)
            groups.forEach((group) => {
                if (group.sourceConnectionId && (group.syncSchema || group.syncData)) {
                    checkGroupSyncStatus(group.id);
                }
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-refresh sync status every 10 minutes
    useEffect(() => {
        const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in ms

        const refreshSyncStatuses = () => {
            syncGroups.forEach((group) => {
                if (group.sourceConnectionId && (group.syncSchema || group.syncData)) {
                    checkGroupSyncStatus(group.id);
                }
            });
        };

        const intervalId = setInterval(refreshSyncStatuses, REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncGroups]);

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
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        startIcon={<SearchIcon />}
                        onClick={() => setScanDialogOpen(true)}
                    >
                        Scan
                    </Button>
                    <Tooltip title="Refresh">
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
                    </Tooltip>
                </Box>
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
                                onClick={() => navigate('/dashboard')}
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
                            <LoadingState size="small" />
                        ) : connections.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                <StorageIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    No connections yet
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 1,
                                        justifyContent: 'center',
                                        mt: 2,
                                    }}
                                >
                                    <Button
                                        size="small"
                                        startIcon={<SearchIcon />}
                                        onClick={() => setScanDialogOpen(true)}
                                    >
                                        Scan
                                    </Button>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => navigate('/projects')}
                                    >
                                        Add Manually
                                    </Button>
                                </Box>
                            </Box>
                        ) : (
                            connections.map((conn, i) => {
                                const health = healthStatus[conn.id];
                                const status: 'online' | 'offline' | 'checking' = health
                                    ? health.isOnline
                                        ? 'online'
                                        : 'offline'
                                    : 'checking';
                                return (
                                    <ConnectionRow
                                        key={conn.id}
                                        connection={conn}
                                        status={status}
                                        isFirst={i === 0}
                                        onClick={() => navigate(`/query/${conn.id}`)}
                                    />
                                );
                            })
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
                            <LoadingState size="small" />
                        ) : history.length === 0 ? (
                            <EmptyState
                                icon={<HistoryIcon />}
                                title="No recent activity"
                                description="Queries you run will appear here."
                                size="small"
                            />
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
                                    syncStatus={syncStatuses[group.id]}
                                    checking={syncChecking[group.id] || false}
                                    onClick={() => navigate(`/groups/${group.id}/sync`)}
                                />
                            ))}
                        </GlassCard>
                    </Grid>
                )}
            </Grid>

            {/* Scan Connections Dialog */}
            <ScanConnectionsDialog
                open={scanDialogOpen}
                onClose={() => {
                    setScanDialogOpen(false);
                    loadData(); // Refresh after scanning
                }}
            />
        </Box>
    );
}
