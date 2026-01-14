import { createTheme, type PaletteMode } from '@mui/material/styles';

// Theme colors per mode
const themeColors = {
    dark: {
        primary: '#14b8a6', // Teal
        primaryLight: '#2dd4bf',
        primaryDark: '#0d9488',
        primaryRgb: '20, 184, 166',
    },
    light: {
        primary: '#6366f1', // Indigo
        primaryLight: '#818cf8',
        primaryDark: '#4f46e5',
        primaryRgb: '99, 102, 241',
    },
};

// Common component overrides
const getComponentOverrides = (mode: PaletteMode) => {
    const colors = themeColors[mode];
    return {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none' as const,
                    fontWeight: 500,
                    borderRadius: 0,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    borderRadius: 0,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: `1px solid ${mode === 'dark' ? '#27272a' : '#e4e4e7'}`,
                    borderRadius: 0,
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                size: 'small' as const,
            },
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 0,
                    },
                },
            },
        },
        MuiSelect: {
            defaultProps: {
                size: 'small' as const,
            },
            styleOverrides: {
                root: {
                    borderRadius: 0,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                    borderRadius: 16,
                },
            },
        },
        MuiAvatar: {
            styleOverrides: {
                root: {
                    borderRadius: '50%',
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: '50%',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderColor: mode === 'dark' ? '#27272a' : '#e4e4e7',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: mode === 'dark' ? '#18181b' : '#f4f4f5',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: `1px solid ${mode === 'dark' ? '#27272a' : '#e4e4e7'}`,
                    borderRadius: 0,
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                    marginBottom: 4,
                    '&.Mui-selected': {
                        backgroundColor: `rgba(${colors.primaryRgb}, 0.15)`,
                        '&:hover': {
                            backgroundColor: `rgba(${colors.primaryRgb}, 0.25)`,
                        },
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 0,
                },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: 0,
                },
            },
        },
        MuiAutocomplete: {
            styleOverrides: {
                paper: {
                    borderRadius: 0,
                },
                inputRoot: {
                    borderRadius: 0,
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    borderRadius: 0,
                },
            },
        },
    };
};

export const createAppTheme = (mode: PaletteMode) => {
    const colors = themeColors[mode];
    return createTheme({
        palette: {
            mode,
            primary: {
                main: colors.primary,
                light: colors.primaryLight,
                dark: colors.primaryDark,
                contrastText: '#fff',
            },
            secondary: {
                main: '#f97316',
                light: '#fb923c',
                dark: '#ea580c',
            },
            error: {
                main: '#ef4444',
                light: '#f87171',
                dark: '#dc2626',
            },
            warning: {
                main: '#f59e0b',
                light: '#fbbf24',
                dark: '#d97706',
            },
            success: {
                main: '#10b981',
                light: '#34d399',
                dark: '#059669',
            },
            background:
                mode === 'dark'
                    ? {
                          default: '#09090b',
                          paper: 'rgb(20, 25, 27)',
                      }
                    : {
                          default: '#fafafa',
                          paper: '#ffffff',
                      },
            text:
                mode === 'dark'
                    ? {
                          primary: '#fafafa',
                          secondary: '#a1a1aa',
                      }
                    : {
                          primary: '#18181b',
                          secondary: '#71717a',
                      },
            divider: mode === 'dark' ? '#27272a' : '#e4e4e7',
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h1: { fontWeight: 600 },
            h2: { fontWeight: 600 },
            h3: { fontWeight: 600 },
            h4: { fontWeight: 600 },
            h5: { fontWeight: 600 },
            h6: { fontWeight: 600 },
        },
        shape: {
            borderRadius: 0,
        },
        components: getComponentOverrides(mode),
    });
};

// Export theme colors for use in components
export { themeColors };

// Default dark theme for backwards compatibility
export const theme = createAppTheme('dark');
