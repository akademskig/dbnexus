import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueryResult } from '@dbnexus/shared';

export interface QueryTab {
    id: string;
    name: string;
    sql: string;
    connectionId?: string;
    tableName?: string;
    schemaName?: string;
    result?: QueryResult | null;
    error?: string | null;
    lastExecutedAt?: number;
}

interface QueryTabsState {
    tabs: QueryTab[];
    activeTabId: string | null;

    addTab: (connectionId?: string) => string;
    removeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTab: (id: string, updates: Partial<QueryTab>) => void;
    renameTab: (id: string, name: string) => void;
    duplicateTab: (id: string) => string;
    getActiveTab: () => QueryTab | undefined;
    clearTabResults: (id: string) => void;
}

let tabCounter = 1;

const createNewTab = (connectionId?: string): QueryTab => {
    const id = `tab-${Date.now()}-${tabCounter++}`;
    return {
        id,
        name: `Query ${tabCounter - 1}`,
        sql: '',
        connectionId,
        result: null,
        error: null,
    };
};

export const useQueryTabsStore = create<QueryTabsState>()(
    persist(
        (set, get) => ({
            tabs: [],
            activeTabId: null,

            addTab: (connectionId?: string) => {
                const newTab = createNewTab(connectionId);
                set((state) => ({
                    tabs: [...state.tabs, newTab],
                    activeTabId: newTab.id,
                }));
                return newTab.id;
            },

            removeTab: (id: string) => {
                set((state) => {
                    const index = state.tabs.findIndex((t) => t.id === id);
                    const newTabs = state.tabs.filter((t) => t.id !== id);

                    if (newTabs.length === 0) {
                        const newTab = createNewTab();
                        return {
                            tabs: [newTab],
                            activeTabId: newTab.id,
                        };
                    }

                    let newActiveId = state.activeTabId;
                    if (state.activeTabId === id) {
                        const newIndex = Math.min(index, newTabs.length - 1);
                        newActiveId = newTabs[newIndex]?.id ?? null;
                    }

                    return {
                        tabs: newTabs,
                        activeTabId: newActiveId,
                    };
                });
            },

            setActiveTab: (id: string) => {
                set({ activeTabId: id });
            },

            updateTab: (id: string, updates: Partial<QueryTab>) => {
                set((state) => ({
                    tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab)),
                }));
            },

            renameTab: (id: string, name: string) => {
                set((state) => ({
                    tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)),
                }));
            },

            duplicateTab: (id: string) => {
                const state = get();
                const tabToDuplicate = state.tabs.find((t) => t.id === id);
                if (!tabToDuplicate) return '';

                const newTab = createNewTab(tabToDuplicate.connectionId);
                newTab.sql = tabToDuplicate.sql;
                newTab.name = `${tabToDuplicate.name} (copy)`;

                set((s) => ({
                    tabs: [...s.tabs, newTab],
                    activeTabId: newTab.id,
                }));

                return newTab.id;
            },

            getActiveTab: () => {
                const state = get();
                return state.tabs.find((t) => t.id === state.activeTabId);
            },

            clearTabResults: (id: string) => {
                set((state) => ({
                    tabs: state.tabs.map((tab) =>
                        tab.id === id ? { ...tab, result: null, error: null } : tab
                    ),
                }));
            },
        }),
        {
            name: 'dbnexus-query-tabs',
            partialize: (state) => ({
                tabs: state.tabs.map((tab) => ({
                    id: tab.id,
                    name: tab.name,
                    sql: tab.sql,
                    connectionId: tab.connectionId,
                })),
                activeTabId: state.activeTabId,
            }),
        }
    )
);
