import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { Storage as DatabaseIcon } from '@mui/icons-material';
import type { ConnectionConfig } from '@dbnexus/shared';

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
                        onChange={(e) => onConnectionChange(e.target.value)}
                        label="Connection"
                        disabled={loadingConnections}
                    >
                        {connections.map((conn) => (
                            <MenuItem
                                key={conn.id}
                                value={conn.id}
                                disabled={conn.id === disabledConnectionId}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DatabaseIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                    {conn.name}
                                </Box>
                            </MenuItem>
                        ))}
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
