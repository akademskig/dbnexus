import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    Grid,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    Alert,
    CircularProgress,
    Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import { connectionsApi } from '../lib/api';
import type { ConnectionConfig, ConnectionCreateInput } from '@dbnexus/shared';
import { useTagsStore } from '../stores/tagsStore';

export function ConnectionsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [formOpen, setFormOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

    const { data: connections = [], isLoading } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const deleteMutation = useMutation({
        mutationFn: connectionsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });

    const handleEdit = (connection: ConnectionConfig) => {
        setEditingConnection(connection);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingConnection(null);
    };

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 4,
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={600} gutterBottom>
                        Connections
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage your database connections
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    Add Connection
                </Button>
            </Box>

            {/* Connection Form Dialog */}
            <ConnectionFormDialog
                open={formOpen}
                connection={editingConnection}
                onClose={handleCloseForm}
            />

            {/* Connections Grid */}
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : connections.length === 0 ? (
                <Card sx={{ textAlign: 'center', py: 8 }}>
                    <CardContent>
                        <StorageIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            No connections yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Add your first database connection to get started
                        </Typography>
                        <Button variant="contained" onClick={() => setFormOpen(true)}>
                            Add Connection
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {connections.map((connection) => (
                        <Grid item xs={12} sm={6} lg={4} key={connection.id}>
                            <ConnectionCard
                                connection={connection}
                                onEdit={() => handleEdit(connection)}
                                onDelete={() => deleteMutation.mutate(connection.id)}
                                onQuery={() => navigate(`/query/${connection.id}`)}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}

function ConnectionCard({
    connection,
    onEdit,
    onDelete,
    onQuery,
}: {
    connection: ConnectionConfig;
    onEdit: () => void;
    onDelete: () => void;
    onQuery: () => void;
}) {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );
    const { tags: availableTags } = useTagsStore();

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await connectionsApi.test(connection.id);
            setTestResult(result);
        } catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : 'Test failed',
            });
        } finally {
            setTesting(false);
        }
    };

    const getTagStyle = (tagName: string) => {
        const tag = availableTags.find((t) => t.name === tagName);
        if (tag) {
            return {
                bgcolor: `rgba(${tag.color}, 0.15)`,
                color: `rgb(${tag.color})`,
                borderColor: `rgba(${tag.color}, 0.3)`,
            };
        }
        return {};
    };

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                bgcolor: 'primary.dark',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <StorageIcon sx={{ color: 'primary.light' }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {connection.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {connection.engine}
                            </Typography>
                        </Box>
                    </Box>
                    <Box>
                        <IconButton size="small" onClick={onEdit}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={onDelete} color="error">
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                {/* Connection details */}
                <Stack spacing={1} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                            Host
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace">
                            {connection.host}:{connection.port}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                            Database
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace">
                            {connection.database}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                            User
                        </Typography>
                        <Typography variant="body2" fontFamily="monospace">
                            {connection.username}
                        </Typography>
                    </Box>
                </Stack>

                {/* Tags */}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {connection.tags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{
                                ...getTagStyle(tag),
                                borderRadius: 0.5,
                                fontWeight: 500,
                                border: '1px solid',
                            }}
                        />
                    ))}
                    {connection.readOnly && (
                        <Chip
                            label="read-only"
                            size="small"
                            sx={{
                                borderRadius: 0.5,
                                fontWeight: 500,
                                bgcolor: 'rgba(139, 92, 246, 0.15)',
                                color: 'rgb(139, 92, 246)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                            }}
                        />
                    )}
                </Box>

                {/* Test result */}
                {testResult && (
                    <Alert
                        severity={testResult.success ? 'success' : 'error'}
                        sx={{ mb: 2 }}
                        onClose={() => setTestResult(null)}
                    >
                        {testResult.message}
                    </Alert>
                )}
            </CardContent>

            <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                    size="small"
                    startIcon={testing ? <CircularProgress size={16} /> : <ScienceIcon />}
                    onClick={handleTest}
                    disabled={testing}
                >
                    Test
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={onQuery}
                    sx={{ ml: 'auto' }}
                >
                    Query
                </Button>
            </CardActions>
        </Card>
    );
}

function ConnectionFormDialog({
    open,
    connection,
    onClose,
}: {
    open: boolean;
    connection: ConnectionConfig | null;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const { tags: availableTags } = useTagsStore();
    const [formData, setFormData] = useState<ConnectionCreateInput>({
        name: '',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        database: '',
        username: '',
        password: '',
        ssl: false,
        tags: [],
        readOnly: false,
    });
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );

    // Reset form when dialog opens
    const handleEnter = () => {
        if (connection) {
            setFormData({
                name: connection.name,
                engine: 'postgres',
                host: connection.host,
                port: connection.port,
                database: connection.database,
                username: connection.username,
                password: '',
                ssl: connection.ssl,
                tags: connection.tags,
                readOnly: connection.readOnly,
            });
        } else {
            setFormData({
                name: '',
                engine: 'postgres',
                host: 'localhost',
                port: 5432,
                database: '',
                username: '',
                password: '',
                ssl: false,
                tags: [],
                readOnly: false,
            });
        }
        setTestResult(null);
    };

    const createMutation = useMutation({
        mutationFn: connectionsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ConnectionCreateInput }) =>
            connectionsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (connection) {
            updateMutation.mutate({ id: connection.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await connectionsApi.testSettings(formData);
            setTestResult(result);
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
                <DialogTitle>{connection ? 'Edit Connection' : 'New Connection'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Connection Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="My Database"
                            required
                            fullWidth
                        />

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
                                    setFormData({ ...formData, port: parseInt(e.target.value) })
                                }
                                required
                                sx={{ flex: 1 }}
                            />
                        </Box>

                        <TextField
                            label="Database"
                            value={formData.database}
                            onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                            placeholder="mydb"
                            required
                            fullWidth
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Username"
                                value={formData.username}
                                onChange={(e) =>
                                    setFormData({ ...formData, username: e.target.value })
                                }
                                placeholder="postgres"
                                required
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Password"
                                type="password"
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                placeholder={connection ? '••••••••' : ''}
                                required={!connection}
                                sx={{ flex: 1 }}
                            />
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
                                                borderRadius: 0.5,
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

                        <Box sx={{ display: 'flex', gap: 3 }}>
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
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={formData.readOnly}
                                        onChange={(e) =>
                                            setFormData({ ...formData, readOnly: e.target.checked })
                                        }
                                    />
                                }
                                label="Read-only mode"
                            />
                        </Box>

                        {testResult && (
                            <Alert severity={testResult.success ? 'success' : 'error'}>
                                {testResult.message}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
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
                        {connection ? 'Save Changes' : 'Create Connection'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
