import { useState, useMemo } from 'react';
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
    CompareArrows as CompareIcon,
} from '@mui/icons-material';
import { groupsApi, syncApi, projectsApi } from '../lib/api';
import { GlassCard } from '../components/GlassCard';
import type { InstanceGroupTargetStatus, ConnectionConfig } from '@dbnexus/shared';

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

// Target status row
function TargetRow({
    target,
    group,
    onViewSchemaDiff,
    onSyncData,
}: {
    target: InstanceGroupTargetStatus;
    group: { id: string; projectId: string; syncSchema: boolean; syncData: boolean };
    onViewSchemaDiff: (targetId: string) => void;
    onSyncData: (targetId: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);

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
                                startIcon={<CompareIcon />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewSchemaDiff(target.connectionId);
                                }}
                            >
                                View Diff
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
                        <Box sx={{ py: 2 }}>
                            {target.error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {target.error}
                                </Alert>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                Connection ID: {target.connectionId}
                            </Typography>
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
    };
    connections: ConnectionConfig[];
}) {
    const queryClient = useQueryClient();
    const [sourceConnectionId, setSourceConnectionId] = useState(group.sourceConnectionId || '');
    const [syncSchema, setSyncSchema] = useState(group.syncSchema);
    const [syncData, setSyncData] = useState(group.syncData);

    const updateMutation = useMutation({
        mutationFn: () =>
            projectsApi.updateGroup(group.projectId, group.id, {
                sourceConnectionId: sourceConnectionId || null,
                syncSchema,
                syncData,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', group.id] });
            queryClient.invalidateQueries({ queryKey: ['groupSyncStatus', group.id] });
            onClose();
        },
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Instance Group Settings</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel>Source Connection (Reference)</InputLabel>
                        <Select
                            value={sourceConnectionId}
                            onChange={(e) => setSourceConnectionId(e.target.value)}
                            label="Source Connection (Reference)"
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {connections.map((conn) => (
                                <MenuItem key={conn.id} value={conn.id}>
                                    {conn.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

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

// Main page component
export function GroupSyncPage() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [dataSyncTarget, setDataSyncTarget] = useState<{
        connectionId: string;
        connectionName: string;
    } | null>(null);

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
        refetch: refetchStatus,
    } = useQuery({
        queryKey: ['groupSyncStatus', groupId],
        queryFn: () => syncApi.getGroupSyncStatus(groupId!),
        enabled: !!groupId && !!group?.sourceConnectionId,
    });

    const handleViewSchemaDiff = (targetConnectionId: string) => {
        // Navigate to schema diff page with pre-filled connections
        navigate(`/schema-diff?source=${group?.sourceConnectionId}&target=${targetConnectionId}`);
    };

    const handleSyncData = (targetConnectionId: string) => {
        const target = connections.find((c) => c.id === targetConnectionId);
        if (target) {
            setDataSyncTarget({ connectionId: targetConnectionId, connectionName: target.name });
        }
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
                    <Typography variant="body2" color="text.secondary">
                        Instance Group Sync Status
                    </Typography>
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
                    startIcon={loadingStatus ? <CircularProgress size={16} /> : <RefreshIcon />}
                    onClick={() => refetchStatus()}
                    disabled={loadingStatus || !group.sourceConnectionId}
                >
                    Refresh Status
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
                                            onViewSchemaDiff={handleViewSchemaDiff}
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
                    schema="public"
                />
            )}
        </Box>
    );
}
