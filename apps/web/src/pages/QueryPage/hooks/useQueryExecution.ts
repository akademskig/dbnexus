import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { QueryResult, TableInfo } from '@dbnexus/shared';
import { queriesApi } from '../../../lib/api';
import { useToastStore } from '../../../stores/toastStore';
import { extractTableFromQuery } from '../utils';

interface UseQueryExecutionProps {
    selectedConnectionId: string;
    sql: string;
    tables: TableInfo[];
    selectedTable: TableInfo | null;
    historyOpen: boolean;
    setResult: (result: QueryResult | null) => void;
    setError: (error: string | null) => void;
    setActiveTab: (tab: number) => void;
    setSelectedTable: (table: TableInfo | null) => void;
    setSelectedSchema: (schema: string) => void;
    updateUrl: (params: { tab?: number; schema?: string; table?: string }) => void;
    refetchTables: () => void;
    refetchHistory: () => void;
    setLastSuccessfulQuery?: (query: string) => void;
}

export function useQueryExecution({
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
    setLastSuccessfulQuery,
}: UseQueryExecutionProps) {
    const toast = useToastStore();
    const [confirmDangerous, setConfirmDangerous] = useState<{
        message: string;
        type: string;
    } | null>(null);
    const [explainDialogOpen, setExplainDialogOpen] = useState(false);
    const [explainPlan, setExplainPlan] = useState<{
        plan: unknown;
        planText: string;
        insights: { type: string; message: string }[];
        suggestions: string[];
    } | null>(null);
    const lastExecutedQueryRef = useRef<string>('');

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

            // Track successful query
            if (setLastSuccessfulQuery) {
                setLastSuccessfulQuery(lastExecutedQueryRef.current);
            }

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

    const handleConfirmDangerous = useCallback(() => {
        executeMutation.mutate({ query: sql, confirmed: true });
    }, [executeMutation, sql]);

    return {
        confirmDangerous,
        explainDialogOpen,
        explainPlan,
        lastExecutedQueryRef,
        isExecuting: executeMutation.isPending,
        isExplaining: explainMutation.isPending,
        handleExecute,
        handleExplain,
        handleConfirmDangerous,
        setConfirmDangerous,
        setExplainDialogOpen,
        executeMutation,
        explainMutation,
    };
}
