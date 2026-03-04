import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { preferencesApi } from '../lib/api';

interface FavoriteKey {
    connectionId: string;
    schema: string;
    tableName: string;
}

interface FavoriteTablesState {
    favorites: FavoriteKey[];
    synced: boolean;
    isFavorite: (connectionId: string, schema: string, tableName: string) => boolean;
    toggleFavorite: (connectionId: string, schema: string, tableName: string) => void;
    getFavoritesForConnection: (connectionId: string, schema?: string) => string[];
    syncFromBackend: () => Promise<void>;
}

const PREFERENCE_KEY = 'favorite_tables';

export const useFavoriteTablesStore = create<FavoriteTablesState>()(
    persist(
        (set, get) => ({
            favorites: [],
            synced: false,

            isFavorite: (connectionId: string, schema: string, tableName: string) => {
                return get().favorites.some(
                    (f) =>
                        f.connectionId === connectionId &&
                        f.schema === schema &&
                        f.tableName === tableName
                );
            },

            toggleFavorite: (connectionId: string, schema: string, tableName: string) => {
                set((state) => {
                    const exists = state.favorites.some(
                        (f) =>
                            f.connectionId === connectionId &&
                            f.schema === schema &&
                            f.tableName === tableName
                    );

                    let newFavorites: FavoriteKey[];
                    if (exists) {
                        newFavorites = state.favorites.filter(
                            (f) =>
                                !(
                                    f.connectionId === connectionId &&
                                    f.schema === schema &&
                                    f.tableName === tableName
                                )
                        );
                    } else {
                        newFavorites = [...state.favorites, { connectionId, schema, tableName }];
                    }

                    // Sync to backend (fire and forget)
                    preferencesApi.set(PREFERENCE_KEY, newFavorites).catch(console.error);

                    return { favorites: newFavorites };
                });
            },

            getFavoritesForConnection: (connectionId: string, schema?: string) => {
                return get()
                    .favorites.filter(
                        (f) =>
                            f.connectionId === connectionId &&
                            (schema === undefined || f.schema === schema)
                    )
                    .map((f) => f.tableName);
            },

            syncFromBackend: async () => {
                try {
                    const result = await preferencesApi.get<FavoriteKey[]>(PREFERENCE_KEY);
                    if (result.value && Array.isArray(result.value)) {
                        set({ favorites: result.value, synced: true });
                    } else {
                        set({ synced: true });
                    }
                } catch {
                    // Backend sync failed, use local storage
                    set({ synced: true });
                }
            },
        }),
        {
            name: 'dbnexus-favorite-tables',
        }
    )
);
