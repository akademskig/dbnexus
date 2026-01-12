import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
    Storage as DatabaseIcon,
    Sync as SyncIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Edit as EditIcon,
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    CompareArrows as CompareIcon,
    SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import { connectionsApi, schemaApi } from '../lib/api';
import type { ConnectionConfig, SchemaDiff, SchemaDiffItem } from '@dbnexus/shared';

// Diff type badge component
function DiffTypeBadge({ type }: { type: string }) {
    const config: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
        table_added: { icon: <AddIcon sx={{ fontSize: 14 }} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        table_removed: { icon: <RemoveIcon sx={{ fontSize: 14 }} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        column_added: { icon: <AddIcon sx={{ fontSize: 14 }} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        column_removed: { icon: <RemoveIcon sx={{ fontSize: 14 }} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        column_modified: { icon: <EditIcon sx={{ fontSize: 14 }} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        index_added: { icon: <AddIcon sx={{ fontSize: 14 }} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        index_removed: { icon: <RemoveIcon sx={{ fontSize: 14 }} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        index_modified: { icon: <EditIcon sx={{ fontSize: 14 }} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        fk_added: { icon: <AddIcon sx={{ fontSize: 14 }} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        fk_removed: { icon: <RemoveIcon sx={{ fontSize: 14 }} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        fk_modified: { icon: <EditIcon sx={{ fontSize: 14 }} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    };

    const cfg = config[type] || { icon: <EditIcon sx={{ fontSize: 14 }} />, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' };

    return (
        <Chip
            icon={cfg.icon as React.ReactElement}
            label={type.replace(/_/g, ' ')}
            size="small"
            sx={{
                bgcolor: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.color}`,
                '& .MuiChip-icon': { color: cfg.color },
                fontSize: 11,
                height: 24,
            }}
        />
    );
}

// Schema diff display component
function SchemaDiffDisplay({
    diff,
    migrationSql,
    onApplyMigration,
    applying,
}: {
    diff: SchemaDiff;
    migrationSql: string[];
    onApplyMigration: () => void;
    applying: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const sqlText = migrationSql.join('\n\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Group diff items by table
    const groupedItems = useMemo(() => {
        const groups: Record<string, SchemaDiffItem[]> = {};
        for (const item of diff.items) {
            const tableName = item.table || 'General';
            groups[tableName] ??= [];
            groups[tableName]!.push(item);
        }
        return groups;
    }, [diff.items]);

    const totalAdded = diff.summary.tablesAdded + diff.summary.columnsAdded + diff.summary.indexesAdded + diff.summary.fksAdded;
    const totalRemoved = diff.summary.tablesRemoved + diff.summary.columnsRemoved + diff.summary.indexesRemoved + diff.summary.fksRemoved;
    const totalModified = diff.summary.columnsModified + diff.summary.indexesModified + diff.summary.fksModified;

    if (diff.items.length === 0) {
        return (
            <Alert severity="success" icon={<CheckIcon />}>
                Schemas are identical - no differences found.
            </Alert>
        );
    }

    return (
        <Box>
            {/* Summary chips */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                    label={`${totalAdded} added`}
                    size="small"
                    sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
                />
                <Chip
                    label={`${totalRemoved} removed`}
                    size="small"
                    sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                />
                <Chip
                    label={`${totalModified} modified`}
                    size="small"
                    sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}
                />
            </Box>

            {/* Grouped diff items */}
            {Object.entries(groupedItems).map(([tableName, items]) => (
                <Accordion key={tableName} defaultExpanded sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                        <Typography fontWeight={500}>{tableName}</Typography>
                        <Box sx={{ ml: 2, display: 'flex', gap: 0.5 }}>
                            {items.map((item, idx) => (
                                <DiffTypeBadge key={idx} type={item.type} />
                            ))}
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        {items.map((item, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    p: 1.5,
                                    mb: 1,
                                    bgcolor: 'background.default',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <DiffTypeBadge type={item.type} />
                                    <Typography variant="body2" fontWeight={500}>
                                        {item.type.replace(/_/g, ' ')}: {item.name || item.table}
                                    </Typography>
                                </Box>
                                {item.migrationSql && item.migrationSql.length > 0 && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        component="pre"
                                        sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                                    >
                                        {item.migrationSql.join('\n')}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                    </AccordionDetails>
                </Accordion>
            ))}

            {/* Migration SQL */}
            {migrationSql.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                        }}
                    >
                        <Typography variant="subtitle2">Migration SQL</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                startIcon={copied ? <CheckIcon /> : <CopyIcon />}
                                onClick={handleCopy}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                startIcon={applying ? <CircularProgress size={16} /> : <SyncIcon />}
                                onClick={onApplyMigration}
                                disabled={applying}
                            >
                                Apply Migration
                            </Button>
                        </Box>
                    </Box>
                    <Paper
                        sx={{
                            p: 2,
                            bgcolor: 'background.default',
                            maxHeight: 300,
                            overflow: 'auto',
                        }}
                    >
                        <Typography
                            component="pre"
                            sx={{
                                fontFamily: 'monospace',
                                fontSize: 12,
                                whiteSpace: 'pre-wrap',
                                m: 0,
                            }}
                        >
                            {sqlText}
                        </Typography>
                    </Paper>
                </Box>
            )}
        </Box>
    );
}

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

    // Set default schemas when connections change
    // For MySQL/MariaDB, the database name is the schema
    const getDefaultSchema = (conn: ConnectionConfig | undefined, schemas: string[]) => {
        if (!conn) return '';
        // For MySQL/MariaDB, prefer the database name as the schema
        if (conn.engine === 'mysql' || conn.engine === 'mariadb') {
            if (conn.database && schemas.includes(conn.database)) return conn.database;
        }
        if (conn.defaultSchema && schemas.includes(conn.defaultSchema)) return conn.defaultSchema;
        if (schemas.includes('public')) return 'public';
        if (schemas.includes('main')) return 'main';
        if (schemas.includes('dbo')) return 'dbo';
        return schemas[0] || '';
    };

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
    const { data: schemaDiff, isLoading: loadingDiff, refetch: refetchDiff } = useQuery({
        queryKey: ['schemaDiff', sourceConnectionId, targetConnectionId, sourceSchema, targetSchema],
        queryFn: () => schemaApi.compareSchemasApi(sourceConnectionId, targetConnectionId, sourceSchema, targetSchema),
        enabled: comparing && !!sourceConnectionId && !!targetConnectionId && !!sourceSchema && !!targetSchema,
        staleTime: 0, // Always refetch when comparing
    });

    // Fetch migration SQL
    const { data: migrationSqlData } = useQuery({
        queryKey: ['migrationSql', sourceConnectionId, targetConnectionId, sourceSchema, targetSchema],
        queryFn: () => schemaApi.getMigrationSql(sourceConnectionId, targetConnectionId, sourceSchema, targetSchema),
        enabled: comparing && !!schemaDiff && !!sourceConnectionId && !!targetConnectionId,
        staleTime: 0,
    });

    const handleCompare = () => {
        setComparing(true);
        // Invalidate cache to force fresh comparison
        queryClient.invalidateQueries({ queryKey: ['schemaDiff', sourceConnectionId, targetConnectionId] });
        queryClient.invalidateQueries({ queryKey: ['migrationSql', sourceConnectionId, targetConnectionId] });
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

    const canCompare = sourceConnectionId && targetConnectionId && sourceSchema && targetSchema;

    return (
        <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                    Compare Schemas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Compare schemas between any two database connections and generate migration scripts.
                </Typography>
            </Box>

            {/* Connection Selection */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {/* Source */}
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            Source (reference)
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <FormControl size="small" sx={{ flex: 1 }}>
                                <InputLabel>Connection</InputLabel>
                                <Select
                                    value={sourceConnectionId}
                                    onChange={(e) => {
                                        setSourceConnectionId(e.target.value);
                                        setSourceSchema('');
                                        setComparing(false);
                                    }}
                                    label="Connection"
                                    disabled={loadingConnections}
                                >
                                    {connections.map((conn) => (
                                        <MenuItem key={conn.id} value={conn.id} disabled={conn.id === targetConnectionId}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DatabaseIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                                {conn.name}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {sourceSchemas.length > 0 && (
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Schema</InputLabel>
                                    <Select
                                        value={sourceSchema}
                                        onChange={(e) => {
                                            setSourceSchema(e.target.value);
                                            setComparing(false);
                                        }}
                                        label="Schema"
                                    >
                                        {sourceSchemas.map((schema) => (
                                            <MenuItem key={schema} value={schema}>
                                                {schema}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </Box>
                    </Box>

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
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            Target (to be updated)
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <FormControl size="small" sx={{ flex: 1 }}>
                                <InputLabel>Connection</InputLabel>
                                <Select
                                    value={targetConnectionId}
                                    onChange={(e) => {
                                        setTargetConnectionId(e.target.value);
                                        setTargetSchema('');
                                        setComparing(false);
                                    }}
                                    label="Connection"
                                    disabled={loadingConnections}
                                >
                                    {connections.map((conn) => (
                                        <MenuItem key={conn.id} value={conn.id} disabled={conn.id === sourceConnectionId}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DatabaseIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                                {conn.name}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {targetSchemas.length > 0 && (
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Schema</InputLabel>
                                    <Select
                                        value={targetSchema}
                                        onChange={(e) => {
                                            setTargetSchema(e.target.value);
                                            setComparing(false);
                                        }}
                                        label="Schema"
                                    >
                                        {targetSchemas.map((schema) => (
                                            <MenuItem key={schema} value={schema}>
                                                {schema}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </Box>
                    </Box>

                    {/* Compare Button */}
                    <Button
                        variant="contained"
                        startIcon={comparing && loadingDiff ? <CircularProgress size={16} /> : <CompareIcon />}
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
                        <Typography variant="h6">
                            Schema Differences
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

                    {loadingDiff ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <CircularProgress size={32} />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                Comparing schemas...
                            </Typography>
                        </Box>
                    ) : schemaDiff ? (
                        <SchemaDiffDisplay
                            diff={schemaDiff}
                            migrationSql={migrationSqlData?.sql || []}
                            onApplyMigration={handleApplyMigration}
                            applying={applying}
                        />
                    ) : (
                        <Alert severity="info">
                            Select source and target connections, then click Compare to see differences.
                        </Alert>
                    )}
                </Paper>
            )}

            {/* Empty state */}
            {!comparing && (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <CompareIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Select connections to compare
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Choose a source and target database connection above, then click Compare to see schema differences.
                    </Typography>
                </Paper>
            )}
        </Box>
    );
}
