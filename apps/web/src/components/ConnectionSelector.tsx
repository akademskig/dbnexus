import { useMemo } from 'react';
import { FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { connectionsApi } from '../lib/api';
import { useConnectionHealthStore } from '../stores/connectionHealthStore';
import type { ConnectionConfig } from '@dbnexus/shared';

interface ConnectionSelectorProps {
    readonly value: string;
    readonly onChange: (connectionId: string) => void;
    readonly disabled?: boolean;
    readonly size?: 'small' | 'medium';
    readonly minWidth?: number;
    readonly label?: string;
    readonly disableOffline?: boolean;
    readonly 'data-tour'?: string;
}

export function ConnectionSelector({
    value,
    onChange,
    disabled = false,
    size = 'small',
    minWidth = 200,
    label = 'Connection',
    disableOffline = true,
    'data-tour': dataTour,
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
        const getOnlineRank = (health: (typeof healthStatus)[string] | undefined) => {
            if (!health) return 0;
            return health.isOnline ? 1 : -1;
        };

        return [...connections].sort((a, b) => {
            const aOnline = getOnlineRank(healthStatus[a.id]);
            const bOnline = getOnlineRank(healthStatus[b.id]);
            return bOnline - aOnline;
        });
    }, [connections, healthStatus]);

    return (
        <FormControl
            size={size}
            sx={{ minWidth }}
            disabled={disabled || isLoading}
            data-tour={dataTour}
        >
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
