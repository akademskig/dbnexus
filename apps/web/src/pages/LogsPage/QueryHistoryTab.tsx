import { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Chip,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    Delete as DeleteIcon,
    PlayArrow as PlayIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queriesApi, connectionsApi, projectsApi } from '../../lib/api';
import type { QueryHistoryEntry } from '@dbnexus/shared';

const PROJECT_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#0ea5e9', // sky
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899', // pink
];

function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString();
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
}

export function QueryHistoryTab() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedConnection, setSelectedConnection] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<QueryHistoryEntry | null>(null);

    const { data: connections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: projectsApi.getAll,
    });

    const { data: history = [], isLoading } = useQuery({
        queryKey: ['queryHistory', selectedConnection],
        queryFn: () => queriesApi.getHistory(selectedConnection || undefined, 500),
    });

    const clearMutation = useMutation({
        mutationFn: () => queriesApi.clearHistory(selectedConnection || undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queryHistory'] });
            setClearDialogOpen(false);
        },
    });

    const handleCopy = (sql: string, id: string) => {
        navigator.clipboard.writeText(sql);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRunQuery = (entry: QueryHistoryEntry) => {
        // Navigate to query page with the connection and pre-fill the query
        navigate(`/query/${entry.connectionId}`, {
            state: { sql: entry.sql },
        });
    };

    const getConnectionInfo = (connectionId: string) => {
        const conn = connections.find((c) => c.id === connectionId);
        if (!conn) return { name: 'Unknown', color: undefined };

        const project = projects.find((p) => p.id === conn.projectId);
        const colorIndex = project ? projects.indexOf(project) % PROJECT_COLORS.length : -1;
        const color = colorIndex >= 0 ? PROJECT_COLORS[colorIndex] : undefined;

        return { name: conn.name, color };
    };

    const getConnectionName = (connectionId: string) => {
        return getConnectionInfo(connectionId).name;
    };

    // Filter history
    const filteredHistory = history.filter((entry) => {
        if (statusFilter === 'success' && !entry.success) return false;
        if (statusFilter === 'error' && entry.success) return false;
        if (searchQuery && !entry.sql.toLowerCase().includes(searchQuery.toLowerCase()))
            return false;
        return true;
    });

    const columns: GridColDef[] = [
        {
            field: 'executedAt',
            headerName: 'Time',
            width: 170,
            renderCell: (params: GridRenderCellParams) => (
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {formatDate(params.value)}
                </Typography>
            ),
        },
        {
            field: 'connectionId',
            headerName: 'Connection',
            width: 150,
            renderCell: (params: GridRenderCellParams) => {
                const { name, color } = getConnectionInfo(params.value);
                return (
                    <Chip
                        label={name}
                        size="small"
                        sx={{
                            fontSize: 11,
                            ...(color && {
                                bgcolor: `${color}15`,
                                color: color,
                                border: `1px solid ${color}`,
                            }),
                        }}
                    />
                );
            },
        },
        {
            field: 'sql',
            headerName: 'Query',
            flex: 1,
            minWidth: 300,
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title={params.value} placement="top-start">
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {params.value}
                    </Typography>
                </Tooltip>
            ),
        },
        {
            field: 'executionTimeMs',
            headerName: 'Duration',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: 12,
                        color: params.value > 1000 ? 'warning.main' : 'text.secondary',
                    }}
                >
                    {formatDuration(params.value)}
                </Typography>
            ),
        },
        {
            field: 'rowCount',
            headerName: 'Rows',
            width: 80,
            renderCell: (params: GridRenderCellParams) => (
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {params.value.toLocaleString()}
                </Typography>
            ),
        },
        {
            field: 'success',
            headerName: 'Status',
            width: 90,
            renderCell: (params: GridRenderCellParams<QueryHistoryEntry>) => (
                <Chip
                    label={params.value ? 'Success' : 'Error'}
                    size="small"
                    sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor: params.value
                            ? 'rgba(34, 197, 94, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                        color: params.value ? '#22c55e' : '#ef4444',
                    }}
                />
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 100,
            sortable: false,
            renderCell: (params: GridRenderCellParams<QueryHistoryEntry>) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Copy SQL">
                        <IconButton
                            size="small"
                            onClick={() => handleCopy(params.row.sql, params.row.id)}
                        >
                            {copiedId === params.row.id ? (
                                <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            ) : (
                                <CopyIcon sx={{ fontSize: 16 }} />
                            )}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Run Again">
                        <IconButton size="small" onClick={() => handleRunQuery(params.row)}>
                            <PlayIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => setSelectedEntry(params.row)}>
                            <SearchIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
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
                    mb: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Connection</InputLabel>
                    <Select
                        value={selectedConnection}
                        onChange={(e) => setSelectedConnection(e.target.value)}
                        label="Connection"
                    >
                        <MenuItem value="">All Connections</MenuItem>
                        {connections.map((conn) => (
                            <MenuItem key={conn.id} value={conn.id}>
                                {conn.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value as 'all' | 'success' | 'error')
                        }
                        label="Status"
                    >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="success">Success</MenuItem>
                        <MenuItem value="error">Errors</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    size="small"
                    placeholder="Search queries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ minWidth: 250 }}
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
                    {filteredHistory.length} entries
                </Typography>

                <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setClearDialogOpen(true)}
                    disabled={history.length === 0}
                >
                    Clear History
                </Button>
            </Box>

            {/* Data Grid */}
            <Box sx={{ flex: 1, minHeight: 400 }}>
                <DataGrid
                    rows={filteredHistory}
                    columns={columns}
                    loading={isLoading}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: { sortModel: [{ field: 'executedAt', sort: 'desc' }] },
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

            {/* Clear Confirmation Dialog */}
            <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
                <DialogTitle>Clear Query History</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to clear{' '}
                        {selectedConnection
                            ? `history for ${getConnectionName(selectedConnection)}`
                            : 'all query history'}
                        ? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => clearMutation.mutate()}
                        disabled={clearMutation.isPending}
                    >
                        Clear
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Entry Details Dialog */}
            <Dialog
                open={!!selectedEntry}
                onClose={() => setSelectedEntry(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Query Details</DialogTitle>
                <DialogContent>
                    {selectedEntry && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Connection
                                    </Typography>
                                    <Typography variant="body2">
                                        {getConnectionName(selectedEntry.connectionId)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Executed At
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDate(selectedEntry.executedAt)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Duration
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDuration(selectedEntry.executionTimeMs)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Rows
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedEntry.rowCount.toLocaleString()}
                                    </Typography>
                                </Box>
                            </Box>

                            {!selectedEntry.success && selectedEntry.error && (
                                <Alert severity="error">{selectedEntry.error}</Alert>
                            )}

                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    SQL Query
                                </Typography>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: 'background.default',
                                        borderRadius: 1,
                                        fontFamily: 'monospace',
                                        fontSize: 13,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        maxHeight: 300,
                                        overflow: 'auto',
                                    }}
                                >
                                    {selectedEntry.sql}
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedEntry(null)}>Close</Button>
                    {selectedEntry && (
                        <>
                            <Button
                                startIcon={<CopyIcon />}
                                onClick={() => handleCopy(selectedEntry.sql, selectedEntry.id)}
                            >
                                Copy SQL
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<PlayIcon />}
                                onClick={() => {
                                    handleRunQuery(selectedEntry);
                                    setSelectedEntry(null);
                                }}
                            >
                                Run Again
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
