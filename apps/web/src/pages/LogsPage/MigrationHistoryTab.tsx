import { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    TextField,
    InputAdornment,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import {
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    ArrowForward as ArrowIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schemaApi } from '../../lib/api';
import type { MigrationHistoryEntry } from '@dbnexus/shared';
import { useToastStore } from '../../stores/toastStore';

function formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleString();
}

export function MigrationHistoryTab() {
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedMigration, setSelectedMigration] = useState<MigrationHistoryEntry | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [migrationToDelete, setMigrationToDelete] = useState<string | null>(null);

    const { data: migrations = [], isLoading } = useQuery({
        queryKey: ['migrationHistory'],
        queryFn: () => schemaApi.getMigrationHistory({ limit: 500 }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => schemaApi.deleteMigration(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['migrationHistory'] });
            setDeleteDialogOpen(false);
            setMigrationToDelete(null);
            toast.success('Migration record deleted');
        },
    });

    const handleCopy = (sql: string[], id: string) => {
        navigator.clipboard.writeText(sql.join('\n\n'));
        setCopiedId(id);
        toast.success('SQL copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = (id: string) => {
        setMigrationToDelete(id);
        setDeleteDialogOpen(true);
    };

    // Filter migrations
    const filteredMigrations = migrations.filter((m) => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            m.sourceConnectionName?.toLowerCase().includes(search) ||
            m.targetConnectionName?.toLowerCase().includes(search) ||
            m.sourceSchema.toLowerCase().includes(search) ||
            m.targetSchema.toLowerCase().includes(search) ||
            m.description?.toLowerCase().includes(search) ||
            m.sqlStatements.some((s) => s.toLowerCase().includes(search))
        );
    });

    const columns: GridColDef[] = [
        {
            field: 'appliedAt',
            headerName: 'Applied At',
            width: 170,
            renderCell: (params: GridRenderCellParams) => (
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                    {formatDate(params.value)}
                </Typography>
            ),
        },
        {
            field: 'source',
            headerName: 'Source',
            width: 180,
            valueGetter: (_value, row) =>
                `${row.sourceConnectionName || 'Unknown'}.${row.sourceSchema}`,
            renderCell: (params: GridRenderCellParams<MigrationHistoryEntry>) => (
                <Box sx={{ lineHeight: 1.3 }}>
                    <Typography
                        variant="body2"
                        sx={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}
                    >
                        {params.row.sourceConnectionName || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                        {params.row.sourceSchema}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'arrow',
            headerName: '',
            width: 40,
            sortable: false,
            renderCell: () => <ArrowIcon sx={{ fontSize: 16, color: 'text.secondary' }} />,
        },
        {
            field: 'target',
            headerName: 'Target',
            width: 180,
            valueGetter: (_value, row) =>
                `${row.targetConnectionName || 'Unknown'}.${row.targetSchema}`,
            renderCell: (params: GridRenderCellParams<MigrationHistoryEntry>) => (
                <Box sx={{ lineHeight: 1.3 }}>
                    <Typography
                        variant="body2"
                        sx={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}
                    >
                        {params.row.targetConnectionName || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                        {params.row.targetSchema}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1,
            minWidth: 200,
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
            field: 'sqlStatements',
            headerName: 'Statements',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={`${params.value?.length || 0} SQL`}
                    size="small"
                    sx={{ fontSize: 10, height: 20 }}
                />
            ),
        },
        {
            field: 'success',
            headerName: 'Status',
            width: 90,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value ? 'Success' : 'Failed'}
                    size="small"
                    sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor: params.value ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
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
            renderCell: (params: GridRenderCellParams<MigrationHistoryEntry>) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <StyledTooltip title="Copy SQL">
                        <IconButton
                            size="small"
                            onClick={() => handleCopy(params.row.sqlStatements, params.row.id)}
                        >
                            {copiedId === params.row.id ? (
                                <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            ) : (
                                <CopyIcon sx={{ fontSize: 16 }} />
                            )}
                        </IconButton>
                    </StyledTooltip>
                    <StyledTooltip title="View Details">
                        <IconButton size="small" onClick={() => setSelectedMigration(params.row)}>
                            <ViewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </StyledTooltip>
                    <StyledTooltip title="Delete">
                        <IconButton
                            size="small"
                            onClick={() => handleDelete(params.row.id)}
                            sx={{ color: 'error.main' }}
                        >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </StyledTooltip>
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
                    mt: 1,
                    mb: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <TextField
                    size="small"
                    placeholder="Search migrations..."
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
                    {filteredMigrations.length} migrations
                </Typography>
            </Box>

            {/* Data Grid */}
            <Box sx={{ flex: 1, minHeight: 400 }}>
                <DataGrid
                    rows={filteredMigrations}
                    columns={columns}
                    loading={isLoading}
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 25 } },
                        sorting: { sortModel: [{ field: 'appliedAt', sort: 'desc' }] },
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Migration Record</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this migration record? This only removes the
                        history entry, not the actual database changes.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() =>
                            migrationToDelete && deleteMutation.mutate(migrationToDelete)
                        }
                        disabled={deleteMutation.isPending}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Migration Details Dialog */}
            <Dialog
                open={!!selectedMigration}
                onClose={() => setSelectedMigration(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Migration Details</DialogTitle>
                <DialogContent>
                    {selectedMigration && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 3,
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Source
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedMigration.sourceConnectionName}.
                                        {selectedMigration.sourceSchema}
                                    </Typography>
                                </Box>
                                <ArrowIcon sx={{ color: 'text.secondary' }} />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Target
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedMigration.targetConnectionName}.
                                        {selectedMigration.targetSchema}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Applied At
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDate(selectedMigration.appliedAt)}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={selectedMigration.success ? 'Success' : 'Failed'}
                                    size="small"
                                    sx={{
                                        bgcolor: selectedMigration.success
                                            ? 'rgba(34, 197, 94, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                        color: selectedMigration.success ? '#22c55e' : '#ef4444',
                                    }}
                                />
                            </Box>

                            {selectedMigration.description && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Description
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedMigration.description}
                                    </Typography>
                                </Box>
                            )}

                            {!selectedMigration.success && selectedMigration.error && (
                                <Alert
                                    severity="error"
                                    sx={{
                                        '& .MuiAlert-message': {
                                            width: '100%',
                                        },
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
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
                                        {selectedMigration.error}
                                    </Box>
                                </Alert>
                            )}

                            <Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mb: 1, display: 'block' }}
                                >
                                    SQL Statements ({selectedMigration.sqlStatements.length})
                                </Typography>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: 'background.default',
                                        borderRadius: 1,
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        maxHeight: 400,
                                        overflow: 'auto',
                                    }}
                                >
                                    {selectedMigration.sqlStatements.join('\n\n')}
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSelectedMigration(null)}>Close</Button>
                    {selectedMigration && (
                        <Button
                            startIcon={<CopyIcon />}
                            onClick={() =>
                                handleCopy(selectedMigration.sqlStatements, selectedMigration.id)
                            }
                        >
                            Copy All SQL
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
