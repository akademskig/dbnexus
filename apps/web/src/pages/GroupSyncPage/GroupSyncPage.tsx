import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Storage as DatabaseIcon,
    ArrowBack as BackIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import { groupsApi, syncApi } from '../../lib/api';
import { GlassCard } from '../../components/GlassCard';
import { TargetRow } from './TargetRow';
import { GroupSettingsDialog } from './GroupSettingsDialog';
import { DataSyncDialog } from './DataSyncDialog';
import type { ConnectionConfig } from '@dbnexus/shared';

// Helper to format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    return date.toLocaleString();
}

// Helper to get default schema for a connection
// For MySQL/MariaDB, the database name is the schema
function getConnectionDefaultSchema(conn: ConnectionConfig | undefined): string {
    if (!conn) return 'public';
    if (conn.engine === 'mysql' || conn.engine === 'mariadb') {
        return conn.database;
    }
    return conn.defaultSchema || 'public';
}

export function GroupSyncPage() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [dataSyncTarget, setDataSyncTarget] = useState<{
        connectionId: string;
        connectionName: string;
    } | null>(null);
    const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

    const { data: group, isLoading: loadingGroup } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => groupsApi.getById(groupId!),
        enabled: !!groupId,
    });

    const { data: connections = [] } = useQuery({
        queryKey: ['groupConnections', groupId],
        queryFn: () => groupsApi.getConnections(groupId!),
        enabled: !!groupId,
    });

    const {
        data: syncStatus,
        isLoading: loadingStatus,
        isFetching: fetchingStatus,
        refetch: refetchStatus,
        dataUpdatedAt,
    } = useQuery({
        queryKey: ['groupSyncStatus', groupId],
        queryFn: async () => {
            const result = await syncApi.getGroupSyncStatus(groupId!);
            setLastCheckedAt(new Date());
            return result;
        },
        enabled: !!groupId && !!group?.sourceConnectionId,
        // Auto-refresh every 10 minutes in background
        refetchInterval: 10 * 60 * 1000, // 10 minutes
        refetchIntervalInBackground: true, // Keep refreshing even when tab is not focused
        // Don't refetch on mount or window focus - use cached data
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Keep data fresh for a long time - only background interval updates it
        staleTime: Infinity, // Never consider stale (only manual refresh or interval)
        gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    });

    // Update lastCheckedAt when data is updated
    useEffect(() => {
        if (dataUpdatedAt && dataUpdatedAt > 0) {
            setLastCheckedAt(new Date(dataUpdatedAt));
        }
    }, [dataUpdatedAt]);

    // Force refresh - invalidate cache and refetch
    const handleRefresh = () => {
        setLastCheckedAt(null);
        refetchStatus();
    };

    // Get source connection and its default schema
    const sourceConnection = connections.find((c) => c.id === group?.sourceConnectionId);

    // Use group's syncTargetSchema if set, otherwise fall back to connection's defaultSchema
    const sourceSchema = group?.syncTargetSchema || getConnectionDefaultSchema(sourceConnection);

    // Helper to get target schema - use group's syncTargetSchema for all targets
    const getTargetSchema = (targetId: string) => {
        if (group?.syncTargetSchema) {
            return group.syncTargetSchema;
        }
        const targetConn = connections.find((c) => c.id === targetId);
        return getConnectionDefaultSchema(targetConn);
    };

    if (loadingGroup) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!group) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">Instance group not found</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <IconButton onClick={() => navigate('/dashboard')}>
                    <BackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={600}>
                        {group.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Instance Group Sync Status
                            {group.projectName && ` • ${group.projectName}`}
                        </Typography>
                        {lastCheckedAt && (
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                                • Last checked: {formatRelativeTime(lastCheckedAt)}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => setSettingsOpen(true)}
                >
                    Settings
                </Button>
                <Button
                    variant="contained"
                    startIcon={
                        loadingStatus || fetchingStatus ? (
                            <CircularProgress size={16} />
                        ) : (
                            <RefreshIcon />
                        )
                    }
                    onClick={handleRefresh}
                    disabled={loadingStatus || fetchingStatus || !group.sourceConnectionId}
                >
                    {fetchingStatus ? 'Checking...' : 'Refresh Status'}
                </Button>
            </Box>

            {/* No source warning */}
            {!group.sourceConnectionId && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    No source connection set. Configure a source connection in settings to enable
                    sync checking.
                </Alert>
            )}

            {/* Sync not enabled warning */}
            {group.sourceConnectionId && !group.syncSchema && !group.syncData && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Neither schema nor data sync is enabled. Enable sync options in settings.
                </Alert>
            )}

            {/* Source info */}
            {group.sourceConnectionId && (
                <GlassCard>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Source (Reference)
                        </Typography>
                        <Chip
                            label={group.sourceConnectionName || 'Unknown'}
                            icon={<DatabaseIcon />}
                            color="primary"
                        />
                        {group.syncSchema && <Chip label="Schema Sync" size="small" />}
                        {group.syncData && <Chip label="Data Sync" size="small" />}
                    </Box>

                    {/* Targets table */}
                    {syncStatus && syncStatus.targets.length > 0 ? (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={50} />
                                        <TableCell>Target Connection</TableCell>
                                        <TableCell>Schema Status</TableCell>
                                        <TableCell>Data Status</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {syncStatus.targets.map((target) => (
                                        <TargetRow
                                            key={target.connectionId}
                                            target={target}
                                            group={group}
                                            sourceConnectionId={group.sourceConnectionId!}
                                            sourceSchema={sourceSchema}
                                            targetSchema={getTargetSchema(target.connectionId)}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : loadingStatus ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <CircularProgress size={24} />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Checking sync status...
                            </Typography>
                        </Box>
                    ) : (
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                            No target connections in this group.
                        </Typography>
                    )}
                </GlassCard>
            )}

            {/* Connections list if no source */}
            {!group.sourceConnectionId && connections.length > 0 && (
                <GlassCard>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                        Connections in this group ({connections.length})
                    </Typography>
                    {connections.map((conn) => (
                        <Box
                            key={conn.id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                py: 1,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:last-child': { borderBottom: 'none' },
                            }}
                        >
                            <DatabaseIcon sx={{ color: 'primary.main' }} />
                            <Typography>{conn.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {conn.host}:{conn.port}
                            </Typography>
                        </Box>
                    ))}
                </GlassCard>
            )}

            {/* Settings dialog */}
            <GroupSettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                group={group}
                connections={connections}
            />

            {/* Data sync dialog */}
            {dataSyncTarget && group.sourceConnectionId && (
                <DataSyncDialog
                    open={true}
                    onClose={() => setDataSyncTarget(null)}
                    sourceConnectionId={group.sourceConnectionId}
                    targetConnectionId={dataSyncTarget.connectionId}
                    targetName={dataSyncTarget.connectionName}
                    schema={sourceSchema}
                />
            )}
        </Box>
    );
}
