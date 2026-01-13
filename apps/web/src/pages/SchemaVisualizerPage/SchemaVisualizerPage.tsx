import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    Node,
    Edge,
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
    CircularProgress,
    useTheme,
    alpha,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    FitScreen as FitScreenIcon,
    Refresh as RefreshIcon,
    GridOn as GridIcon,
    GridOff as GridOffIcon,
    AccountTree as TreeIcon,
    Hub as HubIcon,
} from '@mui/icons-material';
import { connectionsApi, schemaApi } from '../../lib/api';
import { TableNode, TableNodeData, TableColumn } from './TableNode';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import type { TableInfo, ForeignKey } from '@dbnexus/shared';

const nodeTypes = {
    table: TableNode,
};

type LayoutType = 'tree' | 'circular';

// Auto-layout algorithm for positioning nodes
function calculateLayout(
    tables: TableInfo[],
    foreignKeys: Map<string, ForeignKey[]>,
    layoutType: LayoutType
): { nodes: Node<TableNodeData>[]; edges: Edge[] } {
    const nodes: Node<TableNodeData>[] = [];
    const edges: Edge[] = [];

    if (tables.length === 0) return { nodes, edges };

    // Build adjacency list for relationships
    const relationships = new Map<string, Set<string>>();
    tables.forEach((t) => relationships.set(t.name, new Set()));

    foreignKeys.forEach((fks, tableName) => {
        fks.forEach((fk) => {
            relationships.get(tableName)?.add(fk.referencedTable);
            if (!relationships.has(fk.referencedTable)) {
                relationships.set(fk.referencedTable, new Set());
            }
            relationships.get(fk.referencedTable)?.add(tableName);
        });
    });

    // Calculate node positions based on layout type
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

            const tableFks = foreignKeys.get(table.name) || [];
            const columns: TableColumn[] = table.columns.map((col) => {
                const fk = tableFks.find((f) => f.columns.includes(col.name));
                return {
                    name: col.name,
                    dataType: col.dataType,
                    nullable: col.nullable,
                    isPrimaryKey: col.isPrimaryKey,
                    isForeignKey: !!fk,
                    references: fk
                        ? {
                              table: fk.referencedTable,
                              column: fk.referencedColumns[0],
                          }
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
        // Tree/hierarchical layout - group by relationships
        const visited = new Set<string>();
        const levels: string[][] = [];

        // Find root tables (tables with no incoming foreign keys)
        const incomingCount = new Map<string, number>();
        tables.forEach((t) => incomingCount.set(t.name, 0));
        foreignKeys.forEach((fks) => {
            fks.forEach((fk) => {
                incomingCount.set(
                    fk.referencedTable,
                    (incomingCount.get(fk.referencedTable) || 0) + 1
                );
            });
        });

        // Start with tables that have no foreign keys pointing to them
        const roots = tables
            .filter((t) => (incomingCount.get(t.name) || 0) === 0)
            .map((t) => t.name);

        if (roots.length === 0 && tables.length > 0) {
            roots.push(tables[0].name);
        }

        // BFS to assign levels
        const queue = [...roots];
        roots.forEach((r) => visited.add(r));
        let currentLevel: string[] = [...roots];

        while (currentLevel.length > 0) {
            levels.push(currentLevel);
            const nextLevel: string[] = [];

            currentLevel.forEach((tableName) => {
                const fks = foreignKeys.get(tableName) || [];
                fks.forEach((fk) => {
                    if (!visited.has(fk.referencedTable)) {
                        visited.add(fk.referencedTable);
                        nextLevel.push(fk.referencedTable);
                    }
                });

                // Also check tables that reference this one
                tables.forEach((t) => {
                    const tFks = foreignKeys.get(t.name) || [];
                    if (
                        tFks.some((f) => f.referencedTable === tableName) &&
                        !visited.has(t.name)
                    ) {
                        visited.add(t.name);
                        nextLevel.push(t.name);
                    }
                });
            });

            currentLevel = nextLevel;
        }

        // Add any remaining unvisited tables
        const unvisited = tables.filter((t) => !visited.has(t.name)).map((t) => t.name);
        if (unvisited.length > 0) {
            levels.push(unvisited);
        }

        // Position nodes by level
        levels.forEach((level, levelIndex) => {
            const levelWidth = level.length * (nodeWidth + horizontalSpacing);
            const startX = -levelWidth / 2 + nodeWidth / 2;

            level.forEach((tableName, tableIndex) => {
                const table = tables.find((t) => t.name === tableName);
                if (!table) return;

                const x = startX + tableIndex * (nodeWidth + horizontalSpacing);
                const y = levelIndex * (nodeHeight + verticalSpacing);

                const tableFks = foreignKeys.get(table.name) || [];
                const columns: TableColumn[] = table.columns.map((col) => {
                    const fk = tableFks.find((f) => f.columns.includes(col.name));
                    return {
                        name: col.name,
                        dataType: col.dataType,
                        nullable: col.nullable,
                        isPrimaryKey: col.isPrimaryKey,
                        isForeignKey: !!fk,
                        references: fk
                            ? {
                                  table: fk.referencedTable,
                                  column: fk.referencedColumns[0],
                              }
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
        });
    }

    // Create edges for foreign key relationships
    foreignKeys.forEach((fks, tableName) => {
        fks.forEach((fk, index) => {
            const sourceColumn = fk.columns[0];
            const targetColumn = fk.referencedColumns[0];

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

export function SchemaVisualizerPage() {
    const theme = useTheme();
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
    const [selectedSchema, setSelectedSchema] = useState<string>('');
    const [showGrid, setShowGrid] = useState(true);
    const [layoutType, setLayoutType] = useState<LayoutType>('tree');
    const [nodes, setNodes, onNodesChange] = useNodesState<TableNodeData>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

    // Auto-select default schema
    useEffect(() => {
        if (schemas.length > 0 && !selectedSchema) {
            const defaultSchema =
                selectedConnection?.engine === 'postgres'
                    ? schemas.find((s) => s === 'public') || schemas[0]
                    : selectedConnection?.engine === 'mysql' || selectedConnection?.engine === 'mariadb'
                      ? selectedConnection.database || schemas[0]
                      : schemas[0];
            setSelectedSchema(defaultSchema);
        }
    }, [schemas, selectedSchema, selectedConnection]);

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
    const { data: tableDetails = new Map(), isLoading: loadingDetails } = useQuery({
        queryKey: ['tableDetails', selectedConnectionId, selectedSchema, tables.map((t) => t.name)],
        queryFn: async () => {
            const details = new Map<string, { columns: TableColumn[]; foreignKeys: ForeignKey[] }>();
            await Promise.all(
                tables.map(async (table) => {
                    try {
                        const tableInfo = await schemaApi.getTable(
                            selectedConnectionId,
                            selectedSchema,
                            table.name
                        );
                        details.set(table.name, {
                            columns: tableInfo.columns,
                            foreignKeys: tableInfo.foreignKeys || [],
                        });
                    } catch (error) {
                        console.error(`Failed to fetch details for ${table.name}:`, error);
                    }
                })
            );
            return details;
        },
        enabled: !!selectedConnectionId && !!selectedSchema && tables.length > 0,
    });

    // Build the graph when data changes
    useEffect(() => {
        if (tables.length === 0 || tableDetails.size === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        // Merge table info with details
        const enrichedTables: TableInfo[] = tables.map((t) => {
            const details = tableDetails.get(t.name);
            return {
                ...t,
                columns: details?.columns || [],
            };
        });

        // Build foreign keys map
        const foreignKeys = new Map<string, ForeignKey[]>();
        tableDetails.forEach((details, tableName) => {
            if (details.foreignKeys.length > 0) {
                foreignKeys.set(tableName, details.foreignKeys);
            }
        });

        const { nodes: newNodes, edges: newEdges } = calculateLayout(
            enrichedTables,
            foreignKeys,
            layoutType
        );

        setNodes(newNodes);
        setEdges(newEdges);
    }, [tables, tableDetails, layoutType, setNodes, setEdges]);

    const handleConnectionChange = useCallback((connectionId: string) => {
        setSelectedConnectionId(connectionId);
        setSelectedSchema('');
        setNodes([]);
        setEdges([]);
    }, [setNodes, setEdges]);

    const isLoading = loadingConnections || loadingTables || loadingDetails;

    // Count relationships
    const relationshipCount = useMemo(() => {
        let count = 0;
        tableDetails.forEach((details) => {
            count += details.foreignKeys.length;
        });
        return count;
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
                        onChange={(e) => setSelectedSchema(e.target.value)}
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
                            nodeColor={(node) =>
                                node.selected
                                    ? theme.palette.primary.main
                                    : alpha(theme.palette.primary.main, 0.3)
                            }
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
                                        <Tooltip title="Tree layout">
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
