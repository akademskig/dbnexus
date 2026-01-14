import { useMemo } from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
    Box,
    Tooltip,
    CircularProgress,
    type SelectChangeEvent,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useQuery } from '@tanstack/react-query';
import { connectionsApi } from '../lib/api';
import { useConnectionHealthStore } from '../stores/connectionHealthStore';
import type { ConnectionConfig } from '@dbnexus/shared';

interface ConnectionSelectorProps {
    value: string;
    onChange: (connectionId: string) => void;
    disabled?: boolean;
    size?: 'small' | 'medium';
    minWidth?: number;
    label?: string;
    disableOffline?: boolean;
    showStatusIcon?: boolean;
}

export function ConnectionSelector({
    value,
    onChange,
    disabled = false,
    size = 'small',
    minWidth = 200,
    label = 'Connection',
    disableOffline = true,
    showStatusIcon = true,
}: ConnectionSelectorProps) {
    const { data: connections = [], isLoading } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const { healthStatus, isChecking, checkConnection } = useConnectionHealthStore();

    // Get status icon for a connection
    const getStatusIcon = (conn: ConnectionConfig) => {
        const health = healthStatus[conn.id];

        if (!health) {
            // Not checked yet
            return (
                <Tooltip title="Status unknown - will check on selection">
                    <HelpOutlineIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 'auto' }} />
                </Tooltip>
            );
        }

        if (health.isOnline) {
            return (
                <Tooltip title="Connected">
                    <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main', ml: 'auto' }} />
                </Tooltip>
            );
        }

        return (
            <Tooltip title={health.error || 'Connection failed'}>
                <ErrorIcon sx={{ fontSize: 14, color: 'error.main', ml: 'auto' }} />
            </Tooltip>
        );
    };

    // Check if a connection is disabled
    const isConnectionDisabled = (conn: ConnectionConfig) => {
        if (!disableOffline) return false;
        const health = healthStatus[conn.id];
        // Only disable if we've checked and it's offline
        return health && !health.isOnline;
    };

    const handleChange = async (event: SelectChangeEvent<string>) => {
        const connectionId = event.target.value;

        // Check connection health if not yet checked
        const health = healthStatus[connectionId];
        if (!health) {
            const isOnline = await checkConnection(connectionId);
            if (!isOnline && disableOffline) {
                // Don't allow selection of offline connections
                return;
            }
        } else if (!health.isOnline && disableOffline) {
            // Already know it's offline
            return;
        }

        onChange(connectionId);
    };

    // Sort connections: online first, then offline
    const sortedConnections = useMemo(() => {
        return [...connections].sort((a, b) => {
            const aHealth = healthStatus[a.id];
            const bHealth = healthStatus[b.id];

            // Unknown status goes in the middle
            const aOnline = aHealth ? (aHealth.isOnline ? 1 : -1) : 0;
            const bOnline = bHealth ? (bHealth.isOnline ? 1 : -1) : 0;

            return bOnline - aOnline;
        });
    }, [connections, healthStatus]);

    return (
        <FormControl size={size} sx={{ minWidth }} disabled={disabled || isLoading}>
            <InputLabel>{label}</InputLabel>
            <Select
                value={value}
                onChange={handleChange}
                label={label}
                startAdornment={
                    <InputAdornment position="start">
                        {isLoading || isChecking ? (
                            <CircularProgress size={16} />
                        ) : (
                            <StorageIcon fontSize="small" sx={{ color: 'primary.main' }} />
                        )}
                    </InputAdornment>
                }
            >
                {sortedConnections.map((conn) => {
                    const isDisabled = isConnectionDisabled(conn);
                    return (
                        <MenuItem
                            key={conn.id}
                            value={conn.id}
                            disabled={isDisabled}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                opacity: isDisabled ? 0.5 : 1,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    gap: 1,
                                }}
                            >
                                <span>{conn.name}</span>
                                {showStatusIcon && getStatusIcon(conn)}
                            </Box>
                        </MenuItem>
                    );
                })}
            </Select>
        </FormControl>
    );
}
