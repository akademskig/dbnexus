import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { GridSortModel, GridFilterModel } from '@mui/x-data-grid';
import type { TableInfo, TableSchema, QueryResult } from '@dbnexus/shared';
import { queriesApi } from '../../../lib/api';
import { useToastStore } from '../../../stores/toastStore';
import { buildTableName } from '../utils';
import {
    buildInsertQuery,
    buildUpdateQuery,
    buildDeleteQuery,
    buildDeleteMultipleQuery,
} from '../rowOperations';
import { extractTableNameFromQuery, inferPrimaryKeysFromResult } from '../sqlHelpers';

interface UseRowOperationsProps {
    selectedConnectionId: string;
    selectedConnection: { engine: string } | undefined;
    selectedTable: TableInfo | null;
    tableSchema: TableSchema | null;
    sql: string;
    result: QueryResult | null;
    paginationModel: { page: number; pageSize: number };
    sortModel: GridSortModel;
    filterModel: GridFilterModel;
    searchQuery: string;
    totalRowCount: number | null;
    setSql: (sql: string) => void;
    setTotalRowCount: (count: number | null) => void;
    fetchTableData: (
        table: TableInfo,
        page: number,
        pageSize: number,
        searchQuery: string,
        schema: TableSchema,
        sort: GridSortModel,
        filter: GridFilterModel
    ) => void;
    refetchRowCount: () => Promise<void>;
    refetchTables: () => void;
}

export function useRowOperations({
    selectedConnectionId,
    selectedConnection,
    selectedTable,
    tableSchema,
    sql,
    result,
    paginationModel,
    sortModel,
    filterModel,
    searchQuery,
    setSql,
    fetchTableData,
    refetchRowCount,
    refetchTables,
}: UseRowOperationsProps) {
    const toast = useToastStore();
    const [addRowOpen, setAddRowOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<Record<string, unknown> | null>(null);
    const [rowsToDelete, setRowsToDelete] = useState<Record<string, unknown>[] | null>(null);

    const executeMutation = useMutation({
        mutationFn: async (params: { query: string; confirmed?: boolean }) => {
            const response = await queriesApi.execute(selectedConnectionId, params.query);
            return response;
        },
    });

    const handleAddRow = useCallback(
        (values: Record<string, string>) => {
            if (!selectedTable || !selectedConnectionId || !tableSchema) return;

            const query = buildInsertQuery({
                table: selectedTable,
                tableSchema,
                values,
                engine: selectedConnection?.engine as 'postgres' | 'mysql' | 'sqlite',
            });
            setSql(query);
            executeMutation.mutate(
                { query },
                {
                    onSuccess: () => {
                        setAddRowOpen(false);
                        toast.success('Row added successfully');
                        if (selectedTable && tableSchema) {
                            fetchTableData(
                                selectedTable,
                                paginationModel.page,
                                paginationModel.pageSize,
                                searchQuery,
                                tableSchema,
                                sortModel,
                                filterModel
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
            filterModel,
            toast,
            setSql,
        ]
    );

    const handleUpdateRow = useCallback(
        async (oldRow: Record<string, unknown>, newRow: Record<string, unknown>) => {
            if (!selectedConnectionId) return;

            const engine = selectedConnection?.engine as 'postgres' | 'mysql' | 'sqlite';

            // Determine table name and primary keys
            let tableName: string;
            let pkColumns: string[];

            if (selectedTable && tableSchema) {
                tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);
                pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
            } else {
                const extractedTable = extractTableNameFromQuery(sql);
                if (!extractedTable) {
                    throw new Error('Cannot determine table name for update');
                }
                tableName = extractedTable;

                pkColumns = inferPrimaryKeysFromResult(result);
                if (pkColumns.length === 0) {
                    throw new Error(
                        'Cannot update row: no primary key identified (looking for columns named: id, version, or ending with _id)'
                    );
                }
            }

            const query = buildUpdateQuery({
                tableName,
                oldRow,
                newRow,
                pkColumns,
                tableSchema: tableSchema || null,
                engine,
            });

            if (!query) {
                return;
            }

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
                                    sortModel,
                                    filterModel
                                );
                            } else {
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
            filterModel,
            toast,
            sql,
            result,
            setSql,
        ]
    );

    const handleDeleteRow = useCallback((row: Record<string, unknown>) => {
        setRowToDelete(row);
    }, []);

    const handleDeleteRows = useCallback((rows: Record<string, unknown>[]) => {
        setRowsToDelete(rows);
    }, []);

    const confirmDeleteRow = useCallback(() => {
        if (!selectedTable || !selectedConnectionId || !tableSchema || !rowToDelete) return;

        const engine = selectedConnection?.engine as 'postgres' | 'mysql' | 'sqlite';
        const tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);

        const pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
        if (pkColumns.length === 0) {
            toast.error('Cannot delete row: no primary key defined');
            setRowToDelete(null);
            return;
        }

        const query = buildDeleteQuery({
            tableName,
            row: rowToDelete,
            pkColumns,
            tableSchema,
            engine,
        });
        setSql(query);
        executeMutation.mutate(
            { query, confirmed: true },
            {
                onSuccess: async () => {
                    if (selectedTable && tableSchema) {
                        fetchTableData(
                            selectedTable,
                            paginationModel.page,
                            paginationModel.pageSize,
                            searchQuery,
                            tableSchema,
                            sortModel,
                            filterModel
                        );

                        // Refetch the total row count after deletion
                        await refetchRowCount();
                        // Refetch tables list to update row counts in sidebar
                        refetchTables();
                    }
                    toast.success('Row deleted');
                    setRowToDelete(null);
                },
                onError: () => {
                    toast.error('Failed to delete row');
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
        filterModel,
        toast,
        setSql,
        refetchRowCount,
        refetchTables,
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

        const engine = selectedConnection?.engine as 'postgres' | 'mysql' | 'sqlite';
        const tableName = buildTableName(selectedTable.schema, selectedTable.name, engine);

        const pkColumns = tableSchema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
        if (pkColumns.length === 0) {
            toast.error('Cannot delete rows: no primary key defined');
            setRowsToDelete(null);
            return;
        }

        const query = buildDeleteMultipleQuery({
            tableName,
            rows: rowsToDelete,
            pkColumns,
            tableSchema,
            engine,
        });
        setSql(query);
        executeMutation.mutate(
            { query, confirmed: true },
            {
                onSuccess: async () => {
                    if (selectedTable && tableSchema) {
                        fetchTableData(
                            selectedTable,
                            paginationModel.page,
                            paginationModel.pageSize,
                            searchQuery,
                            tableSchema,
                            sortModel,
                            filterModel
                        );

                        // Refetch the total row count after deletion
                        await refetchRowCount();
                        // Refetch tables list to update row counts in sidebar
                        refetchTables();
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
        filterModel,
        toast,
        setSql,
        refetchRowCount,
        refetchTables,
    ]);

    return {
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
    };
}
