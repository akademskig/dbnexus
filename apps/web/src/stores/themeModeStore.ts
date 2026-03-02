import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaletteMode } from '@mui/material';

const DEFAULT_USER_KEY = '_default';

interface ThemePreferences {
    [userId: string]: PaletteMode;
}

interface ThemeModeStore {
    preferences: ThemePreferences;
    currentUserId: string | null;
    getMode: () => PaletteMode;
    toggleMode: () => void;
    setMode: (mode: PaletteMode) => void;
    setCurrentUser: (userId: string | null) => void;
}

export const useThemeModeStore = create<ThemeModeStore>()(
    persist(
        (set, get) => ({
            preferences: { [DEFAULT_USER_KEY]: 'dark' },
            currentUserId: null,

            getMode: () => {
                const { preferences, currentUserId } = get();
                const key = currentUserId || DEFAULT_USER_KEY;
                return preferences[key] ?? preferences[DEFAULT_USER_KEY] ?? 'dark';
            },

            toggleMode: () =>
                set((state) => {
                    const key = state.currentUserId || DEFAULT_USER_KEY;
                    const currentMode = state.preferences[key] ?? 'dark';
                    return {
                        preferences: {
                            ...state.preferences,
                            [key]: currentMode === 'dark' ? 'light' : 'dark',
                        },
                    };
                }),

            setMode: (mode) =>
                set((state) => {
                    const key = state.currentUserId || DEFAULT_USER_KEY;
                    return {
                        preferences: {
                            ...state.preferences,
                            [key]: mode,
                        },
                    };
                }),

            setCurrentUser: (userId) => set({ currentUserId: userId }),
        }),
        {
            name: 'dbnexus-theme-mode',
            partialize: (state) => ({ preferences: state.preferences }),
        }
    )
);
