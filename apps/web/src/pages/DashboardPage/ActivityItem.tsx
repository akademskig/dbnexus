import { Box, Typography } from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import type { QueryHistoryEntry } from '@dbnexus/shared';
import { getTimeAgo } from './utils';

interface ActivityItemProps {
    entry: QueryHistoryEntry;
}

export function ActivityItem({ entry }: ActivityItemProps) {
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
