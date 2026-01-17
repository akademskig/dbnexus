import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Checkbox,
    LinearProgress,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { Sync as SyncIcon } from '@mui/icons-material';
import { syncApi } from '../../lib/api';
import type { TableDataDiff } from '@dbnexus/shared';

interface DataSyncDialogProps {
    open: boolean;
    onClose: () => void;
    sourceConnectionId: string;
    targetConnectionId: string;
    targetName: string;
    schema: string;
}

export function DataSyncDialog({
    open,
    onClose,
    sourceConnectionId,
    targetConnectionId,
    targetName,
    schema,
}: DataSyncDialogProps) {
    const queryClient = useQueryClient();
    const [selectedTables, setSelectedTables] = useState<GridRowSelectionModel>([]);
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
            selectedTables.length > 0
                ? (selectedTables as string[])
                : outOfSyncTables.map((t) => t.table);

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

    // DataGrid columns for table selection
    const columns: GridColDef<TableDataDiff>[] = [
        {
            field: 'table',
            headerName: 'Table',
            flex: 1,
            minWidth: 150,
        },
        {
            field: 'sourceCount',
            headerName: 'Source',
            width: 100,
            align: 'right',
            headerAlign: 'right',
        },
        {
            field: 'targetCount',
            headerName: 'Target',
            width: 100,
            align: 'right',
            headerAlign: 'right',
        },
        {
            field: 'difference',
            headerName: 'Difference',
            width: 120,
            align: 'right',
            headerAlign: 'right',
            valueGetter: (_, row) => row.sourceCount - row.targetCount,
            renderCell: (params) => {
                const diff = params.value as number;
                return (
                    <Typography
                        variant="body2"
                        color={
                            diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.secondary'
                        }
                    >
                        {diff > 0 ? '+' : ''}
                        {diff}
                    </Typography>
                );
            },
        },
    ];

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
                                    borderRadius: 1,
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

                        <DataGrid
                            rows={outOfSyncTables}
                            columns={columns}
                            getRowId={(row) => row.table}
                            checkboxSelection
                            rowSelectionModel={selectedTables}
                            onRowSelectionModelChange={setSelectedTables}
                            autoHeight
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 10 } },
                            }}
                            sx={{
                                mb: 3,
                                maxHeight: 300,
                                border: 'none',
                                '& .MuiDataGrid-cell': {
                                    borderColor: 'divider',
                                },
                                '& .MuiDataGrid-columnHeaders': {
                                    bgcolor: 'background.default',
                                    borderColor: 'divider',
                                },
                            }}
                        />

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
            <DialogActions sx={{ p: 2 }}>
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
