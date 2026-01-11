import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import {
    Box,
    Typography,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Tooltip,
    IconButton,
    TextField,
    InputAdornment,
    Collapse,
    LinearProgress,
    Tabs,
    Tab,
    Badge,
    Drawer,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import TableChartIcon from '@mui/icons-material/TableChart';
import ViewListIcon from '@mui/icons-material/ViewList';
import SearchIcon from '@mui/icons-material/Search';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GridViewIcon from '@mui/icons-material/GridView';
import CodeIcon from '@mui/icons-material/Code';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HistoryIcon from '@mui/icons-material/History';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ReplayIcon from '@mui/icons-material/Replay';
import CloseIcon from '@mui/icons-material/Close';
import type { TableInfo, TableSchema, QueryResult, QueryHistoryEntry } from '@dbnexus/shared';
import { connectionsApi, queriesApi, schemaApi } from '../lib/api';

const SIDEBAR_WIDTH = 280;

export function QueryPage() {
    const { connectionId } = useParams();
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>(connectionId ?? '');
    const [selectedSchema, setSelectedSchema] = useState<string>('');
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
    const [tableSearch, setTableSearch] = useState('');
    const [sql, setSql] = useState('');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0); // 0: Data, 1: Structure, 2: Indexes, 3: Foreign Keys, 4: SQL
    const [confirmDangerous, setConfirmDangerous] = useState<{
        message: string;
        type: string;
    } | null>(null);
    const [schemasExpanded, setSchemasExpanded] = useState<Record<string, boolean>>({});
    const [historyOpen, setHistoryOpen] = useState(false);

    // Connections query
    const { data: connections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

    // Schemas query
    const {
        data: schemas = [],
        isLoading: schemasLoading,
        refetch: refetchSchemas,
    } = useQuery({
        queryKey: ['schemas', selectedConnectionId],
        queryFn: () => schemaApi.getSchemas(selectedConnectionId),
        enabled: !!selectedConnectionId,
    });

    // Tables query
    const {
        data: tables = [],
        isLoading: tablesLoading,
        refetch: refetchTables,
    } = useQuery({
        queryKey: ['tables', selectedConnectionId, selectedSchema],
        queryFn: () => schemaApi.getTables(selectedConnectionId, selectedSchema || undefined),
        enabled: !!selectedConnectionId,
    });

    // Table schema query
    const { data: tableSchema, isLoading: tableSchemaLoading } = useQuery({
        queryKey: ['tableSchema', selectedConnectionId, selectedTable?.schema, selectedTable?.name],
        queryFn: () =>
            schemaApi.getTableSchema(
                selectedConnectionId,
                selectedTable?.schema ?? 'public',
                selectedTable?.name ?? ''
            ),
        enabled: !!selectedConnectionId && !!selectedTable,
    });

    // Query history
    const {
        data: queryHistory = [],
        refetch: refetchHistory,
    } = useQuery({
        queryKey: ['queryHistory', selectedConnectionId],
        queryFn: () => queriesApi.getHistory(selectedConnectionId || undefined, 50),
        enabled: historyOpen,
    });

    // Clear history mutation
    const clearHistoryMutation = useMutation({
        mutationFn: () => queriesApi.clearHistory(selectedConnectionId || undefined),
        onSuccess: () => refetchHistory(),
    });

    // Set default schema when schemas load
    useEffect(() => {
        if (schemas.length > 0 && !selectedSchema) {
            const defaultSchema =
                schemas.find((s) => s === 'public') ??
                schemas.find((s) => s === 'main') ??
                schemas[0];
            if (defaultSchema) {
                setSelectedSchema(defaultSchema);
                setSchemasExpanded({ [defaultSchema]: true });
            }
        }
    }, [schemas, selectedSchema]);

    // Reset state when connection changes
    useEffect(() => {
        setSelectedSchema('');
        setSelectedTable(null);
        setResult(null);
        setError(null);
        setSql('');
    }, [selectedConnectionId]);

    // Execute mutation
    const executeMutation = useMutation({
        mutationFn: async ({ query, confirmed }: { query: string; confirmed?: boolean }) => {
            if (!selectedConnectionId) throw new Error('No connection selected');
            return queriesApi.execute(selectedConnectionId, query, confirmed);
        },
        onSuccess: (data) => {
            setResult(data);
            setError(null);
            setConfirmDangerous(null);
            // Refetch history if panel is open
            if (historyOpen) {
                refetchHistory();
            }
        },
        onError: (err: Error) => {
            try {
                const parsed = JSON.parse(err.message);
                if (parsed.requiresConfirmation) {
                    setConfirmDangerous({
                        message: parsed.message,
                        type: parsed.dangerousType,
                    });
                    return;
                }
            } catch {
                // Not a JSON error
            }
            setError(err.message);
            setResult(null);
            setConfirmDangerous(null);
        },
    });

    const handleExecute = useCallback(() => {
        if (!sql.trim()) return;
        setConfirmDangerous(null);
        executeMutation.mutate({ query: sql });
    }, [executeMutation, sql]);

    const handleConfirmDangerous = () => {
        executeMutation.mutate({ query: sql, confirmed: true });
    };

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleExecute();
            }
        },
        [handleExecute]
    );

    // Load table data when selecting a table
    const handleTableSelect = (table: TableInfo) => {
        setSelectedTable(table);
        setActiveTab(0); // Switch to Data tab
        const query =
            selectedConnection?.engine === 'sqlite'
                ? `SELECT * FROM "${table.name}" LIMIT 100;`
                : `SELECT * FROM "${table.schema}"."${table.name}" LIMIT 100;`;
        setSql(query);
        executeMutation.mutate({ query });
    };

    // Filter tables by search
    const filteredTables = tables.filter((t) =>
        t.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    // Group tables by schema
    const tablesBySchema = filteredTables.reduce(
        (acc, table) => {
            const schema = table.schema || 'main';
            if (!acc[schema]) acc[schema] = [];
            acc[schema].push(table);
            return acc;
        },
        {} as Record<string, TableInfo[]>
    );

    const handleRefresh = () => {
        refetchSchemas();
        refetchTables();
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Top Toolbar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Connection</InputLabel>
                    <Select
                        value={selectedConnectionId}
                        onChange={(e) => setSelectedConnectionId(e.target.value)}
                        label="Connection"
                    >
                        {connections.map((conn) => (
                            <MenuItem key={conn.id} value={conn.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <StorageIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                    {conn.name}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {selectedConnection && (
                    <>
                        <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                            {selectedConnection.engine === 'sqlite'
                                ? selectedConnection.database.split('/').pop()
                                : `${selectedConnection.host}/${selectedConnection.database}`}
                        </Typography>
                        <Chip
                            label={selectedConnection.engine.toUpperCase()}
                            size="small"
                            sx={{
                                fontSize: 10,
                                height: 20,
                                bgcolor: 'primary.dark',
                                color: 'primary.contrastText',
                            }}
                        />
                    </>
                )}

                <Box sx={{ flex: 1 }} />

                <Tooltip title="Query History">
                    <IconButton
                        size="small"
                        onClick={() => setHistoryOpen(true)}
                        color={historyOpen ? 'primary' : 'default'}
                    >
                        <HistoryIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Refresh">
                    <IconButton size="small" onClick={handleRefresh}>
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {/* Sidebar - Tables Tree */}
                <Box
                    sx={{
                        width: SIDEBAR_WIDTH,
                        borderRight: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: 'background.default',
                    }}
                >
                    {/* Schema Selector */}
                    {selectedConnectionId && schemas.length > 0 && (
                        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Schema</InputLabel>
                                <Select
                                    value={selectedSchema}
                                    onChange={(e) => {
                                        setSelectedSchema(e.target.value);
                                        setSchemasExpanded({ [e.target.value]: true });
                                    }}
                                    label="Schema"
                                    startAdornment={
                                        <InputAdornment position="start">
                                            <GridViewIcon
                                                fontSize="small"
                                                sx={{ color: 'primary.main' }}
                                            />
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
                        </Box>
                    )}

                    {/* Search */}
                    <Box sx={{ p: 1.5 }}>
                        <TextField
                            size="small"
                            placeholder="Search tables..."
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ opacity: 0.5 }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: 'background.paper',
                                },
                            }}
                        />
                    </Box>

                    {/* Tables List */}
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {(schemasLoading || tablesLoading) && <LinearProgress />}

                        {!selectedConnectionId && (
                            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                                <StorageIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                                <Typography variant="body2">Select a connection</Typography>
                            </Box>
                        )}

                        {selectedConnectionId &&
                            Object.keys(tablesBySchema).length === 0 &&
                            !tablesLoading && (
                                <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                                    <TableChartIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                                    <Typography variant="body2">No tables found</Typography>
                                </Box>
                            )}

                        {Object.entries(tablesBySchema).map(([schema, schemaTables]) => (
                            <Box key={schema}>
                                {/* Schema Header */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 1.5,
                                        py: 1,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' },
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                    }}
                                    onClick={() =>
                                        setSchemasExpanded((prev) => ({
                                            ...prev,
                                            [schema]: !prev[schema],
                                        }))
                                    }
                                >
                                    {schemasExpanded[schema] ? (
                                        <ExpandLessIcon fontSize="small" sx={{ mr: 0.5 }} />
                                    ) : (
                                        <ExpandMoreIcon fontSize="small" sx={{ mr: 0.5 }} />
                                    )}
                                    <GridViewIcon
                                        fontSize="small"
                                        sx={{ mr: 1, color: 'primary.main' }}
                                    />
                                    <Typography variant="body2" fontWeight={600}>
                                        {schema}
                                    </Typography>
                                    <Chip
                                        label={schemaTables.length}
                                        size="small"
                                        sx={{ ml: 'auto', height: 18, fontSize: 10 }}
                                    />
                                </Box>

                                {/* Tables in Schema */}
                                <Collapse in={schemasExpanded[schema]}>
                                    {schemaTables.map((table) => (
                                        <TableListItem
                                            key={`${table.schema}.${table.name}`}
                                            table={table}
                                            selected={
                                                selectedTable?.schema === table.schema &&
                                                selectedTable?.name === table.name
                                            }
                                            onClick={() => handleTableSelect(table)}
                                        />
                                    ))}
                                </Collapse>
                            </Box>
                        ))}
                    </Box>

                    {/* Stats Footer */}
                    {selectedConnectionId && tables.length > 0 && (
                        <Box
                            sx={{
                                p: 1.5,
                                borderTop: 1,
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                {tables.filter((t) => t.type === 'table').length} tables,{' '}
                                {tables.filter((t) => t.type === 'view').length} views
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Main Panel */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {selectedTable ? (
                        <>
                            {/* Table Header */}
                            <Box
                                sx={{
                                    px: 2,
                                    py: 1.5,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {selectedTable.type === 'view' ? (
                                        <VisibilityIcon color="secondary" />
                                    ) : (
                                        <TableChartIcon color="primary" />
                                    )}
                                    <Typography variant="h6" fontWeight={600}>
                                        {selectedTable.name}
                                    </Typography>
                                    <Chip
                                        label={selectedTable.type}
                                        size="small"
                                        color={
                                            selectedTable.type === 'view' ? 'secondary' : 'default'
                                        }
                                        sx={{ textTransform: 'uppercase', fontSize: 10 }}
                                    />
                                </Box>

                                {selectedTable.rowCount !== undefined && (
                                    <Typography variant="body2" color="text.secondary">
                                        ~{selectedTable.rowCount.toLocaleString()} rows
                                    </Typography>
                                )}

                                {selectedTable.sizeBytes !== undefined && (
                                    <Typography variant="body2" color="text.secondary">
                                        {formatBytes(selectedTable.sizeBytes)}
                                    </Typography>
                                )}

                                <Box sx={{ flex: 1 }} />

                                <Tooltip title="Run Query (⌘+Enter)">
                                    <span>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={
                                                executeMutation.isPending ? (
                                                    <CircularProgress size={16} color="inherit" />
                                                ) : (
                                                    <PlayArrowIcon />
                                                )
                                            }
                                            onClick={handleExecute}
                                            disabled={!sql.trim() || executeMutation.isPending}
                                        >
                                            Run
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Box>

                            {/* Tabs */}
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <Tabs
                                    value={activeTab}
                                    onChange={(_, v) => setActiveTab(v)}
                                    sx={{ minHeight: 40 }}
                                >
                                    <Tab
                                        label={
                                            <Badge
                                                badgeContent={result?.rowCount}
                                                color="primary"
                                                max={999}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        pr: 1,
                                                    }}
                                                >
                                                    <ViewListIcon fontSize="small" />
                                                    Data
                                                </Box>
                                            </Badge>
                                        }
                                        sx={{ minHeight: 40, textTransform: 'none' }}
                                    />
                                    <Tab
                                        label={
                                            <Badge
                                                badgeContent={tableSchema?.columns.length}
                                                color="primary"
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        pr: 1,
                                                    }}
                                                >
                                                    <GridViewIcon fontSize="small" />
                                                    Structure
                                                </Box>
                                            </Badge>
                                        }
                                        sx={{ minHeight: 40, textTransform: 'none' }}
                                    />
                                    <Tab
                                        label={
                                            <Badge
                                                badgeContent={tableSchema?.indexes.length}
                                                color="primary"
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        pr: 1,
                                                    }}
                                                >
                                                    <KeyIcon fontSize="small" />
                                                    Indexes
                                                </Box>
                                            </Badge>
                                        }
                                        sx={{ minHeight: 40, textTransform: 'none' }}
                                    />
                                    <Tab
                                        label={
                                            <Badge
                                                badgeContent={tableSchema?.foreignKeys.length}
                                                color="primary"
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        pr: 1,
                                                    }}
                                                >
                                                    <LinkIcon fontSize="small" />
                                                    Foreign Keys
                                                </Box>
                                            </Badge>
                                        }
                                        sx={{ minHeight: 40, textTransform: 'none' }}
                                    />
                                    <Tab
                                        label={
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                }}
                                            >
                                                <CodeIcon fontSize="small" />
                                                SQL
                                            </Box>
                                        }
                                        sx={{ minHeight: 40, textTransform: 'none' }}
                                    />
                                </Tabs>
                            </Box>

                            {/* Tab Content */}
                            <Box
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: 0,
                                }}
                            >
                                {/* Data Tab */}
                                {activeTab === 0 && (
                                    <DataTab
                                        result={result}
                                        error={error}
                                        loading={executeMutation.isPending}
                                        confirmDangerous={confirmDangerous}
                                        onConfirm={handleConfirmDangerous}
                                        onCancel={() => setConfirmDangerous(null)}
                                    />
                                )}

                                {/* Structure Tab */}
                                {activeTab === 1 && (
                                    <StructureTab
                                        schema={tableSchema}
                                        loading={tableSchemaLoading}
                                    />
                                )}

                                {/* Indexes Tab */}
                                {activeTab === 2 && (
                                    <IndexesTab schema={tableSchema} loading={tableSchemaLoading} />
                                )}

                                {/* Foreign Keys Tab */}
                                {activeTab === 3 && (
                                    <ForeignKeysTab
                                        schema={tableSchema}
                                        loading={tableSchemaLoading}
                                    />
                                )}

                                {/* SQL Tab */}
                                {activeTab === 4 && (
                                    <SqlTab
                                        sql={sql}
                                        onSqlChange={setSql}
                                        onExecute={handleExecute}
                                        onKeyDown={handleKeyDown}
                                        loading={executeMutation.isPending}
                                    />
                                )}
                            </Box>
                        </>
                    ) : (
                        <EmptyState connectionSelected={!!selectedConnectionId} />
                    )}
                </Box>
            </Box>

            {/* Query History Drawer */}
            <Drawer
                anchor="right"
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                PaperProps={{
                    sx: { width: 420, bgcolor: 'background.default' },
                }}
            >
                <HistoryPanel
                    history={queryHistory}
                    connections={connections}
                    onSelect={(entry) => {
                        setSql(entry.sql);
                        if (entry.connectionId && entry.connectionId !== selectedConnectionId) {
                            setSelectedConnectionId(entry.connectionId);
                        }
                        setActiveTab(4); // Switch to SQL tab
                        setHistoryOpen(false);
                    }}
                    onRerun={(entry) => {
                        setSql(entry.sql);
                        if (entry.connectionId && entry.connectionId !== selectedConnectionId) {
                            setSelectedConnectionId(entry.connectionId);
                        }
                        setActiveTab(4);
                        setHistoryOpen(false);
                        // Execute after state updates
                        setTimeout(() => {
                            executeMutation.mutate({ query: entry.sql });
                        }, 100);
                    }}
                    onClear={() => clearHistoryMutation.mutate()}
                    onClose={() => setHistoryOpen(false)}
                    onRefresh={() => refetchHistory()}
                    clearing={clearHistoryMutation.isPending}
                />
            </Drawer>
        </Box>
    );
}

// ============ Sub Components ============

function TableListItem({
    table,
    selected,
    onClick,
}: {
    table: TableInfo;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 0.75,
                pl: 4,
                cursor: 'pointer',
                bgcolor: selected ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
                borderLeft: selected ? 2 : 0,
                borderColor: 'primary.main',
            }}
            onClick={onClick}
        >
            {table.type === 'view' ? (
                <VisibilityIcon
                    fontSize="small"
                    sx={{ mr: 1, fontSize: 16, color: 'secondary.main' }}
                />
            ) : (
                <TableChartIcon
                    fontSize="small"
                    sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }}
                />
            )}
            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: selected ? 600 : 400,
                }}
            >
                {table.name}
            </Typography>
            {table.rowCount !== undefined && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {table.rowCount.toLocaleString()}
                </Typography>
            )}
        </Box>
    );
}

function DataTab({
    result,
    error,
    loading,
    confirmDangerous,
    onConfirm,
    onCancel,
}: {
    result: QueryResult | null;
    error: string | null;
    loading: boolean;
    confirmDangerous: { message: string; type: string } | null;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {loading && <LinearProgress />}

            {confirmDangerous && (
                <Alert
                    severity="warning"
                    icon={<WarningIcon />}
                    action={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button color="inherit" size="small" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button
                                color="error"
                                size="small"
                                variant="contained"
                                onClick={onConfirm}
                            >
                                Execute Anyway
                            </Button>
                        </Box>
                    }
                >
                    <Typography variant="subtitle2">Dangerous Query Detected</Typography>
                    <Typography variant="body2">{confirmDangerous.message}</Typography>
                </Alert>
            )}

            {error && (
                <Alert severity="error" icon={<ErrorIcon />} sx={{ m: 2 }}>
                    <Typography variant="subtitle2">Query Error</Typography>
                    <Typography variant="body2" fontFamily="monospace">
                        {error}
                    </Typography>
                </Alert>
            )}

            {result && (
                <>
                    {/* Stats Bar */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            px: 2,
                            py: 1,
                            bgcolor: 'background.paper',
                            borderBottom: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: 'success.main',
                            }}
                        >
                            <CheckCircleIcon fontSize="small" />
                            <Typography variant="body2">{result.rowCount} rows</Typography>
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: 'text.secondary',
                            }}
                        >
                            <AccessTimeIcon fontSize="small" />
                            <Typography variant="body2">{result.executionTimeMs}ms</Typography>
                        </Box>
                    </Box>

                    {/* Results Table */}
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {result.rows.length > 0 ? (
                            <TableContainer>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell
                                                sx={{
                                                    bgcolor: 'background.paper',
                                                    fontWeight: 600,
                                                    borderRight: 1,
                                                    borderColor: 'divider',
                                                    width: 50,
                                                }}
                                            >
                                                #
                                            </TableCell>
                                            {result.columns.map((col, i) => (
                                                <TableCell
                                                    key={i}
                                                    sx={{
                                                        bgcolor: 'background.paper',
                                                        minWidth: 120,
                                                    }}
                                                >
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {col.name}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {col.dataType}
                                                    </Typography>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {result.rows.map((row, rowIndex) => (
                                            <TableRow key={rowIndex} hover>
                                                <TableCell
                                                    sx={{
                                                        color: 'text.secondary',
                                                        borderRight: 1,
                                                        borderColor: 'divider',
                                                    }}
                                                >
                                                    {rowIndex + 1}
                                                </TableCell>
                                                {result.columns.map((col, colIndex) => (
                                                    <TableCell key={colIndex}>
                                                        <CellValue value={row[col.name]} />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                Query executed successfully. No rows returned.
                            </Box>
                        )}
                    </Box>
                </>
            )}

            {!result && !error && !loading && (
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body2">Loading data...</Typography>
                </Box>
            )}
        </Box>
    );
}

function StructureTab({ schema, loading }: { schema?: TableSchema; loading: boolean }) {
    if (loading) return <LinearProgress />;
    if (!schema) return null;

    return (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Column
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Type
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Nullable
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Default
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Key
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {schema.columns.map((col) => (
                            <TableRow key={col.name} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {col.isPrimaryKey && (
                                            <KeyIcon
                                                fontSize="small"
                                                sx={{ color: 'warning.main' }}
                                            />
                                        )}
                                        <Typography
                                            variant="body2"
                                            fontWeight={col.isPrimaryKey ? 600 : 400}
                                        >
                                            {col.name}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={col.dataType}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontFamily: 'monospace', fontSize: 11 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={col.nullable ? 'NULL' : 'NOT NULL'}
                                        size="small"
                                        color={col.nullable ? 'default' : 'primary'}
                                        sx={{ fontSize: 10 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    {col.defaultValue ? (
                                        <Typography
                                            variant="body2"
                                            fontFamily="monospace"
                                            color="text.secondary"
                                        >
                                            {col.defaultValue}
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="text.disabled">
                                            —
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {col.isPrimaryKey && (
                                            <Chip
                                                label="PK"
                                                size="small"
                                                color="warning"
                                                sx={{ fontSize: 10 }}
                                            />
                                        )}
                                        {col.isUnique && (
                                            <Chip
                                                label="UQ"
                                                size="small"
                                                color="info"
                                                sx={{ fontSize: 10 }}
                                            />
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

function IndexesTab({ schema, loading }: { schema?: TableSchema; loading: boolean }) {
    if (loading) return <LinearProgress />;
    if (!schema) return null;

    if (schema.indexes.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <KeyIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography>No indexes defined</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Name
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Columns
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Type
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Properties
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {schema.indexes.map((idx) => (
                            <TableRow key={idx.name} hover>
                                <TableCell>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {idx.name}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {idx.columns.map((col) => (
                                            <Chip
                                                key={col}
                                                label={col}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontFamily: 'monospace', fontSize: 11 }}
                                            />
                                        ))}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {idx.type || 'btree'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {idx.isPrimary && (
                                            <Chip
                                                label="PRIMARY"
                                                size="small"
                                                color="warning"
                                                sx={{ fontSize: 10 }}
                                            />
                                        )}
                                        {idx.isUnique && (
                                            <Chip
                                                label="UNIQUE"
                                                size="small"
                                                color="info"
                                                sx={{ fontSize: 10 }}
                                            />
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

function ForeignKeysTab({ schema, loading }: { schema?: TableSchema; loading: boolean }) {
    if (loading) return <LinearProgress />;
    if (!schema) return null;

    if (schema.foreignKeys.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <LinkIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography>No foreign keys defined</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Name
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Columns
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                References
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                On Delete
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                On Update
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {schema.foreignKeys.map((fk) => (
                            <TableRow key={fk.name} hover>
                                <TableCell>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {fk.name}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {fk.columns.map((col) => (
                                            <Chip
                                                key={col}
                                                label={col}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontFamily: 'monospace', fontSize: 11 }}
                                            />
                                        ))}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {fk.referencedSchema}.{fk.referencedTable}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        ({fk.referencedColumns.join(', ')})
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={fk.onDelete || 'NO ACTION'}
                                        size="small"
                                        color={fk.onDelete === 'CASCADE' ? 'error' : 'default'}
                                        sx={{ fontSize: 10 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={fk.onUpdate || 'NO ACTION'}
                                        size="small"
                                        color={fk.onUpdate === 'CASCADE' ? 'warning' : 'default'}
                                        sx={{ fontSize: 10 }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

function SqlTab({
    sql,
    onSqlChange,
    onExecute,
    onKeyDown,
    loading,
}: {
    sql: string;
    onSqlChange: (sql: string) => void;
    onExecute: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    loading: boolean;
}) {
    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1 }} onKeyDown={onKeyDown}>
                <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={sql}
                    onChange={(value) => onSqlChange(value ?? '')}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: 'JetBrains Mono, Fira Code, monospace',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                        padding: { top: 16, bottom: 16 },
                    }}
                />
            </Box>
            <Box
                sx={{
                    p: 1.5,
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'background.paper',
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    Press ⌘+Enter to execute
                </Typography>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={
                        loading ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />
                    }
                    onClick={onExecute}
                    disabled={!sql.trim() || loading}
                >
                    Run Query
                </Button>
            </Box>
        </Box>
    );
}

function EmptyState({ connectionSelected }: { connectionSelected: boolean }) {
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
            }}
        >
            <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                {connectionSelected ? (
                    <>
                        <TableChartIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Select a table
                        </Typography>
                        <Typography variant="body2">
                            Choose a table from the sidebar to view its data, structure, indexes,
                            and foreign keys.
                        </Typography>
                    </>
                ) : (
                    <>
                        <StorageIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            No connection selected
                        </Typography>
                        <Typography variant="body2">
                            Select a database connection from the dropdown above to browse tables
                            and run queries.
                        </Typography>
                    </>
                )}
            </Box>
        </Box>
    );
}

function CellValue({ value }: { value: unknown }) {
    if (value === null) {
        return (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
                NULL
            </Typography>
        );
    }

    if (typeof value === 'boolean') {
        return (
            <Chip
                label={String(value)}
                size="small"
                color={value ? 'success' : 'error'}
                sx={{ fontSize: 10 }}
            />
        );
    }

    if (typeof value === 'object') {
        const json = JSON.stringify(value);
        return (
            <Tooltip title={json}>
                <Typography
                    variant="body2"
                    color="warning.main"
                    fontFamily="monospace"
                    sx={{ maxWidth: 200, cursor: 'pointer' }}
                    noWrap
                >
                    {json.length > 50 ? json.slice(0, 50) + '...' : json}
                </Typography>
            </Tooltip>
        );
    }

    const strValue = String(value);
    if (strValue.length > 100) {
        return (
            <Tooltip title={strValue}>
                <Typography
                    variant="body2"
                    fontFamily="monospace"
                    sx={{ maxWidth: 200, cursor: 'pointer' }}
                    noWrap
                >
                    {strValue.slice(0, 100)}...
                </Typography>
            </Tooltip>
        );
    }

    return (
        <Typography variant="body2" fontFamily="monospace">
            {strValue}
        </Typography>
    );
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function HistoryPanel({
    history,
    connections,
    onSelect,
    onRerun,
    onClear,
    onClose,
    onRefresh,
    clearing,
}: {
    history: QueryHistoryEntry[];
    connections: { id: string; name: string }[];
    onSelect: (entry: QueryHistoryEntry) => void;
    onRerun: (entry: QueryHistoryEntry) => void;
    onClear: () => void;
    onClose: () => void;
    onRefresh: () => void;
    clearing: boolean;
}) {
    const getConnectionName = (connectionId: string) => {
        const conn = connections.find((c) => c.id === connectionId);
        return conn?.name ?? 'Unknown';
    };

    const formatTime = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString();
    };

    const truncateSql = (sql: string, maxLength = 150) => {
        const cleaned = sql.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= maxLength) return cleaned;
        return cleaned.slice(0, maxLength) + '...';
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <HistoryIcon color="primary" />
                <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
                    Query History
                </Typography>
                <Tooltip title="Refresh">
                    <IconButton size="small" onClick={onRefresh}>
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Clear All">
                    <IconButton
                        size="small"
                        onClick={onClear}
                        disabled={clearing || history.length === 0}
                        color="error"
                    >
                        <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* History List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {history.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <HistoryIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                        <Typography variant="body2">No query history yet</Typography>
                        <Typography variant="caption">
                            Executed queries will appear here
                        </Typography>
                    </Box>
                ) : (
                    history.map((entry) => (
                        <Box
                            key={entry.id}
                            sx={{
                                p: 2,
                                borderBottom: 1,
                                borderColor: 'divider',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                                transition: 'background-color 0.15s',
                            }}
                            onClick={() => onSelect(entry)}
                        >
                            {/* Status & Time */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                {entry.success ? (
                                    <CheckCircleIcon
                                        sx={{ fontSize: 16, color: 'success.main' }}
                                    />
                                ) : (
                                    <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                )}
                                <Typography variant="caption" color="text.secondary">
                                    {formatTime(entry.executedAt)}
                                </Typography>
                                <Box sx={{ flex: 1 }} />
                                <Chip
                                    label={getConnectionName(entry.connectionId)}
                                    size="small"
                                    sx={{ height: 18, fontSize: 10 }}
                                />
                            </Box>

                            {/* SQL Preview */}
                            <Typography
                                variant="body2"
                                fontFamily="monospace"
                                sx={{
                                    fontSize: 12,
                                    color: entry.success ? 'text.primary' : 'error.main',
                                    bgcolor: 'action.hover',
                                    p: 1,
                                    borderRadius: 0.5,
                                    mb: 1,
                                    wordBreak: 'break-all',
                                }}
                            >
                                {truncateSql(entry.sql)}
                            </Typography>

                            {/* Stats & Actions */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                }}
                            >
                                {entry.success ? (
                                    <>
                                        <Typography variant="caption" color="text.secondary">
                                            {entry.rowCount} rows
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {entry.executionTimeMs}ms
                                        </Typography>
                                    </>
                                ) : (
                                    <Typography
                                        variant="caption"
                                        color="error.main"
                                        sx={{
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {entry.error}
                                    </Typography>
                                )}
                                <Box sx={{ flex: 1 }} />
                                <Tooltip title="Run Again">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRerun(entry);
                                        }}
                                        sx={{
                                            bgcolor: 'primary.dark',
                                            '&:hover': { bgcolor: 'primary.main' },
                                        }}
                                    >
                                        <ReplayIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    ))
                )}
            </Box>

            {/* Footer Stats */}
            {history.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        borderTop: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        {history.length} queries •{' '}
                        {history.filter((h) => h.success).length} successful •{' '}
                        {history.filter((h) => !h.success).length} failed
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
