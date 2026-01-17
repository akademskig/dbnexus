import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
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
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import {
    CompareArrows as CompareIcon,
    SwapHoriz as SwapIcon,
    Schema as SchemaIcon,
    Storage as DataIcon,
} from '@mui/icons-material';
import { connectionsApi, schemaApi, groupsApi, projectsApi } from '../../lib/api';
import { ConnectionSelector } from './ConnectionSelector';
import { SchemaDiffDisplay } from './SchemaDiffDisplay';
import { DataDiffDisplay } from './DataDiffDisplay';
import { getDefaultSchema } from './utils';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import type { DatabaseGroup } from '@dbnexus/shared';

type CompareTab = 'schema' | 'data';

// Cache results for 10 minutes - they only refresh on explicit Compare click
const COMPARE_CACHE_TIME = 10 * 60 * 1000;

export function ComparePage() {
    const queryClient = useQueryClient();
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [sourceConnectionId, setSourceConnectionId] = useState<string>('');
    const [targetConnectionId, setTargetConnectionId] = useState<string>('');
    const [sourceSchema, setSourceSchema] = useState<string>('');
    const [targetSchema, setTargetSchema] = useState<string>('');
    const [hasCompared, setHasCompared] = useState(false);
    const [applying, setApplying] = useState(false);
    const [activeTab, setActiveTab] = useState<CompareTab>('schema');

    // Fetch connections
    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    // Fetch groups
    const { data: groups = [] } = useQuery<DatabaseGroup[]>({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    // Fetch projects for group display
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: projectsApi.getAll,
    });

    // Filter connections by selected group
    const groupedConnections = useMemo(() => {
        if (!selectedGroupId) return [];
        return connections.filter((conn) => conn.groupId === selectedGroupId);
    }, [connections, selectedGroupId]);

    // Auto-select first group if none selected
    useEffect(() => {
        if (groups.length > 0 && !selectedGroupId && groups[0]) {
            setSelectedGroupId(groups[0].id);
        }
    }, [groups, selectedGroupId]);

    // Get selected connections
    const sourceConnection = groupedConnections.find((c) => c.id === sourceConnectionId);
    const targetConnection = groupedConnections.find((c) => c.id === targetConnectionId);

    // Get selected group info
    const selectedGroup = groups.find((g) => g.id === selectedGroupId);

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

    // Build query key for comparison results
    const compareQueryKey = [
        'schemaDiff',
        sourceConnectionId,
        targetConnectionId,
        sourceSchema,
        targetSchema,
    ];

    // Check if we have cached results for the current selection
    const hasCachedResults = !!queryClient.getQueryData(compareQueryKey);

    // Auto-show results if we have cached data for this comparison
    useEffect(() => {
        if (hasCachedResults && !hasCompared) {
            setHasCompared(true);
        }
    }, [hasCachedResults, hasCompared]);

    // Fetch schema diff - enabled when we have valid selections AND have clicked compare
    const {
        data: schemaDiff,
        isLoading: loadingDiff,
        isFetching: fetchingDiff,
        refetch: refetchDiff,
    } = useQuery({
        queryKey: compareQueryKey,
        queryFn: () =>
            schemaApi.compareSchemasApi(
                sourceConnectionId,
                targetConnectionId,
                sourceSchema,
                targetSchema
            ),
        enabled:
            hasCompared &&
            activeTab === 'schema' &&
            !!sourceConnectionId &&
            !!targetConnectionId &&
            !!sourceSchema &&
            !!targetSchema,
        staleTime: COMPARE_CACHE_TIME,
        gcTime: COMPARE_CACHE_TIME,
    });

    // Use isFetching instead of isLoading to show loader on refetches too
    const isComparing = loadingDiff || fetchingDiff;

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
            hasCompared &&
            activeTab === 'schema' &&
            !!schemaDiff &&
            !!sourceConnectionId &&
            !!targetConnectionId,
        staleTime: COMPARE_CACHE_TIME,
        gcTime: COMPARE_CACHE_TIME,
    });

    const handleCompare = () => {
        setHasCompared(true);
        // Invalidate cache to force fresh comparison
        queryClient.invalidateQueries({
            queryKey: ['schemaDiff', sourceConnectionId, targetConnectionId],
        });
        queryClient.invalidateQueries({
            queryKey: ['migrationSql', sourceConnectionId, targetConnectionId],
        });
        queryClient.invalidateQueries({
            queryKey: ['tableDiffs', sourceConnectionId, targetConnectionId],
        });
        if (activeTab === 'schema') {
            refetchDiff();
        }
    };

    const handleSwap = () => {
        const tempConn = sourceConnectionId;
        const tempSchema = sourceSchema;
        setSourceConnectionId(targetConnectionId);
        setSourceSchema(targetSchema);
        setTargetConnectionId(tempConn);
        setTargetSchema(tempSchema);
        // Don't reset hasCompared - let cached results show if available
    };

    const handleApplyMigration = async () => {
        if (!sourceConnectionId || !targetConnectionId || !sourceSchema || !targetSchema) return;

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

    const handleTabChange = (_: React.SyntheticEvent, newValue: CompareTab) => {
        setActiveTab(newValue);
    };

    const canCompare = sourceConnectionId && targetConnectionId && sourceSchema && targetSchema;

    // Reset connection selections when group changes
    useEffect(() => {
        setSourceConnectionId('');
        setTargetConnectionId('');
        setSourceSchema('');
        setTargetSchema('');
        setHasCompared(false);
    }, [selectedGroupId]);

    // Redirect to dashboard if no connections after loading
    if (!loadingConnections && connections.length === 0) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                    Compare Databases
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Compare schemas and data between connections within the same instance group.
                </Typography>
            </Box>

            {/* Group Selection */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Select Instance Group
                </Typography>
                {groups.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        No instance groups found. Create groups in the Projects page to compare
                        connections.
                    </Alert>
                ) : (
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                        <InputLabel>Instance Group</InputLabel>
                        <Select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            label="Instance Group"
                        >
                            {groups.map((group) => {
                                const project = projects.find((p) => p.id === group.projectId);
                                return (
                                    <MenuItem key={group.id} value={group.id}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                width: '100%',
                                            }}
                                        >
                                            {project && (
                                                <Chip
                                                    label={project.name}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: 11,
                                                        bgcolor: `${project.color}20`,
                                                        color: project.color,
                                                    }}
                                                />
                                            )}
                                            <span>{group.name}</span>
                                            <Chip
                                                label={
                                                    group.databaseEngine === 'postgres'
                                                        ? 'PostgreSQL'
                                                        : group.databaseEngine === 'mysql'
                                                          ? 'MySQL'
                                                          : group.databaseEngine === 'mariadb'
                                                            ? 'MariaDB'
                                                            : 'SQLite'
                                                }
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: 11,
                                                    bgcolor: 'primary.main',
                                                    color: 'primary.contrastText',
                                                }}
                                            />
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ ml: 'auto' }}
                                            >
                                                {
                                                    connections.filter(
                                                        (c) => c.groupId === group.id
                                                    ).length
                                                }{' '}
                                                connections
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                )}
            </Paper>

            {/* Connection Selection */}
            {selectedGroupId && groupedConnections.length >= 2 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        {/* Source */}
                        <ConnectionSelector
                            label="Source (reference)"
                            connectionId={sourceConnectionId}
                            schema={sourceSchema}
                            connections={groupedConnections}
                            schemas={sourceSchemas}
                            disabledConnectionId={targetConnectionId}
                            loadingConnections={loadingConnections}
                            onConnectionChange={(id) => {
                                setSourceConnectionId(id);
                                setSourceSchema('');
                                // Check if we have cached results for new selection
                            }}
                            onSchemaChange={(s) => {
                                setSourceSchema(s);
                            }}
                        />

                        {/* Swap Button */}
                        <StyledTooltip title="Swap source and target">
                            <IconButton
                                onClick={handleSwap}
                                disabled={!sourceConnectionId || !targetConnectionId}
                                sx={{ mt: 2 }}
                            >
                                <SwapIcon />
                            </IconButton>
                        </StyledTooltip>

                        {/* Target */}
                        <ConnectionSelector
                            label="Target (to be updated)"
                            connectionId={targetConnectionId}
                            schema={targetSchema}
                            connections={groupedConnections}
                            schemas={targetSchemas}
                            disabledConnectionId={sourceConnectionId}
                            loadingConnections={loadingConnections}
                            onConnectionChange={(id) => {
                                setTargetConnectionId(id);
                                setTargetSchema('');
                            }}
                            onSchemaChange={(s) => {
                                setTargetSchema(s);
                            }}
                        />

                        {/* Compare Button */}
                        <Button
                            variant="contained"
                            data-tour="compare-button"
                            startIcon={
                                isComparing ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <CompareIcon />
                                )
                            }
                            onClick={handleCompare}
                            disabled={!canCompare || isComparing}
                            sx={{ mt: 2 }}
                        >
                            {isComparing && 'Comparing...'}
                            {!isComparing && (hasCachedResults || schemaDiff) && 'Refresh'}
                            {!isComparing && !hasCachedResults && !schemaDiff && 'Compare'}
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Not enough connections message */}
            {selectedGroupId && groupedConnections.length < 2 && (
                <Alert severity="info">
                    {groupedConnections.length === 0
                        ? `No connections found in the "${selectedGroup?.name}" group. Add connections to this group in the Projects page.`
                        : `Only ${groupedConnections.length} connection found in the "${selectedGroup?.name}" group. At least 2 connections are required for comparison.`}
                </Alert>
            )}

            {/* Results */}
            {hasCompared && (
                <Paper sx={{ p: 0 }}>
                    {/* Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={activeTab} onChange={handleTabChange}>
                            <Tab
                                value="schema"
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <SchemaIcon fontSize="small" />
                                        Schema
                                        {schemaDiff && schemaDiff.items.length > 0 && (
                                            <Chip
                                                label={schemaDiff.items.length}
                                                size="small"
                                                color="warning"
                                                sx={{ height: 20, fontSize: 11 }}
                                            />
                                        )}
                                    </Box>
                                }
                            />
                            <Tab
                                value="data"
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <DataIcon fontSize="small" />
                                        Data
                                    </Box>
                                }
                            />
                        </Tabs>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ p: 3 }}>
                        {/* Header with connection info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Typography variant="h6">
                                {activeTab === 'schema' ? 'Schema Differences' : 'Data Differences'}
                            </Typography>
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

                        {/* Schema Tab */}
                        {activeTab === 'schema' && isComparing && (
                            <LoadingState message="Comparing schemas..." size="medium" />
                        )}
                        {activeTab === 'schema' && !isComparing && schemaDiff && (
                            <SchemaDiffDisplay
                                diff={schemaDiff}
                                migrationSql={migrationSqlData?.sql || []}
                                onApplyMigration={handleApplyMigration}
                                applying={applying}
                            />
                        )}
                        {activeTab === 'schema' && !isComparing && !schemaDiff && (
                            <Alert severity="info">Click Compare to see schema differences.</Alert>
                        )}

                        {/* Data Tab */}
                        {activeTab === 'data' && (
                            <DataDiffDisplay
                                sourceConnectionId={sourceConnectionId}
                                targetConnectionId={targetConnectionId}
                                sourceSchema={sourceSchema}
                                targetSchema={targetSchema}
                                sourceConnectionName={sourceConnection?.name || 'Source'}
                                targetConnectionName={targetConnection?.name || 'Target'}
                            />
                        )}
                    </Box>
                </Paper>
            )}

            {/* Empty state */}
            {!hasCompared && (
                <Paper sx={{ p: 3 }}>
                    <EmptyState
                        icon={<CompareIcon />}
                        title="Select connections to compare"
                        description="Choose a source and target database connection above, then click Compare to see schema and data differences."
                        size="large"
                    />
                </Paper>
            )}
        </Box>
    );
}
