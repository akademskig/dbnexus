import { useMemo } from 'react';
import { FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent } from '@mui/material';
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
}

export function ConnectionSelector({
    value,
    onChange,
    disabled = false,
    size = 'small',
    minWidth = 200,
    label = 'Connection',
    disableOffline = true,
}: ConnectionSelectorProps) {
    const { data: connections = [], isLoading } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const { healthStatus } = useConnectionHealthStore();

    // Check if a connection is disabled
    const isConnectionDisabled = (conn: ConnectionConfig) => {
        if (!disableOffline) return false;
        const health = healthStatus[conn.id];
        // Only disable if we've checked and it's offline
        return health && !health.isOnline;
    };

    const handleChange = async (event: SelectChangeEvent<string>) => {
        const connectionId = event.target.value;
        // Allow selection immediately
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
            <Select value={value} onChange={handleChange} label={label}>
                {sortedConnections.length === 0 && !isLoading ? (
                    <MenuItem disabled value="">
                        No connections available
                    </MenuItem>
                ) : (
                    sortedConnections.map((conn) => {
                        const isDisabled = isConnectionDisabled(conn);
                        return (
                            <MenuItem
                                key={conn.id}
                                value={conn.id}
                                disabled={isDisabled}
                                sx={{
                                    opacity: isDisabled ? 0.5 : 1,
                                }}
                            >
                                {conn.name}
                            </MenuItem>
                        );
                    })
                )}
            </Select>
        </FormControl>
    );
}
