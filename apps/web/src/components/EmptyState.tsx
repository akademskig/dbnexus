import { Box, Typography, Button, SxProps, Theme } from '@mui/material';
import { ReactNode } from 'react';

interface EmptyStateAction {
    label: string;
    onClick: () => void;
    variant?: 'text' | 'outlined' | 'contained';
    icon?: ReactNode;
}

interface EmptyStateProps {
    readonly icon?: ReactNode;
    readonly title: string;
    readonly description?: string;
    readonly action?: EmptyStateAction;
    readonly secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    readonly tertiaryAction?: {
        label: string;
        onClick: () => void;
    };
    readonly size?: 'small' | 'medium' | 'large';
    readonly sx?: SxProps<Theme>;
}

// Reusable empty state component with consistent styling
export function EmptyState({
    icon,
    title,
    description,
    action,
    secondaryAction,
    tertiaryAction,
    size = 'medium',
    sx,
}: EmptyStateProps) {
    const sizes = {
        small: { icon: 40, title: 'body1', desc: 'body2', py: 3 },
        medium: { icon: 56, title: 'h6', desc: 'body2', py: 5 },
        large: { icon: 72, title: 'h5', desc: 'body1', py: 8 },
    } as const;

    const config = sizes[size];

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                py: config.py,
                px: 3,
                ...sx,
            }}
        >
            {icon && (
                <Box
                    sx={{
                        mb: 2,
                        color: 'text.disabled',
                        '& > svg': {
                            fontSize: config.icon,
                            opacity: 0.5,
                        },
                    }}
                >
                    {icon}
                </Box>
            )}

            <Typography
                variant={config.title}
                sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    mb: description ? 1 : 0,
                }}
            >
                {title}
            </Typography>

            {description && (
                <Typography
                    variant={config.desc}
                    sx={{
                        color: 'text.secondary',
                        maxWidth: 400,
                        mb: action ? 3 : 0,
                    }}
                >
                    {description}
                </Typography>
            )}

            {(action || secondaryAction || tertiaryAction) && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1.5,
                        mt: 1,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}
                >
                    {tertiaryAction && (
                        <Button
                            variant="text"
                            onClick={tertiaryAction.onClick}
                            sx={{ textTransform: 'none' }}
                        >
                            {tertiaryAction.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            variant="outlined"
                            onClick={secondaryAction.onClick}
                            sx={{ textTransform: 'none' }}
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                    {action && (
                        <Button
                            variant={action.variant || 'contained'}
                            onClick={action.onClick}
                            sx={{ textTransform: 'none' }}
                            startIcon={action.icon}
                        >
                            {action.label}
                        </Button>
                    )}
                </Box>
            )}
        </Box>
    );
}

// Pre-built empty state configurations for common scenarios
export const emptyStateConfigs = {
    noConnections: {
        title: 'No connections yet',
        description: 'Add your first database connection to start exploring your data.',
    },
    noTables: {
        title: 'No tables found',
        description: "This schema doesn't have any tables or views.",
    },
    selectConnection: {
        title: 'Select a connection',
        description:
            'Choose a database connection from the dropdown to browse tables and run queries.',
    },
    selectTable: {
        title: 'Select a table',
        description:
            'Choose a table from the sidebar to view its data, structure, indexes, and foreign keys.',
    },
    noResults: {
        title: 'No results',
        description: 'Your query returned no rows.',
    },
    noActivity: {
        title: 'No recent activity',
        description: 'Your query history will appear here once you start running queries.',
    },
    noProjects: {
        title: 'No projects yet',
        description: 'Create a project to organize your database connections.',
    },
    noGroups: {
        title: 'No instance groups',
        description: 'Create an instance group to sync schemas between related databases.',
    },
    selectConnections: {
        title: 'Select connections to compare',
        description: 'Choose a source and target database connection to see schema differences.',
    },
    noHistory: {
        title: 'No query history',
        description: 'Queries you run will be saved here for easy access.',
    },
    noMigrations: {
        title: 'No migrations yet',
        description: 'Schema migrations you apply will be recorded here.',
    },
    error: {
        title: 'Something went wrong',
        description: 'An error occurred while loading data. Please try again.',
    },
};
