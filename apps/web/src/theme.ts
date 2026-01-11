import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#0ea5e9',
            light: '#38bdf8',
            dark: '#0369a1',
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
        background: {
            default: '#09090b',
            paper: 'rgb(20, 25, 27);',
        },
        text: {
            primary: '#fafafa',
            secondary: '#a1a1aa',
        },
        divider: '#27272a',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 600,
        },
        h2: {
            fontWeight: 600,
        },
        h3: {
            fontWeight: 600,
        },
        h4: {
            fontWeight: 600,
        },
        h5: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 0,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
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
                    border: '1px solid #27272a',
                    borderRadius: 0,
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                size: 'small',
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
                size: 'small',
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
                    borderColor: '#27272a',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: '#18181b',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: '1px solid #27272a',
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
                        backgroundColor: 'rgba(14, 165, 233, 0.15)',
                        '&:hover': {
                            backgroundColor: 'rgba(14, 165, 233, 0.25)',
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
    },
});
