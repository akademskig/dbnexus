import { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
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
    CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddBoxIcon from '@mui/icons-material/AddBox';
import WarningIcon from '@mui/icons-material/Warning';
import ViewListIcon from '@mui/icons-material/ViewList';
import type { TableInfo, TableSchema, QueryResult } from '@dbnexus/shared';
import { connectionsApi, queriesApi, schemaApi } from '../../lib/api';
import { useQueryPageStore } from '../../stores/queryPageStore';
import { useToastStore } from '../../stores/toastStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { TableListItem } from './TableListItem';
import { DataTab } from './DataTab';
import { StructureTab, IndexesTab, ForeignKeysTab, SqlTab } from './SchemaTabs';
import { HistoryPanel } from './HistoryPanel';
import { CreateTableDialog, AddRowDialog, SyncRowDialog } from './Dialogs';
import { EmptyState } from './EmptyState';
import {
    SIDEBAR_WIDTH,
    TAB_NAMES,
    getTabIndex,
    formatBytes,
    quoteIdentifier,
    buildTableName,
} from './utils';

export function QueryPage() {
    const { connectionId: routeConnectionId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Persisted state store
    const { lastState, saveState } = useQueryPageStore();
    const toast = useToastStore();

    // Shared connection store (for syncing with other pages like Schema Visualizer)
    const {
        selectedConnectionId: sharedConnectionId,
        selectedSchema: sharedSchema,
        setConnectionAndSchema: syncConnectionStore
    } = useConnectionStore();

    // Get state from URL params, falling back to persisted state
    const urlSchema = searchParams.get('schema');
    const urlTable = searchParams.get('table');
    const urlTab = searchParams.get('tab');

    // Local state - start empty, will be populated by effect
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
    const [selectedSchema, setSelectedSchema] = useState<string>('');

    // Initialize connection and schema from URL, store, or persisted state
    useEffect(() => {
        // Connection: URL route param > shared store > persisted state
        const connId = routeConnectionId || sharedConnectionId || lastState?.connectionId || '';
        if (connId && connId !== selectedConnectionId) {
            setSelectedConnectionId(connId);
        }

        // Schema: URL param > shared store > persisted state (only if matching connection)
        const schema = urlSchema || sharedSchema || lastState?.schema || '';
        if (schema && schema !== selectedSchema) {
            setSelectedSchema(schema);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeConnectionId, urlSchema, sharedConnectionId, sharedSchema]);

    const getInitialTab = () => {
        if (urlTab) return getTabIndex(urlTab);
        if (!routeConnectionId && lastState?.tab) return getTabIndex(lastState.tab);
        return 0;
    };
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

    // Row sync state
    const [syncRowDialogOpen, setSyncRowDialogOpen] = useState(false);
    const [rowsToSync, setRowsToSync] = useState<Record<string, unknown>[]>([]);

    // Restore from shared store or persisted state on mount if no URL params
    useEffect(() => {
        if (!routeConnectionId) {
            // First check shared store, then persisted state
            const connectionToUse = sharedConnectionId || lastState?.connectionId;
            const schemaToUse = sharedSchema || lastState?.schema;

            if (connectionToUse) {
                const params = new URLSearchParams();
                if (schemaToUse) params.set('schema', schemaToUse);
                if (lastState?.table) params.set('table', lastState.table);
                if (lastState?.tab) params.set('tab', lastState.tab);
                navigate(`/query/${connectionToUse}?${params.toString()}`, { replace: true });
            }
        }
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
            const tab = TAB_NAMES[activeTab];
            navigate(`/query/${newConnectionId}?tab=${tab}`, { replace: true });
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

    // Save state to store whenever it changes
    useEffect(() => {
        if (selectedConnectionId) {
            saveState({
                connectionId: selectedConnectionId,
                schema: selectedSchema,
                table: selectedTable?.name ?? '',
                tab: TAB_NAMES[activeTab] ?? 'data',
            });
            // Sync with shared connection store (for other pages like Schema Visualizer)
            syncConnectionStore(selectedConnectionId, selectedSchema);
        }
    }, [selectedConnectionId, selectedSchema, selectedTable?.name, activeTab, saveState, syncConnectionStore]);

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
        onSuccess: () => {
            refetchHistory();
            toast.success('Query history cleared');
        },
    });

    // Set default schema when schemas load
    useEffect(() => {
        if (schemas.length > 0 && !selectedSchema) {
            const schemaFromUrl = urlSchema;
            if (schemaFromUrl && schemas.includes(schemaFromUrl)) {
                setSelectedSchema(schemaFromUrl);
                setSchemasExpanded({ [schemaFromUrl]: true });
            } else {
                const engine = selectedConnection?.engine;
                let defaultSchema: string | undefined;

                if (engine === 'mysql' || engine === 'mariadb') {
                    defaultSchema =
                        selectedConnection?.database && schemas.includes(selectedConnection.database)
                            ? selectedConnection.database
                            : schemas[0];
                } else {
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
    }, [
        schemas,
        selectedSchema,
        urlSchema,
        updateUrl,
        selectedConnection?.defaultSchema,
        selectedConnection?.engine,
        selectedConnection?.database,
    ]);

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
            toast.error('Query failed');
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

    // Restore table selection from URL
    useEffect(() => {
        if (tables.length > 0 && !selectedTable) {
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
            const engine = selectedConnection?.engine;
            const tableName = buildTableName(table.schema, table.name, engine);

            let query: string;
            if (search && search.trim() && schema?.columns.length) {
                const searchTerm = search.replaceAll("'", "''");
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
                        const quotedCol = quoteIdentifier(col.name, engine);
                        if (engine === 'sqlite') {
                            return `${quotedCol} LIKE '%${searchTerm}%'`;
                        } else if (engine === 'mysql' || engine === 'mariadb') {
                            return `${quotedCol} LIKE '%${searchTerm}%'`;
                        } else {
                            return `${quotedCol}::text ILIKE '%${searchTerm}%'`;
                        }
                    });
                    query = `SELECT * FROM ${tableName} WHERE ${conditions.join(' OR ')} LIMIT ${pageSize} OFFSET ${offset};`;
                } else {
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
            setTotalRowCount(null);
            setPaginationModel({ page: 0, pageSize: 100 });
            setSearchQuery('');
            updateUrl({ table: table.name });

            try {
                const { count } = await schemaApi.getTableRowCount(
                    selectedConnectionId,
                    table.schema || 'main',
                    table.name
                );
                setTotalRowCount(count);
            } catch {
                setTotalRowCount(null);
            }

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
            setPaginationModel((prev) => ({ ...prev, page: 0 }));

            if (selectedTable) {
                if (query.trim()) {
                    setTotalRowCount(null);
                } else {
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
        [
            selectedTable,
            selectedConnectionId,
            fetchTableData,
            paginationModel.pageSize,
            tableSchema,
        ]
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

        const tableName = buildTableName(
            selectedTable.schema,
            selectedTable.name,
            selectedConnection?.engine
        );

        const query = `DROP TABLE ${tableName};`;
        setSql(query);
        executeMutation.mutate(
            { query, confirmed: true },
            {
                onSuccess: () => {
                    setSelectedTable(null);
                    setResult(null);
                    refetchTables();
                    setDropTableConfirmOpen(false);
                    toast.success(`Table "${selectedTable.name}" dropped`);
                },
            }
        );
    }, [
        selectedTable,
        selectedConnectionId,
        selectedConnection?.engine,
        executeMutation,
        refetchTables,
        toast,
    ]);

    // Handle add row
    const handleAddRow = useCallback(
        (values: Record<string, string>) => {
            if (!selectedTable || !selectedConnectionId || !tableSchema) return;

            const engine = selectedConnection?.engine;
            const tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);

            const columns = Object.keys(values).filter((k) => values[k] !== '');
            const vals = columns.map((k) => {
                const col = tableSchema.columns.find((c) => c.name === k);
                const val = values[k] ?? '';
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

            const query = `INSERT INTO ${tableName} (${columns.map((c) => quoteIdentifier(c, engine)).join(', ')}) VALUES (${vals.join(', ')});`;
            setSql(query);
            executeMutation.mutate(
                { query },
                {
                    onSuccess: () => {
                        setAddRowOpen(false);
                        toast.success('Row added successfully');
                        if (selectedTable) {
                            fetchTableData(
                                selectedTable,
                                paginationModel.page,
                                paginationModel.pageSize,
                                searchQuery,
                                tableSchema
                            );
                        }
                    },
                }
            );
        },
        [
            selectedTable,
            selectedConnectionId,
            selectedConnection?.engine,
            tableSchema,
            executeMutation,
            fetchTableData,
            paginationModel,
            searchQuery,
            toast,
        ]
    );

    // Handle create table
    const handleCreateTable = useCallback(
        (
            tableName: string,
            columns: Array<{ name: string; type: string; nullable: boolean; primaryKey: boolean }>
        ) => {
            if (!selectedConnectionId) return;

            const engine = selectedConnection?.engine;
            const schema = selectedSchema || 'public';
            const fullTableName = buildTableName(schema, tableName, engine);

            const columnDefs = columns.map((col) => {
                let def = `${quoteIdentifier(col.name, engine)} ${col.type}`;
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
                        toast.success(`Table "${tableName}" created`);
                    },
                }
            );
        },
        [selectedConnectionId, selectedConnection?.engine, selectedSchema, executeMutation, refetchTables, toast]
    );

    // Helper function to format value for SQL
    const formatSqlValue = useCallback(
        (value: unknown, colName: string): string => {
            if (value === null || value === undefined) return 'NULL';

            const col = tableSchema?.columns.find((c) => c.name === colName);
            const dataType = col?.dataType.toLowerCase() || '';

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

            if (dataType.includes('bool')) {
                return String(value);
            }

            if (dataType.includes('json') || dataType.includes('jsonb')) {
                const jsonStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                return `'${jsonStr.replaceAll("'", "''")}'`;
            }

            if (typeof value === 'object') {
                const jsonStr = JSON.stringify(value);
                return `'${jsonStr.replaceAll("'", "''")}'`;
            }

            return `'${String(value).replaceAll("'", "''")}'`;
        },
        [tableSchema]
    );

    // Handle update row
    const handleUpdateRow = useCallback(
        async (oldRow: Record<string, unknown>, newRow: Record<string, unknown>) => {
            if (!selectedTable || !selectedConnectionId || !tableSchema) return;

            const engine = selectedConnection?.engine;
            const tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);

            const pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
            if (pkColumns.length === 0) {
                throw new Error('Cannot update row: no primary key defined');
            }

            const changes: string[] = [];
            for (const key of Object.keys(newRow)) {
                if (key === 'id') continue;
                const oldVal = oldRow[key];
                const newVal = newRow[key];
                const hasChanged =
                    typeof oldVal === 'object' || typeof newVal === 'object'
                        ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
                        : oldVal !== newVal;
                if (hasChanged) {
                    changes.push(
                        `${quoteIdentifier(key, engine)} = ${formatSqlValue(newVal, key)}`
                    );
                }
            }

            if (changes.length === 0) {
                return;
            }

            const whereConditions = pkColumns.map(
                (pk) => `${quoteIdentifier(pk, engine)} = ${formatSqlValue(oldRow[pk], pk)}`
            );

            const query = `UPDATE ${tableName} SET ${changes.join(', ')} WHERE ${whereConditions.join(' AND ')};`;
            setSql(query);

            return new Promise<void>((resolve, reject) => {
                executeMutation.mutate(
                    { query, confirmed: true },
                    {
                        onSuccess: () => {
                            if (selectedTable) {
                                fetchTableData(
                                    selectedTable,
                                    paginationModel.page,
                                    paginationModel.pageSize,
                                    searchQuery,
                                    tableSchema
                                );
                            }
                            toast.success('Row updated');
                            resolve();
                        },
                        onError: (err) => {
                            toast.error('Failed to update row');
                            reject(err);
                        },
                    }
                );
            });
        },
        [
            selectedTable,
            selectedConnectionId,
            selectedConnection?.engine,
            tableSchema,
            executeMutation,
            fetchTableData,
            paginationModel,
            searchQuery,
            formatSqlValue,
            toast,
        ]
    );

    // Handle delete row
    const handleDeleteRow = useCallback(
        (row: Record<string, unknown>) => {
            if (!selectedTable || !selectedConnectionId || !tableSchema) return;

            const engine = selectedConnection?.engine;
            const tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);

            const pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
            if (pkColumns.length === 0) {
                setError('Cannot delete row: no primary key defined');
                return;
            }

            const whereConditions = pkColumns.map(
                (pk) => `${quoteIdentifier(pk, engine)} = ${formatSqlValue(row[pk], pk)}`
            );

            const query = `DELETE FROM ${tableName} WHERE ${whereConditions.join(' AND ')};`;
            setSql(query);
            executeMutation.mutate(
                { query, confirmed: true },
                {
                    onSuccess: () => {
                        if (selectedTable) {
                            fetchTableData(
                                selectedTable,
                                paginationModel.page,
                                paginationModel.pageSize,
                                searchQuery,
                                tableSchema
                            );
                        }
                        if (totalRowCount !== null) {
                            setTotalRowCount(totalRowCount - 1);
                        }
                        toast.success('Row deleted');
                    },
                }
            );
        },
        [
            selectedTable,
            selectedConnectionId,
            selectedConnection?.engine,
            tableSchema,
            executeMutation,
            fetchTableData,
            paginationModel,
            searchQuery,
            formatSqlValue,
            totalRowCount,
            toast,
        ]
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
                            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                <StorageIcon sx={{ fontSize: 36, opacity: 0.3, mb: 1 }} />
                                <Typography variant="body2" fontWeight={500}>
                                    Select a connection
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    Choose from the dropdown above
                                </Typography>
                            </Box>
                        )}

                        {selectedConnectionId &&
                            Object.keys(tablesBySchema).length === 0 &&
                            !tablesLoading && (
                                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    <TableChartIcon sx={{ fontSize: 36, opacity: 0.3, mb: 1 }} />
                                    <Typography variant="body2" fontWeight={500}>
                                        No tables found
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        This schema is empty
                                    </Typography>
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
                                                onClick={(e) =>
                                                    setTableActionsAnchor(e.currentTarget)
                                                }
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
                                        onSyncRow={(rows) => {
                                            setRowsToSync(rows);
                                            setSyncRowDialogOpen(true);
                                        }}
                                        connectionHost={selectedConnection?.host}
                                        connectionDatabase={selectedConnection?.database}
                                        tableName={selectedTable?.name}
                                    />
                                )}

                                {activeTab === 1 && (
                                    <StructureTab schema={tableSchema} loading={tableSchemaLoading} />
                                )}

                                {activeTab === 2 && (
                                    <IndexesTab schema={tableSchema} loading={tableSchemaLoading} />
                                )}

                                {activeTab === 3 && (
                                    <ForeignKeysTab
                                        schema={tableSchema}
                                        loading={tableSchemaLoading}
                                    />
                                )}

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
                        handleTabChange(4);
                        setHistoryOpen(false);
                    }}
                    onRerun={(entry) => {
                        setSql(entry.sql);
                        if (entry.connectionId && entry.connectionId !== selectedConnectionId) {
                            handleConnectionChange(entry.connectionId);
                        }
                        handleTabChange(4);
                        setHistoryOpen(false);
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
            <Dialog open={dropTableConfirmOpen} onClose={() => setDropTableConfirmOpen(false)}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="error" />
                    Drop Table
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to drop the table{' '}
                        <strong>{selectedTable?.name}</strong>? This action cannot be undone and all
                        data will be permanently deleted.
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

            {/* Sync Row Dialog */}
            <SyncRowDialog
                open={syncRowDialogOpen}
                onClose={() => {
                    setSyncRowDialogOpen(false);
                    setRowsToSync([]);
                }}
                rows={rowsToSync}
                sourceConnectionId={selectedConnectionId}
                sourceConnection={selectedConnection}
                schema={selectedTable?.schema || selectedSchema || ''}
                table={selectedTable?.name || ''}
                primaryKeys={
                    tableSchema?.columns.filter((c) => c.isPrimaryKey).map((c) => c.name) || []
                }
                connections={connections}
            />
        </Box>
    );
}
