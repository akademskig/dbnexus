import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
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
    InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import StorageIcon from '@mui/icons-material/Storage';
import GridViewIcon from '@mui/icons-material/GridView';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { schemaApi, queriesApi, connectionsApi } from '../../lib/api';
import { buildDropTableSql, buildTableName, quoteIdentifier } from '../../lib/sql';
import { useToastStore } from '../../stores/toastStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { GlassCard } from '../../components/GlassCard';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ConnectionSelector } from '../../components/ConnectionSelector';
import {
    EditableTableNode,
    type EditableColumn,
    type EditableTableNodeData,
} from '../ConnectionManagementPage/EditableTableNode';

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
            return inner.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        }
        // Single column as string
        return value ? [value] : [];
    }
    return [];
}

export function DiagramEditorPage() {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [searchParams, setSearchParams] = useSearchParams();

    // Use shared connection store
    const {
        selectedConnectionId: storeConnectionId,
        selectedSchema: storeSchema,
        setConnectionAndSchema,
    } = useConnectionStore();

    // Get URL params - these are the source of truth on page load
    const urlConnectionId = searchParams.get('connection') || '';
    const urlSchema = searchParams.get('schema') || '';

    // Fetch connections
    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    // Compute the candidate connection ID from URL or store
    const candidateConnectionId = urlConnectionId || storeConnectionId || '';

    // Only use the connection ID if it exists in the connections list
    // This prevents invalid values being passed to Select component
    const selectedConnectionId = useMemo(() => {
        if (!candidateConnectionId || loadingConnections) return '';
        const exists = connections.some((c) => c.id === candidateConnectionId);
        return exists ? candidateConnectionId : '';
    }, [candidateConnectionId, connections, loadingConnections]);

    const selectedSchema = urlSchema || storeSchema || '';

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Loading state for diagram rendering
    const [loadingDiagram, setLoadingDiagram] = useState(false);

    // React Flow state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [refreshCounter, setRefreshCounter] = useState(0);

    // Dialog states
    const [createTableOpen, setCreateTableOpen] = useState(false);
    const [addColumnOpen, setAddColumnOpen] = useState(false);
    const [editColumnOpen, setEditColumnOpen] = useState(false);
    const [deleteColumnOpen, setDeleteColumnOpen] = useState(false);
    const [deleteTableOpen, setDeleteTableOpen] = useState(false);
    const [createFkOpen, setCreateFkOpen] = useState(false);

    // Form states
    const [newTableName, setNewTableName] = useState('');
    const [currentTableId, setCurrentTableId] = useState<string | null>(null);
    const [currentColumn, setCurrentColumn] = useState<EditableColumn | null>(null);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
    const [confirmDeleteText, setConfirmDeleteText] = useState('');

    const [newColumn, setNewColumn] = useState({
        name: '',
        dataType: '',
        nullable: true,
        isPrimaryKey: false,
        defaultValue: '',
    });

    // Get current connection - only if it exists in the connections list
    const connection = connections.find((c) => c.id === selectedConnectionId);

    // Check if selected connection is valid (exists in connections list)
    const isValidConnection = !!selectedConnectionId && !!connection;

    // Fetch schemas for selected connection - only if connection is valid
    const {
        data: schemas = [],
        isLoading: loadingSchemas,
        error: schemasError,
        refetch: refetchSchemas,
    } = useQuery({
        queryKey: ['schemas', selectedConnectionId],
        queryFn: () => schemaApi.getSchemas(selectedConnectionId),
        enabled: isValidConnection,
        retry: 1,
    });

    // Fetch tables for selected schema - only if connection is valid
    const {
        data: tables = [],
        isLoading: loadingTables,
        error: tablesError,
        refetch: refetchTables,
    } = useQuery({
        queryKey: ['tables', selectedConnectionId, selectedSchema],
        queryFn: () => schemaApi.getTables(selectedConnectionId, selectedSchema),
        enabled: isValidConnection && !!selectedSchema,
        retry: 1,
    });

    // Connection error state
    const connectionError = schemasError || tablesError;

    // Sync URL params to store on initial load
    useEffect(() => {
        if (urlConnectionId || urlSchema) {
            setConnectionAndSchema(urlConnectionId, urlSchema);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clear invalid connection from store when connections are loaded
    useEffect(() => {
        if (loadingConnections || connections.length === 0) return;

        // If the candidate connection ID doesn't exist in connections, clear the store
        if (candidateConnectionId) {
            const exists = connections.some((c) => c.id === candidateConnectionId);
            if (!exists) {
                setConnectionAndSchema('', '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingConnections, connections.length]);

    // Update URL when selection changes
    const handleConnectionChange = useCallback(
        (connectionId: string) => {
            setSearchParams(
                (prev) => {
                    const newParams = new URLSearchParams(prev);
                    if (connectionId) {
                        newParams.set('connection', connectionId);
                        // Reset schema when connection changes
                        newParams.delete('schema');
                    } else {
                        newParams.delete('connection');
                        newParams.delete('schema');
                    }
                    return newParams;
                },
                { replace: true }
            );
            setConnectionAndSchema(connectionId, '');
        },
        [setConnectionAndSchema, setSearchParams]
    );

    const handleSchemaChange = useCallback(
        (schema: string) => {
            setSearchParams(
                (prev) => {
                    const newParams = new URLSearchParams(prev);
                    if (schema) {
                        newParams.set('schema', schema);
                    } else {
                        newParams.delete('schema');
                    }
                    return newParams;
                },
                { replace: true }
            );
            setConnectionAndSchema(selectedConnectionId, schema);
        },
        [selectedConnectionId, setConnectionAndSchema, setSearchParams]
    );

    // Set default schema when schemas load
    useEffect(() => {
        if (schemas.length > 0 && !selectedSchema && selectedConnectionId) {
            const defaultSchema =
                connection?.defaultSchema && schemas.includes(connection.defaultSchema)
                    ? connection.defaultSchema
                    : schemas.includes('public')
                      ? 'public'
                      : schemas[0];
            if (defaultSchema) {
                handleSchemaChange(defaultSchema);
            }
        }
    }, [
        schemas,
        selectedSchema,
        selectedConnectionId,
        connection?.defaultSchema,
        handleSchemaChange,
    ]);

    // Handlers for node operations
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

    const handleOpenEditColumn = useCallback((tableId: string, column: EditableColumn) => {
        setCurrentTableId(tableId);
        setCurrentColumn(column);
        // Pre-populate form with current values
        setNewColumn({
            name: column.name,
            dataType: column.dataType,
            nullable: column.nullable,
            isPrimaryKey: column.isPrimaryKey,
            defaultValue: column.defaultValue || '',
        });
        setEditColumnOpen(true);
    }, []);

    const handleOpenDeleteColumn = useCallback((tableId: string, column: EditableColumn) => {
        setCurrentTableId(tableId);
        setCurrentColumn(column);
        setDeleteColumnOpen(true);
    }, []);

    const handleOpenEditTable = useCallback((_tableId: string) => {
        // Could implement table rename
    }, []);

    const handleOpenDeleteTable = useCallback((tableId: string) => {
        setCurrentTableId(tableId);
        setDeleteTableOpen(true);
    }, []);

    // Load table details and create nodes/edges
    useEffect(() => {
        if (!tables.length || !selectedConnectionId || !selectedSchema) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const loadTableDetails = async () => {
            setLoadingDiagram(true);
            try {
                const tableDetails = await Promise.all(
                    tables.map((table) =>
                        schemaApi.getTableSchema(selectedConnectionId, selectedSchema, table.name)
                    )
                );

                // Layout constants - similar to Schema Visualizer
                const nodeWidth = 280;
                const nodeHeight = 250;
                const horizontalSpacing = 80;
                const verticalSpacing = 60;

                // Use square-ish grid layout (like visualizer)
                const numCols = Math.ceil(Math.sqrt(tableDetails.length));

                // Create nodes
                const newNodes: Node[] = tableDetails.map((detail, index) => {
                    const columns: EditableColumn[] = detail.columns.map((col, idx) => ({
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

                    // Grid layout - square grid like visualizer
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

                // Create edges for foreign keys
                const newEdges: Edge[] = [];
                tableDetails.forEach((detail) => {
                    detail.foreignKeys.forEach((fk, fkIndex) => {
                        // Use parseColumnArray to handle PostgreSQL string format
                        const sourceColumns = parseColumnArray(fk.columns);
                        const targetColumns = parseColumnArray(fk.referencedColumns);

                        if (sourceColumns[0] && targetColumns[0]) {
                            const sourceNode = newNodes.find((n) => n.id === detail.name);
                            const targetNode = newNodes.find((n) => n.id === fk.referencedTable);

                            if (sourceNode && targetNode) {
                                const sourceCol = (
                                    sourceNode.data as EditableTableNodeData
                                ).columns.find((c) => c.name === sourceColumns[0]);
                                const targetCol = (
                                    targetNode.data as EditableTableNodeData
                                ).columns.find((c) => c.name === targetColumns[0]);

                                if (sourceCol && targetCol) {
                                    newEdges.push({
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
                                }
                            }
                        }
                    });
                });

                setNodes(newNodes);
                setEdges(newEdges);
            } catch (error) {
                console.error('Failed to load table details:', error);
                toast.error('Failed to load table details');
            } finally {
                setLoadingDiagram(false);
            }
        };

        loadTableDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tables, selectedConnectionId, selectedSchema, refreshCounter]);

    // Handle connection (creating FK)
    const onConnect: OnConnect = useCallback((connection) => {
        setPendingConnection(connection);
        setCreateFkOpen(true);
    }, []);

    // Execute SQL mutation
    const executeSql = useMutation({
        mutationFn: async ({ sql, confirmed }: { sql: string; confirmed?: boolean }) => {
            return queriesApi.execute(selectedConnectionId, sql, confirmed);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['tables', selectedConnectionId, selectedSchema],
            });
            refetchTables();
            setRefreshCounter((value) => value + 1);
        },
    });

    // Create table handler
    const handleCreateTable = async () => {
        if (!newTableName.trim()) return;

        const fullTableName = buildTableName(selectedSchema, newTableName, connection?.engine);
        const sql = `CREATE TABLE ${fullTableName} (
    id SERIAL PRIMARY KEY
)`;

        try {
            await executeSql.mutateAsync({ sql });
            toast.success(`Table "${newTableName}" created`);
            setCreateTableOpen(false);
            setNewTableName('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create table');
        }
    };

    // Add column handler
    const handleAddColumn = async () => {
        if (!currentTableId || !newColumn.name || !newColumn.dataType) return;

        const fullTableName = buildTableName(selectedSchema, currentTableId, connection?.engine);
        let sql = `ALTER TABLE ${fullTableName} ADD COLUMN ${quoteIdentifier(newColumn.name, connection?.engine)} ${newColumn.dataType}`;

        if (!newColumn.nullable) {
            sql += ' NOT NULL';
        }
        if (newColumn.defaultValue) {
            sql += ` DEFAULT ${newColumn.defaultValue}`;
        }
        if (newColumn.isPrimaryKey) {
            sql += ' PRIMARY KEY';
        }

        try {
            await executeSql.mutateAsync({ sql });
            toast.success(`Column "${newColumn.name}" added to "${currentTableId}"`);
            setAddColumnOpen(false);
            setCurrentTableId(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to add column');
        }
    };

    // Delete column handler
    const handleDeleteColumn = async () => {
        if (!currentTableId || !currentColumn) return;

        const fullTableName = buildTableName(selectedSchema, currentTableId, connection?.engine);
        const sql = `ALTER TABLE ${fullTableName} DROP COLUMN ${quoteIdentifier(currentColumn.name, connection?.engine)}`;

        try {
            await executeSql.mutateAsync({ sql });
            toast.success(`Column "${currentColumn.name}" dropped from "${currentTableId}"`);
            setDeleteColumnOpen(false);
            setCurrentTableId(null);
            setCurrentColumn(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to drop column');
        }
    };

    // Edit column handler
    const handleEditColumn = async () => {
        if (!currentTableId || !currentColumn) return;

        const fullTableName = buildTableName(selectedSchema, currentTableId, connection?.engine);
        const quotedColumn = quoteIdentifier(currentColumn.name, connection?.engine);
        const statements: string[] = [];

        // For PostgreSQL, we can alter type, nullable, and default separately
        if (connection?.engine === 'postgres') {
            if (newColumn.dataType && newColumn.dataType !== currentColumn.dataType) {
                statements.push(
                    `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} TYPE ${newColumn.dataType}`
                );
            }
            if (newColumn.nullable !== currentColumn.nullable) {
                if (newColumn.nullable) {
                    statements.push(
                        `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} DROP NOT NULL`
                    );
                } else {
                    statements.push(
                        `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} SET NOT NULL`
                    );
                }
            }
            if (newColumn.defaultValue !== (currentColumn.defaultValue || '')) {
                if (newColumn.defaultValue) {
                    statements.push(
                        `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} SET DEFAULT ${newColumn.defaultValue}`
                    );
                } else {
                    statements.push(
                        `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} DROP DEFAULT`
                    );
                }
            }
        } else {
            // MySQL/MariaDB uses MODIFY COLUMN
            let sql = `ALTER TABLE ${fullTableName} MODIFY COLUMN ${quotedColumn} ${newColumn.dataType || currentColumn.dataType}`;
            if (!newColumn.nullable) {
                sql += ' NOT NULL';
            }
            if (newColumn.defaultValue) {
                sql += ` DEFAULT ${newColumn.defaultValue}`;
            }
            statements.push(sql);
        }

        if (statements.length === 0) {
            toast.info('No changes to apply');
            setEditColumnOpen(false);
            return;
        }

        try {
            for (const sql of statements) {
                await executeSql.mutateAsync({ sql });
            }
            toast.success(`Column "${currentColumn.name}" updated`);
            setEditColumnOpen(false);
            setCurrentTableId(null);
            setCurrentColumn(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update column');
        }
    };

    // Delete table handler
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

        const sourceColId = sourceHandle.replace('-source', '');
        const targetColId = targetHandle.replace('-target', '');

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
        const fullSourceTable = buildTableName(selectedSchema, sourceTable, connection?.engine);
        const fullTargetTable = buildTableName(selectedSchema, targetTable, connection?.engine);

        const sql = `ALTER TABLE ${fullSourceTable} ADD CONSTRAINT ${quoteIdentifier(fkName, connection?.engine)} FOREIGN KEY (${quoteIdentifier(sourceCol.name, connection?.engine)}) REFERENCES ${fullTargetTable} (${quoteIdentifier(targetCol.name, connection?.engine)})`;

        try {
            await executeSql.mutateAsync({ sql });
            toast.success(`Foreign key "${fkName}" created`);
            setCreateFkOpen(false);
            setPendingConnection(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create foreign key');
        }
    };

    const dataTypes =
        DATA_TYPES[connection?.engine as keyof typeof DATA_TYPES] || DATA_TYPES.postgres;

    // Redirect to dashboard if no connections after loading
    if (!loadingConnections && connections.length === 0) {
        return <Navigate to="/dashboard" replace />;
    }

    // Render diagram canvas content - extracted to avoid nested ternary
    const renderDiagramCanvas = () => {
        // Show empty state when no connections exist
        if (!loadingConnections && connections.length === 0) {
            return (
                <EmptyState
                    icon={<StorageIcon />}
                    title="No connections configured"
                    description="Add a database connection to start using the schema diagram."
                    action={{
                        label: 'Go to Projects',
                        onClick: () => (window.location.href = '/projects'),
                    }}
                />
            );
        }

        // Show select connection state when no connection is selected or selected connection no longer exists
        if (!selectedConnectionId || (!loadingConnections && !isValidConnection)) {
            return (
                <EmptyState
                    icon={<StorageIcon />}
                    title="Select a connection"
                    description="Choose a database connection to start editing the schema diagram."
                />
            );
        }

        // Show connection error state
        if (connectionError) {
            const errorMessage =
                connectionError instanceof Error ? connectionError.message : 'Unknown error';
            const isConnectionRefused =
                errorMessage.includes('ECONNREFUSED') ||
                errorMessage.includes('connect') ||
                errorMessage.includes('Connection') ||
                errorMessage.includes('timeout');

            return (
                <EmptyState
                    icon={<ErrorOutlineIcon sx={{ color: 'error.main' }} />}
                    title={isConnectionRefused ? 'Database Unavailable' : 'Connection Error'}
                    description={
                        isConnectionRefused
                            ? `Unable to connect to the database. Please ensure the database server is running and accessible.`
                            : `Failed to load schema data: ${errorMessage}`
                    }
                    action={{
                        label: 'Retry Connection',
                        onClick: () => {
                            refetchSchemas();
                            if (selectedSchema) refetchTables();
                        },
                    }}
                />
            );
        }

        if (!selectedSchema) {
            return (
                <EmptyState
                    icon={<GridViewIcon />}
                    title="Select a schema"
                    description="Choose a schema to view and edit its tables."
                />
            );
        }

        if (loadingTables || loadingDiagram) {
            return (
                <LoadingState
                    message={loadingTables ? 'Loading tables...' : 'Rendering diagram...'}
                    size="large"
                />
            );
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
                        bottom: 'auto',
                        top: 0,
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
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1}
                        color={alpha(theme.palette.text.primary, 0.1)}
                    />
                    <Controls />
                    <MiniMap
                        nodeColor={(node) =>
                            node.selected
                                ? theme.palette.primary.main
                                : alpha(theme.palette.primary.main, 0.5)
                        }
                        maskColor={alpha(theme.palette.background.default, 0.8)}
                        style={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    />

                    {/* Instructions panel */}
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

                    {/* Legend */}
                    <Panel position="bottom-left">
                        <Paper
                            sx={{
                                p: 1.5,
                                display: 'flex',
                                gap: 2,
                                alignItems: 'center',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        bgcolor: 'warning.main',
                                    }}
                                />
                                <Typography variant="caption">Primary Key</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        bgcolor: 'info.main',
                                    }}
                                />
                                <Typography variant="caption">Foreign Key</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'error.main', fontWeight: 600 }}
                                >
                                    NN
                                </Typography>
                                <Typography variant="caption">Not Null</Typography>
                            </Box>
                        </Paper>
                    </Panel>
                </ReactFlow>
            </Box>
        );
    };

    const diagramContent = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: isFullscreen ? 'calc(100vh - 32px)' : 'calc(100vh - 35px)',
                minHeight: 500,
            }}
        >
            {/* Top Bar */}
            <GlassCard sx={{ mb: 2, p: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Connection Selector */}
                    <ConnectionSelector
                        value={selectedConnectionId}
                        onChange={handleConnectionChange}
                        disabled={loadingConnections}
                        disableOffline={true}
                    />

                    {/* Schema Selector */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Schema</InputLabel>
                        <Select
                            value={selectedSchema}
                            onChange={(e) => handleSchemaChange(e.target.value)}
                            label="Schema"
                            disabled={!selectedConnectionId || loadingSchemas}
                            startAdornment={
                                <InputAdornment position="start">
                                    <GridViewIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                </InputAdornment>
                            }
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
                        disabled={!selectedConnectionId || !selectedSchema || connection?.readOnly}
                    >
                        New Table
                    </Button>

                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => refetchTables()}
                        disabled={loadingTables || !selectedConnectionId || !selectedSchema}
                    >
                        Refresh
                    </Button>

                    <Box sx={{ flex: 1 }} />

                    <Chip
                        label={`${tables.length} table${tables.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                    />

                    <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
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
                    </Tooltip>
                </Box>
            </GlassCard>

            {/* Diagram Canvas */}
            <GlassCard
                sx={{
                    flex: 1,
                    p: 0,
                    overflow: 'hidden',
                    backgroundColor: 'background.default',
                    '&:hover': { borderColor: 'divider', boxShadow: 'none' },
                }}
            >
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
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Table Name"
                        fullWidth
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateTable();
                        }}
                        helperText="Table will be created with a default 'id' serial primary key column"
                    />
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
                <DialogTitle>Add Column to &quot;{currentTableId}&quot;</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            autoFocus
                            label="Column Name"
                            fullWidth
                            value={newColumn.name}
                            onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                        />
                        <Autocomplete
                            freeSolo
                            options={dataTypes}
                            value={newColumn.dataType}
                            onChange={(_, value) =>
                                setNewColumn({ ...newColumn, dataType: value || '' })
                            }
                            onInputChange={(_, value) =>
                                setNewColumn({ ...newColumn, dataType: value })
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Data Type" fullWidth />
                            )}
                        />
                        <TextField
                            label="Default Value (optional)"
                            fullWidth
                            value={newColumn.defaultValue}
                            onChange={(e) =>
                                setNewColumn({ ...newColumn, defaultValue: e.target.value })
                            }
                            helperText="Enter SQL expression (e.g., 'now()', '0', 'true')"
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newColumn.nullable}
                                        onChange={(e) =>
                                            setNewColumn({
                                                ...newColumn,
                                                nullable: e.target.checked,
                                            })
                                        }
                                    />
                                }
                                label="Nullable"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newColumn.isPrimaryKey}
                                        onChange={(e) =>
                                            setNewColumn({
                                                ...newColumn,
                                                isPrimaryKey: e.target.checked,
                                            })
                                        }
                                    />
                                }
                                label="Primary Key"
                            />
                        </Box>
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

            {/* Edit Column Dialog */}
            <Dialog
                open={editColumnOpen}
                onClose={() => setEditColumnOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EditIcon color="primary" />
                    Edit Column: {currentColumn?.name}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                            Column name cannot be changed here. Use SQL to rename columns.
                        </Alert>
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
                            renderInput={(params) => <TextField {...params} label="Data Type" />}
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
                            label="Default Value"
                            value={newColumn.defaultValue}
                            onChange={(e) =>
                                setNewColumn((prev) => ({ ...prev, defaultValue: e.target.value }))
                            }
                            placeholder="NULL, 0, 'default', now()"
                            helperText="Enter SQL expression for default value, or leave empty to drop default"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditColumnOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleEditColumn}
                        disabled={executeSql.isPending}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <EditIcon />
                        }
                    >
                        Save Changes
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

            {/* Delete Table Confirmation */}
            <Dialog
                open={deleteTableOpen}
                onClose={() => {
                    setDeleteTableOpen(false);
                    setConfirmDeleteText('');
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="error" />
                    Drop Table
                </DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        This will permanently delete the table and all its data. This action cannot
                        be undone.
                    </Alert>
                    <Typography>
                        Are you sure you want to drop table &quot;{currentTableId}&quot;?
                    </Typography>
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
            <Dialog open={createFkOpen} onClose={() => setCreateFkOpen(false)}>
                <DialogTitle>Create Foreign Key</DialogTitle>
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
        </Box>
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
                <Box sx={{ p: 2, height: '100%' }}>{diagramContent}</Box>
            </Dialog>
        );
    }

    return <Box sx={{ px: 3, pt: 2, pb: 1, height: 'calc(100vh - 64px)' }}>{diagramContent}</Box>;
}
