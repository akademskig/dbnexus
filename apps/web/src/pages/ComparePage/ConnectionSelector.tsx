import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import { Storage as DatabaseIcon } from '@mui/icons-material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { ConnectionConfig } from '@dbnexus/shared';
import { useConnectionHealthStore } from '../../stores/connectionHealthStore';

interface ConnectionSelectorProps {
    label: string;
    connectionId: string;
    schema: string;
    connections: ConnectionConfig[];
    schemas: string[];
    disabledConnectionId?: string;
    loadingConnections: boolean;
    onConnectionChange: (connectionId: string) => void;
    onSchemaChange: (schema: string) => void;
}

export function ConnectionSelector({
    label,
    connectionId,
    schema,
    connections,
    schemas,
    disabledConnectionId,
    loadingConnections,
    onConnectionChange,
    onSchemaChange,
}: ConnectionSelectorProps) {
    const { healthStatus, checkConnection } = useConnectionHealthStore();

    // Get status icon for a connection
    const getStatusIcon = (conn: ConnectionConfig) => {
        const health = healthStatus[conn.id];

        if (!health) {
            return (
                <StyledTooltip title="Status unknown">
                    <HelpOutlineIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 'auto' }} />
                </StyledTooltip>
            );
        }

        if (health.isOnline) {
            return (
                <StyledTooltip title="Connected">
                    <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main', ml: 'auto' }} />
                </StyledTooltip>
            );
        }

        return (
            <StyledTooltip title={health.error || 'Connection failed'}>
                <ErrorIcon sx={{ fontSize: 14, color: 'error.main', ml: 'auto' }} />
            </StyledTooltip>
        );
    };

    // Check if a connection is disabled (offline or explicitly disabled)
    const isConnectionDisabled = (conn: ConnectionConfig) => {
        if (conn.id === disabledConnectionId) return true;
        const health = healthStatus[conn.id];
        return health && !health.isOnline;
    };

    const handleConnectionChange = async (newConnectionId: string) => {
        // Check connection health if not yet checked
        const health = healthStatus[newConnectionId];
        if (!health) {
            const isOnline = await checkConnection(newConnectionId);
            if (!isOnline) {
                return; // Don't allow selection of offline connections
            }
        } else if (!health.isOnline) {
            return; // Already know it's offline
        }

        onConnectionChange(newConnectionId);
    };

    return (
        <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Connection</InputLabel>
                    <Select
                        value={connectionId}
                        onChange={(e) => handleConnectionChange(e.target.value)}
                        label="Connection"
                        disabled={loadingConnections}
                    >
                        {connections.map((conn) => {
                            const isDisabled = isConnectionDisabled(conn);
                            return (
                                <MenuItem
                                    key={conn.id}
                                    value={conn.id}
                                    disabled={isDisabled}
                                    sx={{ opacity: isDisabled ? 0.5 : 1 }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            width: '100%',
                                        }}
                                    >
                                        <DatabaseIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                        <span>{conn.name}</span>
                                        {getStatusIcon(conn)}
                                    </Box>
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
                {schemas.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Schema</InputLabel>
                        <Select
                            value={schema}
                            onChange={(e) => onSchemaChange(e.target.value)}
                            label="Schema"
                        >
                            {schemas.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {s}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </Box>
        </Box>
    );
}
