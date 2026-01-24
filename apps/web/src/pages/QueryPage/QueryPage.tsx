import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { Box, Typography, Chip, IconButton, useTheme } from '@mui/material';
import type { GridSortModel, GridFilterModel } from '@mui/x-data-grid';
import { StyledTooltip } from '../../components/StyledTooltip';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import type { TableInfo, TableSchema, QueryResult, SavedQuery } from '@dbnexus/shared';
import { connectionsApi, queriesApi, schemaApi } from '../../lib/api';
import { useQueryPageStore } from '../../stores/queryPageStore';
import { useToastStore } from '../../stores/toastStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { QueryPageSidebar } from './QueryPageSidebar';
import { QueryPageHeader } from './QueryPageHeader';
import { QueryPageTabs } from './QueryPageTabs';
import { QueryPageDrawers } from './QueryPageDrawers';
import { SqlEditor } from './SqlEditor';
import { DeleteRowDialog } from './DeleteRowDialog';
import { DeleteRowsDialog } from './DeleteRowsDialog';
import { DeleteSavedQueryDialog } from './DeleteSavedQueryDialog';
import { AddRowDialog, SyncRowDialog, SaveQueryDialog } from './Dialogs';
import { ExplainPlanDialog } from '../../components/ExplainPlanDialog';
import { FloatingEditorDialog } from './FloatingEditorDialog';
import { EmptyState } from './EmptyState';
import { ConnectionSelector } from '../../components/ConnectionSelector';
import {
    TAB_NAMES,
    getTabIndex,
    quoteIdentifier,
    buildTableName,
    extractTableFromQuery,
} from './utils';
import { QueryTemplateIcon } from '../../components/icons/QueryTemplateIcon';

export function QueryPage() {
    const theme = useTheme();
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
        setConnectionAndSchema: syncConnectionStore,
    } = useConnectionStore();

    // Get state from URL params, falling back to persisted state
    const urlSchema = searchParams.get('schema');
    const urlTable = searchParams.get('table');
    const urlTab = searchParams.get('tab');

    // Local state - initialized from URL, store, or persisted state
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
        () => routeConnectionId || sharedConnectionId || lastState?.connectionId || ''
    );
    const [selectedSchema, setSelectedSchema] = useState<string>(
        () => urlSchema || sharedSchema || lastState?.schema || ''
    );

    // Sync state when URL params change (e.g., external navigation)
    // Only sync FROM URL, not when we're programmatically changing the connection
    useEffect(() => {
        if (routeConnectionId && routeConnectionId !== selectedConnectionId) {
            setSelectedConnectionId(routeConnectionId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeConnectionId]); // Only react to URL changes, not state changes

    useEffect(() => {
        if (urlSchema && urlSchema !== selectedSchema) {
            setSelectedSchema(urlSchema);
        }
    }, [urlSchema, selectedSchema]);

    const getInitialTab = () => {
        if (urlTab) return getTabIndex(urlTab);
        if (!routeConnectionId && lastState?.tab) return getTabIndex(lastState.tab);
        return 0;
    };
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
    const [tableSearch, setTableSearch] = useState('');
    const [tablesExpanded, setTablesExpanded] = useState(true);
    const [viewsExpanded, setViewsExpanded] = useState(true);
    const [sql, setSql] = useState('');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [totalRowCount, setTotalRowCount] = useState<number | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
    const [sortModel, setSortModel] = useState<GridSortModel>([]);
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [confirmDangerous, setConfirmDangerous] = useState<{
        message: string;
        type: string;
    } | null>(null);
    // Default to showing selected schema expanded
    const [historyOpen, setHistoryOpen] = useState(false);

    // Edit dialogs state
    const [addRowOpen, setAddRowOpen] = useState(false);

    // Row sync state
    const [syncRowDialogOpen, setSyncRowDialogOpen] = useState(false);
    const [rowsToSync, setRowsToSync] = useState<Record<string, unknown>[]>([]);

    // Saved queries state
    const [savedQueriesOpen, setSavedQueriesOpen] = useState(false);
    const [saveQueryOpen, setSaveQueryOpen] = useState(false);
    const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
    const [queryToDelete, setQueryToDelete] = useState<SavedQuery | null>(null);

    // Templates state
    const [templatesOpen, setTemplatesOpen] = useState(false);

    // Floating editor state
    const [floatingEditorOpen, setFloatingEditorOpen] = useState(false);
    const [splitViewOpen, setSplitViewOpen] = useState(false);

    // Row deletion state
    const [rowToDelete, setRowToDelete] = useState<Record<string, unknown> | null>(null);
    const [rowsToDelete, setRowsToDelete] = useState<Record<string, unknown>[] | null>(null);

    // Explain plan state
    const [explainDialogOpen, setExplainDialogOpen] = useState(false);
    const [explainPlan, setExplainPlan] = useState<{
        plan: unknown;
        planText: string;
        insights: { type: string; message: string }[];
        suggestions: string[];
    } | null>(null);

    // Track last executed query for table selection
    const lastExecutedQueryRef = useRef<string>('');

    // Skip table restoration when doing FK query
    const skipTableRestoreRef = useRef(false);

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
            setSearchParams(
                (currentParams) => {
                    const newParams = new URLSearchParams(currentParams);

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

                    return newParams;
                },
                { replace: true }
            );
        },
        [setSearchParams]
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
    }, [
        selectedConnectionId,
        selectedSchema,
        selectedTable?.name,
        activeTab,
        saveState,
        syncConnectionStore,
    ]);

    // Connections query
    const { data: connections = [], isLoading: connectionsLoading } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

    // Schemas query
    const { data: schemas = [], refetch: refetchSchemas } = useQuery({
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

    // Saved queries
    const { data: savedQueries = [], refetch: refetchSavedQueries } = useQuery({
        queryKey: ['savedQueries'],
        queryFn: () => queriesApi.getSaved(),
        enabled: savedQueriesOpen,
    });

    // Save query mutation
    const saveQueryMutation = useMutation({
        mutationFn: (input: { name: string; sql: string; connectionId?: string }) =>
            editingQuery
                ? queriesApi.updateSaved(editingQuery.id, input)
                : queriesApi.createSaved(input),
        onSuccess: () => {
            refetchSavedQueries();
            toast.success(editingQuery ? 'Query updated' : 'Query saved');
            setEditingQuery(null);
        },
        onError: () => {
            toast.error('Failed to save query');
        },
    });

    // Delete saved query mutation
    const deleteQueryMutation = useMutation({
        mutationFn: (id: string) => queriesApi.deleteSaved(id),
        onSuccess: () => {
            refetchSavedQueries();
            toast.success('Query deleted');
        },
        onError: () => {
            toast.error('Failed to delete query');
        },
    });

    // Set default schema when schemas load
    useEffect(() => {
        if (schemas.length > 0 && !selectedSchema) {
            const schemaFromUrl = urlSchema;
            if (schemaFromUrl && schemas.includes(schemaFromUrl)) {
                setSelectedSchema(schemaFromUrl);
            } else {
                const engine = selectedConnection?.engine;
                let defaultSchema: string | undefined;

                if (engine === 'mysql' || engine === 'mariadb') {
                    defaultSchema =
                        selectedConnection?.database &&
                        schemas.includes(selectedConnection.database)
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
            lastExecutedQueryRef.current = query;
            return queriesApi.execute(selectedConnectionId, query, confirmed);
        },
        onSuccess: (data) => {
            setResult(data);
            setError(null);
            setConfirmDangerous(null);
            // Switch to Data tab to show results
            setActiveTab(0);
            updateUrl({ tab: 0 });

            // Try to select the table from the query
            const tableInfo = extractTableFromQuery(lastExecutedQueryRef.current);
            if (tableInfo && tables.length > 0) {
                const matchingTable = tables.find((t) => {
                    const tableMatch = t.name.toLowerCase() === tableInfo.table.toLowerCase();
                    if (tableInfo.schema) {
                        return (
                            tableMatch && t.schema.toLowerCase() === tableInfo.schema.toLowerCase()
                        );
                    }
                    // If no schema in query, match any table with that name (prefer current schema)
                    return tableMatch;
                });
                if (matchingTable && matchingTable.name !== selectedTable?.name) {
                    setSelectedTable(matchingTable);
                    setSelectedSchema(matchingTable.schema);
                    updateUrl({ schema: matchingTable.schema, table: matchingTable.name });
                }
            }

            // Invalidate table counts if this was a data-modifying query
            const queryUpper = lastExecutedQueryRef.current.toUpperCase().trim();
            if (
                queryUpper.startsWith('INSERT') ||
                queryUpper.startsWith('UPDATE') ||
                queryUpper.startsWith('DELETE') ||
                queryUpper.startsWith('TRUNCATE') ||
                queryUpper.startsWith('CREATE') ||
                queryUpper.startsWith('DROP') ||
                queryUpper.startsWith('ALTER')
            ) {
                refetchTables();
            }

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

    const explainMutation = useMutation({
        mutationFn: async ({ analyze }: { analyze: boolean }) => {
            if (!selectedConnectionId) throw new Error('No connection selected');
            if (!sql.trim()) throw new Error('No query to explain');
            return queriesApi.explain(selectedConnectionId, sql, analyze);
        },
        onSuccess: (data) => {
            setExplainPlan(data);
            setExplainDialogOpen(true);
            toast.success('Query plan generated');
        },
        onError: (err: Error) => {
            toast.error(`Failed to explain query: ${err.message}`);
        },
    });

    const handleExecute = useCallback(() => {
        if (!sql.trim()) return;
        setConfirmDangerous(null);
        executeMutation.mutate({ query: sql });
    }, [executeMutation, sql]);

    const handleExplain = useCallback(
        (analyze = false) => {
            if (!sql.trim()) return;
            explainMutation.mutate({ analyze });
        },
        [explainMutation, sql]
    );

    const handleConfirmDangerous = () => {
        executeMutation.mutate({ query: sql, confirmed: true });
    };

    // Restore table selection from URL
    useEffect(() => {
        // Skip restoration if we just did a FK query
        if (skipTableRestoreRef.current) {
            skipTableRestoreRef.current = false;
            return;
        }

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
                    return;
                }
            }

            // Auto-select first table if none specified
            const firstTable = tables[0];
            if (firstTable) {
                handleTableSelect(firstTable);
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
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (sql.trim()) {
                    setSaveQueryOpen(true);
                }
            }
        },
        [handleExecute, sql]
    );

    // Fetch data with pagination and optional search
    const fetchTableData = useCallback(
        (
            table: TableInfo,
            page: number,
            pageSize: number,
            search?: string,
            schema?: TableSchema | null,
            sort?: GridSortModel
        ) => {
            const offset = page * pageSize;
            const engine = selectedConnection?.engine;
            const tableName = buildTableName(table.schema, table.name, engine);

            // Build ORDER BY clause
            let orderByClause = '';
            if (sort && sort.length > 0) {
                const orderByParts = sort
                    .filter((s) => s.sort)
                    .map((s) => {
                        // Remove the column index suffix (_0, _1, etc.) to get original column name
                        const originalField = s.field.replace(/_\d+$/, '');
                        const quotedField = quoteIdentifier(originalField, engine);
                        return `${quotedField} ${s.sort!.toUpperCase()}`;
                    });
                if (orderByParts.length > 0) {
                    orderByClause = ` ORDER BY ${orderByParts.join(', ')}`;
                }
            }

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
                    query = `SELECT * FROM ${tableName} WHERE ${conditions.join(' OR ')}${orderByClause} LIMIT ${pageSize} OFFSET ${offset};`;
                } else {
                    query = `SELECT * FROM ${tableName}${orderByClause} LIMIT ${pageSize} OFFSET ${offset};`;
                }
            } else {
                query = `SELECT * FROM ${tableName}${orderByClause} LIMIT ${pageSize} OFFSET ${offset};`;
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
            setPaginationModel({ page: 0, pageSize: paginationModel.pageSize });
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

            setSortModel([]);
            fetchTableData(table, 0, paginationModel.pageSize);
        },
        [selectedConnectionId, updateUrl, fetchTableData, paginationModel.pageSize]
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
                    tableSchema,
                    sortModel
                );
            }
        },
        [selectedTable, fetchTableData, searchQuery, tableSchema, sortModel]
    );

    // Handle sort change
    const handleSortChange = useCallback(
        (newSortModel: GridSortModel) => {
            const validSort = newSortModel.filter((s) => s.sort) as GridSortModel;
            setSortModel(validSort);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
            if (selectedTable) {
                fetchTableData(
                    selectedTable,
                    0,
                    paginationModel.pageSize,
                    searchQuery,
                    tableSchema,
                    validSort
                );
            }
        },
        [selectedTable, fetchTableData, paginationModel.pageSize, searchQuery, tableSchema]
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
                fetchTableData(
                    selectedTable,
                    0,
                    paginationModel.pageSize,
                    query,
                    tableSchema,
                    sortModel
                );
            }
        },
        [
            selectedTable,
            selectedConnectionId,
            fetchTableData,
            paginationModel.pageSize,
            tableSchema,
            sortModel,
        ]
    );

    // Filter tables by search
    const filteredTables = tables.filter((t) =>
        t.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    // Group tables by schema
    const handleRefresh = () => {
        refetchSchemas();
        refetchTables();
    };

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
                                tableSchema,
                                sortModel
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
            sortModel,
            toast,
        ]
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

    // Extract table name from SQL query (simple regex for SELECT queries)
    const extractTableNameFromQuery = (query: string): string | null => {
        const match = query.match(/FROM\s+([`"]?[\w.]+[`"]?)/i);
        return match?.[1]?.replace(/[`"]/g, '') ?? null;
    };

    // Infer primary keys from result columns (for raw queries without tableSchema)
    const inferPrimaryKeysFromResult = (result: QueryResult | null): string[] => {
        if (!result) return [];
        return result.columns
            .filter((col) => {
                const name = col.name.toLowerCase();
                return name === 'id' || name === 'version' || name.endsWith('_id');
            })
            .map((col) => col.name);
    };

    // Handle update row
    const handleUpdateRow = useCallback(
        async (oldRow: Record<string, unknown>, newRow: Record<string, unknown>) => {
            if (!selectedConnectionId) return;

            const engine = selectedConnection?.engine;

            // Determine table name and primary keys
            let tableName: string;
            let pkColumns: string[];

            if (selectedTable && tableSchema) {
                // Use selected table info if available
                tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);
                pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
            } else {
                // For raw queries, try to extract table name from SQL
                const extractedTable = extractTableNameFromQuery(sql);
                if (!extractedTable) {
                    throw new Error('Cannot determine table name for update');
                }
                tableName = extractedTable;

                // Infer primary keys from result
                pkColumns = inferPrimaryKeysFromResult(result);
                if (pkColumns.length === 0) {
                    throw new Error(
                        'Cannot update row: no primary key identified (looking for columns named: id, version, or ending with _id)'
                    );
                }
            }

            const changes: string[] = [];
            for (const key of Object.keys(newRow)) {
                if (key === '__rowIndex') continue; // Skip internal row index
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
                            if (selectedTable && tableSchema) {
                                fetchTableData(
                                    selectedTable,
                                    paginationModel.page,
                                    paginationModel.pageSize,
                                    searchQuery,
                                    tableSchema,
                                    sortModel
                                );
                            } else {
                                // For raw queries, re-run the original query
                                executeMutation.mutate({ query: sql, confirmed: true });
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
            sortModel,
            formatSqlValue,
            toast,
            sql,
            result,
        ]
    );

    // Handle delete row - show confirmation
    const handleDeleteRow = useCallback((row: Record<string, unknown>) => {
        setRowToDelete(row);
    }, []);

    const handleDeleteRows = useCallback((rows: Record<string, unknown>[]) => {
        setRowsToDelete(rows);
    }, []);

    // Actually perform row deletion
    const confirmDeleteRow = useCallback(() => {
        if (!selectedTable || !selectedConnectionId || !tableSchema || !rowToDelete) return;

        const engine = selectedConnection?.engine;
        const tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);

        const pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
        if (pkColumns.length === 0) {
            setError('Cannot delete row: no primary key defined');
            setRowToDelete(null);
            return;
        }

        const whereConditions = pkColumns.map(
            (pk) => `${quoteIdentifier(pk, engine)} = ${formatSqlValue(rowToDelete[pk], pk)}`
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
                            tableSchema,
                            sortModel
                        );
                    }
                    if (totalRowCount !== null) {
                        setTotalRowCount(totalRowCount - 1);
                    }
                    toast.success('Row deleted');
                    setRowToDelete(null);
                },
            }
        );
    }, [
        selectedTable,
        selectedConnectionId,
        selectedConnection?.engine,
        tableSchema,
        rowToDelete,
        executeMutation,
        fetchTableData,
        paginationModel,
        searchQuery,
        sortModel,
        formatSqlValue,
        totalRowCount,
        toast,
    ]);

    const confirmDeleteRows = useCallback(() => {
        if (
            !selectedTable ||
            !selectedConnectionId ||
            !tableSchema ||
            !rowsToDelete ||
            rowsToDelete.length === 0
        ) {
            return;
        }

        const engine = selectedConnection?.engine;
        const tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);

        const pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
        if (pkColumns.length === 0) {
            setError('Cannot delete rows: no primary key defined');
            setRowsToDelete(null);
            return;
        }

        const rowClauses = rowsToDelete.map((row) => {
            const conditions = pkColumns.map(
                (pk) => `${quoteIdentifier(pk, engine)} = ${formatSqlValue(row[pk], pk)}`
            );
            return `(${conditions.join(' AND ')})`;
        });

        const query = `DELETE FROM ${tableName} WHERE ${rowClauses.join(' OR ')};`;
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
                            tableSchema,
                            sortModel
                        );
                    }
                    if (totalRowCount !== null) {
                        setTotalRowCount(totalRowCount - rowsToDelete.length);
                    }
                    toast.success(`Deleted ${rowsToDelete.length} rows`);
                    setRowsToDelete(null);
                },
                onError: () => {
                    toast.error('Failed to delete rows');
                    setRowsToDelete(null);
                },
            }
        );
    }, [
        selectedTable,
        selectedConnectionId,
        selectedConnection?.engine,
        tableSchema,
        rowsToDelete,
        executeMutation,
        fetchTableData,
        paginationModel,
        searchQuery,
        sortModel,
        formatSqlValue,
        totalRowCount,
        toast,
    ]);

    // Handle foreign key click - query the specific referenced row
    const handleForeignKeyClick = useCallback(
        (info: { referencedTable: string; referencedColumn: string; value: unknown }) => {
            if (!selectedConnectionId) return;

            const engine = selectedConnection?.engine;

            // Parse table name - might include schema (e.g., "public.users" or just "users")
            const parts = info.referencedTable.split('.');
            const targetTableName =
                (parts.length > 1 ? parts[1] : parts[0]) ?? info.referencedTable;
            const targetSchema = (parts.length > 1 ? parts[0] : selectedSchema) ?? 'public';

            // Build the query to fetch the specific row
            const tableName = buildTableName(targetSchema, targetTableName, engine);
            const quotedColumn = quoteIdentifier(info.referencedColumn, engine);

            // Format the value for SQL
            let sqlValue: string;
            if (info.value === null) {
                sqlValue = 'NULL';
            } else if (typeof info.value === 'number') {
                sqlValue = String(info.value);
            } else if (typeof info.value === 'boolean') {
                sqlValue = info.value ? 'TRUE' : 'FALSE';
            } else {
                sqlValue = `'${String(info.value).replaceAll("'", "''")}'`;
            }

            const query = `SELECT * FROM ${tableName} WHERE ${quotedColumn} = ${sqlValue};`;

            // Set the SQL and execute
            setSql(query);
            setActiveTab(0); // Switch to Data tab

            // Set flag to skip table restoration
            skipTableRestoreRef.current = true;

            // Clear selected table immediately
            setSelectedTable(null);

            // Execute the query
            executeMutation.mutate(
                { query },
                {
                    onSuccess: (data) => {
                        setResult(data);
                        setError(null);
                        setTotalRowCount(null);
                        setSearchQuery('');
                    },
                    onError: (err) => {
                        setError(err instanceof Error ? err.message : String(err));
                        setResult(null);
                    },
                }
            );

            toast.info(
                `Querying ${info.referencedTable} where ${info.referencedColumn} = ${info.value}`
            );
        },
        [selectedConnectionId, selectedConnection?.engine, selectedSchema, executeMutation, toast]
    );

    // Redirect to dashboard if no connections after loading
    if (!connectionsLoading && connections.length === 0) {
        return <Navigate to="/dashboard" replace />;
    }

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
                <ConnectionSelector
                    value={selectedConnectionId}
                    onChange={handleConnectionChange}
                    disableOffline={true}
                />

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

                <StyledTooltip title="Query Templates">
                    <IconButton
                        size="small"
                        onClick={() => setTemplatesOpen(true)}
                        color={templatesOpen ? 'primary' : 'default'}
                    >
                        <QueryTemplateIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>

                <StyledTooltip title="Saved Queries">
                    <IconButton
                        size="small"
                        onClick={() => setSavedQueriesOpen(true)}
                        color={savedQueriesOpen ? 'primary' : 'default'}
                    >
                        <BookmarkIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>

                <StyledTooltip title="Query History">
                    <IconButton
                        size="small"
                        onClick={() => setHistoryOpen(true)}
                        color={historyOpen ? 'primary' : 'default'}
                    >
                        <HistoryIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>

                <StyledTooltip title="Refresh">
                    <IconButton size="small" onClick={handleRefresh}>
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <QueryPageSidebar
                    selectedConnectionId={selectedConnectionId}
                    schemas={schemas}
                    selectedSchema={selectedSchema}
                    onSchemaChange={handleSchemaChange}
                    tableSearch={tableSearch}
                    onTableSearchChange={setTableSearch}
                    filteredTables={filteredTables}
                    selectedTable={selectedTable}
                    onTableSelect={handleTableSelect}
                    tablesLoading={tablesLoading}
                    tablesExpanded={tablesExpanded}
                    onToggleTablesExpanded={() => setTablesExpanded(!tablesExpanded)}
                    viewsExpanded={viewsExpanded}
                    onToggleViewsExpanded={() => setViewsExpanded(!viewsExpanded)}
                />

                {/* Main Panel */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {selectedConnectionId ? (
                        <>
                            {selectedTable && (
                                <QueryPageHeader
                                    selectedTable={selectedTable}
                                    tableSchema={tableSchema}
                                    onManageTable={() => {
                                        navigate(
                                            `/connections/${selectedConnectionId}?tab=management&schema=${encodeURIComponent(
                                                selectedTable.schema || selectedSchema || 'public'
                                            )}&table=${encodeURIComponent(selectedTable.name)}`
                                        );
                                    }}
                                    onAddRow={() => setAddRowOpen(true)}
                                />
                            )}
                            {splitViewOpen ? (
                                <Group
                                    orientation="horizontal"
                                    style={{
                                        display: 'flex',
                                        flex: 1,
                                        minHeight: 0,
                                        height: '100%',
                                    }}
                                >
                                    <Panel
                                        defaultSize={50}
                                        minSize={30}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <QueryPageTabs
                                            activeTab={activeTab}
                                            onTabChange={handleTabChange}
                                            result={result}
                                            error={error}
                                            loading={executeMutation.isPending}
                                            confirmDangerous={confirmDangerous}
                                            onConfirm={handleConfirmDangerous}
                                            onCancel={() => setConfirmDangerous(null)}
                                            totalRowCount={totalRowCount}
                                            paginationModel={paginationModel}
                                            onPaginationChange={handlePaginationChange}
                                            sortModel={sortModel}
                                            onSortChange={handleSortChange}
                                            filterModel={filterModel}
                                            onFilterModelChange={setFilterModel}
                                            showFilters={showFilters}
                                            onShowFiltersChange={setShowFilters}
                                            onSearch={handleSearch}
                                            searchQuery={searchQuery}
                                            tableSchema={tableSchema}
                                            onUpdateRow={handleUpdateRow}
                                            onDeleteRow={handleDeleteRow}
                                            onDeleteRows={handleDeleteRows}
                                            onSyncRow={(rows) => {
                                                setRowsToSync(rows);
                                                setSyncRowDialogOpen(true);
                                            }}
                                            onForeignKeyClick={handleForeignKeyClick}
                                            connectionHost={selectedConnection?.host}
                                            connectionDatabase={selectedConnection?.database}
                                            tableName={selectedTable?.name}
                                            selectedTable={selectedTable}
                                            tableSchemaLoading={tableSchemaLoading}
                                            splitViewOpen={splitViewOpen}
                                            onToggleSplitView={() =>
                                                setSplitViewOpen(!splitViewOpen)
                                            }
                                        />
                                    </Panel>

                                    <Separator
                                        style={{
                                            width: '4px',
                                            background: theme.palette.divider,
                                            cursor: 'col-resize',
                                            position: 'relative',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                            (e.target as HTMLDivElement).style.background =
                                                theme.palette.primary.main;
                                        }}
                                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                            (e.target as HTMLDivElement).style.background =
                                                theme.palette.divider;
                                        }}
                                    />

                                    <Panel
                                        defaultSize={50}
                                        minSize={30}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <SqlEditor
                                            sql={sql}
                                            onSqlChange={setSql}
                                            onExecute={handleExecute}
                                            onSave={() => setSaveQueryOpen(true)}
                                            onExplain={() => handleExplain(false)}
                                            onPopOut={() => setFloatingEditorOpen(true)}
                                            onKeyDown={handleKeyDown}
                                            executeLoading={executeMutation.isPending}
                                            explainLoading={explainMutation.isPending}
                                        />
                                    </Panel>
                                </Group>
                            ) : (
                                <QueryPageTabs
                                    activeTab={activeTab}
                                    onTabChange={handleTabChange}
                                    result={result}
                                    error={error}
                                    loading={executeMutation.isPending}
                                    confirmDangerous={confirmDangerous}
                                    onConfirm={handleConfirmDangerous}
                                    onCancel={() => setConfirmDangerous(null)}
                                    totalRowCount={totalRowCount}
                                    paginationModel={paginationModel}
                                    onPaginationChange={handlePaginationChange}
                                    sortModel={sortModel}
                                    onSortChange={handleSortChange}
                                    filterModel={filterModel}
                                    onFilterModelChange={setFilterModel}
                                    showFilters={showFilters}
                                    onShowFiltersChange={setShowFilters}
                                    onSearch={handleSearch}
                                    searchQuery={searchQuery}
                                    tableSchema={tableSchema}
                                    onUpdateRow={handleUpdateRow}
                                    onDeleteRow={handleDeleteRow}
                                    onDeleteRows={handleDeleteRows}
                                    onSyncRow={(rows) => {
                                        setRowsToSync(rows);
                                        setSyncRowDialogOpen(true);
                                    }}
                                    onForeignKeyClick={handleForeignKeyClick}
                                    connectionHost={selectedConnection?.host}
                                    connectionDatabase={selectedConnection?.database}
                                    tableName={selectedTable?.name}
                                    selectedTable={selectedTable}
                                    tableSchemaLoading={tableSchemaLoading}
                                    splitViewOpen={splitViewOpen}
                                    onToggleSplitView={() => setSplitViewOpen(!splitViewOpen)}
                                />
                            )}
                        </>
                    ) : (
                        <EmptyState connectionSelected={!!selectedConnectionId} />
                    )}
                </Box>
            </Box>

            <QueryPageDrawers
                templatesOpen={templatesOpen}
                onTemplatesClose={() => setTemplatesOpen(false)}
                onTemplateSelect={(templateSql) => {
                    setSql(templateSql);
                    handleTabChange(0);
                    setTemplatesOpen(false);
                }}
                selectedTable={selectedTable}
                tableSchema={tableSchema}
                engine={selectedConnection?.engine}
                historyOpen={historyOpen}
                onHistoryClose={() => setHistoryOpen(false)}
                queryHistory={queryHistory}
                historyConnections={connections}
                onHistorySelect={(entry) => {
                    setSql(entry.sql);
                    if (entry.connectionId && entry.connectionId !== selectedConnectionId) {
                        handleConnectionChange(entry.connectionId);
                    }
                    handleTabChange(0);
                    setHistoryOpen(false);
                    setTimeout(() => {
                        executeMutation.mutate({ query: entry.sql });
                    }, 100);
                }}
                onHistoryRerun={(entry) => {
                    setSql(entry.sql);
                    if (entry.connectionId && entry.connectionId !== selectedConnectionId) {
                        handleConnectionChange(entry.connectionId);
                    }
                    handleTabChange(0);
                    setHistoryOpen(false);
                    setTimeout(() => {
                        executeMutation.mutate({ query: entry.sql });
                    }, 100);
                }}
                onHistoryClear={() => clearHistoryMutation.mutate()}
                onHistoryRefresh={() => refetchHistory()}
                historyClearing={clearHistoryMutation.isPending}
                savedQueriesOpen={savedQueriesOpen}
                onSavedQueriesClose={() => setSavedQueriesOpen(false)}
                savedQueries={savedQueries}
                savedQueryConnections={connections}
                onSavedQuerySelect={(query) => {
                    setSql(query.sql);
                    if (query.connectionId && query.connectionId !== selectedConnectionId) {
                        handleConnectionChange(query.connectionId);
                    }
                    handleTabChange(0);
                    setTimeout(() => {
                        executeMutation.mutate({ query: query.sql });
                    }, 100);
                    setSavedQueriesOpen(false);
                }}
                onSavedQueryRun={(query) => {
                    setSql(query.sql);
                    if (query.connectionId && query.connectionId !== selectedConnectionId) {
                        handleConnectionChange(query.connectionId);
                    }
                    handleTabChange(0);
                    setSavedQueriesOpen(false);
                    setTimeout(() => {
                        executeMutation.mutate({ query: query.sql });
                    }, 100);
                }}
                onSavedQueryEdit={(query) => {
                    setEditingQuery(query);
                    setSaveQueryOpen(true);
                }}
                onSavedQueryDelete={(query) => {
                    setQueryToDelete(query);
                }}
                onSavedQueriesRefresh={() => refetchSavedQueries()}
            />

            {/* Delete Row Dialog */}
            <DeleteRowDialog
                open={!!rowToDelete}
                onClose={() => setRowToDelete(null)}
                onConfirm={confirmDeleteRow}
                row={rowToDelete}
                tableName={selectedTable?.name}
                tableSchema={tableSchema}
                loading={executeMutation.isPending}
            />

            {/* Delete Rows Dialog */}
            <DeleteRowsDialog
                open={!!rowsToDelete}
                onClose={() => setRowsToDelete(null)}
                onConfirm={confirmDeleteRows}
                rows={rowsToDelete}
                tableName={selectedTable?.name}
                tableSchema={tableSchema}
                loading={executeMutation.isPending}
            />

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
                sourceConnectionId={selectedConnectionId || ''}
                sourceConnection={selectedConnection}
                schema={selectedTable?.schema || selectedSchema || ''}
                table={selectedTable?.name || ''}
                primaryKeys={
                    tableSchema?.columns.filter((c) => c.isPrimaryKey).map((c) => c.name) || []
                }
                connections={connections}
            />

            {/* Save Query Dialog */}
            <SaveQueryDialog
                open={saveQueryOpen}
                onClose={() => {
                    setSaveQueryOpen(false);
                    setEditingQuery(null);
                }}
                onSave={(input) => saveQueryMutation.mutate(input)}
                sql={editingQuery?.sql || sql}
                connectionId={selectedConnectionId || undefined}
                connections={connections}
                editingQuery={editingQuery}
            />

            {/* Delete Saved Query Dialog */}
            <DeleteSavedQueryDialog
                open={!!queryToDelete}
                onClose={() => setQueryToDelete(null)}
                onConfirm={() => {
                    if (queryToDelete) {
                        deleteQueryMutation.mutate(queryToDelete.id);
                        setQueryToDelete(null);
                    }
                }}
                query={queryToDelete}
                loading={deleteQueryMutation.isPending}
            />

            {/* Explain Plan Dialog */}
            <ExplainPlanDialog
                open={explainDialogOpen}
                onClose={() => setExplainDialogOpen(false)}
                onExplainAnalyze={() => handleExplain(true)}
                explainPlan={explainPlan}
                loading={explainMutation.isPending}
            />

            {/* Floating Editor Dialog */}
            <FloatingEditorDialog
                open={floatingEditorOpen}
                onClose={() => setFloatingEditorOpen(false)}
                sql={sql}
                onSqlChange={setSql}
                onExecute={() => {
                    handleExecute();
                    handleTabChange(0);
                }}
                onSave={() => setSaveQueryOpen(true)}
                onExplain={() => handleExplain(false)}
                loading={executeMutation.isPending}
            />
        </Box>
    );
}
