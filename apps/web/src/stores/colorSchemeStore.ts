import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { colorSchemes, type ColorScheme } from '../theme';

interface ColorSchemeState {
    colorScheme: ColorScheme;
    setColorScheme: (scheme: ColorScheme) => void;
}

export const useColorSchemeStore = create<ColorSchemeState>()(
    persist(
        (set) => ({
            colorScheme: 'indigo',
            setColorScheme: (scheme) => set({ colorScheme: scheme }),
        }),
        {
            name: 'dbnexus:color-scheme',
        }
    )
);

// Helper to get current color scheme colors
export const getColorSchemeColors = (scheme: ColorScheme) => colorSchemes[scheme];
