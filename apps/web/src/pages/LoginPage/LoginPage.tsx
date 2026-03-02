import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    InputAdornment,
    IconButton,
    Divider,
    useTheme,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Email as EmailIcon,
    Person as PersonIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { DynamicLogo } from '../../components/DynamicLogo';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export function LoginPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const {
        login,
        register,
        isLoading,
        error,
        clearError,
        authEnabled,
        checkAuthStatus,
        isAuthenticated,
    } = useAuthStore();

    const [tabValue, setTabValue] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    useEffect(() => {
        // Only redirect if auth is enabled AND user is authenticated
        // Don't redirect if auth is disabled (no users yet) - user needs to register
        if (authEnabled === true && isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, authEnabled, navigate]);

    useEffect(() => {
        // If no users exist, show register tab
        if (authEnabled === false) {
            setTabValue(1);
        }
    }, [authEnabled]);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        try {
            await login(email, password);
            navigate('/');
        } catch {
            // Error is handled by the store
        }
    };

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();

        if (!email || !password) {
            setLocalError('Please fill in all fields');
            return;
        }

        if (password.length < 8) {
            setLocalError('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        try {
            await register(email, password, name || undefined);
            navigate('/');
        } catch {
            // Error is handled by the store
        }
    };

    const displayError = localError || error;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 2,
            }}
        >
            <Card
                sx={{
                    maxWidth: 440,
                    width: '100%',
                    borderRadius: 3,
                    boxShadow: theme.shadows[8],
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <DynamicLogo size={72} />
                        </Box>
                        <Typography variant="h4" fontWeight={600}>
                            DB Nexus
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {authEnabled === false
                                ? 'Create your admin account to get started'
                                : 'Sign in to manage your databases'}
                        </Typography>
                    </Box>

                    {authEnabled !== false && (
                        <Tabs
                            value={tabValue}
                            onChange={(_, v) => {
                                setTabValue(v);
                                clearError();
                                setLocalError(null);
                            }}
                            variant="fullWidth"
                            sx={{ mb: 1 }}
                        >
                            <Tab label="Sign In" />
                            <Tab label="Register" />
                        </Tabs>
                    )}

                    {displayError && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2 }}
                            onClose={() => {
                                clearError();
                                setLocalError(null);
                            }}
                        >
                            {displayError}
                        </Alert>
                    )}

                    <TabPanel value={tabValue} index={0}>
                        <form onSubmit={handleLogin}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                autoComplete="email"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                margin="normal"
                                autoComplete="current-password"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                size="small"
                                            >
                                                {showPassword ? (
                                                    <VisibilityOffIcon />
                                                ) : (
                                                    <VisibilityIcon />
                                                )}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={isLoading}
                                sx={{ mt: 3, py: 1.5 }}
                            >
                                {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
                            </Button>
                        </form>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <form onSubmit={handleRegister}>
                            {authEnabled === false && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    This will be the admin account for your DB Nexus instance.
                                </Alert>
                            )}
                            <TextField
                                fullWidth
                                label="Name (optional)"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                margin="normal"
                                autoComplete="name"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                autoComplete="email"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                margin="normal"
                                autoComplete="new-password"
                                helperText="Minimum 8 characters"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                size="small"
                                            >
                                                {showPassword ? (
                                                    <VisibilityOffIcon />
                                                ) : (
                                                    <VisibilityIcon />
                                                )}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Confirm Password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                margin="normal"
                                autoComplete="new-password"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={isLoading}
                                sx={{ mt: 3, py: 1.5 }}
                            >
                                {isLoading ? (
                                    <CircularProgress size={24} />
                                ) : authEnabled === false ? (
                                    'Create Admin Account'
                                ) : (
                                    'Create Account'
                                )}
                            </Button>
                        </form>
                    </TabPanel>

                    <Divider sx={{ my: 3 }} />

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        textAlign="center"
                    >
                        Local-first database management
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
}
