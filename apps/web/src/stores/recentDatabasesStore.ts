import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentDatabase {
    connectionId: string;
    name: string;
    engine: string;
    accessedAt: number;
}

interface RecentDatabasesState {
    recentDatabases: RecentDatabase[];
    addRecentDatabase: (db: Omit<RecentDatabase, 'accessedAt'>) => void;
    removeRecentDatabase: (connectionId: string) => void;
    clearRecentDatabases: () => void;
}

const MAX_RECENT_DATABASES = 6;

export const useRecentDatabasesStore = create<RecentDatabasesState>()(
    persist(
        (set) => ({
            recentDatabases: [],

            addRecentDatabase: (db) =>
                set((state) => {
                    const filtered = state.recentDatabases.filter(
                        (d) => d.connectionId !== db.connectionId
                    );
                    const newEntry: RecentDatabase = {
                        ...db,
                        accessedAt: Date.now(),
                    };
                    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_DATABASES);
                    return { recentDatabases: updated };
                }),

            removeRecentDatabase: (connectionId) =>
                set((state) => ({
                    recentDatabases: state.recentDatabases.filter(
                        (d) => d.connectionId !== connectionId
                    ),
                })),

            clearRecentDatabases: () => set({ recentDatabases: [] }),
        }),
        {
            name: 'dbnexus-recent-databases',
        }
    )
);
