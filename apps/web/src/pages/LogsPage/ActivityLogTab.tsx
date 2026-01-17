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

    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Alert,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    Storage as StorageIcon,
    Sync as SyncIcon,
    Code as CodeIcon,
    Settings as SettingsIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CompareArrows as CompareIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { connectionsApi, queriesApi, schemaApi } from '../../lib/api';

interface ActivityDetails {
    connectionId?: string;
    connectionName?: string;
    executionTimeMs?: number;
    rowCount?: number;
    error?: string;
    sourceConnection?: string;
    targetConnection?: string;
    sourceSchema?: string;
    targetSchema?: string;
    statementCount?: number;
}

interface ActivityItem {
    id: string;
    type: 'query' | 'migration' | 'connection' | 'sync';
    action: string;
    description: string;
    timestamp: Date;
    status: 'success' | 'error' | 'info';
    details?: ActivityDetails;
}

function formatDate(date: Date): string {
    return date.toLocaleString();
}

function formatDuration(ms: number | undefined): string {
    if (ms === undefined) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
}

function getActivityIcon(type: string, action: string) {
    switch (type) {
        case 'query':
            return <CodeIcon sx={{ fontSize: 18 }} />;
        case 'migration':
            return <CompareIcon sx={{ fontSize: 18 }} />;
        case 'sync':
            return <SyncIcon sx={{ fontSize: 18 }} />;
        case 'connection':
            if (action.includes('create')) return <AddIcon sx={{ fontSize: 18 }} />;
            if (action.includes('delete')) return <DeleteIcon sx={{ fontSize: 18 }} />;
            if (action.includes('update')) return <EditIcon sx={{ fontSize: 18 }} />;
            return <StorageIcon sx={{ fontSize: 18 }} />;
        default:
            return <SettingsIcon sx={{ fontSize: 18 }} />;
    }
}

function getActivityColor(type: string, status: string) {
    if (status === 'error') return '#ef4444';
    switch (type) {
        case 'query':
            return '#8b5cf6';
        case 'migration':
            return '#f59e0b';
        case 'sync':
            return '#22c55e';
        case 'connection':
            return '#0ea5e9';
        default:
            return '#6b7280';
    }
}

export function ActivityLogTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

    // Fetch data from multiple sources
    const { data: queryHistory = [], isLoading: loadingQueries } = useQuery({
        queryKey: ['queryHistory'],
        queryFn: () => queriesApi.getHistory(undefined, 500),
    });

    const { data: migrations = [], isLoading: loadingMigrations } = useQuery({
        queryKey: ['migrationHistory'],
        queryFn: () => schemaApi.getMigrationHistory({ limit: 500 }),
    });

    const { data: connections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const isLoading = loadingQueries || loadingMigrations;

    // Build unified activity list
    const activities: ActivityItem[] = [
        // Query activities
        ...queryHistory.map(
            (q): ActivityItem => ({
                id: `query-${q.id}`,
                type: 'query',
                action: 'execute',
                description: q.sql,
                timestamp: new Date(q.executedAt),
                status: q.success ? 'success' : 'error',
                details: {
                    connectionId: q.connectionId,
                    connectionName: connections.find((c) => c.id === q.connectionId)?.name,
                    executionTimeMs: q.executionTimeMs,
                    rowCount: q.rowCount,
                    error: q.error,
                },
            })
        ),
        // Migration activities
        ...migrations.map(
            (m): ActivityItem => ({
                id: `migration-${m.id}`,
                type: 'migration',
                action: 'apply',
                description:
                    m.description ||
                    `Migration from ${m.sourceConnectionName} to ${m.targetConnectionName}`,
                timestamp: new Date(m.appliedAt),
                status: m.success ? 'success' : 'error',
                details: {
                    sourceConnection: m.sourceConnectionName,
                    targetConnection: m.targetConnectionName,
                    sourceSchema: m.sourceSchema,
                    targetSchema: m.targetSchema,
                    statementCount: m.sqlStatements.length,
                    error: m.error,
                },
            })
        ),
    ];

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Filter activities
    const filteredActivities = activities.filter((activity) => {
        if (typeFilter !== 'all' && activity.type !== typeFilter) return false;
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            return (
                activity.description.toLowerCase().includes(search) ||
                activity.action.toLowerCase().includes(search) ||
                activity.type.toLowerCase().includes(search) ||
                activity.details?.connectionName?.toLowerCase().includes(search) ||
                activity.details?.sourceConnection?.toLowerCase().includes(search) ||
                activity.details?.targetConnection?.toLowerCase().includes(search)
            );
        }
        return true;
    });

    const columns: GridColDef[] = [
        {
            field: 'timestamp',
            headerName: 'Time',
            width: 170,
            renderCell: (params: GridRenderCellParams) => (
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {formatDate(params.value)}
                </Typography>
            ),
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params: GridRenderCellParams<ActivityItem>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                        sx={{
                            width: 24,
                            height: 24,
                            bgcolor: `${getActivityColor(params.row.type, params.row.status)}20`,
                            color: getActivityColor(params.row.type, params.row.status),
                        }}
                    >
                        {getActivityIcon(params.row.type, params.row.action)}
                    </Avatar>
                    <Chip
                        label={params.value}
                        size="small"
                        sx={{
                            fontSize: 10,
                            height: 20,
                            textTransform: 'capitalize',
                            bgcolor: `${getActivityColor(params.row.type, params.row.status)}15`,
                            color: getActivityColor(params.row.type, params.row.status),
                        }}
                    />
                </Box>
            ),
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1,
            minWidth: 300,
            renderCell: (params: GridRenderCellParams<ActivityItem>) => (
                <StyledTooltip title={params.value} placement="top-start">
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily: params.row.type === 'query' ? 'monospace' : 'inherit',
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
            field: 'connection',
            headerName: 'Connection',
            width: 150,
            valueGetter: (_value, row) => {
                if (row.details?.connectionName) return row.details.connectionName;
                if (row.details?.sourceConnection && row.details?.targetConnection) {
                    return `${row.details.sourceConnection} → ${row.details.targetConnection}`;
                }
                return '-';
            },
            renderCell: (params: GridRenderCellParams) => (
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
            field: 'duration',
            headerName: 'Duration',
            width: 90,
            valueGetter: (_value, row) => row.details?.executionTimeMs,
            renderCell: (params: GridRenderCellParams) => (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: 12,
                        color:
                            params.value && params.value > 1000 ? 'warning.main' : 'text.secondary',
                    }}
                >
                    {formatDuration(params.value)}
                </Typography>
            ),
        },
        {
            field: 'rows',
            headerName: 'Rows',
            width: 80,
            valueGetter: (_value, row) => row.details?.rowCount,
            renderCell: (params: GridRenderCellParams) => (
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {params.value !== undefined ? params.value.toLocaleString() : '-'}
                </Typography>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 90,
            renderCell: (params: GridRenderCellParams<ActivityItem>) => (
                <Chip
                    label={params.value === 'error' ? 'Error' : 'Success'}
                    size="small"
                    sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor:
                            params.value === 'error'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(34, 197, 94, 0.1)',
                        color: params.value === 'error' ? '#ef4444' : '#22c55e',
                    }}
                />
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 60,
            sortable: false,
            renderCell: (params: GridRenderCellParams<ActivityItem>) => (
                <StyledTooltip title="View Details">
                    <IconButton size="small" onClick={() => setSelectedActivity(params.row)}>
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
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        label="Type"
                    >
                        <MenuItem value="all">All Activity</MenuItem>
                        <MenuItem value="query">Queries</MenuItem>
                        <MenuItem value="migration">Migrations</MenuItem>
                        <MenuItem value="sync">Sync Operations</MenuItem>
                        <MenuItem value="connection">Connections</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    size="small"
                    placeholder="Search activity..."
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
                    {filteredActivities.length} activities
                </Typography>
            </Box>

            {/* Data Grid */}
            <Box sx={{ flex: 1, minHeight: 400 }}>
                <DataGrid
                    rows={filteredActivities}
                    columns={columns}
                    loading={isLoading}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: { sortModel: [{ field: 'timestamp', sort: 'desc' }] },
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

            {/* Activity Details Dialog */}
            <Dialog
                open={!!selectedActivity}
                onClose={() => setSelectedActivity(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {selectedActivity && (
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: `${getActivityColor(selectedActivity.type, selectedActivity.status)}20`,
                                    color: getActivityColor(
                                        selectedActivity.type,
                                        selectedActivity.status
                                    ),
                                }}
                            >
                                {getActivityIcon(selectedActivity.type, selectedActivity.action)}
                            </Avatar>
                        )}
                        <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                            {selectedActivity?.type} Details
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedActivity && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            {/* Metadata */}
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Time
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDate(selectedActivity.timestamp)}
                                    </Typography>
                                </Box>
                                {selectedActivity.details?.connectionName && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Connection
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedActivity.details.connectionName}
                                        </Typography>
                                    </Box>
                                )}
                                {selectedActivity.details?.sourceConnection && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Source
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedActivity.details.sourceConnection}
                                            {selectedActivity.details.sourceSchema &&
                                                `.${selectedActivity.details.sourceSchema}`}
                                        </Typography>
                                    </Box>
                                )}
                                {selectedActivity.details?.targetConnection && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Target
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedActivity.details.targetConnection}
                                            {selectedActivity.details.targetSchema &&
                                                `.${selectedActivity.details.targetSchema}`}
                                        </Typography>
                                    </Box>
                                )}
                                {selectedActivity.details?.executionTimeMs !== undefined && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Duration
                                        </Typography>
                                        <Typography variant="body2">
                                            {formatDuration(
                                                selectedActivity.details.executionTimeMs
                                            )}
                                        </Typography>
                                    </Box>
                                )}
                                {selectedActivity.details?.rowCount !== undefined && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Rows
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedActivity.details.rowCount.toLocaleString()}
                                        </Typography>
                                    </Box>
                                )}
                                {selectedActivity.details?.statementCount !== undefined && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Statements
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedActivity.details.statementCount}
                                        </Typography>
                                    </Box>
                                )}
                                <Chip
                                    label={
                                        selectedActivity.status === 'error' ? 'Error' : 'Success'
                                    }
                                    size="small"
                                    sx={{
                                        alignSelf: 'center',
                                        bgcolor:
                                            selectedActivity.status === 'error'
                                                ? 'rgba(239, 68, 68, 0.1)'
                                                : 'rgba(34, 197, 94, 0.1)',
                                        color:
                                            selectedActivity.status === 'error'
                                                ? '#ef4444'
                                                : '#22c55e',
                                    }}
                                />
                            </Box>

                            {/* Error Details */}
                            {selectedActivity.status === 'error' &&
                                selectedActivity.details?.error && (
                                    <Alert
                                        severity="error"
                                        sx={{
                                            '& .MuiAlert-message': {
                                                width: '100%',
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, mb: 1 }}
                                        >
                                            Error Details
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
                                            {selectedActivity.details.error}
                                        </Box>
                                    </Alert>
                                )}

                            {/* Description / SQL */}
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    {selectedActivity.type === 'query'
                                        ? 'SQL Query'
                                        : 'Description'}
                                </Typography>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: 'background.default',
                                        borderRadius: 1,
                                        fontFamily:
                                            selectedActivity.type === 'query'
                                                ? 'monospace'
                                                : 'inherit',
                                        fontSize: 13,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        maxHeight: 300,
                                        overflow: 'auto',
                                    }}
                                >
                                    {selectedActivity.description}
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedActivity(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
