import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteKey {
    connectionId: string;
    schema: string;
    tableName: string;
}

interface FavoriteTablesState {
    favorites: FavoriteKey[];
    isFavorite: (connectionId: string, schema: string, tableName: string) => boolean;
    toggleFavorite: (connectionId: string, schema: string, tableName: string) => void;
    getFavoritesForConnection: (connectionId: string, schema?: string) => string[];
}

export const useFavoriteTablesStore = create<FavoriteTablesState>()(
    persist(
        (set, get) => ({
            favorites: [],

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

                    if (exists) {
                        return {
                            favorites: state.favorites.filter(
                                (f) =>
                                    !(
                                        f.connectionId === connectionId &&
                                        f.schema === schema &&
                                        f.tableName === tableName
                                    )
                            ),
                        };
                    }

                    return {
                        favorites: [
                            ...state.favorites,
                            { connectionId, schema, tableName },
                        ],
                    };
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
        }),
        {
            name: 'dbnexus-favorite-tables',
        }
    )
);
