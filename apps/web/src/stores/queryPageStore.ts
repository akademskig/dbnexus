import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QueryPageState {
    // Last visited state per connection
    lastState: {
        connectionId: string;
        schema: string;
        table: string;
        tab: string;
    } | null;

    // Actions
    saveState: (state: {
        connectionId: string;
        schema: string;
        table: string;
        tab: string;
    }) => void;
    clearState: () => void;
}

export const useQueryPageStore = create<QueryPageState>()(
    persist(
        (set) => ({
            lastState: null,

            saveState: (state) =>
                set({
                    lastState: state,
                }),

            clearState: () => set({ lastState: null }),
        }),
        {
            name: 'dbnexus-query-page-state',
        }
    )
);
