import { Box } from '@mui/material';
import { ReactNode } from 'react';
import { useThemeStore, type ThemeStyle } from '../stores/themeStore';

// Re-export types and constants from store for convenience
export { ACCENT_COLORS, THEME_PRESETS, hexToRgb, type ThemeStyle } from '../stores/themeStore';

// Glassmorphism card using Zustand theme store
export function GlassCard({
    children,
    noPadding = false,
    style: styleOverride,
}: {
    children: ReactNode;
    noPadding?: boolean;
    style?: Partial<ThemeStyle>; // Override any style property
}) {
    const storeStyle = useThemeStore((state) => state.style);
    const { bgColor, bgOpacity, borderColor, borderOpacity, hoverBorderColor, hoverBorderOpacity } =
        {
            ...storeStyle,
            ...styleOverride,
        };

    return (
        <Box
            sx={{
                background: `rgba(${bgColor}, ${bgOpacity})`,
                backdropFilter: 'blur(10px)',
                border: `1px solid rgba(${borderColor}, ${borderOpacity})`,
                borderRadius: 1,
                p: noPadding ? 0 : 2.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                    border: `2px solid rgba(${hoverBorderColor}, ${hoverBorderOpacity})`,
                },
            }}
        >
            {children}
        </Box>
    );
}
