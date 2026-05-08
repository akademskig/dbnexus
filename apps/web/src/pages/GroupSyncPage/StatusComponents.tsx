import { Chip } from '@mui/material';
import {
    CheckCircle as SyncedIcon,
    Warning as OutOfSyncIcon,
    Error as ErrorIcon,
    HelpOutline as UncheckedIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Edit as EditIcon,
} from '@mui/icons-material';

type SyncStatus = 'in_sync' | 'out_of_sync' | 'error' | 'unchecked';

// Status icon component
export function StatusIcon({ status }: Readonly<{ status: SyncStatus }>) {
    switch (status) {
        case 'in_sync':
            return <SyncedIcon sx={{ color: '#22c55e', fontSize: 16 }} />;
        case 'out_of_sync':
            return <OutOfSyncIcon sx={{ color: '#f59e0b', fontSize: 16 }} />;
        case 'error':
            return <ErrorIcon sx={{ color: '#ef4444', fontSize: 16 }} />;
        default:
            return <UncheckedIcon sx={{ color: 'text.disabled', fontSize: 16 }} />;
    }
}

// Status chip component
export function StatusChip({ status }: Readonly<{ status: SyncStatus }>) {
    const config = {
        in_sync: { label: 'Synced', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        out_of_sync: { label: 'Out of Sync', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        error: { label: 'Error', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        unchecked: { label: 'Unchecked', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
    }[status];

    return (
        <Chip
            label={config.label}
            size="small"
            sx={{
                height: 20,
                fontSize: 10,
                bgcolor: config.bg,
                color: config.color,
                border: `1px solid ${config.color}40`,
                fontWeight: 600,
                '& .MuiChip-label': { px: 1 },
            }}
        />
    );
}

// Get diff category from DiffType
function getDiffCategory(type: string): 'added' | 'removed' | 'modified' {
    if (type.includes('added')) return 'added';
    if (type.includes('removed')) return 'removed';
    return 'modified';
}

// Diff type badge
export function DiffTypeBadge({ type }: Readonly<{ type: string }>) {
    const category = getDiffCategory(type);
    const config = {
        added: { icon: <AddIcon sx={{ fontSize: 12 }} />, color: '#22c55e', label: '+' },
        removed: { icon: <RemoveIcon sx={{ fontSize: 12 }} />, color: '#ef4444', label: '-' },
        modified: { icon: <EditIcon sx={{ fontSize: 12 }} />, color: '#f59e0b', label: '~' },
    }[category];

    return (
        <Chip
            icon={config.icon}
            label={config.label}
            size="small"
            sx={{
                bgcolor: `${config.color}15`,
                color: config.color,
                border: `1px solid ${config.color}40`,
                height: 18,
                fontSize: 10,
                fontWeight: 600,
                '& .MuiChip-icon': { color: config.color, ml: 0.5 },
                '& .MuiChip-label': { px: 0.5 },
            }}
        />
    );
}
