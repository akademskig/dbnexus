import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    RadioGroup,
    FormControlLabel,
    Radio,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import type { ConnectionConfig } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import {
    OperationResultsList,
    type OperationResultData,
    StatusAlert,
} from '../../components/StatusAlert';
import { queriesApi, schemaApi } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';

interface MaintenanceTabProps {
    connectionId: string;
    connection: ConnectionConfig | undefined;
    schemas: string[];
    selectedSchema?: string | null;
    onSchemaChange?: (schema: string) => void;
}

type OperationScope = 'database' | 'schema' | 'table';

interface MaintenanceOperation {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    engines: string[];
    getCommand: (target?: string) => string;
    scope: OperationScope;
    scopeOptions?: OperationScope[]; // Multiple scope options (e.g., database or table)
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
        scope: 'database',
        scopeOptions: ['database', 'table'],
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
        scope: 'database',
        scopeOptions: ['database', 'table'],
        color: '#dc2626',
    },
    {
        id: 'analyze',
        name: 'ANALYZE',
        description: 'Update statistics used by the query planner. Improves query performance.',
        icon: <SpeedIcon />,
        engines: ['postgres', 'sqlite'],
        getCommand: () => 'ANALYZE',
        scope: 'database',
        scopeOptions: ['database', 'table'],
        color: '#06b6d4',
    },
    {
        id: 'vacuum_analyze',
        name: 'VACUUM ANALYZE',
        description: 'Combines VACUUM and ANALYZE in one operation. Good for routine maintenance.',
        icon: <BuildIcon />,
        engines: ['postgres'],
        getCommand: () => 'VACUUM ANALYZE',
        scope: 'database',
        scopeOptions: ['database', 'table'],
        color: '#22c55e',
    },
    {
        id: 'reindex',
        name: 'REINDEX',
        description: 'Rebuild indexes. Can target database, schema, or individual tables/indexes.',
        icon: <StorageIcon />,
        engines: ['postgres'],
        getCommand: () => 'REINDEX',
        scope: 'database',
        scopeOptions: ['database', 'schema', 'table'],
        color: '#f59e0b',
    },
    {
        id: 'optimize',
        name: 'OPTIMIZE TABLE',
        description:
            'Reorganize table storage and rebuild indexes. MySQL/MariaDB equivalent of VACUUM.',
        icon: <CleaningServicesIcon />,
        engines: ['mysql', 'mariadb'],
        getCommand: () => 'OPTIMIZE TABLE',
        scope: 'table',
        color: '#8b5cf6',
    },
    {
        id: 'analyze_mysql',
        name: 'ANALYZE TABLE',
        description: 'Update table statistics for the query optimizer.',
        icon: <SpeedIcon />,
        engines: ['mysql', 'mariadb'],
        getCommand: () => 'ANALYZE TABLE',
        scope: 'table',
        color: '#06b6d4',
    },
];

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
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [selectedScope, setSelectedScope] = useState<OperationScope>('database');
    const [results, setResults] = useState<OperationResultData[]>([]);
    const [runningOperation, setRunningOperation] = useState<string | null>(null);

    const handleSchemaChange = (schema: string) => {
        setLocalSchema(schema);
        setSelectedTable(''); // Reset table when schema changes
        onSchemaChange?.(schema);
    };

    // Fetch tables for the selected schema
    const { data: tables = [] } = useQuery({
        queryKey: ['tables', connectionId, selectedSchema],
        queryFn: () => schemaApi.getTables(connectionId, selectedSchema || 'public'),
        enabled: !!connectionId && !!selectedSchema,
    });

    const executeMutation = useMutation({
        mutationFn: async ({
            operation,
            target,
            scope,
        }: {
            operation: MaintenanceOperation;
            target?: string;
            scope: OperationScope;
        }) => {
            return await queriesApi.executeMaintenance(connectionId, operation.id, target, scope);
        },
        onSuccess: (data, { operation }) => {
            const result: OperationResultData = {
                id: operation.id,
                success: data.success,
                message: data.message,
                duration: data.duration,
                details: data.details,
            };
            setResults((prev) => [result, ...prev.slice(0, 9)]);
            if (data.success) {
                toast.success(`${operation.name} completed in ${(data.duration / 1000).toFixed(2)}s`);
            } else {
                toast.error(`${operation.name} completed with errors`);
            }
            setRunningOperation(null);
        },
        onError: (error, { operation }) => {
            const result: OperationResultData = {
                id: operation.id,
                success: false,
                message: error instanceof Error ? error.message : 'Operation failed',
            };
            setResults((prev) => [result, ...prev.slice(0, 9)]);
            toast.error(`${operation.name} failed: ${result.message}`);
            setRunningOperation(null);
        },
    });

    const handleRunOperation = (operation: MaintenanceOperation) => {
        // Determine the target based on scope
        let target: string | undefined;
        const scope = operation.scopeOptions ? selectedScope : operation.scope;

        if (scope === 'table') {
            if (!selectedTable) {
                toast.error('Please select a table');
                return;
            }
            // For PostgreSQL and MySQL, use schema.table format
            // For SQLite, just use table name
            if (connection?.engine === 'sqlite') {
                target = selectedTable;
            } else {
                target = `${selectedSchema}.${selectedTable}`;
            }
        } else if (scope === 'schema') {
            if (!selectedSchema) {
                toast.error('Please select a schema');
                return;
            }
            target = selectedSchema;
        }
        // For 'database' scope, target is undefined (operates on whole database)

        setRunningOperation(operation.id);
        executeMutation.mutate({
            operation,
            target,
            scope,
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
            <StatusAlert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                    Maintenance operations help keep your database running efficiently. Some
                    operations may temporarily lock tables or impact performance. Run during
                    low-traffic periods when possible.
                </Typography>
            </StatusAlert>

            {/* Target Selection */}
            {!isSqlite && (
                <GlassCard sx={{ mb: 3, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Operation Target
                    </Typography>

                    {/* Scope Selector (for operations with multiple scope options) */}
                    {availableOperations.some((op) => op.scopeOptions) && (
                        <Box sx={{ mb: 2 }}>
                            <RadioGroup
                                row
                                value={selectedScope}
                                onChange={(e) => setSelectedScope(e.target.value as OperationScope)}
                            >
                                <FormControlLabel
                                    value="database"
                                    control={<Radio size="small" />}
                                    label="Entire Database"
                                />
                                <FormControlLabel
                                    value="schema"
                                    control={<Radio size="small" />}
                                    label="Schema"
                                />
                                <FormControlLabel
                                    value="table"
                                    control={<Radio size="small" />}
                                    label="Single Table"
                                />
                            </RadioGroup>
                        </Box>
                    )}

                    {/* Schema and Table Selectors */}
                    {(selectedScope === 'schema' || selectedScope === 'table') &&
                        schemas.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                {/* Schema Selector */}
                                <FormControl size="small" sx={{ minWidth: 200 }}>
                                    <InputLabel>Schema</InputLabel>
                                    <Select
                                        value={selectedSchema || ''}
                                        onChange={(e) => handleSchemaChange(e.target.value)}
                                        label="Schema"
                                    >
                                        {schemas.map((schema) => (
                                            <MenuItem key={schema} value={schema}>
                                                {schema}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* Table Selector */}
                                {selectedScope === 'table' && selectedSchema && (
                                    <FormControl size="small" sx={{ minWidth: 200 }}>
                                        <InputLabel>Table</InputLabel>
                                        <Select
                                            value={selectedTable}
                                            onChange={(e) => setSelectedTable(e.target.value)}
                                            label="Table"
                                            disabled={tables.length === 0}
                                        >
                                            {tables.map((table) => (
                                                <MenuItem key={table.name} value={table.name}>
                                                    {table.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {tables.length === 0 && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ mt: 0.5, display: 'block' }}
                                            >
                                                No tables found
                                            </Typography>
                                        )}
                                    </FormControl>
                                )}
                            </Box>
                        )}
                </GlassCard>
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
                    const currentScope = operation.scopeOptions ? selectedScope : operation.scope;
                    const needsTarget =
                        (currentScope === 'schema' || currentScope === 'table') && !selectedSchema;
                    const needsTable = currentScope === 'table' && !selectedTable;

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
                                        disabled={
                                            isRunning ||
                                            needsTarget ||
                                            needsTable ||
                                            connection?.readOnly
                                        }
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
                                    {needsTable ? (
                                        <Typography
                                            variant="caption"
                                            color="warning.main"
                                            sx={{ display: 'block', mt: 1 }}
                                        >
                                            Select a table first
                                        </Typography>
                                    ) : needsTarget ? (
                                        <Typography
                                            variant="caption"
                                            color="warning.main"
                                            sx={{ display: 'block', mt: 1 }}
                                        >
                                            Select a schema first
                                        </Typography>
                                    ) : null}
                                </Box>
                            </Box>
                        </GlassCard>
                    );
                })}
            </Box>

            {/* Read-only warning */}
            {connection?.readOnly && (
                <StatusAlert severity="warning" sx={{ mb: 3 }}>
                    This connection is read-only. Maintenance operations are disabled.
                </StatusAlert>
            )}

            {/* Results History */}
            {results.length > 0 && (
                <GlassCard>
                    <OperationResultsList results={results} />
                </GlassCard>
            )}
        </Box>
    );
}
