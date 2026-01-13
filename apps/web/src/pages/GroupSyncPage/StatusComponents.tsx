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
            return <SyncedIcon sx={{ color: '#22c55e' }} />;
        case 'out_of_sync':
            return <OutOfSyncIcon sx={{ color: '#f59e0b' }} />;
        case 'error':
            return <ErrorIcon sx={{ color: '#ef4444' }} />;
        default:
            return <UncheckedIcon sx={{ color: 'text.disabled' }} />;
    }
}

// Status chip component
export function StatusChip({ status }: Readonly<{ status: SyncStatus }>) {
    const config = {
        in_sync: { label: 'In Sync', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        out_of_sync: { label: 'Out of Sync', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        error: { label: 'Error', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        unchecked: { label: 'Not Checked', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
    }[status];

    return (
        <Chip
            label={config.label}
            size="small"
            sx={{
                bgcolor: config.bg,
                color: config.color,
                border: `1px solid ${config.color}`,
                fontWeight: 500,
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
        added: { icon: <AddIcon sx={{ fontSize: 14 }} />, color: '#22c55e', label: 'Added' },
        removed: { icon: <RemoveIcon sx={{ fontSize: 14 }} />, color: '#ef4444', label: 'Removed' },
        modified: { icon: <EditIcon sx={{ fontSize: 14 }} />, color: '#f59e0b', label: 'Modified' },
    }[category];

    return (
        <Chip
            icon={config.icon}
            label={config.label}
            size="small"
            sx={{
                bgcolor: `${config.color}20`,
                color: config.color,
                border: `1px solid ${config.color}`,
                height: 22,
                '& .MuiChip-icon': { color: config.color },
            }}
        />
    );
}
