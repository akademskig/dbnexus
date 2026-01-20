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
    Storage as StorageIcon,
    Folder as FolderIcon,
    Group as GroupIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TableChart as TableIcon,
    ViewColumn as ColumnIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { connectionsApi, auditApi, type AuditLogEntry } from '../../lib/api';
import { StatusAlert } from '@/components/StatusAlert';

function formatDate(date: string): string {
    return new Date(date).toLocaleString();
}

function getActionIcon(action: string) {
    if (action.includes('created')) return <AddIcon sx={{ fontSize: 18 }} />;
    if (action.includes('updated')) return <EditIcon sx={{ fontSize: 18 }} />;
    if (action.includes('deleted')) return <DeleteIcon sx={{ fontSize: 18 }} />;
    return <SettingsIcon sx={{ fontSize: 18 }} />;
}

function getActionColor(action: string) {
    if (action.includes('created')) return '#22c55e'; // green
    if (action.includes('updated')) return '#f59e0b'; // orange
    if (action.includes('deleted')) return '#ef4444'; // red
    return '#6b7280'; // gray
}

function getEntityIcon(entityType: string) {
    switch (entityType) {
        case 'connection':
            return <StorageIcon sx={{ fontSize: 18 }} />;
        case 'project':
            return <FolderIcon sx={{ fontSize: 18 }} />;
        case 'database_group':
            return <GroupIcon sx={{ fontSize: 18 }} />;
        case 'table':
            return <TableIcon sx={{ fontSize: 18 }} />;
        case 'column':
            return <ColumnIcon sx={{ fontSize: 18 }} />;
        default:
            return <SettingsIcon sx={{ fontSize: 18 }} />;
    }
}

export function AuditLogsTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
    const [connectionFilter, setConnectionFilter] = useState<string>('all');
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

    // Fetch audit logs
    const { data: auditLogs = [], isLoading } = useQuery({
        queryKey: ['auditLogs'],
        queryFn: () => auditApi.getLogs({ limit: 500 }),
    });

    const { data: connections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    // Filter audit logs
    const filteredLogs = auditLogs.filter((log) => {
        if (entityTypeFilter !== 'all' && log.entityType !== entityTypeFilter) return false;
        if (connectionFilter !== 'all' && log.connectionId !== connectionFilter) return false;
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            return (
                log.action.toLowerCase().includes(search) ||
                log.entityType.toLowerCase().includes(search) ||
                log.connectionName?.toLowerCase().includes(search) ||
                JSON.stringify(log.details).toLowerCase().includes(search)
            );
        }
        return true;
    });

    const columns: GridColDef[] = [
        {
            field: 'createdAt',
            headerName: 'Time',
            width: 170,
            renderCell: (params: GridRenderCellParams) => (
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {formatDate(params.value)}
                </Typography>
            ),
        },
        {
            field: 'action',
            headerName: 'Action',
            width: 200,
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: 1,
                            bgcolor: `${getActionColor(params.value)}20`,
                            color: getActionColor(params.value),
                        }}
                    >
                        {getActionIcon(params.value)}
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {params.value
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'entityType',
            headerName: 'Entity Type',
            width: 150,
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getEntityIcon(params.value)}
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {params.value
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'details',
            headerName: 'Details',
            flex: 1,
            renderCell: (params: GridRenderCellParams) => {
                const details = params.value as Record<string, unknown>;
                const displayText =
                    details?.name || details?.tableName || details?.columnName || 'N/A';
                return (
                    <Typography
                        variant="body2"
                        sx={{
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {String(displayText)}
                    </Typography>
                );
            },
        },
        {
            field: 'connectionName',
            headerName: 'Connection',
            width: 150,
            renderCell: (params: GridRenderCellParams) => (
                <Typography
                    variant="body2"
                    sx={{
                        fontSize: 12,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {params.value || '-'}
                </Typography>
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 80,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => (
                <StyledTooltip title="View Details">
                    <IconButton size="small" onClick={() => setSelectedLog(params.row)}>
                        <SearchIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
            ),
        },
    ];

    return (
        <Box
            sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
        >
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                <TextField
                    size="small"
                    placeholder="Search audit logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ minWidth: 300, mr: 1 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchQuery('')}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Entity Type</InputLabel>
                    <Select
                        value={entityTypeFilter}
                        label="Entity Type"
                        onChange={(e) => setEntityTypeFilter(e.target.value)}
                    >
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="connection">Connection</MenuItem>
                        <MenuItem value="project">Project</MenuItem>
                        <MenuItem value="database_group">Database Group</MenuItem>
                        <MenuItem value="table">Table</MenuItem>
                        <MenuItem value="column">Column</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Connection</InputLabel>
                    <Select
                        value={connectionFilter}
                        label="Connection"
                        onChange={(e) => setConnectionFilter(e.target.value)}
                    >
                        <MenuItem value="all">All Connections</MenuItem>
                        {connections.map((conn) => (
                            <MenuItem key={conn.id} value={conn.id}>
                                {conn.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ ml: 'auto' }}>
                    <Chip label={`${filteredLogs.length} events`} size="small" color="primary" />
                </Box>
            </Box>

            {/* Data Grid */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ width: '100%', height: '100%' }}>
                    <DataGrid
                        rows={filteredLogs}
                        columns={columns}
                        loading={isLoading}
                        pageSizeOptions={[25, 50, 100]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                        }}
                        disableRowSelectionOnClick
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell': {
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                            },
                            '& .MuiDataGrid-columnHeader': {
                                display: 'flex',
                                alignItems: 'center',
                            },
                            '& .MuiDataGrid-columnHeaderTitle': {
                                textAlign: 'center',
                                width: '100%',
                            },
                        }}
                    />
                </Box>
            </Box>

            {/* Details Dialog */}
            <Dialog
                open={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Audit Log Details</DialogTitle>
                <DialogContent>
                    {selectedLog && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Time
                                </Typography>
                                <Typography variant="body2">
                                    {formatDate(selectedLog.createdAt)}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Action
                                </Typography>
                                <Typography variant="body2">
                                    {selectedLog.action
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Entity Type
                                </Typography>
                                <Typography variant="body2">
                                    {selectedLog.entityType
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                                </Typography>
                            </Box>
                            {selectedLog.connectionName && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Connection
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedLog.connectionName}
                                    </Typography>
                                </Box>
                            )}
                            {selectedLog.details && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Details
                                    </Typography>
                                    <StatusAlert severity="info" sx={{ mt: 1 }}>
                                        <pre
                                            style={{
                                                margin: 0,
                                                fontSize: '12px',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {JSON.stringify(selectedLog.details, null, 2)}
                                        </pre>
                                    </StatusAlert>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedLog(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
