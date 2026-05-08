import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaletteMode } from '@mui/material';
import { preferencesApi } from '../lib/api';

const DEFAULT_USER_KEY = '_default';
const PREFERENCE_KEY = 'theme_mode';

interface ThemePreferences {
    [userId: string]: PaletteMode;
}

interface ThemeModeStore {
    preferences: ThemePreferences;
    currentUserId: string | null;
    synced: boolean;
    getMode: () => PaletteMode;
    toggleMode: () => void;
    setMode: (mode: PaletteMode) => void;
    setCurrentUser: (userId: string | null) => void;
    syncFromBackend: () => Promise<void>;
}

export const useThemeModeStore = create<ThemeModeStore>()(
    persist(
        (set, get) => ({
            preferences: { [DEFAULT_USER_KEY]: 'dark' },
            currentUserId: null,
            synced: false,

            getMode: () => {
                const { preferences, currentUserId } = get();
                const key = currentUserId || DEFAULT_USER_KEY;
                return preferences[key] ?? preferences[DEFAULT_USER_KEY] ?? 'dark';
            },

            toggleMode: () =>
                set((state) => {
                    const key = state.currentUserId || DEFAULT_USER_KEY;
                    const currentMode = state.preferences[key] ?? 'dark';
                    const newMode = currentMode === 'dark' ? 'light' : 'dark';

                    // Sync to backend if logged in
                    if (state.currentUserId) {
                        preferencesApi.set(PREFERENCE_KEY, newMode).catch(console.error);
                    }

                    return {
                        preferences: {
                            ...state.preferences,
                            [key]: newMode,
                        },
                    };
                }),

            setMode: (mode) =>
                set((state) => {
                    const key = state.currentUserId || DEFAULT_USER_KEY;

                    // Sync to backend if logged in
                    if (state.currentUserId) {
                        preferencesApi.set(PREFERENCE_KEY, mode).catch(console.error);
                    }

                    return {
                        preferences: {
                            ...state.preferences,
                            [key]: mode,
                        },
                    };
                }),

            setCurrentUser: (userId) => set({ currentUserId: userId }),

            syncFromBackend: async () => {
                const { currentUserId } = get();
                if (!currentUserId) {
                    set({ synced: true });
                    return;
                }

                try {
                    const result = await preferencesApi.get<PaletteMode>(PREFERENCE_KEY);
                    if (result.value) {
                        set((state) => ({
                            preferences: {
                                ...state.preferences,
                                [currentUserId]: result.value as PaletteMode,
                            },
                            synced: true,
                        }));
                    } else {
                        set({ synced: true });
                    }
                } catch {
                    set({ synced: true });
                }
            },
        }),
        {
            name: 'dbnexus-theme-mode',
            partialize: (state) => ({ preferences: state.preferences }),
        }
    )
);
