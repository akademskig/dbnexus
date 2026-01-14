import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { Layers as LayersIcon } from '@mui/icons-material';
import type { InstanceGroup, InstanceGroupSyncStatus } from '@dbnexus/shared';

interface SyncGroupRowProps {
    group: InstanceGroup;
    syncStatus?: InstanceGroupSyncStatus;
    checking: boolean;
    onClick: () => void;
}

export function SyncGroupRow({ group, syncStatus, checking, onClick }: SyncGroupRowProps) {
    const hasSource = !!group.sourceConnectionId;
    const syncEnabled = group.syncSchema || group.syncData;

    // Determine overall status from targets
    const getOverallStatus = () => {
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

    const statusConfig = {
        in_sync: { label: 'In Sync', color: '#22c55e', bgcolor: 'rgba(34, 197, 94, 0.1)' },
        out_of_sync: { label: 'Out of Sync', color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' },
        error: { label: 'Error', color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' },
        unchecked: { label: 'Checking...', color: '#6b7280', bgcolor: 'rgba(107, 114, 128, 0.1)' },
    };

    const currentStatus = statusConfig[status];

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
            ) : checking ? (
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
            ) : (
                <Chip
                    label={currentStatus.label}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: currentStatus.bgcolor,
                        color: currentStatus.color,
                    }}
                />
            )}
        </Box>
    );
}
