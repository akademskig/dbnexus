import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Theme style configuration
export interface ThemeStyle {
    bgColor: string; // Background RGB string like "51, 191, 226"
    bgOpacity: number; // Background opacity (0-1)
    borderColor: string; // Border RGB string
    borderOpacity: number; // Border opacity (0-1)
    hoverBorderColor: string; // Hover border RGB string
    hoverBorderOpacity: number; // Hover border opacity (0-1)
}

// Preset accent colors
export const ACCENT_COLORS = {
    primary: '14, 165, 233',
    cyan: '51, 191, 226',
    blue: '14, 165, 233',
    purple: '139, 92, 246',
    green: '16, 185, 129',
    amber: '245, 158, 11',
    red: '239, 68, 68',
    pink: '236, 72, 153',
    neutral: '255, 255, 255',
};

// Default style
const DEFAULT_STYLE: ThemeStyle = {
    bgColor: ACCENT_COLORS.neutral,
    bgOpacity: 0.05,
    borderColor: ACCENT_COLORS.neutral,
    borderOpacity: 0.1,
    hoverBorderColor: ACCENT_COLORS.neutral,
    hoverBorderOpacity: 0.4,
};

interface ThemeStore {
    style: ThemeStyle;
    setStyle: (style: Partial<ThemeStyle>) => void;
    resetStyle: () => void;
}

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            style: DEFAULT_STYLE,
            setStyle: (newStyle) =>
                set((state) => ({
                    style: { ...state.style, ...newStyle },
                })),
            resetStyle: () => set({ style: DEFAULT_STYLE }),
        }),
        {
            name: 'dbnexus-theme-style',
        }
    )
);

// Helper to convert hex to RGB string
export function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result && result[1] && result[2] && result[3]) {
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return ACCENT_COLORS.neutral;
}

// Preset styles for common use cases
export const THEME_PRESETS = {
    subtle: { bgOpacity: 0.03, borderOpacity: 0.05, hoverBorderOpacity: 0.2 },
    default: { bgOpacity: 0.05, borderOpacity: 0.1, hoverBorderOpacity: 0.4 },
    medium: { bgOpacity: 0.1, borderOpacity: 0.15, hoverBorderOpacity: 0.5 },
    strong: { bgOpacity: 0.15, borderOpacity: 0.2, hoverBorderOpacity: 0.6 },
};
