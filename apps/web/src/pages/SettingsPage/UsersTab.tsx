import { useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    People as PeopleIcon,
    AdminPanelSettings as AdminIcon,
    Edit as EditIcon,
    Security as SecurityIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '../../components/GlassCard';
import { useToastStore } from '../../stores/toastStore';
import { useAuthStore } from '../../stores/authStore';
import { usersApi, UserInfo } from '../../lib/api';

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'default'> = {
    admin: 'error',
    editor: 'warning',
    viewer: 'default',
};

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
};

export function UsersTab() {
    const toast = useToastStore();
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserInfo | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);

    const {
        data: users,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['users'],
        queryFn: () => usersApi.getAll(),
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }: { id: string; role: 'admin' | 'editor' | 'viewer' }) =>
            usersApi.updateRole(id, role),
        onSuccess: () => {
            toast.success('User role updated');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditingUserId(null);
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => usersApi.delete(id),
        onSuccess: () => {
            toast.success('User deleted');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const handleDeleteClick = (user: UserInfo) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleRoleChange = (userId: string, role: 'admin' | 'editor' | 'viewer') => {
        updateRoleMutation.mutate({ id: userId, role });
    };

    if (currentUser?.role !== 'admin') {
        return (
            <GlassCard>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <SecurityIcon sx={{ color: 'warning.main' }} />
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        Access Denied
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    Only administrators can manage users.
                </Typography>
            </GlassCard>
        );
    }

    if (isLoading) {
        return (
            <GlassCard>
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading users...
                    </Typography>
                </Box>
            </GlassCard>
        );
    }

    if (error) {
        return (
            <GlassCard>
                <Alert severity="error">Failed to load users: {(error as Error).message}</Alert>
            </GlassCard>
        );
    }

    return (
        <>
            <GlassCard>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <PeopleIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        User Management
                    </Typography>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Manage user accounts and their roles. Admins have full access, editors can
                    read/write data, and viewers have read-only access.
                </Typography>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                <TableCell sx={{ fontWeight: 600, width: 100 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {user.email}
                                            {user.id === currentUser?.id && (
                                                <Chip label="You" size="small" variant="outlined" />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{user.name || '-'}</TableCell>
                                    <TableCell>
                                        {editingUserId === user.id ? (
                                            <Select
                                                value={user.role}
                                                size="small"
                                                onChange={(e) =>
                                                    handleRoleChange(
                                                        user.id,
                                                        e.target.value as
                                                            | 'admin'
                                                            | 'editor'
                                                            | 'viewer'
                                                    )
                                                }
                                                onClose={() => setEditingUserId(null)}
                                                autoFocus
                                                sx={{ minWidth: 100 }}
                                            >
                                                <MenuItem value="admin">Admin</MenuItem>
                                                <MenuItem value="editor">Editor</MenuItem>
                                                <MenuItem value="viewer">Viewer</MenuItem>
                                            </Select>
                                        ) : (
                                            <Chip
                                                label={ROLE_LABELS[user.role]}
                                                size="small"
                                                color={ROLE_COLORS[user.role]}
                                                icon={
                                                    user.role === 'admin' ? (
                                                        <AdminIcon />
                                                    ) : undefined
                                                }
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => setEditingUserId(user.id)}
                                                disabled={user.id === currentUser?.id}
                                                title="Edit role"
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteClick(user)}
                                                disabled={user.id === currentUser?.id}
                                                title="Delete user"
                                                sx={{
                                                    '&:hover': { color: 'error.main' },
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </GlassCard>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Delete User</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This action cannot be undone.
                    </Alert>
                    <Typography variant="body2">
                        Are you sure you want to delete the user{' '}
                        <strong>{userToDelete?.email}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
