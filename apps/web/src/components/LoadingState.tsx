import { Box, CircularProgress, Typography, LinearProgress, SxProps, Theme } from '@mui/material';

interface LoadingStateProps {
    readonly message?: string;
    readonly variant?: 'circular' | 'linear';
    readonly size?: 'small' | 'medium' | 'large';
    readonly fullPage?: boolean;
    readonly sx?: SxProps<Theme>;
}

/**
 * Reusable loading state component with consistent styling
 */
export function LoadingState({
    message,
    variant = 'circular',
    size = 'medium',
    fullPage = false,
    sx,
}: LoadingStateProps) {
    const sizes = {
        small: { spinner: 20, py: 2 },
        medium: { spinner: 32, py: 4 },
        large: { spinner: 48, py: 8 },
    };

    const config = sizes[size];

    if (variant === 'linear') {
        return (
            <Box sx={{ width: '100%', ...sx }}>
                <LinearProgress />
                {message && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block', textAlign: 'center' }}
                    >
                        {message}
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: config.py,
                ...(fullPage && {
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'background.default',
                    zIndex: 10,
                }),
                ...sx,
            }}
        >
            <CircularProgress size={config.spinner} sx={{ color: 'text.disabled' }} />
            {message && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                >
                    {message}
                </Typography>
            )}
        </Box>
    );
}

/**
 * Skeleton placeholder for content that's loading
 */
export function LoadingSkeleton({ height = 200, sx }: { height?: number; sx?: SxProps<Theme> }) {
    return (
        <Box
            sx={{
                height,
                bgcolor: 'action.hover',
                borderRadius: 1,
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                    '0%, 100%': { opacity: 0.4 },
                    '50%': { opacity: 0.7 },
                },
                ...sx,
            }}
        />
    );
}
