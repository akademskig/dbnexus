import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type Connection,
    type OnConnect,
    Panel,
    BackgroundVariant,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Box,
    Typography,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Chip,
    Switch,
    FormControlLabel,
    Autocomplete,
    Divider,
    Paper,
    alpha,
    useTheme,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { ConnectionConfig, TableSchema } from '@dbnexus/shared';
import { schemaApi, queriesApi } from '../../lib/api';
import { buildDropTableSql, buildTableName, quoteIdentifier } from '../../lib/sql';
import { useToastStore } from '../../stores/toastStore';
import { GlassCard } from '../../components/GlassCard';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
    EditableTableNode,
    type EditableColumn,
    type EditableTableNodeData,
} from './EditableTableNode';

interface DiagramEditorTabProps {
    connectionId: string;
    connection: ConnectionConfig | undefined;
    schemas: string[];
    isLoading: boolean;
    initialSchema?: string | null;
}

// Common data types for different database engines
const DATA_TYPES = {
    postgres: [
        'integer',
        'bigint',
        'smallint',
        'serial',
        'bigserial',
        'varchar(255)',
        'text',
        'boolean',
        'timestamp',
        'date',
        'uuid',
        'jsonb',
    ],
    mysql: ['int', 'bigint', 'varchar(255)', 'text', 'boolean', 'datetime', 'date', 'json'],
    sqlite: ['integer', 'real', 'text', 'blob'],
};

const nodeTypes = {
    editableTable: EditableTableNode,
};

/**
 * Helper to parse column arrays that may come as PostgreSQL string format "{col1,col2}"
 */
function parseColumnArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string') {
        // Handle PostgreSQL array format: "{col1,col2}"
        if (value.startsWith('{') && value.endsWith('}')) {
            const inner = value.slice(1, -1);
            if (!inner) return [];
            return inner.split(',').map((s) => s.trim().replaceAll(/(^"|"$)/g, ''));
        }
        // Single column as string
        return value ? [value] : [];
    }
    return [];
}

export function DiagramEditorTab({
    connectionId,
    connection,
    schemas,
    isLoading,
    initialSchema,
}: Readonly<DiagramEditorTabProps>) {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const toast = useToastStore();

    // Selection state
    const [selectedSchema, setSelectedSchema] = useState<string>(() => {
        if (initialSchema && schemas.includes(initialSchema)) return initialSchema;
        if (schemas.includes('public')) return 'public';
        if (schemas.includes('main')) return 'main';
        return schemas[0] || '';
    });

    // React Flow state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);

    // Dialog states
    const [createTableOpen, setCreateTableOpen] = useState(false);
    const [addColumnOpen, setAddColumnOpen] = useState(false);
    const [deleteColumnOpen, setDeleteColumnOpen] = useState(false);
    const [deleteTableOpen, setDeleteTableOpen] = useState(false);
    const [createFkOpen, setCreateFkOpen] = useState(false);

    // Form states
    const [newTableName, setNewTableName] = useState('');
    const [currentTableId, setCurrentTableId] = useState<string | null>(null);
    const [currentColumn, setCurrentColumn] = useState<EditableColumn | null>(null);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

    const [newColumn, setNewColumn] = useState({
        name: '',
        dataType: '',
        nullable: true,
        isPrimaryKey: false,
        defaultValue: '',
    });
    const [confirmDeleteText, setConfirmDeleteText] = useState('');

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

    // Quote identifier based on engine
    const quoteIdentifierForEngine = useCallback(
        (name: string) => quoteIdentifier(name, connection?.engine),
        [connection?.engine]
    );

    const buildTableNameForEngine = useCallback(
        (schema: string, table: string) => buildTableName(schema, table, connection?.engine),
        [connection?.engine]
    );

    // State for dangerous operation confirmation
    const [pendingDangerousSql, setPendingDangerousSql] = useState<{
        sql: string;
        message: string;
        onSuccess?: () => void;
    } | null>(null);

    // Execute SQL mutation
    const executeSql = useMutation({
        mutationFn: async ({ sql, confirmed }: { sql: string; confirmed?: boolean }) => {
            return queriesApi.execute(connectionId, sql, confirmed);
        },
        onSuccess: () => {
            refetchTables();
            queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
            setRefreshCounter((value) => value + 1);
        },
    });

    // Helper to execute SQL with dangerous operation handling
    const executeSqlWithConfirmation = async (
        sql: string,
        onSuccess?: () => void
    ): Promise<void> => {
        try {
            await executeSql.mutateAsync({ sql });
            onSuccess?.();
        } catch (err) {
            // Check if it's a dangerous operation requiring confirmation
            if (err instanceof Error) {
                try {
                    const parsed = JSON.parse(err.message);
                    if (parsed.requiresConfirmation) {
                        setPendingDangerousSql({ sql, message: parsed.message, onSuccess });
                        return;
                    }
                } catch {
                    // Not a JSON error, rethrow
                }
            }
            throw err;
        }
    };

    // Confirm dangerous operation
    const handleConfirmDangerous = async () => {
        if (!pendingDangerousSql) return;
        try {
            await executeSql.mutateAsync({ sql: pendingDangerousSql.sql, confirmed: true });
            pendingDangerousSql.onSuccess?.();
            setPendingDangerousSql(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Operation failed');
        }
    };

    // Handle connection (creating FK)
    const onConnect: OnConnect = useCallback((connection) => {
        setPendingConnection(connection);
        setCreateFkOpen(true);
    }, []);

    // Handlers for table operations
    const handleOpenAddColumn = useCallback((tableId: string) => {
        setCurrentTableId(tableId);
        setNewColumn({
            name: '',
            dataType: '',
            nullable: true,
            isPrimaryKey: false,
            defaultValue: '',
        });
        setAddColumnOpen(true);
    }, []);

    const handleOpenEditColumn = useCallback(
        (_tableId: string, column: EditableColumn) => {
            toast.info(`To edit column "${column.name}", use the Table Management tab`);
        },
        [toast]
    );

    const handleOpenDeleteColumn = useCallback((tableId: string, column: EditableColumn) => {
        setCurrentTableId(tableId);
        setCurrentColumn(column);
        setDeleteColumnOpen(true);
    }, []);

    const handleOpenEditTable = useCallback(
        (_tableId: string) => {
            toast.info('Table renaming requires SQL. Use: ALTER TABLE ... RENAME TO ...');
        },
        [toast]
    );

    const handleOpenDeleteTable = useCallback((tableId: string) => {
        setCurrentTableId(tableId);
        setDeleteTableOpen(true);
    }, []);

    const buildNodeColumns = useCallback((detail: TableSchema) => {
        return detail.columns.map((col, idx) => ({
            id: `${detail.name}-col-${idx}`,
            name: col.name,
            dataType: col.dataType,
            nullable: col.nullable,
            isPrimaryKey: col.isPrimaryKey,
            isForeignKey: detail.foreignKeys.some((fk) =>
                parseColumnArray(fk.columns).includes(col.name)
            ),
            defaultValue: col.defaultValue || undefined,
        }));
    }, []);

    const buildDiagramNodes = useCallback(
        (tableDetails: TableSchema[]) => {
            const nodeWidth = 280;
            const nodeHeight = 250;
            const horizontalSpacing = 80;
            const verticalSpacing = 60;
            const numCols = Math.ceil(Math.sqrt(tableDetails.length));

            return tableDetails.map((detail, index) => {
                const columns = buildNodeColumns(detail);
                const row = Math.floor(index / numCols);
                const col = index % numCols;
                const x = col * (nodeWidth + horizontalSpacing);
                const y = row * (nodeHeight + verticalSpacing);

                return {
                    id: detail.name,
                    type: 'editableTable',
                    position: { x, y },
                    data: {
                        label: detail.name,
                        columns,
                        schema: selectedSchema,
                        onAddColumn: handleOpenAddColumn,
                        onEditColumn: handleOpenEditColumn,
                        onDeleteColumn: handleOpenDeleteColumn,
                        onEditTable: handleOpenEditTable,
                        onDeleteTable: handleOpenDeleteTable,
                    } as EditableTableNodeData,
                };
            });
        },
        [
            buildNodeColumns,
            selectedSchema,
            handleOpenAddColumn,
            handleOpenEditColumn,
            handleOpenDeleteColumn,
            handleOpenEditTable,
            handleOpenDeleteTable,
        ]
    );

    const buildDiagramEdges = useCallback(
        (tableDetails: TableSchema[], newNodes: Node[]) => {
            const edges: Edge[] = [];
            for (const detail of tableDetails) {
                detail.foreignKeys.forEach((fk, fkIndex) => {
                    const sourceColumns = parseColumnArray(fk.columns);
                    const targetColumns = parseColumnArray(fk.referencedColumns);
                    const sourceColumnName = sourceColumns[0];
                    const targetColumnName = targetColumns[0];
                    if (!sourceColumnName || !targetColumnName) return;

                    const sourceNode = newNodes.find((n) => n.id === detail.name);
                    const targetNode = newNodes.find((n) => n.id === fk.referencedTable);
                    if (!sourceNode || !targetNode) return;

                    const sourceCol = (sourceNode.data as EditableTableNodeData).columns.find(
                        (c) => c.name === sourceColumnName
                    );
                    const targetCol = (targetNode.data as EditableTableNodeData).columns.find(
                        (c) => c.name === targetColumnName
                    );
                    if (!sourceCol || !targetCol) return;

                    edges.push({
                        id: `${detail.name}-${fk.name}-${fkIndex}`,
                        source: detail.name,
                        target: fk.referencedTable,
                        sourceHandle: `${sourceCol.id}-source`,
                        targetHandle: `${targetCol.id}-target`,
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: theme.palette.info.main, strokeWidth: 2 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: theme.palette.info.main,
                        },
                        label: fk.name,
                        labelStyle: {
                            fontSize: 10,
                            fill: theme.palette.text.secondary,
                        },
                        labelBgStyle: { fill: theme.palette.background.paper },
                    });
                });
            }
            return edges;
        },
        [theme.palette.info.main, theme.palette.background.paper, theme.palette.text.secondary]
    );

    // Load tables into diagram
    useEffect(() => {
        if (tables.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const loadTableDetails = async () => {
            try {
                const tableDetails = await Promise.all(
                    tables.map((table) =>
                        schemaApi.getTableSchema(connectionId, selectedSchema, table.name)
                    )
                );

                const newNodes = buildDiagramNodes(tableDetails);
                const newEdges = buildDiagramEdges(tableDetails, newNodes);

                setNodes(newNodes);
                setEdges(newEdges);
            } catch (error) {
                console.error('Failed to load table details:', error);
                toast.error('Failed to load table details');
            }
        };

        loadTableDetails();
    }, [
        tables,
        connectionId,
        selectedSchema,
        refreshCounter,
        buildDiagramNodes,
        buildDiagramEdges,
        setNodes,
        setEdges,
        toast,
    ]);

    // Create table
    const handleCreateTable = async () => {
        if (!newTableName.trim()) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, newTableName);
        const sql = `CREATE TABLE ${fullTableName} (id SERIAL PRIMARY KEY)`;

        try {
            await executeSqlWithConfirmation(sql, () => {
                toast.success(`Table "${newTableName}" created`);
                setCreateTableOpen(false);
                setNewTableName('');
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create table');
        }
    };

    // Add column
    const handleAddColumn = async () => {
        if (!currentTableId || !newColumn.name || !newColumn.dataType) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, currentTableId);
        const quotedColumn = quoteIdentifierForEngine(newColumn.name);

        let sql = `ALTER TABLE ${fullTableName} ADD COLUMN ${quotedColumn} ${newColumn.dataType}`;
        if (!newColumn.nullable) sql += ' NOT NULL';
        if (newColumn.defaultValue) sql += ` DEFAULT ${newColumn.defaultValue}`;

        try {
            await executeSqlWithConfirmation(sql, () => {
                toast.success(`Column "${newColumn.name}" added`);
                setAddColumnOpen(false);
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to add column');
        }
    };

    // Delete column
    const handleDeleteColumn = async () => {
        if (!currentTableId || !currentColumn) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, currentTableId);
        const quotedColumn = quoteIdentifierForEngine(currentColumn.name);
        const sql = `ALTER TABLE ${fullTableName} DROP COLUMN ${quotedColumn}`;

        try {
            await executeSqlWithConfirmation(sql, () => {
                toast.success(`Column "${currentColumn.name}" deleted`);
                setDeleteColumnOpen(false);
                setCurrentColumn(null);
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete column');
        }
    };

    // Delete table
    const handleDeleteTable = async () => {
        if (!currentTableId || confirmDeleteText !== currentTableId) return;

        const sql = buildDropTableSql(selectedSchema, currentTableId, connection?.engine, true);

        try {
            await executeSql.mutateAsync({ sql, confirmed: true });
            toast.success(`Table "${currentTableId}" dropped`);
            setDeleteTableOpen(false);
            setCurrentTableId(null);
            setConfirmDeleteText('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to drop table');
        }
    };

    // Create foreign key from connection
    const handleCreateFk = async () => {
        if (!pendingConnection) return;

        const sourceTable = pendingConnection.source;
        const targetTable = pendingConnection.target;
        const sourceHandle = pendingConnection.sourceHandle;
        const targetHandle = pendingConnection.targetHandle;

        if (!sourceTable || !targetTable || !sourceHandle || !targetHandle) return;

        // Extract column names from handles
        const sourceNode = nodes.find((n) => n.id === sourceTable);
        const targetNode = nodes.find((n) => n.id === targetTable);

        if (!sourceNode || !targetNode) return;

        const sourceColId = sourceHandle.replaceAll('-source', '');
        const targetColId = targetHandle.replaceAll('-target', '');

        const sourceCol = (sourceNode.data as EditableTableNodeData).columns.find(
            (c) => c.id === sourceColId
        );
        const targetCol = (targetNode.data as EditableTableNodeData).columns.find(
            (c) => c.id === targetColId
        );

        if (!sourceCol || !targetCol) {
            toast.error('Could not determine columns for foreign key');
            return;
        }

        const fkName = `fk_${sourceTable}_${sourceCol.name}`;
        const fullSourceTable = buildTableNameForEngine(selectedSchema, sourceTable);
        const fullTargetTable = buildTableNameForEngine(selectedSchema, targetTable);

        const sql = `ALTER TABLE ${fullSourceTable} ADD CONSTRAINT ${quoteIdentifierForEngine(fkName)} FOREIGN KEY (${quoteIdentifierForEngine(sourceCol.name)}) REFERENCES ${fullTargetTable} (${quoteIdentifierForEngine(targetCol.name)})`;

        try {
            await executeSqlWithConfirmation(sql, () => {
                toast.success(`Foreign key "${fkName}" created`);
                setCreateFkOpen(false);
                setPendingConnection(null);
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create foreign key');
        }
    };

    // Get data types for current engine
    const dataTypes =
        DATA_TYPES[connection?.engine as keyof typeof DATA_TYPES] || DATA_TYPES.postgres;

    if (isLoading) {
        return (
            <GlassCard>
                <LoadingState message="Loading schemas..." size="large" />
            </GlassCard>
        );
    }

    const renderDiagramCanvas = () => {
        if (loadingTables) {
            return <LoadingState message="Loading tables..." size="large" />;
        }

        if (tables.length === 0) {
            return (
                <EmptyState
                    icon={<TableChartIcon />}
                    title="No tables in this schema"
                    description="Create a new table to get started with the schema diagram."
                    action={{
                        label: 'Create Table',
                        onClick: () => setCreateTableOpen(true),
                    }}
                />
            );
        }

        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    // Style React Flow controls
                    '& .react-flow__controls': {
                        bgcolor: 'background.paper',
                        borderColor: 'divider',
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    },
                    '& .react-flow__controls-button': {
                        bgcolor: 'background.paper',
                        borderColor: 'divider',
                        color: 'text.primary',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                        },
                        '& svg': {
                            fill: theme.palette.text.primary,
                        },
                    },
                }}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.1}
                    maxZoom={2}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: true,
                    }}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                    <Controls />
                    <MiniMap
                        nodeColor={(node) =>
                            node.selected ? theme.palette.primary.main : theme.palette.grey[600]
                        }
                        maskColor={alpha(theme.palette.background.default, 0.8)}
                        style={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    />
                    <Panel position="top-right">
                        <Paper
                            sx={{
                                p: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                                Drag between columns to create FK
                            </Typography>
                        </Paper>
                    </Panel>
                </ReactFlow>
            </Box>
        );
    };

    const diagramContent = (
        <>
            {/* Toolbar */}
            <GlassCard sx={{ mb: 2, p: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
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

                    <Divider orientation="vertical" flexItem />

                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateTableOpen(true)}
                        disabled={connection?.readOnly}
                    >
                        New Table
                    </Button>

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => refetchTables()}
                        disabled={loadingTables}
                    >
                        Refresh
                    </Button>

                    <Box sx={{ flex: 1 }} />

                    <Chip
                        label={`${tables.length} table${tables.length === 1 ? '' : 's'}`}
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                    />

                    <StyledTooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                        <IconButton
                            size="small"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            sx={{
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            {isFullscreen ? (
                                <FullscreenExitIcon fontSize="small" />
                            ) : (
                                <FullscreenIcon fontSize="small" />
                            )}
                        </IconButton>
                    </StyledTooltip>
                </Box>
            </GlassCard>

            {/* Diagram Canvas */}
            <GlassCard sx={{ flex: 1, p: 0, overflow: 'hidden' }}>
                {renderDiagramCanvas()}
            </GlassCard>

            {/* Create Table Dialog */}
            <Dialog
                open={createTableOpen}
                onClose={() => setCreateTableOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableChartIcon color="primary" />
                    Create New Table
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            autoFocus
                            fullWidth
                            label="Table Name"
                            value={newTableName}
                            onChange={(e) => setNewTableName(e.target.value)}
                            placeholder="my_table"
                            helperText="Table will be created with an 'id' primary key column"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateTableOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateTable}
                        disabled={!newTableName.trim() || executeSql.isPending}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <AddIcon />
                        }
                    >
                        Create Table
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Column Dialog */}
            <Dialog
                open={addColumnOpen}
                onClose={() => setAddColumnOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AddIcon color="primary" />
                    Add Column to {currentTableId}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            autoFocus
                            fullWidth
                            label="Column Name"
                            value={newColumn.name}
                            onChange={(e) =>
                                setNewColumn((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="column_name"
                        />
                        <Autocomplete
                            freeSolo
                            options={dataTypes}
                            value={newColumn.dataType}
                            onChange={(_, value) =>
                                setNewColumn((prev) => ({ ...prev, dataType: value || '' }))
                            }
                            onInputChange={(_, value) =>
                                setNewColumn((prev) => ({ ...prev, dataType: value }))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Data Type"
                                    placeholder="varchar(255)"
                                />
                            )}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newColumn.nullable}
                                    onChange={(e) =>
                                        setNewColumn((prev) => ({
                                            ...prev,
                                            nullable: e.target.checked,
                                        }))
                                    }
                                />
                            }
                            label="Nullable"
                        />
                        <TextField
                            fullWidth
                            label="Default Value (optional)"
                            value={newColumn.defaultValue}
                            onChange={(e) =>
                                setNewColumn((prev) => ({ ...prev, defaultValue: e.target.value }))
                            }
                            placeholder="NULL, 0, 'default'"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddColumnOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddColumn}
                        disabled={!newColumn.name || !newColumn.dataType || executeSql.isPending}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <AddIcon />
                        }
                    >
                        Add Column
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Column Dialog */}
            <Dialog
                open={deleteColumnOpen}
                onClose={() => setDeleteColumnOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}
                >
                    <WarningIcon />
                    Delete Column
                </DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Warning:</strong> This will permanently delete the column{' '}
                            <strong>&quot;{currentColumn?.name}&quot;</strong> and ALL data within
                            it.
                        </Typography>
                        <Typography variant="body2">This action cannot be undone.</Typography>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteColumnOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteColumn}
                        disabled={executeSql.isPending}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <DeleteIcon />
                        }
                    >
                        Delete Column
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Table Dialog */}
            <Dialog
                open={deleteTableOpen}
                onClose={() => {
                    setDeleteTableOpen(false);
                    setConfirmDeleteText('');
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}
                >
                    <WarningIcon />
                    Drop Table
                </DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Warning:</strong> This will permanently drop the table{' '}
                            <strong>&quot;{currentTableId}&quot;</strong> and ALL its data.
                        </Typography>
                        <Typography variant="body2">
                            CASCADE will be used to drop dependent objects. This action cannot be
                            undone.
                        </Typography>
                    </Alert>
                    <TextField
                        fullWidth
                        size="small"
                        label={`Type "${currentTableId || ''}" to confirm`}
                        value={confirmDeleteText}
                        onChange={(e) => setConfirmDeleteText(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setDeleteTableOpen(false);
                            setConfirmDeleteText('');
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteTable}
                        disabled={executeSql.isPending || confirmDeleteText !== currentTableId}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <DeleteIcon />
                        }
                    >
                        Drop Table
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create FK Dialog */}
            <Dialog
                open={createFkOpen}
                onClose={() => setCreateFkOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableChartIcon color="primary" />
                    Create Foreign Key
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Create a foreign key relationship between the connected columns?
                        </Alert>
                        {pendingConnection && (
                            <Typography variant="body2" color="text.secondary">
                                From: <strong>{pendingConnection.source}</strong> → To:{' '}
                                <strong>{pendingConnection.target}</strong>
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setCreateFkOpen(false);
                            setPendingConnection(null);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateFk}
                        disabled={executeSql.isPending}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <AddIcon />
                        }
                    >
                        Create Foreign Key
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dangerous Operation Confirmation Dialog */}
            <ConfirmDialog
                open={!!pendingDangerousSql}
                title="Confirm Dangerous Operation"
                message={
                    pendingDangerousSql?.message ||
                    'This operation may permanently modify or delete data.'
                }
                confirmLabel="Execute Anyway"
                confirmColor="error"
                onConfirm={handleConfirmDangerous}
                onCancel={() => setPendingDangerousSql(null)}
            />
        </>
    );

    // Fullscreen mode
    if (isFullscreen) {
        return (
            <Dialog
                open={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                fullScreen
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: 'background.default',
                        },
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100vh',
                        p: 2,
                    }}
                >
                    {diagramContent}
                </Box>
            </Dialog>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 280px)',
                minHeight: 500,
            }}
        >
            {diagramContent}
        </Box>
    );
}
