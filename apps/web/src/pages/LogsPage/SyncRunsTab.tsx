import { useState } from 'react';
import {
    Box,
    Typography,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    Sync as SyncIcon,
    Visibility as ViewIcon,
    TableChart as TableIcon,
    Schema as SchemaIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { syncApi, SyncRun } from '../../lib/api';
import { StatusAlert } from '@/components/StatusAlert';

function formatDate(date: Date): string {
    return date.toLocaleString();
}

function formatDuration(startedAt: string, completedAt?: string): string {
    if (!completedAt) return 'Running...';
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
}

function getStatusColor(status: SyncRun['status']): string {
    switch (status) {
        case 'completed':
            return '#22c55e';
        case 'failed':
            return '#ef4444';
        case 'running':
            return '#3b82f6';
        case 'cancelled':
            return '#6b7280';
        default:
            return '#6b7280';
    }
}

export function SyncRunsTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedRun, setSelectedRun] = useState<SyncRun | null>(null);

    const { data: syncRuns = [], isLoading } = useQuery({
        queryKey: ['syncRuns'],
        queryFn: () => syncApi.getSyncRuns(500),
    });

    // Filter sync runs
    const filteredRuns = syncRuns.filter((run) => {
        if (statusFilter !== 'all' && run.status !== statusFilter) return false;
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            return (
                run.tableName?.toLowerCase().includes(search) ||
                run.schemaName?.toLowerCase().includes(search) ||
                run.sourceConnectionName?.toLowerCase().includes(search) ||
                run.targetConnectionName?.toLowerCase().includes(search)
            );
        }
        return true;
    });

    const columns: GridColDef[] = [
        {
            field: 'startedAt',
            headerName: 'Time',
            width: 170,
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {formatDate(new Date(params.row.startedAt))}
                </Typography>
            ),
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 100,
            valueGetter: (_value, row) => (row.tableName ? 'Table' : 'Schema'),
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {params.row.tableName ? (
                        <TableIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
                    ) : (
                        <SchemaIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                    )}
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {params.value}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'target',
            headerName: 'Target',
            width: 200,
            valueGetter: (_value, row) => {
                const table = row.tableName
                    ? `${row.schemaName}.${row.tableName}`
                    : row.schemaName || 'Unknown';
                return table;
            },
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <StyledTooltip title={params.value}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: 12,
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {params.value}
                    </Typography>
                </StyledTooltip>
            ),
        },
        {
            field: 'connections',
            headerName: 'Connections',
            width: 220,
            valueGetter: (_value, row) =>
                `${row.sourceConnectionName || '?'} → ${row.targetConnectionName || '?'}`,
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <StyledTooltip title={params.value}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {params.value}
                    </Typography>
                </StyledTooltip>
            ),
        },
        {
            field: 'inserts',
            headerName: 'Inserted',
            width: 80,
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: 12,
                        color: params.value > 0 ? '#22c55e' : 'text.secondary',
                    }}
                >
                    {params.value > 0 ? `+${params.value}` : params.value}
                </Typography>
            ),
        },
        {
            field: 'updates',
            headerName: 'Updated',
            width: 80,
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: 12,
                        color: params.value > 0 ? '#f59e0b' : 'text.secondary',
                    }}
                >
                    {params.value > 0 ? `~${params.value}` : params.value}
                </Typography>
            ),
        },
        {
            field: 'deletes',
            headerName: 'Deleted',
            width: 80,
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: 12,
                        color: params.value > 0 ? '#ef4444' : 'text.secondary',
                    }}
                >
                    {params.value > 0 ? `-${params.value}` : params.value}
                </Typography>
            ),
        },
        {
            field: 'duration',
            headerName: 'Duration',
            width: 100,
            valueGetter: (_value, row) => formatDuration(row.startedAt, row.completedAt),
            renderCell: (params: GridRenderCellParams) => (
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        fontSize: 10,
                        height: 20,
                        textTransform: 'capitalize',
                        bgcolor: `${getStatusColor(params.value)}15`,
                        color: getStatusColor(params.value),
                    }}
                />
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 60,
            sortable: false,
            renderCell: (params: GridRenderCellParams<SyncRun>) => (
                <StyledTooltip title="View Details">
                    <IconButton size="small" onClick={() => setSelectedRun(params.row)}>
                        <ViewIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </StyledTooltip>
            ),
        },
    ];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filters */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    mt: 1,
                    mb: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="Status"
                    >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="failed">Failed</MenuItem>
                        <MenuItem value="running">Running</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    size="small"
                    placeholder="Search by table, schema, or connection..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ minWidth: 300 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchQuery('')}>
                                    <ClearIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <Box sx={{ flex: 1 }} />

                <Typography variant="body2" color="text.secondary">
                    {filteredRuns.length} sync operations
                </Typography>
            </Box>

            {/* Data Grid */}
            <Box sx={{ flex: 1, minHeight: 400 }}>
                <DataGrid
                    rows={filteredRuns}
                    columns={columns}
                    loading={isLoading}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: { sortModel: [{ field: 'startedAt', sort: 'desc' }] },
                    }}
                    disableRowSelectionOnClick
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': {
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                        },
                    }}
                />
            </Box>

            {/* Sync Run Details Dialog */}
            <Dialog
                open={!!selectedRun}
                onClose={() => setSelectedRun(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <SyncIcon sx={{ color: '#22c55e' }} />
                        <Typography variant="h6">Sync Run Details</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedRun && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            {/* Metadata */}
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Started
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDate(new Date(selectedRun.startedAt))}
                                    </Typography>
                                </Box>
                                {selectedRun.completedAt && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Completed
                                        </Typography>
                                        <Typography variant="body2">
                                            {formatDate(new Date(selectedRun.completedAt))}
                                        </Typography>
                                    </Box>
                                )}
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Duration
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDuration(
                                            selectedRun.startedAt,
                                            selectedRun.completedAt
                                        )}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={selectedRun.status}
                                    size="small"
                                    sx={{
                                        alignSelf: 'center',
                                        textTransform: 'capitalize',
                                        bgcolor: `${getStatusColor(selectedRun.status)}15`,
                                        color: getStatusColor(selectedRun.status),
                                    }}
                                />
                            </Box>

                            {/* Connections */}
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Source
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedRun.sourceConnectionName || 'Unknown'}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Target
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedRun.targetConnectionName || 'Unknown'}
                                    </Typography>
                                </Box>
                                {selectedRun.schemaName && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Schema
                                        </Typography>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {selectedRun.schemaName}
                                        </Typography>
                                    </Box>
                                )}
                                {selectedRun.tableName && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Table
                                        </Typography>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {selectedRun.tableName}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Results */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 2,
                                    p: 2,
                                    bgcolor: 'background.default',
                                    borderRadius: 1,
                                }}
                            >
                                <Box sx={{ textAlign: 'center', flex: 1 }}>
                                    <Typography
                                        variant="h5"
                                        sx={{ color: '#22c55e', fontWeight: 600 }}
                                    >
                                        +{selectedRun.inserts}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Inserted
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center', flex: 1 }}>
                                    <Typography
                                        variant="h5"
                                        sx={{ color: '#f59e0b', fontWeight: 600 }}
                                    >
                                        ~{selectedRun.updates}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Updated
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center', flex: 1 }}>
                                    <Typography
                                        variant="h5"
                                        sx={{ color: '#ef4444', fontWeight: 600 }}
                                    >
                                        -{selectedRun.deletes}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Deleted
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Errors */}
                            {selectedRun.errors.length > 0 && (
                                <StatusAlert severity="error">
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        Errors ({selectedRun.errors.length})
                                    </Typography>
                                    <Box
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: 12,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            maxHeight: 200,
                                            overflow: 'auto',
                                            bgcolor: 'rgba(0,0,0,0.1)',
                                            p: 1.5,
                                            borderRadius: 1,
                                        }}
                                    >
                                        {selectedRun.errors.join('\n')}
                                    </Box>
                                </StatusAlert>
                            )}

                            {/* SQL Statements */}
                            {selectedRun.sqlStatements.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        Executed SQL ({selectedRun.sqlStatements.length} statements)
                                    </Typography>
                                    <Box
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: 12,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            maxHeight: 300,
                                            overflow: 'auto',
                                            bgcolor: 'background.default',
                                            p: 2,
                                            borderRadius: 1,
                                        }}
                                    >
                                        {selectedRun.sqlStatements.join('\n\n')}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSelectedRun(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
