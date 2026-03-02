import { useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    InputAdornment,
    IconButton,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Email as EmailIcon,
    AdminPanelSettings as AdminIcon,
    Key as KeyIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '../../components/GlassCard';
import { useToastStore } from '../../stores/toastStore';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../lib/authApi';
import { apiKeysApi, ApiKeyInfo } from '../../lib/api';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrator',
    editor: 'Editor',
    viewer: 'Viewer',
};

export function AccountTab() {
    const toast = useToastStore();
    const queryClient = useQueryClient();
    const { user, accessToken, logout } = useAuthStore();
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // API Keys state
    const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
    const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false);
    const [keyToDelete, setKeyToDelete] = useState<ApiKeyInfo | null>(null);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyExpiry, setNewKeyExpiry] = useState('');
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const { data: apiKeys, isLoading: apiKeysLoading } = useQuery({
        queryKey: ['api-keys'],
        queryFn: () => apiKeysApi.getAll(),
    });

    const createKeyMutation = useMutation({
        mutationFn: () => apiKeysApi.create(newKeyName, newKeyExpiry || undefined),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            if (data.key) {
                setCreatedKey(data.key);
            }
            setNewKeyName('');
            setNewKeyExpiry('');
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const deleteKeyMutation = useMutation({
        mutationFn: (id: string) => apiKeysApi.delete(id),
        onSuccess: () => {
            toast.success('API key deleted');
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            setDeleteKeyDialogOpen(false);
            setKeyToDelete(null);
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const handleChangePassword = async () => {
        setError(null);

        if (!currentPassword || !newPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!accessToken) {
            setError('Not authenticated');
            return;
        }

        setIsSubmitting(true);
        try {
            await authApi.changePassword(currentPassword, newPassword, accessToken);
            toast.success('Password changed successfully. Please log in again.');
            setChangePasswordOpen(false);
            logout();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseDialog = () => {
        setChangePasswordOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswords(false);
        setError(null);
    };

    const handleCreateKey = () => {
        if (!newKeyName.trim()) {
            toast.error('Please enter a key name');
            return;
        }
        createKeyMutation.mutate();
    };

    const handleCopyKey = async () => {
        if (createdKey) {
            await navigator.clipboard.writeText(createdKey);
            setCopied(true);
            toast.success('API key copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCloseCreateKeyDialog = () => {
        setCreateKeyDialogOpen(false);
        setCreatedKey(null);
        setNewKeyName('');
        setNewKeyExpiry('');
    };

    if (!user) {
        return (
            <GlassCard>
                <Typography variant="body2" color="text.secondary">
                    Please log in to view account settings.
                </Typography>
            </GlassCard>
        );
    }

    return (
        <>
            <GlassCard sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <PersonIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        Account Information
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <EmailIcon sx={{ color: 'text.secondary' }} />
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Email
                            </Typography>
                            <Typography variant="body1">{user.email}</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PersonIcon sx={{ color: 'text.secondary' }} />
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Name
                            </Typography>
                            <Typography variant="body1">{user.name || 'Not set'}</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AdminIcon sx={{ color: 'text.secondary' }} />
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Role
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                                <Chip
                                    label={ROLE_LABELS[user.role] || user.role}
                                    size="small"
                                    color={
                                        user.role === 'admin'
                                            ? 'error'
                                            : user.role === 'editor'
                                              ? 'warning'
                                              : 'default'
                                    }
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </GlassCard>

            <GlassCard sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <LockIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        Security
                    </Typography>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Update your password or sign out of your account.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<LockIcon />}
                        onClick={() => setChangePasswordOpen(true)}
                        sx={{ textTransform: 'none' }}
                    >
                        Change Password
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<LogoutIcon />}
                        onClick={() => logout()}
                        sx={{ textTransform: 'none' }}
                    >
                        Sign Out
                    </Button>
                </Box>
            </GlassCard>

            {/* API Keys Section */}
            <GlassCard>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 3,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <KeyIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            API Keys
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateKeyDialogOpen(true)}
                        size="small"
                        sx={{ textTransform: 'none' }}
                    >
                        Create API Key
                    </Button>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    API keys allow programmatic access to DB Nexus from the CLI or scripts. Keys are
                    shown only once when created.
                </Typography>

                {apiKeysLoading ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Loading API keys...
                        </Typography>
                    </Box>
                ) : apiKeys && apiKeys.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Last Used</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Expires</TableCell>
                                    <TableCell sx={{ fontWeight: 600, width: 80 }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {apiKeys.map((key) => {
                                    const isExpired =
                                        key.expiresAt && new Date(key.expiresAt) < new Date();
                                    return (
                                        <TableRow key={key.id}>
                                            <TableCell>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                    }}
                                                >
                                                    {key.name}
                                                    {isExpired && (
                                                        <Chip
                                                            label="Expired"
                                                            size="small"
                                                            color="error"
                                                        />
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(key.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {key.lastUsedAt
                                                    ? new Date(key.lastUsedAt).toLocaleDateString()
                                                    : 'Never'}
                                            </TableCell>
                                            <TableCell>
                                                {key.expiresAt
                                                    ? new Date(key.expiresAt).toLocaleDateString()
                                                    : 'Never'}
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setKeyToDelete(key);
                                                        setDeleteKeyDialogOpen(true);
                                                    }}
                                                    title="Delete key"
                                                    sx={{ '&:hover': { color: 'error.main' } }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No API keys yet. Create one to get started.
                        </Typography>
                    </Box>
                )}
            </GlassCard>

            {/* Change Password Dialog */}
            <Dialog open={changePasswordOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Change Password</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        label="Current Password"
                        type={showPasswords ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        autoComplete="current-password"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        label="New Password"
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        autoComplete="new-password"
                        helperText="Minimum 8 characters"
                    />

                    <TextField
                        label="Confirm New Password"
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        fullWidth
                        margin="normal"
                        autoComplete="new-password"
                    />

                    <Alert severity="info" sx={{ mt: 2 }}>
                        You will be logged out after changing your password.
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleChangePassword}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Changing...' : 'Change Password'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create API Key Dialog */}
            <Dialog
                open={createKeyDialogOpen}
                onClose={handleCloseCreateKeyDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{createdKey ? 'API Key Created' : 'Create API Key'}</DialogTitle>
                <DialogContent>
                    {createdKey ? (
                        <>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Copy this key now. You will not be able to see it again!
                            </Alert>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 2,
                                    borderRadius: 1,
                                    bgcolor: 'action.hover',
                                    border: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        flex: 1,
                                        wordBreak: 'break-all',
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                    }}
                                >
                                    {createdKey}
                                </Typography>
                                <IconButton
                                    onClick={handleCopyKey}
                                    color={copied ? 'success' : 'primary'}
                                >
                                    {copied ? <CheckIcon /> : <CopyIcon />}
                                </IconButton>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                Use this key in the Authorization header:{' '}
                                <code>Bearer {'{your-key}'}</code>
                            </Typography>
                        </>
                    ) : (
                        <>
                            <TextField
                                label="Key Name"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                fullWidth
                                margin="normal"
                                placeholder="e.g., CLI Access, CI/CD Pipeline"
                                helperText="A descriptive name for this API key"
                            />
                            <TextField
                                label="Expiration Date (optional)"
                                type="date"
                                value={newKeyExpiry}
                                onChange={(e) => setNewKeyExpiry(e.target.value)}
                                fullWidth
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                                helperText="Leave empty for no expiration"
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button onClick={handleCloseCreateKeyDialog}>
                        {createdKey ? 'Close' : 'Cancel'}
                    </Button>
                    {!createdKey && (
                        <Button
                            variant="contained"
                            onClick={handleCreateKey}
                            disabled={createKeyMutation.isPending || !newKeyName.trim()}
                        >
                            {createKeyMutation.isPending ? 'Creating...' : 'Create'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Delete API Key Confirmation Dialog */}
            <Dialog
                open={deleteKeyDialogOpen}
                onClose={() => setDeleteKeyDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Delete API Key</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This action cannot be undone.
                    </Alert>
                    <Typography variant="body2">
                        Are you sure you want to delete the API key{' '}
                        <strong>{keyToDelete?.name}</strong>? Any applications using this key will
                        lose access.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button onClick={() => setDeleteKeyDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => keyToDelete && deleteKeyMutation.mutate(keyToDelete.id)}
                        disabled={deleteKeyMutation.isPending}
                    >
                        {deleteKeyMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
