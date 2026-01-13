import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    DataGrid,
    type GridColDef,
    type GridRenderCellParams,
    type GridRowId,
    type GridRowModel,
    type GridRowModesModel,
    GridRowModes,
} from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SyncIcon from '@mui/icons-material/Sync';
import DownloadIcon from '@mui/icons-material/Download';
import type { QueryResult, TableSchema } from '@dbnexus/shared';
import { CellValue } from './CellValue';
import { useToastStore } from '../../stores/toastStore';

interface DataTabProps {
    readonly result: QueryResult | null;
    readonly error: string | null;
    readonly loading: boolean;
    readonly confirmDangerous: { message: string; type: string } | null;
    readonly onConfirm: () => void;
    readonly onCancel: () => void;
    readonly totalRowCount: number | null;
    readonly paginationModel: { page: number; pageSize: number };
    readonly onPaginationChange: (model: { page: number; pageSize: number }) => void;
    readonly onSearch: (query: string) => void;
    readonly searchQuery: string;
    readonly tableSchema?: TableSchema;
    readonly onUpdateRow?: (
        oldRow: Record<string, unknown>,
        newRow: Record<string, unknown>
    ) => Promise<void>;
    readonly onDeleteRow?: (row: Record<string, unknown>) => void;
    readonly onSyncRow?: (rows: Record<string, unknown>[]) => void;
}

export function DataTab({
    result,
    error,
    loading,
    confirmDangerous,
    onConfirm,
    onCancel,
    totalRowCount,
    paginationModel,
    onPaginationChange,
    onSearch,
    searchQuery,
    tableSchema,
    onUpdateRow,
    onDeleteRow,
    onSyncRow,
}: DataTabProps) {
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
    const [deleteConfirmRow, setDeleteConfirmRow] = useState<Record<string, unknown> | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useState<GridRowId[]>([]);
    const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
    const toast = useToastStore();

    // Get primary key columns for identifying rows
    const primaryKeyColumns =
        tableSchema?.columns.filter((c) => c.isPrimaryKey).map((c) => c.name) || [];
    // Can only edit/delete/sync if we have primary keys to identify rows
    const canEditRows = primaryKeyColumns.length > 0;
    // Check if we have any selected rows
    const hasSelectedRows = selectedRowIds.length > 0;

    const handleSaveClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    };

    const handleCancelClick = (id: GridRowId) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
        });
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmRow && onDeleteRow) {
            onDeleteRow(deleteConfirmRow);
        }
        setDeleteConfirmRow(null);
    };

    const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
        if (onUpdateRow) {
            await onUpdateRow(
                oldRow as Record<string, unknown>,
                newRow as Record<string, unknown>
            );
        }
        return newRow;
    };

    const handleProcessRowUpdateError = (err: Error) => {
        console.error('Row update error:', err);
    };

    // Check if a column type is JSON-like
    const isJsonColumn = (dataType: string): boolean => {
        const lower = dataType.toLowerCase();
        return lower.includes('json') || lower.includes('jsonb');
    };

    // Handle JSON save from cell viewer
    const handleJsonCellSave = (
        row: Record<string, unknown>,
        field: string,
        newValue: unknown
    ) => {
        if (!onUpdateRow) return;
        const newRow = { ...row, [field]: newValue };
        onUpdateRow(row, newRow);
    };

    // Convert result to DataGrid format
    const dataColumns: GridColDef[] = result
        ? result.columns.map((col) => {
              const isPrimaryKey = primaryKeyColumns.includes(col.name);
              const isJson = isJsonColumn(col.dataType);
              // JSON columns are edited via dialog, not inline; PK columns are not editable
              const isEditable = canEditRows && !isPrimaryKey && !isJson;
              // JSON columns can be edited via dialog if we have edit capability
              const canEditJson = canEditRows && !isPrimaryKey && isJson;

              return {
                  field: col.name,
                  headerName: col.name,
                  description: col.dataType,
                  flex: 1,
                  minWidth: 120,
                  editable: isEditable,
                  renderCell: (params: GridRenderCellParams) => (
                      <CellValue
                          value={params.value}
                          onSaveJson={
                              canEditJson
                                  ? (newValue) =>
                                        handleJsonCellSave(
                                            params.row as Record<string, unknown>,
                                            col.name,
                                            newValue
                                        )
                                  : undefined
                          }
                      />
                  ),
                  renderHeader: () => (
                      <Box>
                          <Typography variant="body2" fontWeight={600}>
                              {col.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                              {col.dataType}
                          </Typography>
                      </Box>
                  ),
              };
          })
        : [];

    // Get the currently editing row id (if any)
    const editingRowId = Object.entries(rowModesModel).find(
        ([, mode]) => mode.mode === GridRowModes.Edit
    )?.[0];

    const columns: GridColDef[] = dataColumns;

    // Use __rowIndex as internal DataGrid id to avoid conflicts with database 'id' column
    const rows = result
        ? result.rows.map((row, index) => ({
              __rowIndex: index,
              ...row,
          }))
        : [];

    // Get selected rows data
    const getSelectedRows = (): Record<string, unknown>[] => {
        return selectedRowIds
            .map((id) => {
                // Find row by __rowIndex
                const row = rows.find(
                    (r) => r.__rowIndex === id || String(r.__rowIndex) === String(id)
                );
                if (!row) {
                    console.warn(
                        'Row not found for __rowIndex:',
                        id,
                        'Available indices:',
                        rows.map((r) => r.__rowIndex)
                    );
                    return null;
                }
                // Remove the internal '__rowIndex' field we added, keep everything else
                const { __rowIndex: _, ...rowData } = row;
                return rowData;
            })
            .filter(
                (row): row is Record<string, unknown> => row !== null && Object.keys(row).length > 0
            );
    };

    // Handle toolbar actions
    const handleEditSelected = () => {
        if (selectedRowIds.length === 1) {
            const id = selectedRowIds[0];
            setRowModesModel({ [String(id)]: { mode: GridRowModes.Edit } });
        }
    };

    const handleDeleteSelected = () => {
        if (selectedRowIds.length === 1) {
            const row = rows.find((r) => r.__rowIndex === selectedRowIds[0]);
            if (row) {
                const { __rowIndex: _, ...rowData } = row;
                setDeleteConfirmRow(rowData);
            }
        }
    };

    const handleSyncSelected = () => {
        const selectedRows = getSelectedRows();
        if (selectedRows.length > 0 && onSyncRow) {
            onSyncRow(selectedRows);
        }
    };

    // Export functions
    const exportToCSV = () => {
        if (!result || result.rows.length === 0) return;

        const headers = result.columns.map((c) => c.name);
        const csvRows = [
            headers.join(','),
            ...result.rows.map((row) =>
                headers
                    .map((h) => {
                        const val = row[h];
                        if (val === null || val === undefined) return '';
                        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
                        const str = String(val);
                        // Escape quotes and wrap in quotes if contains comma, newline, or quote
                        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                            return `"${str.replace(/"/g, '""')}"`;
                        }
                        return str;
                    })
                    .join(',')
            ),
        ];

        const csvContent = csvRows.join('\n');
        downloadFile(csvContent, 'query-results.csv', 'text/csv');
        toast.success('Exported to CSV');
    };

    const exportToJSON = () => {
        if (!result || result.rows.length === 0) return;

        const jsonContent = JSON.stringify(result.rows, null, 2);
        downloadFile(jsonContent, 'query-results.json', 'application/json');
        toast.success('Exported to JSON');
    };

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {loading && <LinearProgress />}

            {confirmDangerous && (
                <Alert
                    severity="warning"
                    icon={<WarningIcon />}
                    action={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button color="inherit" size="small" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button
                                color="error"
                                size="small"
                                variant="contained"
                                onClick={onConfirm}
                            >
                                Execute Anyway
                            </Button>
                        </Box>
                    }
                >
                    <Typography variant="subtitle2">Dangerous Query Detected</Typography>
                    <Typography variant="body2">{confirmDangerous.message}</Typography>
                </Alert>
            )}

            {error && (
                <Alert severity="error" icon={<ErrorIcon />} sx={{ m: 2 }}>
                    <Typography variant="subtitle2">Query Error</Typography>
                    <Typography variant="body2" fontFamily="monospace">
                        {error}
                    </Typography>
                </Alert>
            )}

            {result && (
                <>
                    {/* Stats Bar with Search */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            minHeight: 48,
                            bgcolor: 'background.paper',
                            borderBottom: 1,
                            borderColor: 'divider',
                        }}
                    >
                        {/* Left side: Stats or Selection info */}
                        {editingRowId ? (
                            <>
                                <Typography
                                    variant="body2"
                                    color="warning.main"
                                    sx={{ fontWeight: 500 }}
                                >
                                    Editing row...
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSaveClick(editingRowId)}
                                    sx={{ minWidth: 'auto', px: 1.5 }}
                                >
                                    Save
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<CancelIcon />}
                                    onClick={handleCancelClick(editingRowId)}
                                    sx={{ minWidth: 'auto', px: 1.5 }}
                                >
                                    Cancel
                                </Button>
                            </>
                        ) : hasSelectedRows ? (
                            <>
                                <Chip
                                    label={`${selectedRowIds.length} selected`}
                                    size="small"
                                    color="primary"
                                    onDelete={() => setSelectedRowIds([])}
                                />
                                <Tooltip
                                    title={
                                        !canEditRows
                                            ? 'No primary key'
                                            : selectedRowIds.length > 1
                                              ? 'Select 1 row'
                                              : 'Edit'
                                    }
                                >
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={handleEditSelected}
                                            disabled={
                                                !canEditRows ||
                                                selectedRowIds.length !== 1 ||
                                                !onUpdateRow
                                            }
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip
                                    title={
                                        !canEditRows
                                            ? 'No primary key'
                                            : selectedRowIds.length > 1
                                              ? 'Select 1 row'
                                              : 'Delete'
                                    }
                                >
                                    <span>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={handleDeleteSelected}
                                            disabled={
                                                !canEditRows ||
                                                selectedRowIds.length !== 1 ||
                                                !onDeleteRow
                                            }
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip
                                    title={
                                        !canEditRows
                                            ? 'No primary key'
                                            : `Sync ${selectedRowIds.length} row${selectedRowIds.length > 1 ? 's' : ''}`
                                    }
                                >
                                    <span>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={handleSyncSelected}
                                            disabled={!canEditRows || !onSyncRow}
                                        >
                                            <SyncIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        color: 'success.main',
                                    }}
                                >
                                    <CheckCircleIcon fontSize="small" />
                                    <Typography variant="body2">
                                        {totalRowCount !== null
                                            ? `${totalRowCount.toLocaleString()} rows`
                                            : `${result.rowCount} rows`}
                                    </Typography>
                                </Box>
                                {totalRowCount !== null &&
                                    totalRowCount > paginationModel.pageSize && (
                                        <Typography variant="body2" color="text.secondary">
                                            {paginationModel.page * paginationModel.pageSize + 1}-
                                            {Math.min(
                                                (paginationModel.page + 1) *
                                                    paginationModel.pageSize,
                                                totalRowCount
                                            )}
                                        </Typography>
                                    )}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <AccessTimeIcon fontSize="small" />
                                    <Typography variant="body2">
                                        {result.executionTimeMs}ms
                                    </Typography>
                                </Box>
                            </>
                        )}

                        {/* Spacer */}
                        <Box sx={{ flex: 1 }} />

                        {/* Export button */}
                        {result.rows.length > 0 && (
                            <>
                                <Tooltip title="Export data">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                                    >
                                        <DownloadIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Menu
                                    anchorEl={exportMenuAnchor}
                                    open={Boolean(exportMenuAnchor)}
                                    onClose={() => setExportMenuAnchor(null)}
                                >
                                    <MenuItem
                                        onClick={() => {
                                            exportToCSV();
                                            setExportMenuAnchor(null);
                                        }}
                                    >
                                        <ListItemIcon>
                                            <DownloadIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>Export as CSV</ListItemText>
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => {
                                            exportToJSON();
                                            setExportMenuAnchor(null);
                                        }}
                                    >
                                        <ListItemIcon>
                                            <DownloadIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>Export as JSON</ListItemText>
                                    </MenuItem>
                                </Menu>
                            </>
                        )}

                        {/* Right side: Search (always visible) */}
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onSearch(localSearch);
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon
                                            fontSize="small"
                                            sx={{ color: 'text.disabled' }}
                                        />
                                    </InputAdornment>
                                ),
                                endAdornment: localSearch && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setLocalSearch('');
                                                onSearch('');
                                            }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                width: 180,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: 'background.default',
                                    height: 32,
                                },
                                '& .MuiOutlinedInput-input': {
                                    py: 0.5,
                                },
                            }}
                        />
                        {searchQuery && (
                            <Chip
                                label={`"${searchQuery}"`}
                                size="small"
                                onDelete={() => {
                                    setLocalSearch('');
                                    onSearch('');
                                }}
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Box>

                    {/* Results DataGrid */}
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        {result.rows.length > 0 ? (
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                getRowId={(row) => row.__rowIndex}
                                density="compact"
                                checkboxSelection
                                rowSelectionModel={selectedRowIds}
                                onRowSelectionModelChange={(newSelection) =>
                                    setSelectedRowIds(newSelection as GridRowId[])
                                }
                                loading={loading}
                                paginationMode={totalRowCount !== null ? 'server' : 'client'}
                                rowCount={totalRowCount ?? result.rowCount}
                                paginationModel={paginationModel}
                                onPaginationModelChange={onPaginationChange}
                                pageSizeOptions={[50, 100, 250, 500]}
                                editMode="row"
                                rowModesModel={rowModesModel}
                                onRowModesModelChange={setRowModesModel}
                                processRowUpdate={processRowUpdate}
                                onProcessRowUpdateError={handleProcessRowUpdateError}
                                sx={{
                                    border: 'none',
                                    borderRadius: 0,
                                    '& .MuiDataGrid-cell': {
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                    },
                                    '& .MuiDataGrid-columnHeaders': {
                                        bgcolor: 'background.paper',
                                        borderRadius: 0,
                                    },
                                    '& .MuiDataGrid-columnHeader': {
                                        '&:focus': {
                                            outline: 'none',
                                        },
                                    },
                                    '& .MuiDataGrid-cell:focus': {
                                        outline: 'none',
                                    },
                                    '& .MuiDataGrid-row:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                    '& .MuiDataGrid-footerContainer': {
                                        borderRadius: 0,
                                    },
                                    '& .MuiDataGrid-cell--editing': {
                                        bgcolor: 'action.selected',
                                    },
                                }}
                            />
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                Query executed successfully. No rows returned.
                            </Box>
                        )}
                    </Box>
                </>
            )}

            {!result && !error && !loading && (
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body2">Loading data...</Typography>
                </Box>
            )}

            {/* Delete Row Confirmation Dialog */}
            <Dialog open={!!deleteConfirmRow} onClose={() => setDeleteConfirmRow(null)}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="error" />
                    Delete Row
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this row? This action cannot be undone.
                    </Typography>
                    {deleteConfirmRow && primaryKeyColumns.length > 0 && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                mb={0.5}
                            >
                                Row identifier:
                            </Typography>
                            {primaryKeyColumns.map((pk) => (
                                <Typography key={pk} variant="body2" fontFamily="monospace">
                                    {pk}: {String(deleteConfirmRow[pk])}
                                </Typography>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmRow(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleConfirmDelete}>
                        Delete Row
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
