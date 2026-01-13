import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    type Node,
    type Edge,
    MarkerType,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    IconButton,
    Tooltip,
    Chip,
    useTheme,
    alpha,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    GridOn as GridIcon,
    GridOff as GridOffIcon,
    AccountTree as TreeIcon,
    Hub as HubIcon,
} from '@mui/icons-material';
import { connectionsApi, schemaApi } from '../../lib/api';
import { TableNode, type TableColumn } from './TableNode';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { useConnectionStore } from '../../stores/connectionStore';
import type { TableInfo, ForeignKeyInfo, ColumnInfo } from '@dbnexus/shared';

// Helper to parse columns that might be string (PostgreSQL array format like "{col1,col2}") or actual array
function parseColumnArray(cols: string[] | string | undefined | null): string[] {
    if (!cols) return [];
    if (Array.isArray(cols)) return cols;
    if (typeof cols === 'string') {
        return cols.replaceAll('{', '').replaceAll('}', '').split(',').map(c => c.trim()).filter(Boolean);
    }
    return [];
}

const nodeTypes = {
    table: TableNode,
};

type LayoutType = 'tree' | 'circular';

interface TableDetails {
    columns: ColumnInfo[];
    foreignKeys: ForeignKeyInfo[];
}

// Auto-layout algorithm for positioning nodes
function calculateLayout(
    tables: TableInfo[],
    tableDetails: Record<string, TableDetails>,
    layoutType: LayoutType
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (tables.length === 0) return { nodes, edges };

    const nodeWidth = 250;
    const nodeHeight = 200;
    const horizontalSpacing = 100;
    const verticalSpacing = 80;

    if (layoutType === 'circular') {
        // Circular layout
        const centerX = 500;
        const centerY = 400;
        const radius = Math.max(300, tables.length * 40);

        tables.forEach((table, index) => {
            const angle = (2 * Math.PI * index) / tables.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle) - nodeWidth / 2;
            const y = centerY + radius * Math.sin(angle) - nodeHeight / 2;

            const details = tableDetails[table.name];
            const tableFks = details?.foreignKeys || [];

            const columns: TableColumn[] = (details?.columns || []).map((col) => {
                const fk = tableFks.find((f) => parseColumnArray(f.columns).includes(col.name));
                const refColumn = fk ? parseColumnArray(fk.referencedColumns)[0] : undefined;
                return {
                    name: col.name,
                    dataType: col.dataType,
                    nullable: col.nullable,
                    isPrimaryKey: col.isPrimaryKey,
                    isForeignKey: !!fk,
                    references: fk && refColumn
                        ? { table: fk.referencedTable, column: refColumn }
                        : undefined,
                };
            });

            nodes.push({
                id: table.name,
                type: 'table',
                position: { x, y },
                data: {
                    label: table.name,
                    columns,
                    schema: table.schema,
                    rowCount: table.rowCount,
                },
            });
        });
    } else {
        // Tree/grid layout
        const cols = Math.ceil(Math.sqrt(tables.length));

        tables.forEach((table, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = col * (nodeWidth + horizontalSpacing);
            const y = row * (nodeHeight + verticalSpacing);

            const details = tableDetails[table.name];
            const tableFks = details?.foreignKeys || [];

            const columns: TableColumn[] = (details?.columns || []).map((colInfo) => {
                const fk = tableFks.find((f) => parseColumnArray(f.columns).includes(colInfo.name));
                const refColumn = fk ? parseColumnArray(fk.referencedColumns)[0] : undefined;
                return {
                    name: colInfo.name,
                    dataType: colInfo.dataType,
                    nullable: colInfo.nullable,
                    isPrimaryKey: colInfo.isPrimaryKey,
                    isForeignKey: !!fk,
                    references: fk && refColumn
                        ? { table: fk.referencedTable, column: refColumn }
                        : undefined,
                };
            });

            nodes.push({
                id: table.name,
                type: 'table',
                position: { x, y },
                data: {
                    label: table.name,
                    columns,
                    schema: table.schema,
                    rowCount: table.rowCount,
                },
            });
        });
    }

    // Create edges for foreign key relationships
    // Build a set of all node IDs for validation
    const nodeIds = new Set(nodes.map((n) => n.id));

    Object.entries(tableDetails).forEach(([tableName, details]) => {
        details.foreignKeys.forEach((fk, index) => {
            // Skip if target table doesn't exist in our nodes
            if (!nodeIds.has(fk.referencedTable)) {
                return;
            }

            const fkColumns = parseColumnArray(fk.columns);
            const refColumns = parseColumnArray(fk.referencedColumns);
            const sourceColumn = fkColumns[0];
            const targetColumn = refColumns[0];

            // Validate column names exist and are valid strings
            if (!sourceColumn || !targetColumn) {
                // Use default handles if column info is missing
                edges.push({
                    id: `${tableName}-${fk.referencedTable}-${index}`,
                    source: tableName,
                    target: fk.referencedTable,
                    sourceHandle: 'bottom',
                    targetHandle: 'top',
                    type: 'smoothstep',
                    animated: true,
                    style: { strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 15,
                        height: 15,
                    },
                    label: fk.name,
                    labelStyle: { fontSize: 10, fill: '#888' },
                    labelBgStyle: { fill: 'transparent' },
                });
                return;
            }

            edges.push({
                id: `${tableName}-${fk.referencedTable}-${index}`,
                source: tableName,
                target: fk.referencedTable,
                sourceHandle: `${sourceColumn}-source`,
                targetHandle: `${targetColumn}-target`,
                type: 'smoothstep',
                animated: true,
                style: { strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 15,
                    height: 15,
                },
                label: fk.name,
                labelStyle: { fontSize: 10, fill: '#888' },
                labelBgStyle: { fill: 'transparent' },
            });
        });
    });

    return { nodes, edges };
}

// Helper to get default schema for a database engine
function getDefaultSchema(engine: string | undefined, database: string | undefined, schemas: string[]): string {
    if (schemas.length === 0) return '';
    const firstSchema = schemas[0] ?? '';
    if (engine === 'postgres') {
        return schemas.find((s) => s === 'public') ?? firstSchema;
    }
    if (engine === 'mysql' || engine === 'mariadb') {
        return database && schemas.includes(database) ? database : firstSchema;
    }
    return firstSchema;
}

export function SchemaVisualizerPage() {
    const theme = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showGrid, setShowGrid] = useState(true);
    const [layoutType, setLayoutType] = useState<LayoutType>('tree');
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Use shared connection store
    const {
        selectedConnectionId: storeConnectionId,
        selectedSchema: storeSchema,
        setConnectionAndSchema,
    } = useConnectionStore();

    // Get URL params
    const urlConnectionId = searchParams.get('connection') || '';
    const urlSchema = searchParams.get('schema') || '';

    // Local state for connection and schema
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
    const [selectedSchema, setSelectedSchema] = useState<string>('');

    // Initialize from URL or store on mount and when URL changes
    useEffect(() => {
        const connId = urlConnectionId || storeConnectionId;
        const schema = urlSchema || storeSchema;
        if (connId) {
            setSelectedConnectionId(connId);
        }
        if (schema) {
            setSelectedSchema(schema);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlConnectionId, urlSchema, storeConnectionId, storeSchema]);

    // Fetch connections
    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

    // Fetch schemas
    const { data: schemas = [] } = useQuery({
        queryKey: ['schemas', selectedConnectionId],
        queryFn: () => schemaApi.getSchemas(selectedConnectionId),
        enabled: !!selectedConnectionId,
    });

    // Update URL when local state changes
    useEffect(() => {
        if (selectedConnectionId) {
            const params: Record<string, string> = { connection: selectedConnectionId };
            if (selectedSchema) {
                params.schema = selectedSchema;
            }
            setSearchParams(params, { replace: true });
            // Sync to shared store
            setConnectionAndSchema(selectedConnectionId, selectedSchema);
        } else {
            setSearchParams({}, { replace: true });
        }
    }, [selectedConnectionId, selectedSchema, setSearchParams, setConnectionAndSchema]);

    // Auto-select default schema when schemas load and no schema is selected
    useEffect(() => {
        if (selectedConnectionId && schemas.length > 0 && !selectedSchema) {
            const defaultSchema = getDefaultSchema(selectedConnection?.engine, selectedConnection?.database, schemas);
            if (defaultSchema) {
                setSelectedSchema(defaultSchema);
            }
        }
    }, [selectedConnectionId, schemas, selectedSchema, selectedConnection?.engine, selectedConnection?.database]);

    // Fetch tables
    const {
        data: tables = [],
        isLoading: loadingTables,
        refetch: refetchTables,
    } = useQuery({
        queryKey: ['tables', selectedConnectionId, selectedSchema],
        queryFn: async () => {
            const allTables = await schemaApi.getTables(selectedConnectionId);
            return allTables.filter((t) => t.schema === selectedSchema);
        },
        enabled: !!selectedConnectionId && !!selectedSchema,
    });

    // Fetch table details including foreign keys
    const tableNamesKey = tables.map((t) => t.name).join(',');
    const { data: tableDetails, isLoading: loadingDetails } = useQuery({
        queryKey: ['tableDetails', selectedConnectionId, selectedSchema, tableNamesKey],
        queryFn: async () => {
            const details: Record<string, TableDetails> = {};
            await Promise.all(
                tables.map(async (table) => {
                    try {
                        const tableInfo = await schemaApi.getTableSchema(
                            selectedConnectionId,
                            selectedSchema,
                            table.name
                        );
                        details[table.name] = {
                            columns: tableInfo.columns,
                            foreignKeys: tableInfo.foreignKeys || [],
                        };
                    } catch (error) {
                        console.error(`Failed to fetch details for ${table.name}:`, error);
                    }
                })
            );
            return details;
        },
        enabled: !!selectedConnectionId && !!selectedSchema && tables.length > 0,
        staleTime: 60000, // Cache for 1 minute
    });

    // Build the graph when data changes
    const graphData = useMemo(() => {
        if (tables.length === 0 || !tableDetails || Object.keys(tableDetails).length === 0) {
            return { nodes: [] as Node[], edges: [] as Edge[] };
        }
        return calculateLayout(tables, tableDetails, layoutType);
    }, [tables, tableDetails, layoutType]);

    // Update nodes and edges when graph data changes
    useEffect(() => {
        setNodes(graphData.nodes);
        setEdges(graphData.edges);
    }, [graphData, setNodes, setEdges]);

    // Handle connection change
    const handleConnectionChange = useCallback((connectionId: string) => {
        setNodes([]);
        setEdges([]);
        setSelectedConnectionId(connectionId);
        setSelectedSchema(''); // Reset schema when connection changes
    }, [setNodes, setEdges]);

    // Handle schema change
    const handleSchemaChange = useCallback((schema: string) => {
        setSelectedSchema(schema);
    }, []);

    const isLoading = loadingConnections || loadingTables || loadingDetails;

    // Count relationships
    const relationshipCount = useMemo(() => {
        if (!tableDetails) return 0;
        return Object.values(tableDetails).reduce((count, details) => count + details.foreignKeys.length, 0);
    }, [tableDetails]);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box
                sx={{
                    px: 3,
                    py: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="h5" fontWeight={600}>
                        Schema Visualizer
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Interactive ER diagram of your database schema
                    </Typography>
                </Box>

                {/* Connection selector */}
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Connection</InputLabel>
                    <Select
                        value={selectedConnectionId}
                        label="Connection"
                        onChange={(e) => handleConnectionChange(e.target.value)}
                    >
                        {connections.map((conn) => (
                            <MenuItem key={conn.id} value={conn.id}>
                                {conn.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Schema selector */}
                <FormControl size="small" sx={{ minWidth: 150 }} disabled={!selectedConnectionId}>
                    <InputLabel>Schema</InputLabel>
                    <Select
                        value={selectedSchema}
                        label="Schema"
                        onChange={(e) => handleSchemaChange(e.target.value)}
                    >
                        {schemas.map((schema) => (
                            <MenuItem key={schema} value={schema}>
                                {schema}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Stats */}
                {tables.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                            label={`${tables.length} tables`}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                        <Chip
                            label={`${relationshipCount} relationships`}
                            size="small"
                            color="info"
                            variant="outlined"
                        />
                    </Box>
                )}

                {/* Refresh */}
                <Tooltip title="Refresh schema">
                    <IconButton onClick={() => refetchTables()} disabled={!selectedConnectionId}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Main content */}
            <Box sx={{ flex: 1, position: 'relative' }}>
                {!selectedConnectionId ? (
                    <EmptyState
                        icon={<TreeIcon sx={{ fontSize: 64 }} />}
                        title="Select a connection"
                        description="Choose a database connection to visualize its schema as an interactive ER diagram."
                        size="large"
                    />
                ) : isLoading ? (
                    <LoadingState message="Loading schema..." size="large" />
                ) : tables.length === 0 ? (
                    <EmptyState
                        icon={<TreeIcon sx={{ fontSize: 64 }} />}
                        title="No tables found"
                        description="This schema doesn't have any tables to visualize."
                        size="large"
                    />
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.1}
                        maxZoom={2}
                        defaultEdgeOptions={{
                            style: { stroke: theme.palette.primary.main },
                        }}
                    >
                        {showGrid && (
                            <Background
                                variant={BackgroundVariant.Dots}
                                gap={20}
                                size={1}
                                color={alpha(theme.palette.text.primary, 0.1)}
                            />
                        )}
                        <Controls showInteractive={false} />
                        <MiniMap
                            nodeColor={() => alpha(theme.palette.primary.main, 0.5)}
                            maskColor={alpha(theme.palette.background.default, 0.8)}
                            style={{
                                backgroundColor: theme.palette.background.paper,
                                border: `1px solid ${theme.palette.divider}`,
                            }}
                        />

                        {/* Custom controls panel */}
                        <Panel position="top-right">
                            <Paper
                                sx={{
                                    p: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                }}
                            >
                                <ToggleButtonGroup
                                    value={layoutType}
                                    exclusive
                                    onChange={(_, value) => value && setLayoutType(value)}
                                    size="small"
                                >
                                    <ToggleButton value="tree">
                                        <Tooltip title="Grid layout">
                                            <TreeIcon fontSize="small" />
                                        </Tooltip>
                                    </ToggleButton>
                                    <ToggleButton value="circular">
                                        <Tooltip title="Circular layout">
                                            <HubIcon fontSize="small" />
                                        </Tooltip>
                                    </ToggleButton>
                                </ToggleButtonGroup>

                                <Tooltip title={showGrid ? 'Hide grid' : 'Show grid'}>
                                    <IconButton
                                        size="small"
                                        onClick={() => setShowGrid(!showGrid)}
                                    >
                                        {showGrid ? <GridOffIcon /> : <GridIcon />}
                                    </IconButton>
                                </Tooltip>
                            </Paper>
                        </Panel>

                        {/* Legend */}
                        <Panel position="bottom-left">
                            <Paper sx={{ p: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
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
                )}
            </Box>
        </Box>
    );
}
