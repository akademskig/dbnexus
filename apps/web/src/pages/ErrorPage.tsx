import { Box, Typography, Button, Paper, alpha } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface ErrorPageProps {
    readonly type?: '404' | 'error';
    readonly title?: string;
    readonly message?: string;
}

export function ErrorPage({ type = '404', title, message }: ErrorPageProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const is404 = type === '404';
    const Icon = is404 ? SearchOffIcon : ErrorOutlineIcon;

    const defaultTitle = is404 ? 'Page Not Found' : 'Something Went Wrong';
    const defaultMessage = is404
        ? `The page "${location.pathname}" doesn't exist or has been moved.`
        : 'An unexpected error occurred. Please try again or go back to the dashboard.';

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                bgcolor: 'background.default',
                p: 3,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 6,
                    maxWidth: 480,
                    textAlign: 'center',
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(8px)',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                }}
            >
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        bgcolor: (theme) =>
                            alpha(
                                is404 ? theme.palette.warning.main : theme.palette.error.main,
                                0.1
                            ),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                    }}
                >
                    <Icon
                        sx={{
                            fontSize: 40,
                            color: is404 ? 'warning.main' : 'error.main',
                        }}
                    />
                </Box>

                <Typography variant="h4" fontWeight={700} gutterBottom>
                    {title || defaultTitle}
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
                    {message || defaultMessage}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                    >
                        Go Back
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<HomeIcon />}
                        onClick={() => navigate('/dashboard')}
                    >
                        Dashboard
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
