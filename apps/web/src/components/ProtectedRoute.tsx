import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { useFavoriteTablesStore } from '../stores/favoriteTablesStore';
import { useThemeModeStore } from '../stores/themeModeStore';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const location = useLocation();
    const { isAuthenticated, authEnabled, checkAuthStatus, user } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);
    const syncFavorites = useFavoriteTablesStore((state) => state.syncFromBackend);
    const syncTheme = useThemeModeStore((state) => state.syncFromBackend);
    const setThemeUser = useThemeModeStore((state) => state.setCurrentUser);

    useEffect(() => {
        const check = async () => {
            await checkAuthStatus();
            setIsChecking(false);
        };
        check();
    }, [checkAuthStatus]);

    // Sync user preferences from backend when authenticated
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            setThemeUser(user.id);
            syncFavorites();
            syncTheme();
        }
    }, [isAuthenticated, user?.id, setThemeUser, syncFavorites, syncTheme]);

    if (isChecking) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    // If auth is not enabled (no users), redirect to login to create first admin
    if (authEnabled === false) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If auth is enabled but user is not authenticated, redirect to login
    if (authEnabled === true && !isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If auth status is still unknown (null), show loading
    if (authEnabled === null) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return <>{children}</>;
}
