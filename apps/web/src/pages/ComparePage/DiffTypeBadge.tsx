import { Chip } from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    Edit as EditIcon,
} from '@mui/icons-material';

interface DiffTypeBadgeProps {
    type: string;
}

export function DiffTypeBadge({ type }: DiffTypeBadgeProps) {
    const config: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
        table_added: {
            icon: <AddIcon sx={{ fontSize: 14 }} />,
            color: '#22c55e',
            bg: 'rgba(34, 197, 94, 0.1)',
        },
        table_removed: {
            icon: <RemoveIcon sx={{ fontSize: 14 }} />,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.1)',
        },
        column_added: {
            icon: <AddIcon sx={{ fontSize: 14 }} />,
            color: '#22c55e',
            bg: 'rgba(34, 197, 94, 0.1)',
        },
        column_removed: {
            icon: <RemoveIcon sx={{ fontSize: 14 }} />,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.1)',
        },
        column_modified: {
            icon: <EditIcon sx={{ fontSize: 14 }} />,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.1)',
        },
        index_added: {
            icon: <AddIcon sx={{ fontSize: 14 }} />,
            color: '#22c55e',
            bg: 'rgba(34, 197, 94, 0.1)',
        },
        index_removed: {
            icon: <RemoveIcon sx={{ fontSize: 14 }} />,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.1)',
        },
        index_modified: {
            icon: <EditIcon sx={{ fontSize: 14 }} />,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.1)',
        },
        fk_added: {
            icon: <AddIcon sx={{ fontSize: 14 }} />,
            color: '#22c55e',
            bg: 'rgba(34, 197, 94, 0.1)',
        },
        fk_removed: {
            icon: <RemoveIcon sx={{ fontSize: 14 }} />,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.1)',
        },
        fk_modified: {
            icon: <EditIcon sx={{ fontSize: 14 }} />,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.1)',
        },
    };

    const cfg = config[type] || {
        icon: <EditIcon sx={{ fontSize: 14 }} />,
        color: '#6b7280',
        bg: 'rgba(107, 114, 128, 0.1)',
    };

    return (
        <Chip
            icon={cfg.icon as React.ReactElement}
            label={type.replace(/_/g, ' ')}
            size="small"
            sx={{
                bgcolor: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.color}`,
                '& .MuiChip-icon': { color: cfg.color },
                fontSize: 11,
                height: 24,
            }}
        />
    );
}
