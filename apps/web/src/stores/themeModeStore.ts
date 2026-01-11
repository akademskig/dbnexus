import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaletteMode } from '@mui/material';

interface ThemeModeStore {
    mode: PaletteMode;
    toggleMode: () => void;
    setMode: (mode: PaletteMode) => void;
}

export const useThemeModeStore = create<ThemeModeStore>()(
    persist(
        (set) => ({
            mode: 'dark',
            toggleMode: () =>
                set((state) => ({
                    mode: state.mode === 'dark' ? 'light' : 'dark',
                })),
            setMode: (mode) => set({ mode }),
        }),
        { name: 'dbnexus-theme-mode' }
    )
);
