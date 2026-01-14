import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { ConnectionConfig } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { queriesApi } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';

interface MaintenanceTabProps {
    connectionId: string;
    connection: ConnectionConfig | undefined;
    schemas: string[];
    selectedSchema?: string | null;
    onSchemaChange?: (schema: string) => void;
}

interface MaintenanceOperation {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    engines: string[];
    getCommand: (schema?: string) => string;
    requiresSchema?: boolean;
    color: string;
}

const MAINTENANCE_OPERATIONS: MaintenanceOperation[] = [
    {
        id: 'vacuum',
        name: 'VACUUM',
        description:
            'Reclaim storage occupied by dead tuples. Recommended after large DELETE operations.',
        icon: <CleaningServicesIcon />,
        engines: ['postgres', 'sqlite'],
        getCommand: () => 'VACUUM',
        color: '#8b5cf6',
    },
    {
        id: 'vacuum_full',
        name: 'VACUUM FULL',
        description:
            'Aggressive vacuum that reclaims more space but requires exclusive lock. Use with caution.',
        icon: <CleaningServicesIcon />,
        engines: ['postgres'],
        getCommand: () => 'VACUUM FULL',
        color: '#dc2626',
    },
    {
        id: 'analyze',
        name: 'ANALYZE',
        description: 'Update statistics used by the query planner. Improves query performance.',
        icon: <SpeedIcon />,
        engines: ['postgres', 'sqlite'],
        getCommand: (schema) => (schema ? `ANALYZE "${schema}"` : 'ANALYZE'),
        requiresSchema: false,
        color: '#06b6d4',
    },
    {
        id: 'vacuum_analyze',
        name: 'VACUUM ANALYZE',
        description: 'Combines VACUUM and ANALYZE in one operation. Good for routine maintenance.',
        icon: <BuildIcon />,
        engines: ['postgres'],
        getCommand: () => 'VACUUM ANALYZE',
        color: '#22c55e',
    },
    {
        id: 'reindex',
        name: 'REINDEX DATABASE',
        description: 'Rebuild all indexes in the database. Useful after heavy write operations.',
        icon: <StorageIcon />,
        engines: ['postgres'],
        getCommand: () => 'REINDEX DATABASE CURRENT_DATABASE',
        color: '#f59e0b',
    },
    {
        id: 'optimize',
        name: 'OPTIMIZE TABLE',
        description:
            'Reorganize table storage and rebuild indexes. MySQL/MariaDB equivalent of VACUUM.',
        icon: <CleaningServicesIcon />,
        engines: ['mysql', 'mariadb'],
        getCommand: (schema) => `OPTIMIZE TABLE ${schema ? `\`${schema}\`.*` : '*'}`,
        requiresSchema: true,
        color: '#8b5cf6',
    },
    {
        id: 'analyze_mysql',
        name: 'ANALYZE TABLE',
        description: 'Update table statistics for the query optimizer.',
        icon: <SpeedIcon />,
        engines: ['mysql', 'mariadb'],
        getCommand: (schema) => `ANALYZE TABLE ${schema ? `\`${schema}\`.*` : '*'}`,
        requiresSchema: true,
        color: '#06b6d4',
    },
];

interface OperationResult {
    operationId: string;
    success: boolean;
    message: string;
    duration?: number;
}

export function MaintenanceTab({
    connectionId,
    connection,
    schemas,
    selectedSchema: externalSchema,
    onSchemaChange,
}: MaintenanceTabProps) {
    const toast = useToastStore();
    // Use external schema if provided, otherwise use local state
    const [localSchema, setLocalSchema] = useState<string>(externalSchema || '');
    const selectedSchema = externalSchema ?? localSchema;
    const [results, setResults] = useState<OperationResult[]>([]);
    const [runningOperation, setRunningOperation] = useState<string | null>(null);

    const handleSchemaChange = (schema: string) => {
        setLocalSchema(schema);
        onSchemaChange?.(schema);
    };

    const executeMutation = useMutation({
        mutationFn: async ({
            operation,
            schema,
        }: {
            operation: MaintenanceOperation;
            schema?: string;
        }) => {
            const startTime = Date.now();
            let command = operation.getCommand(schema);

            // Handle special PostgreSQL commands
            if (operation.id === 'reindex' && connection?.engine === 'postgres') {
                command = `REINDEX DATABASE "${connection.database}"`;
            }

            await queriesApi.execute(connectionId, command);
            return { duration: Date.now() - startTime };
        },
        onSuccess: (data, { operation }) => {
            const result: OperationResult = {
                operationId: operation.id,
                success: true,
                message: `${operation.name} completed successfully`,
                duration: data.duration,
            };
            setResults((prev) => [result, ...prev.slice(0, 9)]);
            toast.success(`${operation.name} completed in ${(data.duration / 1000).toFixed(2)}s`);
            setRunningOperation(null);
        },
        onError: (error, { operation }) => {
            const result: OperationResult = {
                operationId: operation.id,
                success: false,
                message: error instanceof Error ? error.message : 'Operation failed',
            };
            setResults((prev) => [result, ...prev.slice(0, 9)]);
            toast.error(`${operation.name} failed: ${result.message}`);
            setRunningOperation(null);
        },
    });

    const handleRunOperation = (operation: MaintenanceOperation) => {
        setRunningOperation(operation.id);
        executeMutation.mutate({
            operation,
            schema: operation.requiresSchema ? selectedSchema : undefined,
        });
    };

    // Filter operations by engine
    const availableOperations = MAINTENANCE_OPERATIONS.filter(
        (op) => connection?.engine && op.engines.includes(connection.engine)
    );

    const isSqlite = connection?.engine === 'sqlite';

    return (
        <Box>
            {/* Info Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                    Maintenance operations help keep your database running efficiently. Some
                    operations may temporarily lock tables or impact performance. Run during
                    low-traffic periods when possible.
                </Typography>
            </Alert>

            {/* Schema Selector (for operations that need it) */}
            {!isSqlite && schemas.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Target Schema</InputLabel>
                        <Select
                            value={selectedSchema || ''}
                            onChange={(e) => handleSchemaChange(e.target.value)}
                            label="Target Schema"
                        >
                            <MenuItem value="">All schemas</MenuItem>
                            {schemas.map((schema) => (
                                <MenuItem key={schema} value={schema}>
                                    {schema}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            {/* Operations Grid */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: 2,
                    mb: 3,
                }}
            >
                {availableOperations.map((operation) => {
                    const isRunning = runningOperation === operation.id;
                    const needsSchema = operation.requiresSchema && !selectedSchema;

                    return (
                        <GlassCard key={operation.id} sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: `${operation.color}15`,
                                        color: operation.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {operation.icon}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            mb: 0.5,
                                        }}
                                    >
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {operation.name}
                                        </Typography>
                                        {operation.id === 'vacuum_full' && (
                                            <Chip
                                                label="CAUTION"
                                                size="small"
                                                sx={{
                                                    height: 18,
                                                    fontSize: 9,
                                                    bgcolor: 'rgba(220, 38, 38, 0.15)',
                                                    color: '#dc2626',
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 2 }}
                                    >
                                        {operation.description}
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleRunOperation(operation)}
                                        disabled={isRunning || needsSchema || connection?.readOnly}
                                        startIcon={
                                            isRunning ? (
                                                <CircularProgress size={14} />
                                            ) : (
                                                operation.icon
                                            )
                                        }
                                        sx={{
                                            borderColor: operation.color,
                                            color: operation.color,
                                            '&:hover': {
                                                borderColor: operation.color,
                                                bgcolor: `${operation.color}10`,
                                            },
                                        }}
                                    >
                                        {isRunning ? 'Running...' : `Run ${operation.name}`}
                                    </Button>
                                    {needsSchema && (
                                        <Typography
                                            variant="caption"
                                            color="warning.main"
                                            sx={{ display: 'block', mt: 1 }}
                                        >
                                            Select a schema first
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </GlassCard>
                    );
                })}
            </Box>

            {/* Read-only warning */}
            {connection?.readOnly && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    This connection is read-only. Maintenance operations are disabled.
                </Alert>
            )}

            {/* Results History */}
            {results.length > 0 && (
                <GlassCard>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        Recent Operations
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {results.map((result, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    p: 1.5,
                                    bgcolor: result.success
                                        ? 'rgba(34, 197, 94, 0.1)'
                                        : 'rgba(220, 38, 38, 0.1)',
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: result.success
                                        ? 'rgba(34, 197, 94, 0.3)'
                                        : 'rgba(220, 38, 38, 0.3)',
                                }}
                            >
                                {result.success ? (
                                    <CheckCircleIcon sx={{ color: 'success.main' }} />
                                ) : (
                                    <BuildIcon sx={{ color: 'error.main' }} />
                                )}
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2">{result.message}</Typography>
                                </Box>
                                {result.duration && (
                                    <Chip
                                        label={`${(result.duration / 1000).toFixed(2)}s`}
                                        size="small"
                                        sx={{ height: 22, fontSize: 11 }}
                                    />
                                )}
                            </Box>
                        ))}
                    </Box>
                </GlassCard>
            )}
        </Box>
    );
}
