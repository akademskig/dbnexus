import { create } from 'zustand';

interface ConnectionManagementState {
    // Current selections
    activeTab: number;
    selectedSchema: string | null;
    selectedTable: string | null;

    // Actions
    setActiveTab: (tab: number) => void;
    setSelectedSchema: (schema: string | null) => void;
    setSelectedTable: (table: string | null) => void;
    setSelection: (schema: string | null, table?: string | null) => void;

    // Initialize from URL params
    initFromUrl: (params: URLSearchParams) => void;

    // Get URL params from current state
    getUrlParams: () => Record<string, string>;

    // Reset state
    reset: () => void;
}

const TAB_NAMES = ['overview', 'schemas', 'tables', 'management', 'maintenance'] as const;
type TabName = (typeof TAB_NAMES)[number];

function tabNameToIndex(name: string | null): number {
    if (!name) return 0;
    const index = TAB_NAMES.indexOf(name as TabName);
    return index >= 0 ? index : 0;
}

function tabIndexToName(index: number): TabName {
    return TAB_NAMES[index] || 'overview';
}

export const useConnectionManagementStore = create<ConnectionManagementState>((set, get) => ({
    activeTab: 0,
    selectedSchema: null,
    selectedTable: null,

    setActiveTab: (tab) => set({ activeTab: tab }),

    setSelectedSchema: (schema) =>
        set({
            selectedSchema: schema,
            // Clear table when schema changes
            selectedTable: null,
        }),

    setSelectedTable: (table) => set({ selectedTable: table }),

    setSelection: (schema, table) =>
        set({
            selectedSchema: schema,
            selectedTable: table ?? null,
        }),

    initFromUrl: (params) => {
        const tab = params.get('tab');
        const schema = params.get('schema');
        const table = params.get('table');

        set({
            activeTab: tabNameToIndex(tab),
            selectedSchema: schema,
            selectedTable: table,
        });
    },

    getUrlParams: () => {
        const state = get();
        const params: Record<string, string> = {
            tab: tabIndexToName(state.activeTab),
        };
        if (state.selectedSchema) {
            params.schema = state.selectedSchema;
        }
        if (state.selectedTable) {
            params.table = state.selectedTable;
        }
        return params;
    },

    reset: () =>
        set({
            activeTab: 0,
            selectedSchema: null,
            selectedTable: null,
        }),
}));
