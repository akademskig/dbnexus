import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Chip,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serversApi } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';
import { useTagsStore } from '../../stores/tagsStore';
import type { ServerConfig, ServerCreateInput, DatabaseEngine } from '@dbnexus/shared';
import { StatusAlert } from '@/components/StatusAlert';

interface ServerFormDialogProps {
    open: boolean;
    server: ServerConfig | null;
    onClose: () => void;
}

export function ServerFormDialog({ open, server, onClose }: ServerFormDialogProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const { tags: availableTags } = useTagsStore();
    const [formData, setFormData] = useState<ServerCreateInput>({
        name: '',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        username: '',
        password: '',
        ssl: false,
        tags: [],
    });
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );

    const handleEnter = () => {
        if (server) {
            setFormData({
                name: server.name,
                engine: server.engine,
                host: server.host,
                port: server.port,
                username: server.username,
                password: '',
                ssl: server.ssl,
                tags: server.tags,
            });
        } else {
            setFormData({
                name: '',
                engine: 'postgres',
                host: 'localhost',
                port: 5432,
                username: '',
                password: '',
                ssl: false,
                tags: [],
            });
        }
        setTestResult(null);
    };

    // Get default port based on engine
    const getDefaultPort = (engine: DatabaseEngine) => {
        switch (engine) {
            case 'postgres':
                return 5432;
            case 'mysql':
                return 3306;
            case 'mariadb':
                return 3306;
            default:
                return 5432;
        }
    };

    const createMutation = useMutation({
        mutationFn: serversApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            toast.success('Server created');
            onClose();
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to create server');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ServerCreateInput }) =>
            serversApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            toast.success('Server updated');
            onClose();
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to update server');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (server) {
            // Only include password if user entered a new one
            const { password, ...rest } = formData;
            const updateData = password ? { ...rest, password } : rest;
            updateMutation.mutate({ id: server.id, data: updateData as ServerCreateInput });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            // For now, just validate the form
            // In the future, this can test actual connectivity
            if (formData.host && formData.port && formData.username) {
                setTestResult({ success: true, message: 'Server configuration is valid' });
            } else {
                setTestResult({ success: false, message: 'Please fill in all required fields' });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : 'Test failed',
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            TransitionProps={{ onEnter: handleEnter }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle>{server ? 'Edit Server' : 'New Server'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Server Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="My PostgreSQL Server"
                            helperText="A friendly name to identify this server"
                            required
                            fullWidth
                        />

                        {/* Engine Selection - Cannot change for existing server */}
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Database Engine
                            </Typography>
                            <ToggleButtonGroup
                                value={formData.engine}
                                exclusive
                                onChange={(_, value) => {
                                    if (value && !server) {
                                        setFormData({
                                            ...formData,
                                            engine: value,
                                            port: getDefaultPort(value),
                                        });
                                    }
                                }}
                                size="small"
                                disabled={!!server}
                                sx={{ flexWrap: 'wrap' }}
                            >
                                <ToggleButton value="postgres">PostgreSQL</ToggleButton>
                                <ToggleButton value="mysql">MySQL</ToggleButton>
                                <ToggleButton value="mariadb">MariaDB</ToggleButton>
                            </ToggleButtonGroup>
                            {server && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 0.5, display: 'block' }}
                                >
                                    Database engine cannot be changed after creation
                                </Typography>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Host"
                                value={formData.host}
                                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                placeholder="localhost"
                                required
                                sx={{ flex: 2 }}
                            />
                            <TextField
                                label="Port"
                                type="number"
                                value={formData.port}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        port: parseInt(e.target.value),
                                    })
                                }
                                required
                                sx={{ flex: 1 }}
                            />
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Admin Credentials (Optional)
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mb: 1.5, display: 'block' }}
                            >
                                Only needed if you have admin access to create databases or scan for
                                existing ones
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="Username"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({ ...formData, username: e.target.value })
                                    }
                                    placeholder="postgres"
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="Password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    placeholder={server ? '••••••••' : ''}
                                    helperText={server ? 'Leave empty to keep current' : undefined}
                                    sx={{ flex: 1 }}
                                />
                            </Box>
                        </Box>

                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Tags
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {availableTags.map((tag) => {
                                    const currentTags = formData.tags ?? [];
                                    const isSelected = currentTags.includes(tag.name);
                                    return (
                                        <Chip
                                            key={tag.id}
                                            label={tag.name}
                                            size="small"
                                            onClick={() => {
                                                if (isSelected) {
                                                    setFormData({
                                                        ...formData,
                                                        tags: currentTags.filter(
                                                            (t) => t !== tag.name
                                                        ),
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        tags: [...currentTags, tag.name],
                                                    });
                                                }
                                            }}
                                            sx={{
                                                cursor: 'pointer',
                                                borderRadius: '16px',
                                                fontWeight: 500,
                                                bgcolor: isSelected
                                                    ? `rgba(${tag.color}, 0.25)`
                                                    : `rgba(${tag.color}, 0.08)`,
                                                color: `rgb(${tag.color})`,
                                                border: isSelected
                                                    ? `2px solid rgba(${tag.color}, 0.6)`
                                                    : `1px solid rgba(${tag.color}, 0.3)`,
                                                '&:hover': {
                                                    bgcolor: `rgba(${tag.color}, 0.2)`,
                                                },
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                            {availableTags.length === 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    No tags available. Create tags in Settings.
                                </Typography>
                            )}
                        </Box>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.ssl}
                                    onChange={(e) =>
                                        setFormData({ ...formData, ssl: e.target.checked })
                                    }
                                />
                            }
                            label="Use SSL"
                        />

                        {testResult && (
                            <StatusAlert severity={testResult.success ? 'success' : 'error'}>
                                {testResult.message}
                            </StatusAlert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleTest}
                        disabled={testing}
                        startIcon={testing ? <CircularProgress size={16} /> : <ScienceIcon />}
                    >
                        Test
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={createMutation.isPending || updateMutation.isPending}
                    >
                        {server ? 'Save Changes' : 'Create Server'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
