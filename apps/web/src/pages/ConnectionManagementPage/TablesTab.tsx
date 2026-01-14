import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Skeleton,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import TableChartIcon from '@mui/icons-material/TableChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import type { ConnectionConfig, TableInfo } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { schemaApi, queriesApi } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';

interface TablesTabProps {
    connectionId: string;
    connection: ConnectionConfig | undefined;
    schemas: string[];
    isLoading: boolean;
    initialSchema?: string | null;
    onSchemaViewed?: () => void;
}

export function TablesTab({
    connectionId,
    connection,
    schemas,
    isLoading,
    initialSchema,
    onSchemaViewed,
}: TablesTabProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [selectedSchema, setSelectedSchema] = useState<string>(() => {
        // Use initialSchema if provided and valid
        if (initialSchema && schemas.includes(initialSchema)) return initialSchema;
        // Default to 'public' for postgres, first schema otherwise
        if (schemas.includes('public')) return 'public';
        if (schemas.includes('main')) return 'main';
        return schemas[0] || '';
    });

    // Dialog states
    const [createTableOpen, setCreateTableOpen] = useState(false);
    const [dropTableOpen, setDropTableOpen] = useState(false);
    const [tableToDelete, setTableToDelete] = useState<TableInfo | null>(null);
    const [newTableName, setNewTableName] = useState('');
    const [confirmDeleteText, setConfirmDeleteText] = useState('');
    const [creating, setCreating] = useState(false);
    const [dropping, setDropping] = useState(false);

    // Update selected schema when initialSchema changes (from Schemas tab navigation)
    useMemo(() => {
        if (initialSchema && schemas.includes(initialSchema)) {
            setSelectedSchema(initialSchema);
            // Clear the initialSchema after using it
            onSchemaViewed?.();
        }
    }, [initialSchema, schemas, onSchemaViewed]);

    // Update selected schema when schemas load
    useMemo(() => {
        if (schemas.length > 0 && !selectedSchema) {
            if (schemas.includes('public')) setSelectedSchema('public');
            else if (schemas.includes('main')) setSelectedSchema('main');
            else if (schemas[0]) setSelectedSchema(schemas[0]);
        }
    }, [schemas, selectedSchema]);

    // Fetch tables for selected schema
    const {
        data: tables = [],
        isLoading: loadingTables,
        refetch: refetchTables,
    } = useQuery({
        queryKey: ['tables', connectionId, selectedSchema],
        queryFn: () => schemaApi.getTables(connectionId, selectedSchema),
        enabled: !!connectionId && !!selectedSchema,
    });

    const handleOpenInQuery = (table: TableInfo) => {
        navigate(`/query/${connectionId}?schema=${table.schema}&table=${table.name}`);
    };

    // Quote identifier based on engine
    const quoteIdentifier = (name: string) => {
        if (connection?.engine === 'mysql' || connection?.engine === 'mariadb') {
            return `\`${name}\``;
        }
        return `"${name}"`;
    };

    // Build full table name
    const buildTableName = (schema: string, table: string) => {
        const quotedSchema = quoteIdentifier(schema);
        const quotedTable = quoteIdentifier(table);
        if (connection?.engine === 'sqlite') {
            return quotedTable;
        }
        return `${quotedSchema}.${quotedTable}`;
    };

    const handleCreateTable = async () => {
        if (!newTableName.trim()) return;

        setCreating(true);
        try {
            const fullTableName = buildTableName(selectedSchema, newTableName.trim());
            // Create a simple table with an id column
            const sql = `CREATE TABLE ${fullTableName} (id SERIAL PRIMARY KEY);`;
            await queriesApi.execute(connectionId, sql);
            await refetchTables();
            queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
            toast.success(`Table "${newTableName}" created`);
            setCreateTableOpen(false);
            setNewTableName('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create table');
        } finally {
            setCreating(false);
        }
    };

    const handleDropTable = async () => {
        if (!tableToDelete || confirmDeleteText !== tableToDelete.name) return;

        setDropping(true);
        try {
            const fullTableName = buildTableName(tableToDelete.schema, tableToDelete.name);
            const sql = `DROP TABLE ${fullTableName};`;
            await queriesApi.execute(connectionId, sql);
            await refetchTables();
            queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
            toast.success(`Table "${tableToDelete.name}" dropped`);
            setDropTableOpen(false);
            setTableToDelete(null);
            setConfirmDeleteText('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to drop table');
        } finally {
            setDropping(false);
        }
    };

    const handleCloseCreateDialog = () => {
        setCreateTableOpen(false);
        setNewTableName('');
    };

    const handleCloseDropDialog = () => {
        setDropTableOpen(false);
        setTableToDelete(null);
        setConfirmDeleteText('');
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Table Name',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableChartIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.7 }} />
                    <Typography fontFamily="monospace">{params.value}</Typography>
                </Box>
            ),
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: 11,
                        bgcolor:
                            params.value === 'table'
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(99, 102, 241, 0.15)',
                        color: params.value === 'table' ? 'rgb(34, 197, 94)' : 'rgb(99, 102, 241)',
                    }}
                />
            ),
        },
        {
            field: 'rowCount',
            headerName: 'Rows',
            width: 120,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => (
                <Typography fontFamily="monospace" color="text.secondary">
                    {params.value >= 0 ? params.value.toLocaleString() : '-'}
                </Typography>
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 180,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
                        onClick={() => handleOpenInQuery(params.row)}
                        sx={{ textTransform: 'none' }}
                    >
                        Query
                    </Button>
                    <Tooltip title="Drop Table">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                                setTableToDelete(params.row);
                                setDropTableOpen(true);
                            }}
                            disabled={connection?.readOnly}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ];

    const rows = tables.map((table) => ({
        id: `${table.schema}.${table.name}`,
        ...table,
    }));

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
                    gap: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Schema</InputLabel>
                        <Select
                            value={selectedSchema}
                            onChange={(e) => setSelectedSchema(e.target.value)}
                            label="Schema"
                        >
                            {schemas.map((schema) => (
                                <MenuItem key={schema} value={schema}>
                                    {schema}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary">
                        {tables.length} table{tables.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => refetchTables()}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateTableOpen(true)}
                        disabled={connection?.readOnly}
                    >
                        Create Table
                    </Button>
                </Box>
            </Box>

            {/* Tables Grid */}
            {tables.length === 0 ? (
                <GlassCard>
                    <EmptyState
                        icon={<ViewListIcon />}
                        title="No tables found"
                        description={`Schema "${selectedSchema}" has no tables yet.`}
                        action={{
                            label: 'Open Query Editor',
                            onClick: () =>
                                navigate(`/query/${connectionId}?schema=${selectedSchema}`),
                        }}
                    />
                </GlassCard>
            ) : (
                <GlassCard sx={{ p: 0 }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        loading={loadingTables}
                        autoHeight
                        disableRowSelectionOnClick
                        pageSizeOptions={[10, 25, 50, 100]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                            sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
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

            {/* Create Table Dialog */}
            <Dialog
                open={createTableOpen}
                onClose={handleCloseCreateDialog}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableChartIcon color="primary" />
                    Create New Table
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Creates a simple table with an auto-increment ID column. You can add
                            more columns using the Query Editor.
                        </Alert>
                        <TextField
                            autoFocus
                            fullWidth
                            label="Table Name"
                            value={newTableName}
                            onChange={(e) => setNewTableName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newTableName.trim()) {
                                    handleCreateTable();
                                }
                            }}
                            placeholder="my_table"
                            helperText={`Will be created in schema: ${selectedSchema}`}
                            disabled={creating}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateDialog} disabled={creating}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateTable}
                        disabled={!newTableName.trim() || creating}
                        startIcon={creating ? <CircularProgress size={16} /> : <AddIcon />}
                    >
                        {creating ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Drop Table Dialog */}
            <Dialog open={dropTableOpen} onClose={handleCloseDropDialog} maxWidth="sm" fullWidth>
                <DialogTitle
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}
                >
                    <WarningIcon />
                    Drop Table
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <Typography variant="body2" gutterBottom>
                                <strong>Warning:</strong> This will permanently delete the table{' '}
                                <strong>&quot;{tableToDelete?.name}&quot;</strong> and ALL data
                                within it.
                            </Typography>
                            <Typography variant="body2">This action cannot be undone.</Typography>
                        </Alert>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            To confirm, type the table name: <strong>{tableToDelete?.name}</strong>
                        </Typography>
                        <TextField
                            autoFocus
                            fullWidth
                            value={confirmDeleteText}
                            onChange={(e) => setConfirmDeleteText(e.target.value)}
                            placeholder={tableToDelete?.name || ''}
                            error={
                                confirmDeleteText.length > 0 &&
                                confirmDeleteText !== tableToDelete?.name
                            }
                            helperText={
                                confirmDeleteText.length > 0 &&
                                confirmDeleteText !== tableToDelete?.name
                                    ? 'Table name does not match'
                                    : ''
                            }
                            disabled={dropping}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDropDialog} disabled={dropping}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDropTable}
                        disabled={confirmDeleteText !== tableToDelete?.name || dropping}
                        startIcon={dropping ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {dropping ? 'Dropping...' : 'Drop Table'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
