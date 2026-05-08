import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { colorSchemes, type ColorScheme } from '../theme';
import { preferencesApi } from '../lib/api';

const PREFERENCE_KEY = 'color_scheme';

interface ColorSchemeState {
    colorScheme: ColorScheme;
    synced: boolean;
    setColorScheme: (scheme: ColorScheme) => void;
    syncFromBackend: () => Promise<void>;
}

export const useColorSchemeStore = create<ColorSchemeState>()(
    persist(
        (set) => ({
            colorScheme: 'indigo',
            synced: false,

            setColorScheme: (scheme) => {
                set({ colorScheme: scheme });
                // Sync to backend (fire and forget)
                preferencesApi.set(PREFERENCE_KEY, scheme).catch(console.error);
            },

            syncFromBackend: async () => {
                try {
                    const result = await preferencesApi.get<ColorScheme>(PREFERENCE_KEY);
                    if (result.value && colorSchemes[result.value]) {
                        set({ colorScheme: result.value, synced: true });
                    } else {
                        set({ synced: true });
                    }
                } catch {
                    set({ synced: true });
                }
            },
        }),
        {
            name: 'dbnexus:color-scheme',
        }
    )
);

// Helper to get current color scheme colors
export const getColorSchemeColors = (scheme: ColorScheme) => colorSchemes[scheme];
