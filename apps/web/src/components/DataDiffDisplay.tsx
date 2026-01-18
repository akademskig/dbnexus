import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Chip,
    Alert,
    FormControlLabel,
    Checkbox,
    LinearProgress,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import {
    Sync as SyncIcon,
    Check as CheckIcon,
    Refresh as RefreshIcon,
    ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { syncApi } from '../lib/api';
import type { TableDataDiff } from '@dbnexus/shared';
import { LoadingState } from './LoadingState';
import { useToastStore } from '../stores/toastStore';
import { OperationResultItem } from './OperationResult';

interface DataDiffDisplayProps {
    /** Source connection ID */
    readonly sourceConnectionId: string;
    /** Target connection ID */
    readonly targetConnectionId: string;
    /** Source schema name */
    readonly sourceSchema: string;
    /** Target schema name (defaults to sourceSchema if not provided) */
    readonly targetSchema?: string;
    /** Display name for source connection */
    readonly sourceConnectionName?: string;
    /** Display name for target connection */
    readonly targetConnectionName?: string;
    /** Pre-fetched data diff (if provided, component won't fetch its own data) */
    readonly dataDiff?: TableDataDiff[];
    /** Callback when data is synced successfully */
    readonly onSyncComplete?: () => void;
    /** Whether to show compact view (less options, smaller grid) */
    readonly compact?: boolean;
    /** Custom query key prefix for cache invalidation */
    readonly queryKeyPrefix?: string;
}

export function DataDiffDisplay({
    sourceConnectionId,
    targetConnectionId,
    sourceSchema,
    targetSchema: _targetSchema, // Available for future use when source/target schemas differ
    sourceConnectionName = 'Source',
    targetConnectionName = 'Target',
    dataDiff: providedDataDiff,
    onSyncComplete,
    compact = false,
    queryKeyPrefix = 'tableDiffs',
}: DataDiffDisplayProps) {
    void _targetSchema; // Suppress unused variable warning
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [selectedTables, setSelectedTables] = useState<GridRowSelectionModel>([]);
    const [syncOptions, setSyncOptions] = useState({
        insertMissing: true,
        updateDifferent: true,
        deleteExtra: false,
    });
    const [syncing, setSyncing] = useState(false);
    const [dumpRestoring, setDumpRestoring] = useState(false);
    const [results, setResults] = useState<
        { table: string; inserted: number; updated: number; deleted: number; errors: string[] }[]
    >([]);
    const [dumpRestoreResult, setDumpRestoreResult] = useState<{
        success: boolean;
        tablesProcessed: number;
        rowsCopied: number;
        errors: string[];
        tableResults: { table: string; rows: number; error?: string }[];
    } | null>(null);

    // Only fetch data if not provided via props
    const shouldFetch =
        !providedDataDiff && !!sourceConnectionId && !!targetConnectionId && !!sourceSchema;

    // Cache data comparison results for 10 minutes
    const CACHE_TIME = 10 * 60 * 1000;

    const {
        data: fetchedTableDiffs = [],
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: [queryKeyPrefix, sourceConnectionId, targetConnectionId, sourceSchema],
        queryFn: () =>
            syncApi.getTableRowCounts(sourceConnectionId, targetConnectionId, sourceSchema),
        enabled: shouldFetch,
        staleTime: CACHE_TIME,
        gcTime: CACHE_TIME,
    });

    // Use provided data or fetched data
    const tableDiffs = providedDataDiff ?? fetchedTableDiffs;

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

    const inSyncTables = useMemo(
        () =>
            tableDiffs.filter(
                (t) =>
                    t.sourceCount === t.targetCount &&
                    t.missingInTarget === 0 &&
                    t.missingInSource === 0
            ),
        [tableDiffs]
    );

    const handleRefresh = () => {
        setResults([]);
        if (shouldFetch) {
            queryClient.invalidateQueries({
                queryKey: [queryKeyPrefix, sourceConnectionId, targetConnectionId],
            });
            refetch();
        }
        onSyncComplete?.();
    };

    const handleSync = async () => {
        setSyncing(true);
        setResults([]);

        const tablesToSync =
            selectedTables.length > 0
                ? (selectedTables as string[])
                : outOfSyncTables.map((t) => t.table);

        const syncResults: typeof results = [];

        for (const table of tablesToSync) {
            try {
                const result = await syncApi.syncTableData(
                    sourceConnectionId,
                    targetConnectionId,
                    sourceSchema,
                    table,
                    {
                        primaryKeys: ['id'], // Primary keys should be fetched from schema in future
                        ...syncOptions,
                    }
                );
                syncResults.push(result);
                setResults([...syncResults]);
            } catch (error) {
                const errorResult = {
                    table,
                    inserted: 0,
                    updated: 0,
                    deleted: 0,
                    errors: [error instanceof Error ? error.message : String(error)],
                };
                syncResults.push(errorResult);
                setResults([...syncResults]);
            }
        }

        setSyncing(false);

        // Show toast summary
        const successCount = syncResults.filter((r) => r.errors.length === 0).length;
        const errorCount = syncResults.filter((r) => r.errors.length > 0).length;

        if (errorCount === 0) {
            toast.success(`Successfully synced ${successCount} table(s)`);
            // Only refresh if no errors - otherwise keep results visible
            handleRefresh();
        } else if (successCount > 0) {
            toast.warning(
                `Synced ${successCount} table(s), ${errorCount} failed. See details below.`
            );
        } else {
            toast.error(`Failed to sync ${errorCount} table(s). See details below.`);
        }
        // Don't call handleRefresh() on error - keep results visible so user can see errors
    };

    const handleSyncSingleTable = async (tableName: string) => {
        setSyncing(true);
        try {
            const result = await syncApi.syncTableData(
                sourceConnectionId,
                targetConnectionId,
                sourceSchema,
                tableName,
                {
                    primaryKeys: ['id'],
                    insertMissing: true,
                    updateDifferent: true,
                    deleteExtra: false,
                }
            );
            setResults((prev) => [...prev.filter((r) => r.table !== tableName), result]);

            if (result.errors && result.errors.length > 0) {
                toast.error(`Table "${tableName}" sync had errors: ${result.errors[0]}`);
            } else {
                toast.success(
                    `Table "${tableName}" synced: +${result.inserted} ~${result.updated}`
                );
            }
            onSyncComplete?.();
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            toast.error(`Failed to sync "${tableName}": ${errorMsg}`);
            // Add to results so user can see the error
            setResults((prev) => [
                ...prev.filter((r) => r.table !== tableName),
                {
                    table: tableName,
                    inserted: 0,
                    updated: 0,
                    deleted: 0,
                    errors: [errorMsg],
                },
            ]);
        } finally {
            setSyncing(false);
        }
    };

    const handleDumpAndRestore = async () => {
        setDumpRestoring(true);
        setDumpRestoreResult(null);
        setResults([]);

        try {
            const result = await syncApi.dumpAndRestore(
                sourceConnectionId,
                targetConnectionId,
                sourceSchema,
                { truncateTarget: true }
            );
            setDumpRestoreResult(result);

            if (result.success) {
                toast.success(
                    `Copied ${result.rowsCopied} rows across ${result.tablesProcessed} tables`
                );
            } else {
                toast.warning(`Completed with ${result.errors.length} error(s)`);
            }

            // Refresh the data after dump & restore
            handleRefresh();
        } catch (error) {
            toast.error(
                `Dump & Restore failed: ${error instanceof Error ? error.message : String(error)}`
            );
        } finally {
            setDumpRestoring(false);
        }
    };

    const handleClearDumpRestoreResult = () => {
        setDumpRestoreResult(null);
    };

    const handleClearResults = () => {
        setResults([]);
    };

    // DataGrid columns for table selection
    const columns: GridColDef<TableDataDiff>[] = [
        {
            field: 'table',
            headerName: 'Table',
            flex: 1,
            minWidth: 150,
            renderCell: (params) => (
                <Typography variant="body2" fontFamily="monospace">
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'sourceCount',
            headerName: compact ? 'Source' : `Source (${sourceConnectionName})`,
            width: compact ? 100 : 150,
            align: 'right',
            headerAlign: 'right',
        },
        {
            field: 'targetCount',
            headerName: compact ? 'Target' : `Target (${targetConnectionName})`,
            width: compact ? 100 : 150,
            align: 'right',
            headerAlign: 'right',
        },
        {
            field: 'missingInTarget',
            headerName: 'Missing',
            width: 100,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) =>
                params.value > 0 ? <Chip label={params.value} size="small" color="warning" /> : '-',
        },
        {
            field: 'missingInSource',
            headerName: 'Extra',
            width: 100,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) =>
                params.value > 0 ? <Chip label={params.value} size="small" color="info" /> : '-',
        },
        ...(compact
            ? [
                {
                    field: 'actions',
                    headerName: 'Actions',
                    width: 120,
                    sortable: false,
                    renderCell: (params: { row: TableDataDiff }) => {
                        const row = params.row;
                        const isOutOfSync =
                            row.sourceCount !== row.targetCount || row.missingInTarget > 0;
                        const result = results.find((r) => r.table === row.table);

                        if (result) {
                            return (
                                <Typography
                                    variant="caption"
                                    color={result.errors.length > 0 ? 'error' : 'success.main'}
                                >
                                    +{result.inserted} ~{result.updated}
                                </Typography>
                            );
                        }

                        if (isOutOfSync) {
                            return (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSyncSingleTable(row.table);
                                    }}
                                    disabled={syncing}
                                >
                                    Sync
                                </Button>
                            );
                        }

                        return (
                            <Chip
                                label="In sync"
                                size="small"
                                color="success"
                                variant="outlined"
                            />
                        );
                    },
                } as GridColDef<TableDataDiff>,
            ]
            : [
                {
                    field: 'difference',
                    headerName: 'Status',
                    width: 120,
                    align: 'center',
                    headerAlign: 'center',
                    valueGetter: (_: unknown, row: TableDataDiff) =>
                        row.sourceCount - row.targetCount,
                    renderCell: (params: { value: unknown }) => {
                        const diff = params.value as number;
                        if (diff === 0) {
                            return (
                                <Chip
                                    icon={<CheckIcon />}
                                    label="In Sync"
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    sx={{ height: 24 }}
                                />
                            );
                        }
                        return (
                            <Typography
                                variant="body2"
                                fontWeight={500}
                                color={diff > 0 ? 'warning.main' : 'error.main'}
                            >
                                {diff > 0 ? '+' : ''}
                                {diff}
                            </Typography>
                        );
                    },
                } as GridColDef<TableDataDiff>,
            ]),
    ];

    // Loading state (only when fetching own data)
    if (isLoading && shouldFetch) {
        return <LoadingState message="Comparing data..." size="medium" />;
    }

    // Show dump & restore result if we have it
    if (!compact && dumpRestoreResult) {
        return (
            <Box>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2,
                    }}
                >
                    <Typography variant="subtitle1" fontWeight={500}>
                        Dump & Restore Results
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                            label={`${dumpRestoreResult.tablesProcessed} tables`}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                        <Chip
                            label={`${dumpRestoreResult.rowsCopied} rows copied`}
                            size="small"
                            color="success"
                            variant="outlined"
                        />
                        {dumpRestoreResult.errors.length > 0 && (
                            <Chip
                                label={`${dumpRestoreResult.errors.length} errors`}
                                size="small"
                                color="error"
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Box>

                <Alert severity={dumpRestoreResult.success ? 'success' : 'warning'} sx={{ mb: 2 }}>
                    {dumpRestoreResult.success
                        ? `Successfully copied all data from source to target.`
                        : `Completed with some errors. Check the details below.`}
                </Alert>

                {dumpRestoreResult.tableResults.map((result) => (
                    <Box
                        key={result.table}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            mb: 0.5,
                            bgcolor: result.error
                                ? 'rgba(220, 38, 38, 0.1)'
                                : 'rgba(34, 197, 94, 0.1)',
                            borderRadius: 1,
                            border: 1,
                            borderColor: result.error
                                ? 'rgba(220, 38, 38, 0.3)'
                                : 'rgba(34, 197, 94, 0.3)',
                        }}
                    >
                        {result.error ? (
                            <CopyIcon sx={{ color: 'error.main' }} />
                        ) : (
                            <CheckIcon sx={{ color: 'success.main' }} />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontFamily="monospace">
                                {result.table}
                            </Typography>
                            {result.error && (
                                <Typography variant="caption" color="text.secondary">
                                    {result.error}
                                </Typography>
                            )}
                        </Box>
                        <Chip
                            label={`${result.rows} rows`}
                            size="small"
                            sx={{ height: 22, fontSize: 11 }}
                        />
                    </Box>
                ))}

                {dumpRestoreResult.errors.length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Errors:
                        </Typography>
                        {dumpRestoreResult.errors.map((err, idx) => (
                            <Typography key={idx} variant="body2">
                                • {err}
                            </Typography>
                        ))}
                    </Alert>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={handleClearDumpRestoreResult}>
                        Back to Comparison
                    </Button>
                    <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleRefresh}>
                        Refresh Data
                    </Button>
                </Box>
            </Box>
        );
    }

    // Show results if we have them (only in non-compact mode)
    if (!compact && results.length > 0) {
        const successCount = results.filter((r) => r.errors.length === 0).length;
        const errorCount = results.filter((r) => r.errors.length > 0).length;
        const failedResults = results.filter((r) => r.errors.length > 0);
        const successResults = results.filter((r) => r.errors.length === 0);

        return (
            <Box>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2,
                    }}
                >
                    <Typography variant="subtitle1" fontWeight={500}>
                        Sync Results
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                            label={`${successCount} succeeded`}
                            size="small"
                            color="success"
                            variant="outlined"
                        />
                        {errorCount > 0 && (
                            <Chip
                                label={`${errorCount} failed`}
                                size="small"
                                color="error"
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Box>

                {/* Show errors first and prominently */}
                {failedResults.length > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            {failedResults.length} table(s) failed to sync:
                        </Typography>
                        {failedResults.map((result) => (
                            <Box key={result.table} sx={{ mb: 1.5 }}>
                                <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                                    {result.table}
                                </Typography>
                                {result.errors.map((err, idx) => (
                                    <Typography
                                        key={idx}
                                        variant="body2"
                                        sx={{
                                            pl: 2,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'pre-wrap',
                                        }}
                                    >
                                        • {err}
                                    </Typography>
                                ))}
                            </Box>
                        ))}
                    </Alert>
                )}

                {/* Show successful syncs */}
                {successResults.length > 0 && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Successfully synced:
                        </Typography>
                        {successResults.map((result) => (
                            <Box
                                key={result.table}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    p: 1.5,
                                    mb: 0.5,
                                    bgcolor: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: 'rgba(34, 197, 94, 0.3)',
                                }}
                            >
                                <CheckIcon sx={{ color: 'success.main' }} />
                                <Typography variant="body2" fontFamily="monospace" sx={{ flex: 1 }}>
                                    {result.table}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {result.inserted > 0 && (
                                        <Chip
                                            label={`+${result.inserted}`}
                                            size="small"
                                            sx={{ height: 22, fontSize: 11 }}
                                        />
                                    )}
                                    {result.updated > 0 && (
                                        <Chip
                                            label={`~${result.updated}`}
                                            size="small"
                                            sx={{ height: 22, fontSize: 11 }}
                                        />
                                    )}
                                    {result.deleted > 0 && (
                                        <Chip
                                            label={`-${result.deleted}`}
                                            size="small"
                                            sx={{ height: 22, fontSize: 11 }}
                                        />
                                    )}
                                    {result.inserted === 0 &&
                                        result.updated === 0 &&
                                        result.deleted === 0 && (
                                            <Chip
                                                label="No changes"
                                                size="small"
                                                variant="outlined"
                                                sx={{ height: 22, fontSize: 11 }}
                                            />
                                        )}
                                </Box>
                            </Box>
                        ))}
                    </>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button variant="outlined" onClick={handleClearResults}>
                        Back to Comparison
                    </Button>
                    <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleRefresh}>
                        Refresh Data
                    </Button>
                </Box>
            </Box>
        );
    }

    // Show "all in sync" message
    if (tableDiffs.length > 0 && outOfSyncTables.length === 0) {
        return (
            <Box>
                <OperationResultItem
                    result={{
                        id: 'data-diff',
                        success: true,
                        message: `All ${inSyncTables.length} tables are in sync between source and target.`,
                    }}
                />
                {shouldFetch && (
                    <Button
                        sx={{ mt: 2 }}
                        variant="outlined"
                        startIcon={isFetching ? <CircularProgress size={16} /> : <RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={isFetching}
                    >
                        Refresh
                    </Button>
                )}
            </Box>
        );
    }

    // Show no tables message
    if (tableDiffs.length === 0) {
        return (
            <Box>
                <OperationResultItem
                    result={{
                        id: 'data-diff',
                        success: false,
                        message: `No tables found in the selected schema, or unable to compare data.`,
                    }}
                />
                {shouldFetch && (
                    <Button
                        sx={{ mt: 2 }}
                        variant="outlined"
                        startIcon={isFetching ? <CircularProgress size={16} /> : <RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={isFetching}
                    >
                        Refresh
                    </Button>
                )}
            </Box>
        );
    }

    return (
        <Box>
            {/* Summary */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip
                    label={`${outOfSyncTables.length} out of sync`}
                    size="small"
                    color="warning"
                />
                <Chip
                    label={`${inSyncTables.length} in sync`}
                    size="small"
                    color="success"
                    variant="outlined"
                />
                <Box sx={{ flex: 1 }} />
                {shouldFetch && (
                    <Button
                        size="small"
                        startIcon={isFetching ? <CircularProgress size={14} /> : <RefreshIcon />}
                        onClick={handleRefresh}
                        disabled={isFetching}
                    >
                        Refresh
                    </Button>
                )}
            </Box>

            {/* Tables grid */}
            {!compact && (
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Tables with differences ({outOfSyncTables.length})
                </Typography>
            )}

            <DataGrid
                rows={compact ? tableDiffs : outOfSyncTables}
                columns={columns}
                getRowId={(row) => row.table}
                checkboxSelection={!compact}
                disableRowSelectionOnClick={compact}
                rowSelectionModel={selectedTables}
                onRowSelectionModelChange={setSelectedTables}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                }}
                sx={{
                    mb: compact ? 0 : 3,
                    height: compact ? 300 : 400,
                    border: 'none',
                    '& .MuiDataGrid-cell': {
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                        bgcolor: 'background.default',
                        borderColor: 'divider',
                    },
                }}
            />

            {/* Sync Options (only in non-compact mode) */}
            {!compact && (
                <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Sync Options
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
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
                            label="Insert missing rows (rows in source but not in target)"
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
                            label="Update different rows (rows that exist in both but have different values)"
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
                                    Delete extra rows in target (rows in target but not in source)
                                    <Chip label="Destructive" size="small" color="error" />
                                </Box>
                            }
                        />
                    </Box>

                    {/* Sync Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={handleSync}
                            disabled={syncing || dumpRestoring || outOfSyncTables.length === 0}
                            startIcon={
                                syncing ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <SyncIcon />
                                )
                            }
                        >
                            {syncing
                                ? 'Syncing...'
                                : `Sync ${selectedTables.length || outOfSyncTables.length} Table(s)`}
                        </Button>

                        <Typography variant="body2" color="text.secondary">
                            or
                        </Typography>

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleDumpAndRestore}
                            disabled={syncing || dumpRestoring || tableDiffs.length === 0}
                            startIcon={
                                dumpRestoring ? (
                                    <CircularProgress size={16} color="inherit" />
                                ) : (
                                    <CopyIcon />
                                )
                            }
                        >
                            {dumpRestoring ? 'Copying...' : 'Dump & Restore All'}
                        </Button>

                        <Chip
                            label="Handles FK constraints"
                            size="small"
                            color="info"
                            variant="outlined"
                        />
                    </Box>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            <strong>Sync Tables:</strong> Incrementally sync selected tables (may
                            fail with FK constraints).
                        </Typography>
                        <Typography variant="body2">
                            <strong>Dump & Restore:</strong> Truncates target and copies all data in
                            dependency order (handles FK constraints properly).
                        </Typography>
                    </Alert>

                    {(syncing || dumpRestoring) && <LinearProgress sx={{ mt: 2 }} />}
                </>
            )}
        </Box>
    );
}
