import { Box, type SxProps, type Theme } from '@mui/material';
import { ReactNode } from 'react';

// Simple card using paper background color
export function GlassCard({
    children,
    noPadding = false,
    sx = {},
}: {
    children: ReactNode;
    noPadding?: boolean;
    sx?: SxProps<Theme>;
}) {
    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                p: noPadding ? 0 : 2.5,
                transition: 'border-color 0.2s ease',
                '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 0 10px 0 rgba(129, 140, 248, 0.1)',
                },
                ...(sx as object),
            }}
        >
            {children}
        </Box>
    );
}
