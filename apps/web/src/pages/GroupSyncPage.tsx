import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Collapse,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Checkbox,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    LinearProgress,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    CheckCircle as SyncedIcon,
    Warning as OutOfSyncIcon,
    Error as ErrorIcon,
    HelpOutline as UncheckedIcon,
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    Storage as DatabaseIcon,
    Sync as SyncIcon,
    ArrowBack as BackIcon,
    Settings as SettingsIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Edit as EditIcon,
    ContentCopy as CopyIcon,
    Check as CheckIcon,
} from '@mui/icons-material';
import { groupsApi, syncApi, projectsApi, schemaApi } from '../lib/api';
import { GlassCard } from '../components/GlassCard';
import type {
    InstanceGroupTargetStatus,
    ConnectionConfig,
    SchemaDiff,
    SchemaDiffItem,
} from '@dbnexus/shared';

// Status icon component
function StatusIcon({ status }: { status: 'in_sync' | 'out_of_sync' | 'error' | 'unchecked' }) {
    switch (status) {
        case 'in_sync':
            return <SyncedIcon sx={{ color: '#22c55e' }} />;
        case 'out_of_sync':
            return <OutOfSyncIcon sx={{ color: '#f59e0b' }} />;
        case 'error':
            return <ErrorIcon sx={{ color: '#ef4444' }} />;
        default:
            return <UncheckedIcon sx={{ color: 'text.disabled' }} />;
    }
}

// Status chip component
function StatusChip({ status }: { status: 'in_sync' | 'out_of_sync' | 'error' | 'unchecked' }) {
    const config = {
        in_sync: { label: 'In Sync', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        out_of_sync: { label: 'Out of Sync', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        error: { label: 'Error', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        unchecked: { label: 'Not Checked', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
    }[status];

    return (
        <Chip
            label={config.label}
            size="small"
            sx={{
                bgcolor: config.bg,
                color: config.color,
                border: `1px solid ${config.color}`,
                fontWeight: 500,
            }}
        />
    );
}

// Get diff category from DiffType
function getDiffCategory(type: string): 'added' | 'removed' | 'modified' {
    if (type.includes('added')) return 'added';
    if (type.includes('removed')) return 'removed';
    return 'modified';
}

// Diff type badge
function DiffTypeBadge({ type }: { type: string }) {
    const category = getDiffCategory(type);
    const config = {
        added: { icon: <AddIcon sx={{ fontSize: 14 }} />, color: '#22c55e', label: 'Added' },
        removed: { icon: <RemoveIcon sx={{ fontSize: 14 }} />, color: '#ef4444', label: 'Removed' },
        modified: { icon: <EditIcon sx={{ fontSize: 14 }} />, color: '#f59e0b', label: 'Modified' },
    }[category];

    return (
        <Chip
            icon={config.icon}
            label={config.label}
            size="small"
            sx={{
                bgcolor: `${config.color}20`,
                color: config.color,
                border: `1px solid ${config.color}`,
                height: 22,
                '& .MuiChip-icon': { color: config.color },
            }}
        />
    );
}

// Schema Diff Display Component
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

    // Group items by table
    const groupedItems = useMemo(() => {
        const groups: Record<string, SchemaDiffItem[]> = {};
        for (const item of diff.items) {
            const key = item.table || 'Other';
            if (!groups[key]) groups[key] = [];
            groups[key]?.push(item);
        }
        return groups;
    }, [diff.items]);

    // Calculate totals
    const totalAdded =
        diff.summary.tablesAdded +
        diff.summary.columnsAdded +
        diff.summary.indexesAdded +
        diff.summary.fksAdded;
    const totalRemoved =
        diff.summary.tablesRemoved +
        diff.summary.columnsRemoved +
        diff.summary.indexesRemoved +
        diff.summary.fksRemoved;
    const totalModified =
        diff.summary.columnsModified + diff.summary.indexesModified + diff.summary.fksModified;

    if (diff.items.length === 0) {
        return (
            <Alert severity="success" sx={{ mt: 2 }}>
                Schemas are in sync! No differences found.
            </Alert>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            {/* Summary */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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

// Target status row with inline diff
function TargetRow({
    target,
    group,
    sourceConnectionId,
    sourceSchema,
    targetSchema,
    onSyncData,
}: {
    target: InstanceGroupTargetStatus;
    group: { id: string; projectId: string; syncSchema: boolean; syncData: boolean };
    sourceConnectionId: string;
    sourceSchema: string;
    targetSchema: string;
    onSyncData: (targetId: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [applying, setApplying] = useState(false);
    const queryClient = useQueryClient();

    // Show diff when expanded and schema sync is enabled
    const showDiff = expanded && group.syncSchema;

    // Fetch schema diff when expanded and diff is requested
    // Cache for 5 minutes to avoid repeated API calls
    const { data: schemaDiff, isLoading: loadingDiff } = useQuery({
        queryKey: [
            'schemaDiff',
            sourceConnectionId,
            target.connectionId,
            sourceSchema,
            targetSchema,
        ],
        queryFn: () =>
            schemaApi.compareSchemasApi(
                sourceConnectionId,
                target.connectionId,
                sourceSchema,
                targetSchema
            ),
        enabled: showDiff && !!sourceConnectionId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });

    // Fetch migration SQL
    const { data: migrationSqlData } = useQuery({
        queryKey: [
            'migrationSql',
            sourceConnectionId,
            target.connectionId,
            sourceSchema,
            targetSchema,
        ],
        queryFn: () =>
            schemaApi.getMigrationSql(
                sourceConnectionId,
                target.connectionId,
                sourceSchema,
                targetSchema
            ),
        enabled: showDiff && !!sourceConnectionId && !!schemaDiff,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const handleApplyMigration = async () => {
        setApplying(true);
        try {
            await schemaApi.applyMigration(
                sourceConnectionId,
                target.connectionId,
                sourceSchema,
                targetSchema,
                'Applied from Instance Group Sync'
            );
            queryClient.invalidateQueries({ queryKey: ['groupSyncStatus'] });
            queryClient.invalidateQueries({ queryKey: ['schemaDiff'] });
            // Collapse after successful migration
            setExpanded(false);
        } catch (error) {
            console.error('Failed to apply migration:', error);
        } finally {
            setApplying(false);
        }
    };

    return (
        <>
            <TableRow
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => setExpanded(!expanded)}
            >
                <TableCell>
                    <IconButton size="small">
                        {expanded ? <CollapseIcon /> : <ExpandIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DatabaseIcon sx={{ color: 'primary.main' }} />
                        <Typography fontWeight={500}>{target.connectionName}</Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIcon status={target.schemaStatus} />
                        <StatusChip status={target.schemaStatus} />
                        {target.schemaDiffCount !== undefined && target.schemaDiffCount > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                ({target.schemaDiffCount} differences)
                            </Typography>
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIcon status={target.dataStatus} />
                        <StatusChip status={target.dataStatus} />
                        {target.dataDiffSummary && (
                            <Typography variant="caption" color="text.secondary">
                                {target.dataDiffSummary}
                            </Typography>
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {group.syncSchema && target.schemaStatus === 'out_of_sync' && (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Invalidate the cache to force refetch
                                    queryClient.invalidateQueries({
                                        queryKey: ['schemaDiff', sourceConnectionId, target.connectionId],
                                    });
                                    queryClient.invalidateQueries({
                                        queryKey: ['migrationSql', sourceConnectionId, target.connectionId],
                                    });
                                    // Expand if not already
                                    if (!expanded) setExpanded(true);
                                }}
                            >
                                Recheck Schema
                            </Button>
                        )}
                        {group.syncData && target.dataStatus === 'out_of_sync' && (
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<SyncIcon />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSyncData(target.connectionId);
                                }}
                            >
                                Sync Data
                            </Button>
                        )}
                    </Box>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={5} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
                    <Collapse in={expanded}>
                        <Box sx={{ py: 2, px: 1 }}>
                            {target.error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {target.error}
                                </Alert>
                            )}

                            {/* Inline Schema Diff */}
                            {showDiff && (
                                <Box sx={{ mb: 2 }}>
                                    {loadingDiff ? (
                                        <Box sx={{ py: 4, textAlign: 'center' }}>
                                            <CircularProgress size={24} />
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mt: 1 }}
                                            >
                                                Loading schema diff...
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
                                        <Alert severity="info">Unable to load schema diff</Alert>
                                    )}
                                </Box>
                            )}

                            {!showDiff && (
                                <Typography variant="body2" color="text.secondary">
                                    Connection ID: {target.connectionId}
                                </Typography>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

// Data sync dialog
function DataSyncDialog({
    open,
    onClose,
    sourceConnectionId,
    targetConnectionId,
    targetName,
    schema,
}: {
    open: boolean;
    onClose: () => void;
    sourceConnectionId: string;
    targetConnectionId: string;
    targetName: string;
    schema: string;
}) {
    const queryClient = useQueryClient();
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [syncOptions, setSyncOptions] = useState({
        insertMissing: true,
        updateDifferent: true,
        deleteExtra: false,
    });
    const [syncing, setSyncing] = useState(false);
    const [results, setResults] = useState<
        { table: string; inserted: number; updated: number; deleted: number; errors: string[] }[]
    >([]);

    const { data: tableDiffs = [], isLoading } = useQuery({
        queryKey: ['tableDiffs', sourceConnectionId, targetConnectionId, schema],
        queryFn: () => syncApi.getTableRowCounts(sourceConnectionId, targetConnectionId, schema),
        enabled: open,
    });

    const outOfSyncTables = useMemo(
        () =>
            tableDiffs.filter(
                (t) =>
                    t.sourceCount !== t.targetCount ||
                    t.missingInTarget > 0 ||
                    t.missingInSource > 0
            ),
        [tableDiffs]
    );

    const handleSync = async () => {
        setSyncing(true);
        setResults([]);

        const tablesToSync =
            selectedTables.length > 0 ? selectedTables : outOfSyncTables.map((t) => t.table);

        for (const table of tablesToSync) {
            try {
                const result = await syncApi.syncTableData(
                    sourceConnectionId,
                    targetConnectionId,
                    schema,
                    table,
                    {
                        primaryKeys: ['id'], // TODO: Get from schema
                        ...syncOptions,
                    }
                );
                setResults((prev) => [...prev, result]);
            } catch (error) {
                setResults((prev) => [
                    ...prev,
                    {
                        table,
                        inserted: 0,
                        updated: 0,
                        deleted: 0,
                        errors: [error instanceof Error ? error.message : String(error)],
                    },
                ]);
            }
        }

        setSyncing(false);
        queryClient.invalidateQueries({ queryKey: ['groupSyncStatus'] });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Sync Data to {targetName}</DialogTitle>
            <DialogContent>
                {isLoading ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : results.length > 0 ? (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Sync Results
                        </Typography>
                        {results.map((result, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    p: 2,
                                    mb: 1,
                                    bgcolor:
                                        result.errors.length > 0 ? 'error.dark' : 'success.dark',
                                    opacity: 0.9,
                                }}
                            >
                                <Typography fontWeight={600}>{result.table}</Typography>
                                <Typography variant="body2">
                                    Inserted: {result.inserted}, Updated: {result.updated}, Deleted:{' '}
                                    {result.deleted}
                                </Typography>
                                {result.errors.map((err, i) => (
                                    <Typography key={i} variant="caption" color="error.light">
                                        {err}
                                    </Typography>
                                ))}
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                            Tables out of sync ({outOfSyncTables.length})
                        </Typography>

                        <TableContainer sx={{ maxHeight: 300, mb: 3 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={
                                                    selectedTables.length ===
                                                    outOfSyncTables.length &&
                                                    outOfSyncTables.length > 0
                                                }
                                                indeterminate={
                                                    selectedTables.length > 0 &&
                                                    selectedTables.length < outOfSyncTables.length
                                                }
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTables(
                                                            outOfSyncTables.map((t) => t.table)
                                                        );
                                                    } else {
                                                        setSelectedTables([]);
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>Table</TableCell>
                                        <TableCell align="right">Source</TableCell>
                                        <TableCell align="right">Target</TableCell>
                                        <TableCell align="right">Difference</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {outOfSyncTables.map((table) => (
                                        <TableRow key={table.table}>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={selectedTables.includes(table.table)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedTables([
                                                                ...selectedTables,
                                                                table.table,
                                                            ]);
                                                        } else {
                                                            setSelectedTables(
                                                                selectedTables.filter(
                                                                    (t) => t !== table.table
                                                                )
                                                            );
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>{table.table}</TableCell>
                                            <TableCell align="right">{table.sourceCount}</TableCell>
                                            <TableCell align="right">{table.targetCount}</TableCell>
                                            <TableCell align="right">
                                                {table.sourceCount - table.targetCount > 0
                                                    ? '+'
                                                    : ''}
                                                {table.sourceCount - table.targetCount}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Sync Options
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={syncOptions.insertMissing}
                                        onChange={(e) =>
                                            setSyncOptions({
                                                ...syncOptions,
                                                insertMissing: e.target.checked,
                                            })
                                        }
                                    />
                                }
                                label="Insert missing rows"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={syncOptions.updateDifferent}
                                        onChange={(e) =>
                                            setSyncOptions({
                                                ...syncOptions,
                                                updateDifferent: e.target.checked,
                                            })
                                        }
                                    />
                                }
                                label="Update different rows"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={syncOptions.deleteExtra}
                                        onChange={(e) =>
                                            setSyncOptions({
                                                ...syncOptions,
                                                deleteExtra: e.target.checked,
                                            })
                                        }
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        Delete extra rows in target
                                        <Chip label="Destructive" size="small" color="error" />
                                    </Box>
                                }
                            />
                        </Box>
                    </Box>
                )}

                {syncing && <LinearProgress sx={{ mt: 2 }} />}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                {results.length === 0 && (
                    <Button
                        variant="contained"
                        onClick={handleSync}
                        disabled={syncing || outOfSyncTables.length === 0}
                        startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                    >
                        {syncing
                            ? 'Syncing...'
                            : `Sync ${selectedTables.length || outOfSyncTables.length} Table(s)`}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

// Group settings dialog
function GroupSettingsDialog({
    open,
    onClose,
    group,
    connections,
}: {
    open: boolean;
    onClose: () => void;
    group: {
        id: string;
        projectId: string;
        name: string;
        sourceConnectionId?: string;
        syncSchema: boolean;
        syncData: boolean;
        syncTargetSchema?: string;
    };
    connections: ConnectionConfig[];
}) {
    const queryClient = useQueryClient();
    const [sourceConnectionId, setSourceConnectionId] = useState(group.sourceConnectionId || '');
    const [syncSchema, setSyncSchema] = useState(group.syncSchema);
    const [syncData, setSyncData] = useState(group.syncData);
    const [syncTargetSchema, setSyncTargetSchema] = useState(group.syncTargetSchema || '');
    const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);
    const [loadingSchemas, setLoadingSchemas] = useState(false);

    // Load schemas when source connection changes
    useEffect(() => {
        if (sourceConnectionId) {
            setLoadingSchemas(true);
            schemaApi
                .getSchemas(sourceConnectionId)
                .then(setAvailableSchemas)
                .catch(() => setAvailableSchemas([]))
                .finally(() => setLoadingSchemas(false));
        } else {
            setAvailableSchemas([]);
        }
    }, [sourceConnectionId]);

    const updateMutation = useMutation({
        mutationFn: () =>
            projectsApi.updateGroup(group.projectId, group.id, {
                sourceConnectionId: sourceConnectionId || null,
                syncSchema,
                syncData,
                syncTargetSchema: syncTargetSchema || null,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', group.id] });
            queryClient.invalidateQueries({ queryKey: ['groupSyncStatus', group.id] });
            onClose();
        },
    });

    // Get the selected source connection's default schema
    // For MySQL/MariaDB, the database name is the schema
    const sourceConnection = connections.find((c) => c.id === sourceConnectionId);
    const getDefaultSchema = (conn: typeof sourceConnection) => {
        if (!conn) return 'public';
        if (conn.engine === 'mysql' || conn.engine === 'mariadb') {
            return conn.database;
        }
        return conn.defaultSchema || 'public';
    };
    const defaultSchema = getDefaultSchema(sourceConnection);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Instance Group Settings</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel>Source Connection (Reference)</InputLabel>
                        <Select
                            value={sourceConnectionId}
                            onChange={(e) => {
                                setSourceConnectionId(e.target.value);
                                setSyncTargetSchema(''); // Reset schema when connection changes
                            }}
                            label="Source Connection (Reference)"
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {connections.map((conn) => (
                                <MenuItem key={conn.id} value={conn.id}>
                                    {conn.name}
                                    {conn.defaultSchema && (
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{ ml: 1, color: 'text.secondary' }}
                                        >
                                            ({conn.defaultSchema})
                                        </Typography>
                                    )}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Schema selector */}
                    {sourceConnectionId && (
                        <FormControl fullWidth>
                            <InputLabel>Target Schema</InputLabel>
                            <Select
                                value={syncTargetSchema}
                                onChange={(e) => setSyncTargetSchema(e.target.value)}
                                label="Target Schema"
                                disabled={loadingSchemas}
                            >
                                <MenuItem value="">
                                    <em>Use connection default ({defaultSchema})</em>
                                </MenuItem>
                                {availableSchemas.map((schema) => (
                                    <MenuItem key={schema} value={schema}>
                                        {schema}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                Schema to use for sync operations (applies to all connections in
                                group)
                            </Typography>
                        </FormControl>
                    )}

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Sync Options
                        </Typography>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={syncSchema}
                                    onChange={(e) => setSyncSchema(e.target.checked)}
                                />
                            }
                            label="Enable schema sync checking"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={syncData}
                                    onChange={(e) => setSyncData(e.target.checked)}
                                />
                            }
                            label="Enable data sync checking"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                >
                    Save Settings
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    return date.toLocaleString();
}

// Main page component
export function GroupSyncPage() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [dataSyncTarget, setDataSyncTarget] = useState<{
        connectionId: string;
        connectionName: string;
    } | null>(null);
    const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

    const { data: group, isLoading: loadingGroup } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => groupsApi.getById(groupId!),
        enabled: !!groupId,
    });

    const { data: connections = [] } = useQuery({
        queryKey: ['groupConnections', groupId],
        queryFn: () => groupsApi.getConnections(groupId!),
        enabled: !!groupId,
    });

    const {
        data: syncStatus,
        isLoading: loadingStatus,
        isFetching: fetchingStatus,
        refetch: refetchStatus,
        dataUpdatedAt,
    } = useQuery({
        queryKey: ['groupSyncStatus', groupId],
        queryFn: async () => {
            const result = await syncApi.getGroupSyncStatus(groupId!);
            setLastCheckedAt(new Date());
            return result;
        },
        enabled: !!groupId && !!group?.sourceConnectionId,
        // Don't refetch on mount - use cached data from Dashboard
        // User can manually refresh with the button
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: 10 * 60 * 1000, // Consider stale after 10 minutes
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });

    // Update lastCheckedAt when data is updated
    useEffect(() => {
        if (dataUpdatedAt && dataUpdatedAt > 0) {
            setLastCheckedAt(new Date(dataUpdatedAt));
        }
    }, [dataUpdatedAt]);

    // Force refresh - invalidate cache and refetch
    const handleRefresh = () => {
        // Invalidate all related caches
        setLastCheckedAt(null);
        refetchStatus();
    };

    const handleSyncData = (targetConnectionId: string) => {
        const target = connections.find((c) => c.id === targetConnectionId);
        if (target) {
            setDataSyncTarget({ connectionId: targetConnectionId, connectionName: target.name });
        }
    };

    // Get source connection and its default schema
    const sourceConnection = connections.find((c) => c.id === group?.sourceConnectionId);
    
    // Helper to get default schema for a connection
    // For MySQL/MariaDB, the database name is the schema
    const getConnectionDefaultSchema = (conn: typeof sourceConnection) => {
        if (!conn) return 'public';
        if (conn.engine === 'mysql' || conn.engine === 'mariadb') {
            return conn.database;
        }
        return conn.defaultSchema || 'public';
    };
    
    // Use group's syncTargetSchema if set, otherwise fall back to connection's defaultSchema
    const sourceSchema = group?.syncTargetSchema || getConnectionDefaultSchema(sourceConnection);

    // Helper to get target schema - use group's syncTargetSchema for all targets
    const getTargetSchema = (targetId: string) => {
        if (group?.syncTargetSchema) {
            return group.syncTargetSchema;
        }
        const targetConn = connections.find((c) => c.id === targetId);
        return getConnectionDefaultSchema(targetConn);
    };

    if (loadingGroup) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!group) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">Instance group not found</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <IconButton onClick={() => navigate('/connections')}>
                    <BackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={600}>
                        {group.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Instance Group Sync Status
                            {group.projectName && ` • ${group.projectName}`}
                        </Typography>
                        {lastCheckedAt && (
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                                • Last checked: {formatRelativeTime(lastCheckedAt)}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => setSettingsOpen(true)}
                >
                    Settings
                </Button>
                <Button
                    variant="contained"
                    startIcon={
                        loadingStatus || fetchingStatus ? (
                            <CircularProgress size={16} />
                        ) : (
                            <RefreshIcon />
                        )
                    }
                    onClick={handleRefresh}
                    disabled={loadingStatus || fetchingStatus || !group.sourceConnectionId}
                >
                    {fetchingStatus ? 'Checking...' : 'Refresh Status'}
                </Button>
            </Box>

            {/* No source warning */}
            {!group.sourceConnectionId && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    No source connection set. Configure a source connection in settings to enable
                    sync checking.
                </Alert>
            )}

            {/* Sync not enabled warning */}
            {group.sourceConnectionId && !group.syncSchema && !group.syncData && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Neither schema nor data sync is enabled. Enable sync options in settings.
                </Alert>
            )}

            {/* Source info */}
            {group.sourceConnectionId && (
                <GlassCard>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Source (Reference)
                        </Typography>
                        <Chip
                            label={group.sourceConnectionName || 'Unknown'}
                            icon={<DatabaseIcon />}
                            color="primary"
                        />
                        {group.syncSchema && <Chip label="Schema Sync" size="small" />}
                        {group.syncData && <Chip label="Data Sync" size="small" />}
                    </Box>

                    {/* Targets table */}
                    {syncStatus && syncStatus.targets.length > 0 ? (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={50} />
                                        <TableCell>Target Connection</TableCell>
                                        <TableCell>Schema Status</TableCell>
                                        <TableCell>Data Status</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {syncStatus.targets.map((target) => (
                                        <TargetRow
                                            key={target.connectionId}
                                            target={target}
                                            group={group}
                                            sourceConnectionId={group.sourceConnectionId!}
                                            sourceSchema={sourceSchema}
                                            targetSchema={getTargetSchema(target.connectionId)}
                                            onSyncData={handleSyncData}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : loadingStatus ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <CircularProgress size={24} />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Checking sync status...
                            </Typography>
                        </Box>
                    ) : (
                        <Typography color="text.secondary" sx={{ py: 2 }}>
                            No target connections in this group.
                        </Typography>
                    )}
                </GlassCard>
            )}

            {/* Connections list if no source */}
            {!group.sourceConnectionId && connections.length > 0 && (
                <GlassCard>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                        Connections in this group ({connections.length})
                    </Typography>
                    {connections.map((conn) => (
                        <Box
                            key={conn.id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                py: 1,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:last-child': { borderBottom: 'none' },
                            }}
                        >
                            <DatabaseIcon sx={{ color: 'primary.main' }} />
                            <Typography>{conn.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {conn.host}:{conn.port}
                            </Typography>
                        </Box>
                    ))}
                </GlassCard>
            )}

            {/* Settings dialog */}
            <GroupSettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                group={group}
                connections={connections}
            />

            {/* Data sync dialog */}
            {dataSyncTarget && group.sourceConnectionId && (
                <DataSyncDialog
                    open={true}
                    onClose={() => setDataSyncTarget(null)}
                    sourceConnectionId={group.sourceConnectionId}
                    targetConnectionId={dataSyncTarget.connectionId}
                    targetName={dataSyncTarget.connectionName}
                    schema={sourceSchema}
                />
            )}
        </Box>
    );
}
