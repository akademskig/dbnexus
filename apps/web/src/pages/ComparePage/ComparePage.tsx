import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Paper,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    CompareArrows as CompareIcon,
    SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import { connectionsApi, schemaApi } from '../../lib/api';
import { ConnectionSelector } from './ConnectionSelector';
import { SchemaDiffDisplay } from './SchemaDiffDisplay';
import { getDefaultSchema } from './utils';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';

export function ComparePage() {
    const queryClient = useQueryClient();
    const [sourceConnectionId, setSourceConnectionId] = useState<string>('');
    const [targetConnectionId, setTargetConnectionId] = useState<string>('');
    const [sourceSchema, setSourceSchema] = useState<string>('');
    const [targetSchema, setTargetSchema] = useState<string>('');
    const [comparing, setComparing] = useState(false);
    const [applying, setApplying] = useState(false);

    // Fetch connections
    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    // Get selected connections
    const sourceConnection = connections.find((c) => c.id === sourceConnectionId);
    const targetConnection = connections.find((c) => c.id === targetConnectionId);

    // Fetch schemas for source connection
    const { data: sourceSchemas = [] } = useQuery({
        queryKey: ['schemas', sourceConnectionId],
        queryFn: () => schemaApi.getSchemas(sourceConnectionId),
        enabled: !!sourceConnectionId,
    });

    // Fetch schemas for target connection
    const { data: targetSchemas = [] } = useQuery({
        queryKey: ['schemas', targetConnectionId],
        queryFn: () => schemaApi.getSchemas(targetConnectionId),
        enabled: !!targetConnectionId,
    });

    // Auto-select default schema for source
    if (sourceSchemas.length > 0 && !sourceSchema) {
        const defaultSchema = getDefaultSchema(sourceConnection, sourceSchemas);
        if (defaultSchema) setSourceSchema(defaultSchema);
    }

    // Auto-select default schema for target
    if (targetSchemas.length > 0 && !targetSchema) {
        const defaultSchema = getDefaultSchema(targetConnection, targetSchemas);
        if (defaultSchema) setTargetSchema(defaultSchema);
    }

    // Fetch schema diff
    const {
        data: schemaDiff,
        isLoading: loadingDiff,
        refetch: refetchDiff,
    } = useQuery({
        queryKey: [
            'schemaDiff',
            sourceConnectionId,
            targetConnectionId,
            sourceSchema,
            targetSchema,
        ],
        queryFn: () =>
            schemaApi.compareSchemasApi(
                sourceConnectionId,
                targetConnectionId,
                sourceSchema,
                targetSchema
            ),
        enabled:
            comparing &&
            !!sourceConnectionId &&
            !!targetConnectionId &&
            !!sourceSchema &&
            !!targetSchema,
        staleTime: 0, // Always refetch when comparing
    });

    // Fetch migration SQL
    const { data: migrationSqlData } = useQuery({
        queryKey: [
            'migrationSql',
            sourceConnectionId,
            targetConnectionId,
            sourceSchema,
            targetSchema,
        ],
        queryFn: () =>
            schemaApi.getMigrationSql(
                sourceConnectionId,
                targetConnectionId,
                sourceSchema,
                targetSchema
            ),
        enabled:
            comparing && !!schemaDiff && !!sourceConnectionId && !!targetConnectionId,
        staleTime: 0,
    });

    const handleCompare = () => {
        setComparing(true);
        // Invalidate cache to force fresh comparison
        queryClient.invalidateQueries({
            queryKey: ['schemaDiff', sourceConnectionId, targetConnectionId],
        });
        queryClient.invalidateQueries({
            queryKey: ['migrationSql', sourceConnectionId, targetConnectionId],
        });
        refetchDiff();
    };

    const handleSwap = () => {
        const tempConn = sourceConnectionId;
        const tempSchema = sourceSchema;
        setSourceConnectionId(targetConnectionId);
        setSourceSchema(targetSchema);
        setTargetConnectionId(tempConn);
        setTargetSchema(tempSchema);
        setComparing(false);
    };

    const handleApplyMigration = async () => {
        if (!sourceConnectionId || !targetConnectionId || !sourceSchema || !targetSchema)
            return;

        setApplying(true);
        try {
            await schemaApi.applyMigration(
                sourceConnectionId,
                targetConnectionId,
                sourceSchema,
                targetSchema,
                'Applied from Compare page'
            );
            // Refresh the diff
            queryClient.invalidateQueries({ queryKey: ['schemaDiff'] });
            queryClient.invalidateQueries({ queryKey: ['migrationSql'] });
            refetchDiff();
        } catch (error) {
            console.error('Failed to apply migration:', error);
        } finally {
            setApplying(false);
        }
    };

    const canCompare =
        sourceConnectionId && targetConnectionId && sourceSchema && targetSchema;

    return (
        <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                    Compare Schemas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Compare schemas between any two database connections and generate migration
                    scripts.
                </Typography>
            </Box>

            {/* Connection Selection */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {/* Source */}
                    <ConnectionSelector
                        label="Source (reference)"
                        connectionId={sourceConnectionId}
                        schema={sourceSchema}
                        connections={connections}
                        schemas={sourceSchemas}
                        disabledConnectionId={targetConnectionId}
                        loadingConnections={loadingConnections}
                        onConnectionChange={(id) => {
                            setSourceConnectionId(id);
                            setSourceSchema('');
                            setComparing(false);
                        }}
                        onSchemaChange={(s) => {
                            setSourceSchema(s);
                            setComparing(false);
                        }}
                    />

                    {/* Swap Button */}
                    <Tooltip title="Swap source and target">
                        <IconButton
                            onClick={handleSwap}
                            disabled={!sourceConnectionId || !targetConnectionId}
                            sx={{ mt: 2 }}
                        >
                            <SwapIcon />
                        </IconButton>
                    </Tooltip>

                    {/* Target */}
                    <ConnectionSelector
                        label="Target (to be updated)"
                        connectionId={targetConnectionId}
                        schema={targetSchema}
                        connections={connections}
                        schemas={targetSchemas}
                        disabledConnectionId={sourceConnectionId}
                        loadingConnections={loadingConnections}
                        onConnectionChange={(id) => {
                            setTargetConnectionId(id);
                            setTargetSchema('');
                            setComparing(false);
                        }}
                        onSchemaChange={(s) => {
                            setTargetSchema(s);
                            setComparing(false);
                        }}
                    />

                    {/* Compare Button */}
                    <Button
                        variant="contained"
                        startIcon={
                            comparing && loadingDiff ? (
                                <CircularProgress size={16} />
                            ) : (
                                <CompareIcon />
                            )
                        }
                        onClick={handleCompare}
                        disabled={!canCompare || loadingDiff}
                        sx={{ mt: 2 }}
                    >
                        {comparing ? 'Refresh' : 'Compare'}
                    </Button>
                </Box>
            </Paper>

            {/* Results */}
            {comparing && (
                <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant="h6">Schema Differences</Typography>
                        <Chip
                            label={`${sourceConnection?.name || 'Source'}.${sourceSchema}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                        <Typography color="text.secondary">→</Typography>
                        <Chip
                            label={`${targetConnection?.name || 'Target'}.${targetSchema}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                        />
                    </Box>

                    {loadingDiff ? (
                        <LoadingState message="Comparing schemas..." size="medium" />
                    ) : schemaDiff ? (
                        <SchemaDiffDisplay
                            diff={schemaDiff}
                            migrationSql={migrationSqlData?.sql || []}
                            onApplyMigration={handleApplyMigration}
                            applying={applying}
                        />
                    ) : (
                        <Alert severity="info">
                            Select source and target connections, then click Compare to see
                            differences.
                        </Alert>
                    )}
                </Paper>
            )}

            {/* Empty state */}
            {!comparing && (
                <Paper sx={{ p: 3 }}>
                    <EmptyState
                        icon={<CompareIcon />}
                        title="Select connections to compare"
                        description="Choose a source and target database connection above, then click Compare to see schema differences and generate migration scripts."
                        size="large"
                    />
                </Paper>
            )}
        </Box>
    );
}
