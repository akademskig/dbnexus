import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from './theme';
import { useThemeModeStore } from './stores/themeModeStore';
import { useColorSchemeStore } from './stores/colorSchemeStore';
import { ToastProvider } from './components/ToastProvider';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 1,
        },
    },
});

function ThemedApp() {
    const mode = useThemeModeStore((state) => state.mode);
    const colorScheme = useColorSchemeStore((state) => state.colorScheme);
    const theme = createAppTheme(mode, colorScheme);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <App />
            </BrowserRouter>
            <ToastProvider />
        </ThemeProvider>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemedApp />
        </QueryClientProvider>
    </React.StrictMode>
);
