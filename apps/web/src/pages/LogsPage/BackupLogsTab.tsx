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
    Badge,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    Backup as BackupIcon,
    Restore as RestoreIcon,
    Delete as DeleteIcon,
    Upload as UploadIcon,
    Storage as StorageIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, type GridFilterModel } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { backupsApi, connectionsApi, type BackupLog } from '../../lib/api';
import { FilterPanel } from '../QueryPage/FilterPanel';
import { ActiveFilters } from '../QueryPage/ActiveFilters';

function formatDate(date: Date): string {
    return date.toLocaleString();
}

function formatDuration(ms: number | undefined): string {
    if (ms === undefined) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
}

function formatFileSize(bytes: number | undefined): string {
    if (bytes === undefined) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getOperationIcon(operation: string) {
    switch (operation) {
        case 'backup_created':
            return <BackupIcon sx={{ fontSize: 16 }} />;
        case 'backup_restored':
            return <RestoreIcon sx={{ fontSize: 16 }} />;
        case 'backup_deleted':
            return <DeleteIcon sx={{ fontSize: 16 }} />;
        case 'backup_uploaded':
            return <UploadIcon sx={{ fontSize: 16 }} />;
        default:
            return <StorageIcon sx={{ fontSize: 16 }} />;
    }
}

function getOperationLabel(operation: string): string {
    switch (operation) {
        case 'backup_created':
            return 'Created';
        case 'backup_restored':
            return 'Restored';
        case 'backup_deleted':
            return 'Deleted';
        case 'backup_uploaded':
            return 'Uploaded';
        default:
            return operation;
    }
}

function getOperationColor(operation: string): string {
    switch (operation) {
        case 'backup_created':
            return '#22c55e';
        case 'backup_restored':
            return '#3b82f6';
        case 'backup_deleted':
            return '#ef4444';
        case 'backup_uploaded':
            return '#8b5cf6';
        default:
            return '#6b7280';
    }
}

export function BackupLogsTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [operationFilter, setOperationFilter] = useState<string>('all');
    const [connectionFilter, setConnectionFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });

    const { data: backupLogs = [], isLoading } = useQuery({
        queryKey: ['backupLogs'],
        queryFn: () => backupsApi.getLogs({ limit: 500 }),
    });

    const { data: connections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    // Filter backup logs
    const filteredLogs = backupLogs.filter((log) => {
        // Operation filter
        if (operationFilter !== 'all' && log.operation !== operationFilter) return false;

        // Connection filter
        if (connectionFilter !== 'all' && log.connectionId !== connectionFilter) return false;

        // Status filter
        if (statusFilter !== 'all' && log.status !== statusFilter) return false;

        // Search query
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            return (
                log.databaseName?.toLowerCase().includes(search) ||
                log.connectionName?.toLowerCase().includes(search) ||
                log.backupFilename?.toLowerCase().includes(search) ||
                log.databaseEngine?.toLowerCase().includes(search)
            );
        }
        return true;
    });

    const columns: GridColDef[] = [
        {
            field: 'createdAt',
            headerName: 'Time',
            width: 170,
            renderCell: (params: GridRenderCellParams<BackupLog>) => (
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {formatDate(new Date(params.row.createdAt))}
                </Typography>
            ),
        },
        {
            field: 'operation',
            headerName: 'Operation',
            width: 130,
            valueGetter: (_value, row) => getOperationLabel(row.operation),
            renderCell: (params: GridRenderCellParams<BackupLog>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: getOperationColor(params.row.operation) }}>
                        {getOperationIcon(params.row.operation)}
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {params.value}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'connectionName',
            headerName: 'Connection',
            width: 180,
            valueGetter: (_value, row) => row.connectionName || row.databaseName,
            renderCell: (params: GridRenderCellParams<BackupLog>) => (
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
            field: 'backupFilename',
            headerName: 'Backup File',
            flex: 1,
            minWidth: 250,
            renderCell: (params: GridRenderCellParams<BackupLog>) => (
                <StyledTooltip title={params.value || '-'}>
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
                        {params.value || '-'}
                    </Typography>
                </StyledTooltip>
            ),
        },
        {
            field: 'databaseEngine',
            headerName: 'Engine',
            width: 100,
            renderCell: (params: GridRenderCellParams<BackupLog>) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        fontSize: 10,
                        height: 20,
                        textTransform: 'uppercase',
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                    }}
                />
            ),
        },
        {
            field: 'fileSize',
            headerName: 'Size',
            width: 100,
            renderCell: (params: GridRenderCellParams<BackupLog>) => (
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {formatFileSize(params.value)}
                </Typography>
            ),
        },
        {
            field: 'duration',
            headerName: 'Duration',
            width: 100,
            renderCell: (params: GridRenderCellParams<BackupLog>) => (
                <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {formatDuration(params.value)}
                </Typography>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            renderCell: (params: GridRenderCellParams<BackupLog>) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        fontSize: 10,
                        height: 20,
                        textTransform: 'capitalize',
                        bgcolor:
                            params.value === 'success'
                                ? 'rgba(34, 197, 94, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                        color: params.value === 'success' ? '#22c55e' : '#ef4444',
                    }}
                />
            ),
        },
    ];

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
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
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Operation</InputLabel>
                    <Select
                        value={operationFilter}
                        onChange={(e) => setOperationFilter(e.target.value)}
                        label="Operation"
                    >
                        <MenuItem value="all">All Operations</MenuItem>
                        <MenuItem value="backup_created">Created</MenuItem>
                        <MenuItem value="backup_restored">Restored</MenuItem>
                        <MenuItem value="backup_deleted">Deleted</MenuItem>
                        <MenuItem value="backup_uploaded">Uploaded</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Connection</InputLabel>
                    <Select
                        value={connectionFilter}
                        onChange={(e) => setConnectionFilter(e.target.value)}
                        label="Connection"
                    >
                        <MenuItem value="all">All Connections</MenuItem>
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
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="Status"
                    >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="success">Success</MenuItem>
                        <MenuItem value="failed">Failed</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    size="small"
                    placeholder="Search by database, connection, or file..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ minWidth: 300 }}
                    slotProps={{
                        input: {
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
                        },
                    }}
                />

                <Box sx={{ flex: 1 }} />

                <StyledTooltip title={showFilters ? 'Hide filters' : 'Show filters'}>
                    <IconButton
                        size="small"
                        onClick={() => setShowFilters(!showFilters)}
                        sx={{
                            color:
                                showFilters || filterModel.items.length > 0
                                    ? 'primary.main'
                                    : 'text.secondary',
                        }}
                    >
                        <Badge
                            badgeContent={filterModel.items.length}
                            color="primary"
                            invisible={filterModel.items.length === 0}
                        >
                            <FilterListIcon fontSize="small" />
                        </Badge>
                    </IconButton>
                </StyledTooltip>

                <Typography variant="body2" color="text.secondary">
                    {filteredLogs.length} backup operations
                </Typography>
            </Box>

            {/* Active Filters Display */}
            <ActiveFilters
                filterModel={filterModel}
                onFilterModelChange={setFilterModel}
                show={!showFilters}
                sx={{ px: 1, pt: 0 }}
            />

            {/* Filter Panel */}
            <FilterPanel
                open={showFilters}
                filterModel={filterModel}
                columns={columns}
                onFilterModelChange={setFilterModel}
                sx={{ px: 1, pt: 0 }}
            />

            {/* Data Grid */}
            <Box sx={{ flex: 1, minHeight: 400 }}>
                <DataGrid
                    rows={filteredLogs}
                    columns={columns}
                    filterModel={filterModel}
                    onFilterModelChange={setFilterModel}
                    loading={isLoading}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
                    }}
                    disableRowSelectionOnClick
                    disableColumnMenu
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': {
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        },
                        '& .MuiDataGrid-row': {
                            '&:hover': {
                                bgcolor: 'action.hover',
                            },
                        },
                        '& .MuiDataGrid-columnHeaders': {
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        },
                    }}
                />
            </Box>
        </Box>
    );
}
