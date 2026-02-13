import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Typography,
    Box,
    Divider,
    alpha,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import PersonIcon from '@mui/icons-material/Person';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serversApi, connectionsApi } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';
import type { ServerConfig } from '@dbnexus/shared';
import { StatusAlert } from '@/components/StatusAlert';

interface CreateDatabaseDialogProps {
    open: boolean;
    server: ServerConfig;
    onClose: () => void;
}

export function CreateDatabaseDialog({ open, server, onClose }: CreateDatabaseDialogProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();

    const [databaseName, setDatabaseName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [createUser, setCreateUser] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [grantSchemaAccess, setGrantSchemaAccess] = useState(true);
    const [addToApp, setAddToApp] = useState(true);
    const [dbUsername, setDbUsername] = useState('');
    const [dbPassword, setDbPassword] = useState('');
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleEnter = () => {
        setDatabaseName('');
        setDisplayName('');
        setCreateUser(false);
        setUsername('');
        setPassword('');
        setGrantSchemaAccess(true);
        setAddToApp(true);
        setDbUsername('');
        setDbPassword('');
        setResult(null);
    };

    const addConnectionMutation = useMutation({
        mutationFn: connectionsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['server-databases', server.id] });
        },
    });

    const handleCreate = async () => {
        setCreating(true);
        setResult(null);

        try {
            // Create database on server
            const createResult = await serversApi.createDatabase(server.id, {
                databaseName,
                username: createUser ? username : undefined,
                password: createUser ? password : undefined,
                grantSchemaAccess: createUser ? grantSchemaAccess : undefined,
            });

            if (!createResult.success) {
                setResult(createResult);
                setCreating(false);
                return;
            }

            // Optionally add to app
            if (addToApp) {
                await addConnectionMutation.mutateAsync({
                    name: displayName || databaseName,
                    engine: server.engine,
                    host: server.host,
                    port: server.port,
                    database: databaseName,
                    username: createUser ? username : dbUsername,
                    password: createUser ? password : dbPassword,
                    ssl: server.ssl,
                    serverId: server.id,
                });
            }

            toast.success(createResult.message);
            onClose();
        } catch (error) {
            setResult({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create database',
            });
        } finally {
            setCreating(false);
        }
    };

    const hasServerCredentials = !!server.username;
    const canCreate = databaseName && hasServerCredentials;
    const needsDbCredentials = addToApp && !createUser;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            TransitionProps={{ onEnter: handleEnter }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StorageIcon color="primary" />
                    Create Database on Server
                </Box>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    {!hasServerCredentials && (
                        <StatusAlert severity="warning">
                            <Typography variant="body2" fontWeight={500}>
                                Admin credentials required
                            </Typography>
                            <Typography variant="body2">
                                This server does not have admin credentials configured. Edit the
                                server to add username and password to create databases.
                            </Typography>
                        </StatusAlert>
                    )}

                    <TextField
                        label="Database Name"
                        value={databaseName}
                        onChange={(e) =>
                            setDatabaseName(
                                e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                            )
                        }
                        placeholder="my_database"
                        helperText="Letters, numbers, and underscores only"
                        required
                        fullWidth
                        disabled={!hasServerCredentials}
                    />

                    <Divider />

                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={createUser}
                                    onChange={(e) => setCreateUser(e.target.checked)}
                                    disabled={!hasServerCredentials}
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body2">Create database user</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Create a new user with full access to this database
                                    </Typography>
                                </Box>
                            }
                        />

                        {createUser && (
                            <Box sx={{ pl: 4, mt: 1 }}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="db_user"
                                        size="small"
                                        fullWidth
                                        InputProps={{
                                            startAdornment: (
                                                <PersonIcon
                                                    sx={{
                                                        mr: 1,
                                                        color: 'text.secondary',
                                                        fontSize: 20,
                                                    }}
                                                />
                                            ),
                                        }}
                                    />
                                    <TextField
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        size="small"
                                        fullWidth
                                    />
                                    {server.engine === 'postgres' && (
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={grantSchemaAccess}
                                                    onChange={(e) =>
                                                        setGrantSchemaAccess(e.target.checked)
                                                    }
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Typography variant="body2" color="text.secondary">
                                                    Grant CREATE on public schema (required for
                                                    PostgreSQL 15+)
                                                </Typography>
                                            }
                                        />
                                    )}
                                </Stack>
                            </Box>
                        )}
                    </Box>

                    <Divider />

                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={addToApp}
                                    onChange={(e) => setAddToApp(e.target.checked)}
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body2">Add to DB Nexus</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Register this database as a connection in the app
                                    </Typography>
                                </Box>
                            }
                        />

                        {addToApp && (
                            <Box sx={{ pl: 4, mt: 1 }}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Display Name"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder={databaseName || 'My Database'}
                                        helperText="Friendly name for this connection"
                                        size="small"
                                        fullWidth
                                    />

                                    {needsDbCredentials && (
                                        <Box
                                            sx={{
                                                p: 2,
                                                borderRadius: 1,
                                                bgcolor: (theme) =>
                                                    alpha(theme.palette.info.main, 0.05),
                                                border: '1px solid',
                                                borderColor: (theme) =>
                                                    alpha(theme.palette.info.main, 0.2),
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ mb: 1, display: 'block' }}
                                            >
                                                Database access credentials
                                            </Typography>
                                            <Stack spacing={2}>
                                                <TextField
                                                    label="Username"
                                                    value={dbUsername}
                                                    onChange={(e) => setDbUsername(e.target.value)}
                                                    size="small"
                                                    fullWidth
                                                    required
                                                />
                                                <TextField
                                                    label="Password"
                                                    type="password"
                                                    value={dbPassword}
                                                    onChange={(e) => setDbPassword(e.target.value)}
                                                    size="small"
                                                    fullWidth
                                                    required
                                                />
                                            </Stack>
                                        </Box>
                                    )}
                                </Stack>
                            </Box>
                        )}
                    </Box>

                    {result && (
                        <StatusAlert severity={result.success ? 'success' : 'error'}>
                            {result.message}
                        </StatusAlert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ pb: 2, px: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleCreate}
                    variant="contained"
                    disabled={
                        !canCreate ||
                        creating ||
                        (addToApp && needsDbCredentials && (!dbUsername || !dbPassword))
                    }
                    startIcon={creating ? <CircularProgress size={16} /> : <StorageIcon />}
                >
                    {creating ? 'Creating...' : 'Create Database'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
