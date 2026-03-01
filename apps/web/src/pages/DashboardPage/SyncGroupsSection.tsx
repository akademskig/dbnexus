import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    IconButton,
    Chip,
    Collapse,
    CircularProgress,
    Button,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import LayersIcon from '@mui/icons-material/Layers';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type {
    InstanceGroup,
    InstanceGroupSyncStatus,
    InstanceGroupTargetStatus,
    ConnectionConfig,
} from '@dbnexus/shared';
import { StyledTooltip } from '../../components/StyledTooltip';
import { GlassCard } from '../../components/GlassCard';
import { useConnectionHealthStore } from '../../stores/connectionHealthStore';

interface SyncGroupsSectionProps {
    syncGroups: InstanceGroup[];
    syncStatuses: Record<string, InstanceGroupSyncStatus>;
    syncChecking: Record<string, boolean>;
    connections: ConnectionConfig[];
    onCheckStatus: (groupId: string) => void;
}

function StatusChip({
    status,
    checking,
}: {
    status: 'in_sync' | 'out_of_sync' | 'error' | 'unchecked' | 'no_source' | 'disabled';
    checking?: boolean;
}) {
    if (checking) {
        return (
            <Chip
                label="Checking..."
                size="small"
                icon={<CircularProgress size={10} sx={{ color: 'inherit' }} />}
                sx={{
                    height: 20,
                    fontSize: 10,
                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                }}
            />
        );
    }

    const configs = {
        in_sync: {
            label: 'In Sync',
            color: '#22c55e',
            bgcolor: 'rgba(34, 197, 94, 0.1)',
            icon: <CheckCircleIcon sx={{ fontSize: 12 }} />,
        },
        out_of_sync: {
            label: 'Out of Sync',
            color: '#f59e0b',
            bgcolor: 'rgba(245, 158, 11, 0.1)',
            icon: <WarningIcon sx={{ fontSize: 12 }} />,
        },
        error: {
            label: 'Error',
            color: '#ef4444',
            bgcolor: 'rgba(239, 68, 68, 0.1)',
            icon: <ErrorIcon sx={{ fontSize: 12 }} />,
        },
        unchecked: {
            label: 'Not Checked',
            color: '#6b7280',
            bgcolor: 'rgba(107, 114, 128, 0.1)',
            icon: null,
        },
        no_source: {
            label: 'No Source',
            color: '#f59e0b',
            bgcolor: 'rgba(245, 158, 11, 0.1)',
            icon: <WarningIcon sx={{ fontSize: 12 }} />,
        },
        disabled: {
            label: 'Disabled',
            color: '#6b7280',
            bgcolor: 'rgba(107, 114, 128, 0.1)',
            icon: null,
        },
    };

    const config = configs[status];

    return (
        <Chip
            label={config.label}
            size="small"
            icon={config.icon || undefined}
            sx={{
                height: 20,
                fontSize: 10,
                bgcolor: config.bgcolor,
                color: config.color,
                '& .MuiChip-icon': { color: config.color },
            }}
        />
    );
}

function TargetConnectionRow({
    target,
    connection,
    onNavigate,
}: {
    target: InstanceGroupTargetStatus;
    connection?: ConnectionConfig;
    onNavigate: (path: string) => void;
}) {
    const { isOnline } = useConnectionHealthStore();
    const online = connection ? isOnline(connection.id) : false;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'in_sync':
                return <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />;
            case 'out_of_sync':
                return <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />;
            case 'error':
                return <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />;
            default:
                return null;
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 0.75,
                px: 2,
                pl: 6,
                '&:hover': { bgcolor: 'action.hover' },
            }}
        >
            <Box
                sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: online ? 'success.main' : 'error.main',
                    flexShrink: 0,
                }}
            />
            <StorageIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography
                variant="caption"
                sx={{
                    flex: 1,
                    fontWeight: 500,
                    color: online ? 'text.primary' : 'text.disabled',
                }}
            >
                {target.connectionName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {getStatusIcon(target.schemaStatus)}
                {getStatusIcon(target.dataStatus)}
            </Box>
            <StyledTooltip title="Query">
                <span>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(`/query/${target.connectionId}`);
                        }}
                        disabled={!online}
                        sx={{ p: 0.25 }}
                    >
                        <PlayArrowIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </span>
            </StyledTooltip>
        </Box>
    );
}

function SyncGroupRow({
    group,
    syncStatus,
    checking,
    connections,
    onNavigate,
    onCheckStatus,
}: {
    group: InstanceGroup;
    syncStatus?: InstanceGroupSyncStatus;
    checking: boolean;
    connections: ConnectionConfig[];
    onNavigate: (path: string) => void;
    onCheckStatus: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const { isOnline } = useConnectionHealthStore();

    const hasSource = !!group.sourceConnectionId;
    const syncEnabled = group.syncSchema || group.syncData;
    const sourceConnection = connections.find((c) => c.id === group.sourceConnectionId);
    const targetConnections = syncStatus?.targets || [];

    const getOverallStatus = ():
        | 'in_sync'
        | 'out_of_sync'
        | 'error'
        | 'unchecked'
        | 'no_source'
        | 'disabled' => {
        if (!hasSource) return 'no_source';
        if (!syncEnabled) return 'disabled';
        if (!syncStatus || !syncStatus.targets || syncStatus.targets.length === 0) {
            return 'unchecked';
        }

        const hasError = syncStatus.targets.some(
            (t) => t.schemaStatus === 'error' || t.dataStatus === 'error'
        );
        if (hasError) return 'error';

        const hasOutOfSync = syncStatus.targets.some(
            (t) => t.schemaStatus === 'out_of_sync' || t.dataStatus === 'out_of_sync'
        );
        if (hasOutOfSync) return 'out_of_sync';

        const allInSync = syncStatus.targets.every(
            (t) =>
                (t.schemaStatus === 'in_sync' || t.schemaStatus === 'unchecked') &&
                (t.dataStatus === 'in_sync' || t.dataStatus === 'unchecked')
        );
        if (allInSync) return 'in_sync';

        return 'unchecked';
    };

    const status = getOverallStatus();

    return (
        <Box
            sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.5,
                    px: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <LayersIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {group.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {group.projectName}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {group.syncSchema && (
                        <Chip label="Schema" size="small" sx={{ height: 18, fontSize: 9 }} />
                    )}
                    {group.syncData && (
                        <Chip label="Data" size="small" sx={{ height: 18, fontSize: 9 }} />
                    )}
                </Box>
                <StatusChip status={status} checking={checking} />
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                >
                    {expanded ? (
                        <ExpandLessIcon sx={{ fontSize: 18 }} />
                    ) : (
                        <ExpandMoreIcon sx={{ fontSize: 18 }} />
                    )}
                </IconButton>
            </Box>

            <Collapse in={expanded}>
                <Box sx={{ bgcolor: 'background.default', py: 1 }}>
                    {/* Source Connection */}
                    <Box sx={{ px: 2, py: 0.5 }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                            Source
                        </Typography>
                    </Box>
                    {sourceConnection ? (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                py: 0.75,
                                px: 2,
                                pl: 4,
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: isOnline(sourceConnection.id)
                                        ? 'success.main'
                                        : 'error.main',
                                    flexShrink: 0,
                                }}
                            />
                            <StorageIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                            <Typography variant="caption" sx={{ flex: 1, fontWeight: 500 }}>
                                {sourceConnection.name}
                            </Typography>
                            <StyledTooltip title="Query">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigate(`/query/${sourceConnection.id}`);
                                        }}
                                        disabled={!isOnline(sourceConnection.id)}
                                        sx={{ p: 0.25 }}
                                    >
                                        <PlayArrowIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </span>
                            </StyledTooltip>
                        </Box>
                    ) : (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', px: 4, py: 0.5 }}
                        >
                            No source configured
                        </Typography>
                    )}

                    {/* Arrow */}
                    {sourceConnection && targetConnections.length > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                            <ArrowForwardIcon
                                sx={{
                                    fontSize: 16,
                                    color: 'text.disabled',
                                    transform: 'rotate(90deg)',
                                }}
                            />
                        </Box>
                    )}

                    {/* Target Connections */}
                    {targetConnections.length > 0 && (
                        <>
                            <Box sx={{ px: 2, py: 0.5 }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    Targets ({targetConnections.length})
                                </Typography>
                            </Box>
                            {targetConnections.map((target) => (
                                <TargetConnectionRow
                                    key={target.connectionId}
                                    target={target}
                                    connection={connections.find(
                                        (c) => c.id === target.connectionId
                                    )}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </>
                    )}

                    {/* Actions */}
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 1,
                            px: 2,
                            pt: 1.5,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            mt: 1,
                        }}
                    >
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SyncIcon sx={{ fontSize: 14 }} />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onCheckStatus();
                            }}
                            disabled={!hasSource || !syncEnabled || checking}
                        >
                            Check Status
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SettingsIcon sx={{ fontSize: 14 }} />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(`/groups/${group.id}/sync`);
                            }}
                        >
                            Manage
                        </Button>
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}

export function SyncGroupsSection({
    syncGroups,
    syncStatuses,
    syncChecking,
    connections,
    onCheckStatus,
}: SyncGroupsSectionProps) {
    const navigate = useNavigate();

    return (
        <GlassCard noPadding sx={{ mt: 3 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <SyncIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Sync Groups
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary">
                    {syncGroups.length} group{syncGroups.length !== 1 ? 's' : ''}
                </Typography>
            </Box>

            {syncGroups.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3, px: 2 }}>
                    <SyncIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                        No sync groups configured
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ display: 'block', mb: 1 }}
                    >
                        Create a sync group to keep databases in sync
                    </Typography>
                </Box>
            ) : (
                syncGroups.map((group) => (
                    <SyncGroupRow
                        key={group.id}
                        group={group}
                        syncStatus={syncStatuses[group.id]}
                        checking={syncChecking[group.id] || false}
                        connections={connections}
                        onNavigate={(path) => navigate(path)}
                        onCheckStatus={() => onCheckStatus(group.id)}
                    />
                ))
            )}
        </GlassCard>
    );
}
