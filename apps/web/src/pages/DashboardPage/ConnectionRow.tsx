import { Box, Typography, IconButton, Chip, CircularProgress, Tooltip } from '@mui/material';
import {
    Storage as StorageIcon,
    MoreHoriz as MoreHorizIcon,
    Circle as CircleIcon,
} from '@mui/icons-material';
import type { ConnectionConfig } from '@dbnexus/shared';

interface ConnectionRowProps {
    connection: ConnectionConfig;
    status: 'online' | 'offline' | 'checking';
    isFirst?: boolean;
    onClick: () => void;
}

export function ConnectionRow({
    connection,
    status,
    isFirst = false,
    onClick,
}: ConnectionRowProps) {
    const statusColors = {
        online: '#10b981',
        offline: '#ef4444',
        checking: '#f59e0b',
    };

    const isOffline = status === 'offline';
    const isClickable = !isOffline && status !== 'checking';

    const handleClick = () => {
        if (isClickable) {
            onClick();
        }
    };

    const rowContent = (
        <Box
            onClick={handleClick}
            sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 100px 40px',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                borderTop: isFirst ? 'none' : '1px solid',
                borderColor: 'divider',
                cursor: isClickable ? 'pointer' : 'not-allowed',
                opacity: isOffline ? 0.6 : 1,
                '&:hover': {
                    bgcolor: isClickable ? 'action.hover' : 'transparent',
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

    if (isOffline) {
        return (
            <Tooltip title="Connection is offline. Test the connection to check status.">
                {rowContent}
            </Tooltip>
        );
    }

    return rowContent;
}
