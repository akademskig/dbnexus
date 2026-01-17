import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    IconButton,

    Skeleton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import GridViewIcon from '@mui/icons-material/GridView';
import WarningIcon from '@mui/icons-material/Warning';
import TableChartIcon from '@mui/icons-material/TableChart';
import type { ConnectionConfig } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { schemaApi } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';

interface SchemasTabProps {
    connectionId: string;
    connection: ConnectionConfig | undefined;
    schemas: string[];
    isLoading: boolean;
    onViewTables?: (schemaName: string) => void;
}

export function SchemasTab({
    connectionId,
    connection,
    schemas,
    isLoading,
    onViewTables,
}: SchemasTabProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [schemaToDelete, setSchemaToDelete] = useState<string | null>(null);
    const [newSchemaName, setNewSchemaName] = useState('');
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    // Create schema mutation
    const createMutation = useMutation({
        mutationFn: (name: string) => schemaApi.createSchema(connectionId, name),
        onSuccess: (_, name) => {
            queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
            toast.success(`Schema "${name}" created successfully`);
            handleCloseCreateDialog();
        },
        onError: (error) => {
            setCreateError(error instanceof Error ? error.message : 'Failed to create schema');
        },
    });

    // Delete schema mutation
    const deleteMutation = useMutation({
        mutationFn: (name: string) => schemaApi.deleteSchema(connectionId, name),
        onSuccess: (_, name) => {
            queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
            toast.success(`Schema "${name}" deleted successfully`);
            handleCloseDeleteDialog();
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete schema');
        },
    });

    const handleCloseCreateDialog = () => {
        setCreateDialogOpen(false);
        setNewSchemaName('');
        setCreateError(null);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSchemaToDelete(null);
        setConfirmDeleteText('');
    };

    const handleCreateSchema = () => {
        if (!newSchemaName.trim()) {
            setCreateError('Schema name is required');
            return;
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newSchemaName)) {
            setCreateError('Invalid name. Use only letters, numbers, and underscores.');
            return;
        }
        createMutation.mutate(newSchemaName.trim());
    };

    const handleDeleteSchema = () => {
        if (schemaToDelete && confirmDeleteText === schemaToDelete) {
            deleteMutation.mutate(schemaToDelete);
        }
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
    };

    // Check if SQLite (doesn't support schema operations)
    const isSqlite = connection?.engine === 'sqlite';

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Schema Name',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GridViewIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.7 }} />
                    <Typography fontFamily="monospace">{params.value}</Typography>
                </Box>
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: (params) => {
                const isSystemSchema = ['information_schema', 'pg_catalog', 'pg_toast'].includes(
                    params.row.name
                );
                return (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {onViewTables && (
                            <StyledTooltip title="View Tables">
                                <IconButton
                                    size="small"
                                    onClick={() => onViewTables(params.row.name)}
                                >
                                    <TableChartIcon fontSize="small" />
                                </IconButton>
                            </StyledTooltip>
                        )}
                        <StyledTooltip
                            title={isSystemSchema ? 'Cannot delete system schema' : 'Delete schema'}
                        >
                            <span>
                                <IconButton
                                    size="small"
                                    color="error"
                                    disabled={isSystemSchema || isSqlite}
                                    onClick={() => {
                                        setSchemaToDelete(params.row.name);
                                        setDeleteDialogOpen(true);
                                    }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </StyledTooltip>
                    </Box>
                );
            },
        },
    ];

    const rows = schemas.map((schema) => ({ id: schema, name: schema }));

    if (isLoading) {
        return (
            <GlassCard>
                <Skeleton height={300} />
            </GlassCard>
        );
    }

    return (
        <Box>
            {/* Toolbar */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                }}
            >
                <Typography variant="h6" fontWeight={600}>
                    Schemas ({schemas.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                    >
                        Refresh
                    </Button>
                    {!isSqlite && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            Create Schema
                        </Button>
                    )}
                </Box>
            </Box>

            {isSqlite && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    SQLite does not support multiple schemas. The database file acts as a single
                    schema.
                </Alert>
            )}

            {/* Schemas Table */}
            {schemas.length === 0 ? (
                <GlassCard>
                    <EmptyState
                        icon={<GridViewIcon />}
                        title="No schemas found"
                        description="This database has no schemas yet."
                        action={
                            !isSqlite
                                ? {
                                      label: 'Create Schema',
                                      onClick: () => setCreateDialogOpen(true),
                                  }
                                : undefined
                        }
                    />
                </GlassCard>
            ) : (
                <GlassCard sx={{ p: 0 }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        autoHeight
                        disableRowSelectionOnClick
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10 } },
                        }}
                        sx={{
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
                </GlassCard>
            )}

            {/* Create Schema Dialog */}
            <Dialog
                open={createDialogOpen}
                onClose={handleCloseCreateDialog}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GridViewIcon color="primary" />
                    Create New Schema
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        {createError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {createError}
                            </Alert>
                        )}
                        <TextField
                            autoFocus
                            fullWidth
                            label="Schema Name"
                            value={newSchemaName}
                            onChange={(e) => {
                                setNewSchemaName(e.target.value);
                                setCreateError(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newSchemaName.trim()) {
                                    handleCreateSchema();
                                }
                            }}
                            placeholder="my_schema"
                            helperText="Use letters, numbers, and underscores"
                            disabled={createMutation.isPending}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateDialog} disabled={createMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateSchema}
                        disabled={!newSchemaName.trim() || createMutation.isPending}
                        startIcon={
                            createMutation.isPending ? <CircularProgress size={16} /> : <AddIcon />
                        }
                    >
                        {createMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Schema Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}
                >
                    <WarningIcon />
                    Delete Schema
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <Typography variant="body2" gutterBottom>
                                <strong>Warning:</strong> This will permanently delete the schema{' '}
                                <strong>&quot;{schemaToDelete}&quot;</strong> and ALL tables, data,
                                and objects within it.
                            </Typography>
                            <Typography variant="body2">This action cannot be undone.</Typography>
                        </Alert>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            To confirm, type the schema name: <strong>{schemaToDelete}</strong>
                        </Typography>
                        <TextField
                            autoFocus
                            fullWidth
                            value={confirmDeleteText}
                            onChange={(e) => setConfirmDeleteText(e.target.value)}
                            placeholder={schemaToDelete || ''}
                            error={
                                confirmDeleteText.length > 0 && confirmDeleteText !== schemaToDelete
                            }
                            helperText={
                                confirmDeleteText.length > 0 && confirmDeleteText !== schemaToDelete
                                    ? 'Schema name does not match'
                                    : ''
                            }
                            disabled={deleteMutation.isPending}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} disabled={deleteMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteSchema}
                        disabled={confirmDeleteText !== schemaToDelete || deleteMutation.isPending}
                        startIcon={
                            deleteMutation.isPending ? (
                                <CircularProgress size={16} />
                            ) : (
                                <DeleteIcon />
                            )
                        }
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete Schema'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
