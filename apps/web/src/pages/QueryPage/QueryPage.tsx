import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { Box, useTheme } from '@mui/material';
import type { GridSortModel, GridFilterModel } from '@mui/x-data-grid';
import type { TableInfo, TableSchema, QueryResult } from '@dbnexus/shared';
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
import { TAB_NAMES, getTabIndex, quoteIdentifier, buildTableName } from './utils';
import { useSavedQueries, useRowOperations, useQueryExecution } from './hooks';
import { QueryPageToolbar } from './QueryPageToolbar';

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
    // Default to showing selected schema expanded
    const [historyOpen, setHistoryOpen] = useState(false);

    // Row sync state
    const [syncRowDialogOpen, setSyncRowDialogOpen] = useState(false);
    const [rowsToSync, setRowsToSync] = useState<Record<string, unknown>[]>([]);

    // Saved queries state
    const [savedQueriesOpen, setSavedQueriesOpen] = useState(false);
    const [saveQueryOpen, setSaveQueryOpen] = useState(false);
    const {
        savedQueries,
        editingQuery,
        queryToDelete,
        setEditingQuery,
        setQueryToDelete,
        saveQueryMutation,
        deleteQueryMutation,
        refetchSavedQueries,
    } = useSavedQueries({ savedQueriesOpen });

    // Templates state
    const [templatesOpen, setTemplatesOpen] = useState(false);

    // Floating editor state
    const [floatingEditorOpen, setFloatingEditorOpen] = useState(false);
    const [splitViewOpen, setSplitViewOpen] = useState(false);

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

    // Query execution hook
    const {
        confirmDangerous,
        explainDialogOpen,
        explainPlan,
        handleExecute,
        handleExplain,
        handleConfirmDangerous,
        setConfirmDangerous,
        setExplainDialogOpen,
        executeMutation,
        explainMutation,
    } = useQueryExecution({
        selectedConnectionId,
        sql,
        tables,
        selectedTable,
        historyOpen,
        setResult,
        setError,
        setActiveTab,
        setSelectedTable,
        setSelectedSchema,
        updateUrl,
        refetchTables,
        refetchHistory,
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
            sort?: GridSortModel,
            filters?: GridFilterModel
        ) => {
            const engine = selectedConnection?.engine;
            const tableName = buildTableName(table.schema, table.name, engine);

            // Handle "All" option (pageSize = -1)
            const isAllRows = pageSize === -1;
            const offset = isAllRows ? 0 : page * pageSize;

            // Build WHERE clause from filters
            const filterConditions: string[] = [];
            if (filters && filters.items.length > 0) {
                filters.items.forEach((filter) => {
                    if (!filter.field || !filter.operator) return;

                    // Remove the column index suffix (_0, _1, etc.) to get original column name
                    const originalField = filter.field.replace(/_\d+$/, '');
                    const quotedField = quoteIdentifier(originalField, engine);
                    const value = filter.value;

                    // Get column data type from schema
                    const column = schema?.columns.find((c) => c.name === originalField);
                    const dataType = column?.dataType.toLowerCase() || '';

                    // Check if column is numeric, JSON, or text-based
                    const isNumeric =
                        dataType.includes('int') ||
                        dataType.includes('numeric') ||
                        dataType.includes('decimal') ||
                        dataType.includes('float') ||
                        dataType.includes('double') ||
                        dataType.includes('real') ||
                        dataType.includes('serial');

                    const isJson = dataType.includes('json') || dataType.includes('jsonb');
                    const isBoolean = dataType.includes('bool');

                    switch (filter.operator) {
                        case 'contains':
                            if (value) {
                                const escapedValue = String(value).replaceAll("'", "''");
                                if (engine === 'postgres') {
                                    filterConditions.push(
                                        `${quotedField}::text ILIKE '%${escapedValue}%'`
                                    );
                                } else {
                                    filterConditions.push(
                                        `${quotedField} LIKE '%${escapedValue}%'`
                                    );
                                }
                            }
                            break;
                        case 'equals':
                            if (value !== undefined && value !== null) {
                                if (isNumeric) {
                                    filterConditions.push(`${quotedField} = ${value}`);
                                } else if (isBoolean) {
                                    const boolValue =
                                        value === 'true' || value === true ? 'TRUE' : 'FALSE';
                                    filterConditions.push(`${quotedField} = ${boolValue}`);
                                } else if (isJson) {
                                    // For JSON, cast to text for comparison
                                    const escapedValue = String(value).replaceAll("'", "''");
                                    if (engine === 'postgres') {
                                        filterConditions.push(
                                            `${quotedField}::text ILIKE '%${escapedValue}%'`
                                        );
                                    } else {
                                        filterConditions.push(
                                            `${quotedField} LIKE '%${escapedValue}%'`
                                        );
                                    }
                                } else {
                                    const escapedValue = String(value).replaceAll("'", "''");
                                    filterConditions.push(`${quotedField} = '${escapedValue}'`);
                                }
                            }
                            break;
                        case 'startsWith':
                            if (value) {
                                const escapedValue = String(value).replaceAll("'", "''");
                                if (engine === 'postgres') {
                                    filterConditions.push(
                                        `${quotedField}::text ILIKE '${escapedValue}%'`
                                    );
                                } else {
                                    filterConditions.push(`${quotedField} LIKE '${escapedValue}%'`);
                                }
                            }
                            break;
                        case 'endsWith':
                            if (value) {
                                const escapedValue = String(value).replaceAll("'", "''");
                                if (engine === 'postgres') {
                                    filterConditions.push(
                                        `${quotedField}::text ILIKE '%${escapedValue}'`
                                    );
                                } else {
                                    filterConditions.push(`${quotedField} LIKE '%${escapedValue}'`);
                                }
                            }
                            break;
                        case 'isEmpty':
                            filterConditions.push(
                                `(${quotedField} IS NULL OR ${quotedField} = '')`
                            );
                            break;
                        case 'isNotEmpty':
                            filterConditions.push(
                                `(${quotedField} IS NOT NULL AND ${quotedField} != '')`
                            );
                            break;
                        case '>':
                            if (value !== undefined && value !== null) {
                                if (isNumeric) {
                                    filterConditions.push(`${quotedField} > ${value}`);
                                } else {
                                    const escapedValue = String(value).replaceAll("'", "''");
                                    filterConditions.push(`${quotedField} > '${escapedValue}'`);
                                }
                            }
                            break;
                        case '>=':
                            if (value !== undefined && value !== null) {
                                if (isNumeric) {
                                    filterConditions.push(`${quotedField} >= ${value}`);
                                } else {
                                    const escapedValue = String(value).replaceAll("'", "''");
                                    filterConditions.push(`${quotedField} >= '${escapedValue}'`);
                                }
                            }
                            break;
                        case '<':
                            if (value !== undefined && value !== null) {
                                if (isNumeric) {
                                    filterConditions.push(`${quotedField} < ${value}`);
                                } else {
                                    const escapedValue = String(value).replaceAll("'", "''");
                                    filterConditions.push(`${quotedField} < '${escapedValue}'`);
                                }
                            }
                            break;
                        case '<=':
                            if (value !== undefined && value !== null) {
                                if (isNumeric) {
                                    filterConditions.push(`${quotedField} <= ${value}`);
                                } else {
                                    const escapedValue = String(value).replaceAll("'", "''");
                                    filterConditions.push(`${quotedField} <= '${escapedValue}'`);
                                }
                            }
                            break;
                    }
                });
            }

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
            const allConditions: string[] = [...filterConditions];

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
                    const searchConditions = searchableColumns.map((col) => {
                        const quotedCol = quoteIdentifier(col.name, engine);
                        if (engine === 'sqlite') {
                            return `${quotedCol} LIKE '%${searchTerm}%'`;
                        } else if (engine === 'mysql' || engine === 'mariadb') {
                            return `${quotedCol} LIKE '%${searchTerm}%'`;
                        } else {
                            return `${quotedCol}::text ILIKE '%${searchTerm}%'`;
                        }
                    });
                    // Combine search conditions with OR, then add to all conditions
                    allConditions.push(`(${searchConditions.join(' OR ')})`);
                }
            }

            // Build final query with WHERE clause if there are conditions
            const limitClause = isAllRows ? '' : ` LIMIT ${pageSize} OFFSET ${offset}`;

            if (allConditions.length > 0) {
                query = `SELECT * FROM ${tableName} WHERE ${allConditions.join(' AND ')}${orderByClause}${limitClause};`;
            } else {
                query = `SELECT * FROM ${tableName}${orderByClause}${limitClause};`;
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
            setFilterModel({ items: [] });
            fetchTableData(table, 0, paginationModel.pageSize, '', null, [], { items: [] });
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
                    sortModel,
                    filterModel
                );
            }
        },
        [selectedTable, fetchTableData, searchQuery, tableSchema, sortModel, filterModel]
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
                    validSort,
                    filterModel
                );
            }
        },
        [
            selectedTable,
            fetchTableData,
            paginationModel.pageSize,
            searchQuery,
            tableSchema,
            filterModel,
        ]
    );

    // Handle filter change
    const handleFilterChange = useCallback(
        (newFilterModel: GridFilterModel) => {
            setFilterModel(newFilterModel);
            setPaginationModel((prev) => ({ ...prev, page: 0 }));
            if (selectedTable) {
                fetchTableData(
                    selectedTable,
                    0,
                    paginationModel.pageSize,
                    searchQuery,
                    tableSchema,
                    sortModel,
                    newFilterModel
                );
            }
        },
        [
            selectedTable,
            fetchTableData,
            paginationModel.pageSize,
            searchQuery,
            tableSchema,
            sortModel,
        ]
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
                    sortModel,
                    filterModel
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
            filterModel,
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

    // Row operations hook
    const {
        addRowOpen,
        rowToDelete,
        rowsToDelete,
        setAddRowOpen,
        setRowToDelete,
        setRowsToDelete,
        handleAddRow,
        handleUpdateRow,
        handleDeleteRow,
        handleDeleteRows,
        confirmDeleteRow,
        confirmDeleteRows,
    } = useRowOperations({
        selectedConnectionId,
        selectedConnection,
        selectedTable,
        tableSchema: tableSchema || null,
        sql,
        result,
        paginationModel,
        sortModel,
        filterModel,
        searchQuery,
        totalRowCount,
        setSql,
        setTotalRowCount,
        fetchTableData,
    });


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
            <QueryPageToolbar
                selectedConnectionId={selectedConnectionId}
                selectedConnection={selectedConnection}
                templatesOpen={templatesOpen}
                savedQueriesOpen={savedQueriesOpen}
                historyOpen={historyOpen}
                onConnectionChange={handleConnectionChange}
                onTemplatesToggle={() => setTemplatesOpen(true)}
                onSavedQueriesToggle={() => setSavedQueriesOpen(true)}
                onHistoryToggle={() => setHistoryOpen(true)}
                onRefresh={handleRefresh}
            />

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
                                            onFilterModelChange={handleFilterChange}
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
                                    onFilterModelChange={handleFilterChange}
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
