import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { SavedQuery } from '@dbnexus/shared';
import { queriesApi } from '../../../lib/api';
import { useToastStore } from '../../../stores/toastStore';

interface UseSavedQueriesProps {
    savedQueriesOpen: boolean;
}

export function useSavedQueries({ savedQueriesOpen }: UseSavedQueriesProps) {
    const toast = useToastStore();
    const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
    const [queryToDelete, setQueryToDelete] = useState<SavedQuery | null>(null);

    const { data: savedQueries = [], refetch: refetchSavedQueries } = useQuery({
        queryKey: ['savedQueries'],
        queryFn: () => queriesApi.getSaved(),
        enabled: savedQueriesOpen,
    });

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

    const deleteQueryMutation = useMutation({
        mutationFn: (id: string) => queriesApi.deleteSaved(id),
        onSuccess: () => {
            refetchSavedQueries();
            toast.success('Query deleted');
            setQueryToDelete(null);
        },
        onError: () => {
            toast.error('Failed to delete query');
            setQueryToDelete(null);
        },
    });

    return {
        savedQueries,
        editingQuery,
        queryToDelete,
        setEditingQuery,
        setQueryToDelete,
        saveQueryMutation,
        deleteQueryMutation,
        refetchSavedQueries,
    };
}
