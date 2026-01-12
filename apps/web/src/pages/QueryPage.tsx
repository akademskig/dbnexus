import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Menu,
} from '@mui/material';
import {
    DataGrid,
    type GridColDef,
    type GridRenderCellParams,
    type GridRowId,
    type GridRowModel,
    type GridRowModesModel,
    GridRowModes,
    GridActionsCellItem,
} from '@mui/x-data-grid';
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddBoxIcon from '@mui/icons-material/AddBox';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import type { TableInfo, TableSchema, QueryResult, QueryHistoryEntry } from '@dbnexus/shared';
import { connectionsApi, queriesApi, schemaApi } from '../lib/api';
import { useQueryPageStore } from '../stores/queryPageStore';

const SIDEBAR_WIDTH = 280;

// Tab name mapping for URL
const TAB_NAMES = ['data', 'structure', 'indexes', 'foreignKeys', 'sql'] as const;
type TabName = (typeof TAB_NAMES)[number];

const getTabIndex = (name: string | null): number => {
    if (!name) return 0;
    const index = TAB_NAMES.indexOf(name as TabName);
    return index >= 0 ? index : 0;
};

export function QueryPage() {
    const { connectionId: routeConnectionId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Persisted state store
    const { lastState, saveState } = useQueryPageStore();

    // Get state from URL params, falling back to persisted state
    const urlSchema = searchParams.get('schema');
    const urlTable = searchParams.get('table');
    const urlTab = searchParams.get('tab');

    // Determine initial values - URL params take priority, then persisted state
    const getInitialConnectionId = () => {
        if (routeConnectionId) return routeConnectionId;
        if (lastState?.connectionId) return lastState.connectionId;
        return '';
    };

    const getInitialSchema = () => {
        if (urlSchema) return urlSchema;
        if (!routeConnectionId && lastState?.schema) return lastState.schema;
        return '';
    };

    const getInitialTab = () => {
        if (urlTab) return getTabIndex(urlTab);
        if (!routeConnectionId && lastState?.tab) return getTabIndex(lastState.tab);
        return 0;
    };

    // Local state
    const [selectedConnectionId, setSelectedConnectionId] =
        useState<string>(getInitialConnectionId());
    const [selectedSchema, setSelectedSchema] = useState<string>(getInitialSchema());
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
    const [tableSearch, setTableSearch] = useState('');
    const [sql, setSql] = useState('');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [totalRowCount, setTotalRowCount] = useState<number | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 100 });
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [confirmDangerous, setConfirmDangerous] = useState<{
        message: string;
        type: string;
    } | null>(null);
    // Default to showing selected schema expanded
    const [schemasExpanded, setSchemasExpanded] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        const schemaToExpand = urlSchema || lastState?.schema;
        if (schemaToExpand) {
            initial[schemaToExpand] = true;
        }
        return initial;
    });
    const [historyOpen, setHistoryOpen] = useState(false);

    // Edit dialogs state
    const [createTableOpen, setCreateTableOpen] = useState(false);
    const [dropTableConfirmOpen, setDropTableConfirmOpen] = useState(false);
    const [addRowOpen, setAddRowOpen] = useState(false);
    const [tableActionsAnchor, setTableActionsAnchor] = useState<null | HTMLElement>(null);

    // Restore from persisted state on mount if no URL params
    useEffect(() => {
        if (!routeConnectionId && lastState?.connectionId) {
            // Navigate to the persisted connection with its state
            const params = new URLSearchParams();
            if (lastState.schema) params.set('schema', lastState.schema);
            if (lastState.table) params.set('table', lastState.table);
            if (lastState.tab) params.set('tab', lastState.tab);
            navigate(`/query/${lastState.connectionId}?${params.toString()}`, { replace: true });
        }
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update URL when state changes
    const updateUrl = useCallback(
        (updates: { schema?: string; table?: string; tab?: number }) => {
            const newParams = new URLSearchParams(searchParams);

            if (updates.schema !== undefined) {
                if (updates.schema) {
                    newParams.set('schema', updates.schema);
                } else {
                    newParams.delete('schema');
                }
            }

            if (updates.table !== undefined) {
                if (updates.table) {
                    newParams.set('table', updates.table);
                } else {
                    newParams.delete('table');
                }
            }

            if (updates.tab !== undefined) {
                const tabName = TAB_NAMES[updates.tab];
                if (tabName) {
                    newParams.set('tab', tabName);
                }
            }

            setSearchParams(newParams, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    // Handle connection change - update URL path
    const handleConnectionChange = useCallback(
        (newConnectionId: string) => {
            setSelectedConnectionId(newConnectionId);
            // Navigate to new connection URL, preserving tab preference
            const tab = TAB_NAMES[activeTab];
            navigate(`/query/${newConnectionId}?tab=${tab}`, { replace: true });
            // Reset table selection
            setSelectedTable(null);
            setSelectedSchema('');
            setResult(null);
            setError(null);
            setSql('');
        },
        [navigate, activeTab]
    );

    // Handle schema change
    const handleSchemaChange = useCallback(
        (newSchema: string) => {
            setSelectedSchema(newSchema);
            setSchemasExpanded((prev) => ({ ...prev, [newSchema]: true }));
            updateUrl({ schema: newSchema, table: '' });
            setSelectedTable(null);
        },
        [updateUrl]
    );

    // Handle tab change
    const handleTabChange = useCallback(
        (newTab: number) => {
            setActiveTab(newTab);
            updateUrl({ tab: newTab });
        },
        [updateUrl]
    );

    // Save state to store whenever it changes (for persistence across navigation)
    useEffect(() => {
        if (selectedConnectionId) {
            saveState({
                connectionId: selectedConnectionId,
                schema: selectedSchema,
                table: selectedTable?.name ?? '',
                tab: TAB_NAMES[activeTab] ?? 'data',
            });
        }
    }, [selectedConnectionId, selectedSchema, selectedTable?.name, activeTab, saveState]);

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
    const { data: queryHistory = [], refetch: refetchHistory } = useQuery({
        queryKey: ['queryHistory', selectedConnectionId],
        queryFn: () => queriesApi.getHistory(selectedConnectionId || undefined, 50),
        enabled: historyOpen,
    });

    // Clear history mutation
    const clearHistoryMutation = useMutation({
        mutationFn: () => queriesApi.clearHistory(selectedConnectionId || undefined),
        onSuccess: () => refetchHistory(),
    });

    // Set default schema when schemas load (or restore from URL)
    useEffect(() => {
        if (schemas.length > 0 && !selectedSchema) {
            // Check if URL has a schema param
            const schemaFromUrl = urlSchema;
            if (schemaFromUrl && schemas.includes(schemaFromUrl)) {
                setSelectedSchema(schemaFromUrl);
                setSchemasExpanded({ [schemaFromUrl]: true });
            } else {
                // For MySQL/MariaDB, use the database name as the default schema
                // For PostgreSQL, use 'public' as the default
                // For SQLite, use 'main' as the default
                const engine = selectedConnection?.engine;
                let defaultSchema: string | undefined;
                
                if (engine === 'mysql' || engine === 'mariadb') {
                    // MySQL: database name is the schema
                    defaultSchema = selectedConnection?.database && schemas.includes(selectedConnection.database)
                        ? selectedConnection.database
                        : schemas[0];
                } else {
                    // PostgreSQL/SQLite: use defaultSchema setting or common defaults
                    defaultSchema =
                        (selectedConnection?.defaultSchema &&
                            schemas.includes(selectedConnection.defaultSchema)
                            ? selectedConnection.defaultSchema
                            : null) ??
                        schemas.find((s) => s === 'public') ??
                        schemas.find((s) => s === 'main') ??
                        schemas[0];
                }
                
                if (defaultSchema) {
                    setSelectedSchema(defaultSchema);
                    setSchemasExpanded({ [defaultSchema]: true });
                    updateUrl({ schema: defaultSchema });
                }
            }
        }
    }, [schemas, selectedSchema, urlSchema, updateUrl, selectedConnection?.defaultSchema, selectedConnection?.engine, selectedConnection?.database]);

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

    // Restore table selection from URL or persisted state when tables load
    useEffect(() => {
        if (tables.length > 0 && !selectedTable) {
            // Try URL table first, then persisted state
            const tableNameToRestore = urlTable || lastState?.table;
            const schemaToMatch = urlSchema || lastState?.schema;

            if (tableNameToRestore) {
                const tableToRestore = tables.find(
                    (t) =>
                        t.name === tableNameToRestore &&
                        (!schemaToMatch || t.schema === schemaToMatch)
                );
                if (tableToRestore) {
                    handleTableSelect(tableToRestore);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tables, urlTable, urlSchema, selectedTable]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleExecute();
            }
        },
        [handleExecute]
    );

    // Fetch data with pagination and optional search
    const fetchTableData = useCallback(
        (
            table: TableInfo,
            page: number,
            pageSize: number,
            search?: string,
            schema?: TableSchema | null
        ) => {
            const offset = page * pageSize;
            const tableName =
                selectedConnection?.engine === 'sqlite'
                    ? `"${table.name}"`
                    : `"${table.schema}"."${table.name}"`;

            let query: string;
            if (search && search.trim() && schema?.columns.length) {
                // Build a WHERE clause that searches across all text-like columns
                const searchTerm = search.replaceAll("'", "''"); // Escape single quotes
                const textTypes = [
                    'text',
                    'varchar',
                    'char',
                    'character varying',
                    'character',
                    'name',
                    'citext',
                    'uuid',
                ];
                const searchableColumns = schema.columns.filter(
                    (col) =>
                        textTypes.some((t) => col.dataType.toLowerCase().includes(t)) ||
                        col.dataType.toLowerCase().includes('text')
                );

                if (searchableColumns.length > 0) {
                    const conditions = searchableColumns.map((col) => {
                        if (selectedConnection?.engine === 'sqlite') {
                            return `"${col.name}" LIKE '%${searchTerm}%'`;
                        } else {
                            return `"${col.name}"::text ILIKE '%${searchTerm}%'`;
                        }
                    });
                    query = `SELECT * FROM ${tableName} WHERE ${conditions.join(' OR ')} LIMIT ${pageSize} OFFSET ${offset};`;
                } else {
                    // No text columns, just do regular query
                    query = `SELECT * FROM ${tableName} LIMIT ${pageSize} OFFSET ${offset};`;
                }
            } else {
                query = `SELECT * FROM ${tableName} LIMIT ${pageSize} OFFSET ${offset};`;
            }
            setSql(query);
            executeMutation.mutate({ query });
        },
        [selectedConnection?.engine, executeMutation]
    );

    // Load table data when selecting a table
    const handleTableSelect = useCallback(
        async (table: TableInfo) => {
            setSelectedTable(table);
            setTotalRowCount(null); // Reset while loading
            setPaginationModel({ page: 0, pageSize: 100 }); // Reset to first page
            setSearchQuery(''); // Reset search when selecting new table
            // Update URL with table (keep current tab)
            updateUrl({ table: table.name });

            // Fetch total row count in background
            try {
                const { count } = await schemaApi.getTableRowCount(
                    selectedConnectionId,
                    table.schema || 'main',
                    table.name
                );
                setTotalRowCount(count);
            } catch {
                // Fallback to unknown count
                setTotalRowCount(null);
            }

            // Fetch first page of data
            fetchTableData(table, 0, 100);
        },
        [selectedConnectionId, updateUrl, fetchTableData]
    );

    // Handle pagination change
    const handlePaginationChange = useCallback(
        (newModel: { page: number; pageSize: number }) => {
            setPaginationModel(newModel);
            if (selectedTable) {
                fetchTableData(
                    selectedTable,
                    newModel.page,
                    newModel.pageSize,
                    searchQuery,
                    tableSchema
                );
            }
        },
        [selectedTable, fetchTableData, searchQuery, tableSchema]
    );

    // Handle search
    const handleSearch = useCallback(
        async (query: string) => {
            setSearchQuery(query);
            setPaginationModel((prev) => ({ ...prev, page: 0 })); // Reset to first page

            if (selectedTable) {
                // If searching, we need to get a new count
                if (query.trim()) {
                    // For search, we don't know the exact count without running COUNT with WHERE
                    // For now, set to null to indicate unknown
                    setTotalRowCount(null);
                } else {
                    // Restore original count
                    try {
                        const { count } = await schemaApi.getTableRowCount(
                            selectedConnectionId,
                            selectedTable.schema || 'main',
                            selectedTable.name
                        );
                        setTotalRowCount(count);
                    } catch {
                        setTotalRowCount(null);
                    }
                }
                fetchTableData(selectedTable, 0, paginationModel.pageSize, query, tableSchema);
            }
        },
        [selectedTable, selectedConnectionId, fetchTableData, paginationModel.pageSize, tableSchema]
    );

    // Filter tables by search
    const filteredTables = tables.filter((t) =>
        t.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    // Group tables by schema
    const tablesBySchema = filteredTables.reduce(
        (acc, table) => {
            const schema = table.schema || 'main';
            acc[schema] ??= [];
            acc[schema]!.push(table);
            return acc;
        },
        {} as Record<string, TableInfo[]>
    );

    const handleRefresh = () => {
        refetchSchemas();
        refetchTables();
    };

    // Handle drop table
    const handleDropTable = useCallback(() => {
        if (!selectedTable || !selectedConnectionId) return;

        const tableName =
            selectedConnection?.engine === 'sqlite'
                ? `"${selectedTable.name}"`
                : `"${selectedTable.schema}"."${selectedTable.name}"`;

        const query = `DROP TABLE ${tableName};`;
        setSql(query);
        // Pass confirmed: true since we already have our own confirmation dialog
        executeMutation.mutate(
            { query, confirmed: true },
            {
                onSuccess: () => {
                    setSelectedTable(null);
                    setResult(null);
                    refetchTables();
                    setDropTableConfirmOpen(false);
                },
            }
        );
    }, [selectedTable, selectedConnectionId, selectedConnection?.engine, executeMutation, refetchTables]);

    // Handle add row
    const handleAddRow = useCallback(
        (values: Record<string, string>) => {
            if (!selectedTable || !selectedConnectionId || !tableSchema) return;

            const tableName =
                selectedConnection?.engine === 'sqlite'
                    ? `"${selectedTable.name}"`
                    : `"${selectedTable.schema}"."${selectedTable.name}"`;

            const columns = Object.keys(values).filter((k) => values[k] !== '');
            const vals = columns.map((k) => {
                const col = tableSchema.columns.find((c) => c.name === k);
                const val = values[k] ?? '';
                // Quote strings, leave numbers unquoted
                if (
                    col?.dataType.toLowerCase().includes('int') ||
                    col?.dataType.toLowerCase().includes('numeric') ||
                    col?.dataType.toLowerCase().includes('decimal') ||
                    col?.dataType.toLowerCase().includes('float') ||
                    col?.dataType.toLowerCase().includes('double') ||
                    col?.dataType.toLowerCase().includes('real')
                ) {
                    return val;
                }
                return `'${val.replaceAll("'", "''")}'`;
            });

            const query = `INSERT INTO ${tableName} (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`;
            setSql(query);
            executeMutation.mutate(
                { query },
                {
                    onSuccess: () => {
                        setAddRowOpen(false);
                        // Refresh data
                        if (selectedTable) {
                            fetchTableData(selectedTable, paginationModel.page, paginationModel.pageSize, searchQuery, tableSchema);
                        }
                    },
                }
            );
        },
        [selectedTable, selectedConnectionId, selectedConnection?.engine, tableSchema, executeMutation, fetchTableData, paginationModel, searchQuery]
    );

    // Handle create table
    const handleCreateTable = useCallback(
        (tableName: string, columns: Array<{ name: string; type: string; nullable: boolean; primaryKey: boolean }>) => {
            if (!selectedConnectionId) return;

            const schema = selectedSchema || 'public';
            const fullTableName =
                selectedConnection?.engine === 'sqlite'
                    ? `"${tableName}"`
                    : `"${schema}"."${tableName}"`;

            const columnDefs = columns.map((col) => {
                let def = `"${col.name}" ${col.type}`;
                if (col.primaryKey) def += ' PRIMARY KEY';
                if (!col.nullable && !col.primaryKey) def += ' NOT NULL';
                return def;
            });

            const query = `CREATE TABLE ${fullTableName} (\n  ${columnDefs.join(',\n  ')}\n);`;
            setSql(query);
            executeMutation.mutate(
                { query },
                {
                    onSuccess: () => {
                        setCreateTableOpen(false);
                        refetchTables();
                    },
                }
            );
        },
        [selectedConnectionId, selectedConnection?.engine, selectedSchema, executeMutation, refetchTables]
    );

    // Helper function to format value for SQL
    const formatSqlValue = useCallback((value: unknown, colName: string): string => {
        if (value === null || value === undefined) return 'NULL';

        const col = tableSchema?.columns.find((c) => c.name === colName);
        const dataType = col?.dataType.toLowerCase() || '';

        // Check if it's a numeric type
        if (
            dataType.includes('int') ||
            dataType.includes('numeric') ||
            dataType.includes('decimal') ||
            dataType.includes('float') ||
            dataType.includes('double') ||
            dataType.includes('real')
        ) {
            return String(value);
        }

        // Check if it's a boolean type
        if (dataType.includes('bool')) {
            return String(value);
        }

        // Check if it's a JSON type - stringify the object
        if (dataType.includes('json') || dataType.includes('jsonb')) {
            const jsonStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return `'${jsonStr.replaceAll("'", "''")}'`;
        }

        // If value is an object (shouldn't happen for non-JSON, but handle it)
        if (typeof value === 'object') {
            const jsonStr = JSON.stringify(value);
            return `'${jsonStr.replaceAll("'", "''")}'`;
        }

        // String type - escape single quotes
        return `'${String(value).replaceAll("'", "''")}'`;
    }, [tableSchema]);

    // Handle update row (inline editing)
    const handleUpdateRow = useCallback(
        async (oldRow: Record<string, unknown>, newRow: Record<string, unknown>) => {
            if (!selectedTable || !selectedConnectionId || !tableSchema) return;

            const tableName =
                selectedConnection?.engine === 'sqlite'
                    ? `"${selectedTable.name}"`
                    : `"${selectedTable.schema}"."${selectedTable.name}"`;

            // Get primary key columns
            const pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
            if (pkColumns.length === 0) {
                throw new Error('Cannot update row: no primary key defined');
            }

            // Build SET clause - only include changed columns
            const changes: string[] = [];
            for (const key of Object.keys(newRow)) {
                if (key === 'id') continue; // Skip our internal id
                // Deep comparison for objects (JSON)
                const oldVal = oldRow[key];
                const newVal = newRow[key];
                const hasChanged = typeof oldVal === 'object' || typeof newVal === 'object'
                    ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
                    : oldVal !== newVal;
                if (hasChanged) {
                    changes.push(`"${key}" = ${formatSqlValue(newVal, key)}`);
                }
            }

            if (changes.length === 0) {
                return; // No changes
            }

            // Build WHERE clause using primary key
            const whereConditions = pkColumns.map(
                (pk) => `"${pk}" = ${formatSqlValue(oldRow[pk], pk)}`
            );

            const query = `UPDATE ${tableName} SET ${changes.join(', ')} WHERE ${whereConditions.join(' AND ')};`;
            setSql(query);

            return new Promise<void>((resolve, reject) => {
                executeMutation.mutate(
                    { query, confirmed: true },
                    {
                        onSuccess: () => {
                            // Refresh data
                            if (selectedTable) {
                                fetchTableData(selectedTable, paginationModel.page, paginationModel.pageSize, searchQuery, tableSchema);
                            }
                            resolve();
                        },
                        onError: (err) => {
                            reject(err);
                        },
                    }
                );
            });
        },
        [selectedTable, selectedConnectionId, selectedConnection?.engine, tableSchema, executeMutation, fetchTableData, paginationModel, searchQuery, formatSqlValue]
    );

    // Handle delete row
    const handleDeleteRow = useCallback(
        (row: Record<string, unknown>) => {
            if (!selectedTable || !selectedConnectionId || !tableSchema) return;

            const tableName =
                selectedConnection?.engine === 'sqlite'
                    ? `"${selectedTable.name}"`
                    : `"${selectedTable.schema}"."${selectedTable.name}"`;

            // Get primary key columns
            const pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
            if (pkColumns.length === 0) {
                setError('Cannot delete row: no primary key defined');
                return;
            }

            // Build WHERE clause using primary key
            const whereConditions = pkColumns.map(
                (pk) => `"${pk}" = ${formatSqlValue(row[pk], pk)}`
            );

            const query = `DELETE FROM ${tableName} WHERE ${whereConditions.join(' AND ')};`;
            setSql(query);
            executeMutation.mutate(
                { query, confirmed: true },
                {
                    onSuccess: () => {
                        // Refresh data
                        if (selectedTable) {
                            fetchTableData(selectedTable, paginationModel.page, paginationModel.pageSize, searchQuery, tableSchema);
                        }
                        // Update row count
                        if (totalRowCount !== null) {
                            setTotalRowCount(totalRowCount - 1);
                        }
                    },
                }
            );
        },
        [selectedTable, selectedConnectionId, selectedConnection?.engine, tableSchema, executeMutation, fetchTableData, paginationModel, searchQuery, formatSqlValue, totalRowCount]
    );

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
                        onChange={(e) => handleConnectionChange(e.target.value)}
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
                                    onChange={(e) => handleSchemaChange(e.target.value)}
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

                    {/* Search and Create Table */}
                    <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
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
                        <Tooltip title="Create Table">
                            <IconButton
                                size="small"
                                onClick={() => setCreateTableOpen(true)}
                                disabled={!selectedConnectionId}
                                sx={{ bgcolor: 'background.paper' }}
                            >
                                <AddBoxIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
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

                                {/* Table Actions */}
                                {selectedTable.type !== 'view' && (
                                    <>
                                        <Tooltip title="Add Row">
                                            <IconButton
                                                size="small"
                                                onClick={() => setAddRowOpen(true)}
                                                disabled={!tableSchema}
                                            >
                                                <AddIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Table Actions">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => setTableActionsAnchor(e.currentTarget)}
                                            >
                                                <MoreVertIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Menu
                                            anchorEl={tableActionsAnchor}
                                            open={Boolean(tableActionsAnchor)}
                                            onClose={() => setTableActionsAnchor(null)}
                                        >
                                            <MenuItem
                                                onClick={() => {
                                                    setTableActionsAnchor(null);
                                                    setDropTableConfirmOpen(true);
                                                }}
                                                sx={{ color: 'error.main' }}
                                            >
                                                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                                                Drop Table
                                            </MenuItem>
                                        </Menu>
                                    </>
                                )}

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
                                    onChange={(_, v) => handleTabChange(v)}
                                    sx={{ minHeight: 48 }}
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
                                        sx={{ minHeight: 48, textTransform: 'none' }}
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
                                        sx={{ minHeight: 48, textTransform: 'none' }}
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
                                        totalRowCount={totalRowCount}
                                        paginationModel={paginationModel}
                                        onPaginationChange={handlePaginationChange}
                                        onSearch={handleSearch}
                                        searchQuery={searchQuery}
                                        tableSchema={tableSchema}
                                        onUpdateRow={handleUpdateRow}
                                        onDeleteRow={handleDeleteRow}
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
                            handleConnectionChange(entry.connectionId);
                        }
                        handleTabChange(4); // Switch to SQL tab
                        setHistoryOpen(false);
                    }}
                    onRerun={(entry) => {
                        setSql(entry.sql);
                        if (entry.connectionId && entry.connectionId !== selectedConnectionId) {
                            handleConnectionChange(entry.connectionId);
                        }
                        handleTabChange(4);
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

            {/* Create Table Dialog */}
            <CreateTableDialog
                open={createTableOpen}
                onClose={() => setCreateTableOpen(false)}
                onSubmit={handleCreateTable}
                engine={selectedConnection?.engine || 'postgres'}
            />

            {/* Drop Table Confirmation Dialog */}
            <Dialog
                open={dropTableConfirmOpen}
                onClose={() => setDropTableConfirmOpen(false)}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="error" />
                    Drop Table
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to drop the table{' '}
                        <strong>{selectedTable?.name}</strong>? This action cannot be undone
                        and all data will be permanently deleted.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDropTableConfirmOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDropTable}
                        disabled={executeMutation.isPending}
                    >
                        Drop Table
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Row Dialog */}
            <AddRowDialog
                open={addRowOpen}
                onClose={() => setAddRowOpen(false)}
                onSubmit={handleAddRow}
                columns={tableSchema?.columns || []}
                tableName={selectedTable?.name || ''}
            />
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
    totalRowCount,
    paginationModel,
    onPaginationChange,
    onSearch,
    searchQuery,
    tableSchema,
    onUpdateRow,
    onDeleteRow,
}: {
    result: QueryResult | null;
    error: string | null;
    loading: boolean;
    confirmDangerous: { message: string; type: string } | null;
    onConfirm: () => void;
    onCancel: () => void;
    totalRowCount: number | null;
    paginationModel: { page: number; pageSize: number };
    onPaginationChange: (model: { page: number; pageSize: number }) => void;
    onSearch: (query: string) => void;
    searchQuery: string;
    tableSchema?: TableSchema;
    onUpdateRow?: (oldRow: Record<string, unknown>, newRow: Record<string, unknown>) => Promise<void>;
    onDeleteRow?: (row: Record<string, unknown>) => void;
}) {
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
    const [deleteConfirmRow, setDeleteConfirmRow] = useState<Record<string, unknown> | null>(null);

    // Get primary key columns for identifying rows
    const primaryKeyColumns = tableSchema?.columns.filter((c) => c.isPrimaryKey).map((c) => c.name) || [];
    // Show edit/delete actions if callbacks are provided (we'll disable edit if no PK)
    const hasActionColumn = !!(onUpdateRow || onDeleteRow);
    // Can only edit/delete if we have primary keys to identify rows
    const canEditRows = primaryKeyColumns.length > 0;

    const handleEditClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
    };

    const handleSaveClick = (id: GridRowId) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    };

    const handleCancelClick = (id: GridRowId) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: GridRowModes.View, ignoreModifications: true },
        });
    };

    const handleDeleteClick = (row: Record<string, unknown>) => () => {
        setDeleteConfirmRow(row);
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmRow && onDeleteRow) {
            onDeleteRow(deleteConfirmRow);
        }
        setDeleteConfirmRow(null);
    };

    const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
        if (onUpdateRow) {
            await onUpdateRow(oldRow as Record<string, unknown>, newRow as Record<string, unknown>);
        }
        return newRow;
    };

    const handleProcessRowUpdateError = (err: Error) => {
        console.error('Row update error:', err);
    };

    // Check if a column type is JSON-like
    const isJsonColumn = (dataType: string): boolean => {
        const lower = dataType.toLowerCase();
        return lower.includes('json') || lower.includes('jsonb');
    };

    // Handle JSON save from cell viewer
    const handleJsonCellSave = (row: Record<string, unknown>, field: string, newValue: unknown) => {
        if (!onUpdateRow) return;
        const newRow = { ...row, [field]: newValue };
        onUpdateRow(row, newRow);
    };

    // Convert result to DataGrid format
    const dataColumns: GridColDef[] = result
        ? result.columns.map((col) => {
            const isPrimaryKey = primaryKeyColumns.includes(col.name);
            const isJson = isJsonColumn(col.dataType);
            // JSON columns are edited via dialog, not inline; PK columns are not editable
            const isEditable = canEditRows && !isPrimaryKey && !isJson;
            // JSON columns can be edited via dialog if we have edit capability
            const canEditJson = canEditRows && !isPrimaryKey && isJson;

            return {
                field: col.name,
                headerName: col.name,
                description: col.dataType,
                flex: 1,
                minWidth: 120,
                editable: isEditable,
                renderCell: (params: GridRenderCellParams) => (
                    <CellValue
                        value={params.value}
                        onSaveJson={canEditJson ? (newValue) => handleJsonCellSave(params.row as Record<string, unknown>, col.name, newValue) : undefined}
                    />
                ),
                renderHeader: () => (
                    <Box>
                        <Typography variant="body2" fontWeight={600}>
                            {col.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {col.dataType}
                        </Typography>
                    </Box>
                ),
            };
        })
        : [];

    // Add actions column if callbacks are provided
    const columns: GridColDef[] = hasActionColumn
        ? [
            ...dataColumns,
            {
                field: 'actions',
                type: 'actions',
                headerName: '',
                width: 100,
                cellClassName: 'actions',
                getActions: ({ id, row }) => {
                    const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

                    if (isInEditMode) {
                        return [
                            <GridActionsCellItem
                                key="save"
                                icon={<SaveIcon />}
                                label="Save"
                                sx={{ color: 'success.main' }}
                                onClick={handleSaveClick(id)}
                            />,
                            <GridActionsCellItem
                                key="cancel"
                                icon={<CancelIcon />}
                                label="Cancel"
                                onClick={handleCancelClick(id)}
                                color="inherit"
                            />,
                        ];
                    }

                    // Show edit/delete buttons, but disable if no primary key
                    return [
                        <GridActionsCellItem
                            key="edit"
                            icon={<EditIcon />}
                            label={canEditRows ? "Edit" : "Edit (no primary key)"}
                            onClick={handleEditClick(id)}
                            color="inherit"
                            disabled={!canEditRows}
                        />,
                        <GridActionsCellItem
                            key="delete"
                            icon={<DeleteIcon />}
                            label={canEditRows ? "Delete" : "Delete (no primary key)"}
                            onClick={handleDeleteClick(row as Record<string, unknown>)}
                            color="inherit"
                            disabled={!canEditRows}
                        />,
                    ];
                },
            },
        ]
        : dataColumns;

    const rows = result
        ? result.rows.map((row, index) => ({
            id: index,
            ...row,
        }))
        : [];

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
                    {/* Stats Bar with Search */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            px: 2,
                            minHeight: 48,
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
                            <Typography variant="body2">
                                {totalRowCount !== null
                                    ? `${totalRowCount.toLocaleString()} rows`
                                    : `${result.rowCount} rows`}
                            </Typography>
                        </Box>
                        {totalRowCount !== null && totalRowCount > paginationModel.pageSize && (
                            <Typography variant="body2" color="text.secondary">
                                {paginationModel.page * paginationModel.pageSize + 1}-
                                {Math.min(
                                    (paginationModel.page + 1) * paginationModel.pageSize,
                                    totalRowCount
                                )}
                            </Typography>
                        )}
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

                        {/* Search */}
                        <Box sx={{ flex: 1 }} />
                        <TextField
                            size="small"
                            placeholder="Search in data... (press Enter)"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onSearch(localSearch);
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: localSearch && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setLocalSearch('');
                                                onSearch('');
                                            }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                width: 200,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: 'background.default',
                                    height: 32,
                                },
                                '& .MuiOutlinedInput-input': {
                                    py: 0.5,
                                },
                            }}
                        />
                        {searchQuery && (
                            <Chip
                                label={`Filtered: "${searchQuery}"`}
                                size="small"
                                onDelete={() => {
                                    setLocalSearch('');
                                    onSearch('');
                                }}
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Box>

                    {/* Results DataGrid */}
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        {result.rows.length > 0 ? (
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                density="compact"
                                disableRowSelectionOnClick
                                loading={loading}
                                paginationMode={totalRowCount !== null ? 'server' : 'client'}
                                rowCount={totalRowCount ?? result.rowCount}
                                paginationModel={paginationModel}
                                onPaginationModelChange={onPaginationChange}
                                pageSizeOptions={[50, 100, 250, 500]}
                                editMode="row"
                                rowModesModel={rowModesModel}
                                onRowModesModelChange={setRowModesModel}
                                processRowUpdate={processRowUpdate}
                                onProcessRowUpdateError={handleProcessRowUpdateError}
                                sx={{
                                    border: 'none',
                                    borderRadius: 0,
                                    '& .MuiDataGrid-cell': {
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                    },
                                    '& .MuiDataGrid-columnHeaders': {
                                        bgcolor: 'background.paper',
                                        borderRadius: 0,
                                    },
                                    '& .MuiDataGrid-columnHeader': {
                                        '&:focus': {
                                            outline: 'none',
                                        },
                                    },
                                    '& .MuiDataGrid-cell:focus': {
                                        outline: 'none',
                                    },
                                    '& .MuiDataGrid-row:hover': {
                                        bgcolor: 'action.hover',
                                    },
                                    '& .MuiDataGrid-footerContainer': {
                                        borderRadius: 0,
                                    },
                                    '& .MuiDataGrid-cell--editing': {
                                        bgcolor: 'action.selected',
                                    },
                                }}
                            />
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

            {/* Delete Row Confirmation Dialog */}
            <Dialog open={!!deleteConfirmRow} onClose={() => setDeleteConfirmRow(null)}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="error" />
                    Delete Row
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this row? This action cannot be undone.
                    </Typography>
                    {deleteConfirmRow && primaryKeyColumns.length > 0 && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                Row identifier:
                            </Typography>
                            {primaryKeyColumns.map((pk) => (
                                <Typography key={pk} variant="body2" fontFamily="monospace">
                                    {pk}: {String(deleteConfirmRow[pk])}
                                </Typography>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmRow(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleConfirmDelete}>
                        Delete Row
                    </Button>
                </DialogActions>
            </Dialog>

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
                        {schema.indexes.map((idx, index) => {
                            const columns = Array.isArray(idx.columns) ? idx.columns : [];
                            return (
                                <TableRow key={idx.name || index} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {idx.name || `idx_${index}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {columns.map((col) => (
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
                            );
                        })}
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
                        {schema.foreignKeys.map((fk, index) => {
                            // Ensure columns are arrays (handle edge cases from different DB drivers)
                            const columns = Array.isArray(fk.columns) ? fk.columns : [];
                            const referencedColumns = Array.isArray(fk.referencedColumns)
                                ? fk.referencedColumns
                                : [];

                            return (
                                <TableRow key={fk.name || index} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {fk.name || `fk_${index}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {columns.map((col) => (
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
                                            ({referencedColumns.join(', ')})
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
                                            color={
                                                fk.onUpdate === 'CASCADE' ? 'warning' : 'default'
                                            }
                                            sx={{ fontSize: 10 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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

function CellValue({ value, onSaveJson }: { value: unknown; onSaveJson?: (newValue: unknown) => void }) {
    const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

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

    // Check if value is JSON object/array or a JSON string
    const isJsonObject = typeof value === 'object';
    let parsedJson: unknown = null;
    let isJsonString = false;

    if (typeof value === 'string') {
        try {
            const trimmed = value.trim();
            if (
                (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))
            ) {
                parsedJson = JSON.parse(value);
                isJsonString = true;
            }
        } catch {
            // Not valid JSON
        }
    }

    if (isJsonObject || isJsonString) {
        const jsonValue = isJsonObject ? value : parsedJson;
        const jsonPreview = JSON.stringify(jsonValue);
        const formattedJson = JSON.stringify(jsonValue, null, 2);

        const handleOpen = (e: React.MouseEvent) => {
            e.stopPropagation();
            setJsonDialogOpen(true);
            setIsEditing(false);
            setEditValue(formattedJson);
            setJsonError(null);
        };

        const handleClose = () => {
            setJsonDialogOpen(false);
            setIsEditing(false);
            setJsonError(null);
        };

        const handleStartEdit = () => {
            setIsEditing(true);
            setEditValue(formattedJson);
        };

        const handleCancelEdit = () => {
            setIsEditing(false);
            setEditValue(formattedJson);
            setJsonError(null);
        };

        const handleSave = () => {
            try {
                const parsed = JSON.parse(editValue);
                if (onSaveJson) {
                    onSaveJson(parsed);
                }
                setJsonDialogOpen(false);
                setIsEditing(false);
            } catch (e) {
                setJsonError('Invalid JSON: ' + (e as Error).message);
            }
        };

        return (
            <>
                <Box
                    onClick={handleOpen}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                    }}
                >
                    <CodeIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                    <Typography
                        variant="body2"
                        color="warning.main"
                        fontFamily="monospace"
                        sx={{ maxWidth: 180 }}
                        noWrap
                    >
                        {jsonPreview.length > 40 ? jsonPreview.slice(0, 40) + '...' : jsonPreview}
                    </Typography>
                </Box>

                {/* JSON Viewer/Editor Dialog */}
                <Dialog
                    open={jsonDialogOpen}
                    onClose={handleClose}
                    maxWidth={false}
                    PaperProps={{
                        sx: {
                            width: '60vw',
                            maxWidth: '900px',
                            minWidth: '400px',
                            height: '70vh',
                            maxHeight: '800px',
                            minHeight: '300px',
                            resize: 'both',
                            overflow: 'auto',
                        },
                    }}
                >
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon color="warning" />
                        {isEditing ? 'Edit JSON' : 'JSON Viewer'}
                        <Box sx={{ flex: 1 }} />
                        {!isEditing && (
                            <>
                                {onSaveJson && (
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={handleStartEdit} sx={{ mr: 1 }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <Tooltip title="Copy to clipboard">
                                    <IconButton
                                        size="small"
                                        onClick={() => navigator.clipboard.writeText(formattedJson)}
                                        sx={{ mr: 1 }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        {jsonError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {jsonError}
                            </Alert>
                        )}
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                value={isEditing ? editValue : formattedJson}
                                onChange={(val) => setEditValue(val ?? '')}
                                theme="vs-dark"
                                options={{
                                    readOnly: !isEditing,
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 2,
                                    wordWrap: 'on',
                                }}
                            />
                        </Box>
                    </DialogContent>
                    {isEditing && (
                        <DialogActions>
                            <Button onClick={handleCancelEdit}>Cancel</Button>
                            <Button variant="contained" onClick={handleSave}>
                                Save
                            </Button>
                        </DialogActions>
                    )}
                </Dialog>
            </>
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
                        <Typography variant="caption">Executed queries will appear here</Typography>
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
                                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
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
                        {history.length} queries • {history.filter((h) => h.success).length}{' '}
                        successful • {history.filter((h) => !h.success).length} failed
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

// ============ Create Table Dialog ============

interface ColumnDefinition {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
}

const COMMON_TYPES = {
    postgres: [
        'INTEGER',
        'BIGINT',
        'SERIAL',
        'BIGSERIAL',
        'VARCHAR(255)',
        'TEXT',
        'BOOLEAN',
        'TIMESTAMP',
        'TIMESTAMPTZ',
        'DATE',
        'NUMERIC',
        'REAL',
        'DOUBLE PRECISION',
        'UUID',
        'JSONB',
        'JSON',
    ],
    sqlite: [
        'INTEGER',
        'TEXT',
        'REAL',
        'BLOB',
        'NUMERIC',
    ],
};

function CreateTableDialog({
    open,
    onClose,
    onSubmit,
    engine,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (tableName: string, columns: ColumnDefinition[]) => void;
    engine: string;
}) {
    const [tableName, setTableName] = useState('');
    const [columns, setColumns] = useState<ColumnDefinition[]>([
        { name: 'id', type: engine === 'sqlite' ? 'INTEGER' : 'SERIAL', nullable: false, primaryKey: true },
    ]);

    const types = engine === 'sqlite' ? COMMON_TYPES.sqlite : COMMON_TYPES.postgres;

    const handleAddColumn = () => {
        setColumns([...columns, { name: '', type: types[0] ?? 'TEXT', nullable: true, primaryKey: false }]);
    };

    const handleRemoveColumn = (index: number) => {
        setColumns(columns.filter((_, i) => i !== index));
    };

    const handleColumnChange = (index: number, field: keyof ColumnDefinition, value: string | boolean) => {
        const newColumns = [...columns];
        const currentCol = newColumns[index];
        if (currentCol) {
            newColumns[index] = { ...currentCol, [field]: value };
            // If setting primary key, unset others
            if (field === 'primaryKey' && value === true) {
                newColumns.forEach((col, i) => {
                    if (i !== index) col.primaryKey = false;
                });
            }
        }
        setColumns(newColumns);
    };

    const handleSubmit = () => {
        if (!tableName.trim() || columns.length === 0) return;
        onSubmit(tableName, columns.filter((c) => c.name.trim()));
        // Reset form
        setTableName('');
        setColumns([{ name: 'id', type: engine === 'sqlite' ? 'INTEGER' : 'SERIAL', nullable: false, primaryKey: true }]);
    };

    const handleClose = () => {
        setTableName('');
        setColumns([{ name: 'id', type: engine === 'sqlite' ? 'INTEGER' : 'SERIAL', nullable: false, primaryKey: true }]);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Create Table</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Table Name"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        fullWidth
                        size="small"
                        autoFocus
                    />

                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Columns
                    </Typography>

                    {columns.map((col, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                label="Name"
                                value={col.name}
                                onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={col.type}
                                    onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                                    label="Type"
                                >
                                    {types.map((t) => (
                                        <MenuItem key={t} value={t}>
                                            {t}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Tooltip title="Primary Key">
                                <IconButton
                                    size="small"
                                    onClick={() => handleColumnChange(index, 'primaryKey', !col.primaryKey)}
                                    color={col.primaryKey ? 'primary' : 'default'}
                                >
                                    <KeyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={col.nullable ? 'Nullable' : 'Not Null'}>
                                <Chip
                                    label={col.nullable ? 'NULL' : 'NOT NULL'}
                                    size="small"
                                    onClick={() => handleColumnChange(index, 'nullable', !col.nullable)}
                                    color={col.nullable ? 'default' : 'warning'}
                                    sx={{ minWidth: 80 }}
                                />
                            </Tooltip>
                            <IconButton
                                size="small"
                                onClick={() => handleRemoveColumn(index)}
                                disabled={columns.length === 1}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}

                    <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddColumn}
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        Add Column
                    </Button>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!tableName.trim() || columns.filter((c) => c.name.trim()).length === 0}
                >
                    Create Table
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ============ Add Row Dialog ============

function AddRowDialog({
    open,
    onClose,
    onSubmit,
    columns,
    tableName,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (values: Record<string, string>) => void;
    columns: Array<{ name: string; dataType: string; nullable: boolean; defaultValue?: string | null }>;
    tableName: string;
}) {
    const [values, setValues] = useState<Record<string, string>>({});

    const handleSubmit = () => {
        onSubmit(values);
        setValues({});
    };

    const handleClose = () => {
        setValues({});
        onClose();
    };

    // Filter out auto-generated columns (serial, identity, etc.)
    const editableColumns = columns.filter(
        (col) =>
            !col.dataType.toLowerCase().includes('serial') &&
            !col.dataType.toLowerCase().includes('identity')
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Row to {tableName}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {editableColumns.map((col) => (
                        <TextField
                            key={col.name}
                            label={
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {col.name}
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ ml: 0.5 }}
                                    >
                                        ({col.dataType})
                                    </Typography>
                                    {!col.nullable && (
                                        <Typography component="span" color="error.main">
                                            *
                                        </Typography>
                                    )}
                                </Box>
                            }
                            value={values[col.name] || ''}
                            onChange={(e) => setValues({ ...values, [col.name]: e.target.value })}
                            size="small"
                            fullWidth
                            placeholder={col.defaultValue ? `Default: ${col.defaultValue}` : undefined}
                        />
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit}>
                    Add Row
                </Button>
            </DialogActions>
        </Dialog>
    );
}
