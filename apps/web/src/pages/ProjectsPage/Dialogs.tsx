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
    Alert,
    CircularProgress,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Select,
    FormControl,
    InputLabel,
    MenuItem,
    Chip,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { connectionsApi, projectsApi, schemaApi } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';
import type {
    ConnectionConfig,
    ConnectionCreateInput,
    Project,
    DatabaseGroup,
} from '@dbnexus/shared';
import { useTagsStore } from '../../stores/tagsStore';
import { PROJECT_COLORS } from './constants';

// Project form dialog
interface ProjectFormDialogProps {
    open: boolean;
    project: Project | null;
    onClose: () => void;
}

export function ProjectFormDialog({ open, project, onClose }: ProjectFormDialogProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(PROJECT_COLORS[0]);

    const handleEnter = () => {
        if (project) {
            setName(project.name);
            setDescription(project.description || '');
            setColor(project.color || PROJECT_COLORS[0]);
        } else {
            setName('');
            setDescription('');
            setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
        }
    };

    const createMutation = useMutation({
        mutationFn: projectsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project created');
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: { name: string; description?: string; color?: string };
        }) => projectsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project updated');
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (project) {
            updateMutation.mutate({ id: project.id, data: { name, description, color } });
        } else {
            createMutation.mutate({ name, description, color });
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
                <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Project Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Project"
                            required
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            multiline
                            rows={2}
                            fullWidth
                        />
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Color
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {PROJECT_COLORS.map((c) => (
                                    <Box
                                        key={c}
                                        onClick={() => setColor(c)}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            bgcolor: c,
                                            cursor: 'pointer',
                                            border: color === c ? '3px solid' : '1px solid',
                                            borderColor:
                                                color === c ? 'common.white' : 'transparent',
                                            '&:hover': { opacity: 0.8 },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={createMutation.isPending || updateMutation.isPending}
                    >
                        {project ? 'Save Changes' : 'Create Project'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

// Database group form dialog
interface GroupFormDialogProps {
    open: boolean;
    group: DatabaseGroup | null;
    projectId: string | null;
    onClose: () => void;
}

export function GroupFormDialog({ open, group, projectId, onClose }: GroupFormDialogProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [databaseEngine, setDatabaseEngine] = useState<
        'postgres' | 'mysql' | 'mariadb' | 'sqlite'
    >('postgres');

    const handleEnter = () => {
        if (group) {
            setName(group.name);
            setDescription(group.description || '');
            setDatabaseEngine(group.databaseEngine);
        } else {
            setName('');
            setDescription('');
            setDatabaseEngine('postgres');
        }
    };

    const createMutation = useMutation({
        mutationFn: () =>
            projectsApi.createGroup(projectId!, { name, description, databaseEngine }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('Instance group created');
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: () => projectsApi.updateGroup(projectId!, group!.id, { name, description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('Instance group updated');
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (group) {
            updateMutation.mutate();
        } else {
            createMutation.mutate();
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
                <DialogTitle>{group ? 'Edit Instance Group' : 'New Instance Group'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Group Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Users Database"
                            helperText="Group instances of the same database (local/dev/staging/prod)"
                            required
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            multiline
                            rows={2}
                            fullWidth
                        />

                        {/* Database Engine - Only for new groups */}
                        {!group && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Database Engine
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mb: 1, display: 'block' }}
                                >
                                    All connections in this group must use the same database engine
                                </Typography>
                                <ToggleButtonGroup
                                    value={databaseEngine}
                                    exclusive
                                    onChange={(_, value) => {
                                        if (value) setDatabaseEngine(value);
                                    }}
                                    size="small"
                                    sx={{ flexWrap: 'wrap' }}
                                >
                                    <ToggleButton value="postgres">PostgreSQL</ToggleButton>
                                    <ToggleButton value="mysql">MySQL</ToggleButton>
                                    <ToggleButton value="mariadb">MariaDB</ToggleButton>
                                    <ToggleButton value="sqlite">SQLite</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        )}

                        {/* Engine Display - For editing groups */}
                        {group && (
                            <TextField
                                label="Database Engine"
                                value={
                                    group.databaseEngine === 'postgres'
                                        ? 'PostgreSQL'
                                        : group.databaseEngine === 'mysql'
                                          ? 'MySQL'
                                          : group.databaseEngine === 'mariadb'
                                            ? 'MariaDB'
                                            : 'SQLite'
                                }
                                disabled
                                fullWidth
                                helperText="Database engine cannot be changed after group creation"
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={createMutation.isPending || updateMutation.isPending}
                    >
                        {group ? 'Save Changes' : 'Create Group'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

// Connection form dialog with project/group selection
interface ConnectionFormDialogProps {
    open: boolean;
    connection: ConnectionConfig | null;
    projects: Project[];
    groups: DatabaseGroup[];
    onClose: () => void;
}

export function ConnectionFormDialog({
    open,
    connection,
    projects,
    groups,
    onClose,
}: ConnectionFormDialogProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();
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
        defaultSchema: '',
        tags: [],
        readOnly: false,
        projectId: undefined,
        groupId: undefined,
    });
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );

    // Fetch schemas for the connection when editing (PostgreSQL only)
    const { data: schemas = [] } = useQuery({
        queryKey: ['schemas', connection?.id],
        queryFn: () => schemaApi.getSchemas(connection!.id),
        enabled: !!connection?.id && connection?.engine === 'postgres',
    });

    const handleEnter = () => {
        if (connection) {
            setFormData({
                name: connection.name,
                engine: connection.engine,
                host: connection.host,
                port: connection.port,
                database: connection.database,
                username: connection.username,
                password: '',
                ssl: connection.ssl,
                defaultSchema: connection.defaultSchema || '',
                tags: connection.tags,
                readOnly: connection.readOnly,
                projectId: connection.projectId,
                groupId: connection.groupId,
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
                defaultSchema: '',
                tags: [],
                readOnly: false,
                projectId: undefined,
                groupId: undefined,
            });
        }
        setTestResult(null);
    };

    const isSqlite = formData.engine === 'sqlite';
    const isMysql = formData.engine === 'mysql' || formData.engine === 'mariadb';
    // Filter groups by project AND database engine
    const availableGroups = groups.filter(
        (g) => g.projectId === formData.projectId && g.databaseEngine === formData.engine
    );

    // Get default port based on engine
    const getDefaultPort = (engine: string) => {
        switch (engine) {
            case 'postgres':
                return 5432;
            case 'mysql':
                return 3306;
            case 'mariadb':
                return 3306;
            default:
                return 0;
        }
    };

    const createMutation = useMutation({
        mutationFn: connectionsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Connection created');
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ConnectionCreateInput }) =>
            connectionsApi.update(id, {
                ...data,
                // Convert undefined to null for clearing project/group
                projectId: data.projectId === undefined ? null : data.projectId,
                groupId: data.groupId === undefined ? null : data.groupId,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Connection updated');
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

                        {/* Project & Group selection */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Project</InputLabel>
                                <Select
                                    value={formData.projectId || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            projectId: e.target.value || undefined,
                                            groupId: undefined, // Reset group when project changes
                                        })
                                    }
                                    label="Project"
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {projects.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 12,
                                                        height: 12,
                                                        bgcolor: p.color || PROJECT_COLORS[0],
                                                    }}
                                                />
                                                {p.name}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth disabled={!formData.projectId}>
                                <InputLabel>Instance Group</InputLabel>
                                <Select
                                    value={formData.groupId || ''}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            groupId: e.target.value || undefined,
                                        })
                                    }
                                    label="Instance Group"
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {availableGroups.length === 0 && formData.projectId && (
                                        <MenuItem disabled>
                                            <em>No groups for {formData.engine} in this project</em>
                                        </MenuItem>
                                    )}
                                    {availableGroups.map((g) => (
                                        <MenuItem key={g.id} value={g.id}>
                                            {g.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Engine Selection - Only for new connections */}
                        {!connection && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Database Engine
                                </Typography>
                                <ToggleButtonGroup
                                    value={formData.engine}
                                    exclusive
                                    onChange={(_, value) => {
                                        if (value) {
                                            setFormData({
                                                ...formData,
                                                engine: value,
                                                host: value === 'sqlite' ? '' : 'localhost',
                                                port: getDefaultPort(value),
                                                username:
                                                    value === 'sqlite' ? '' : formData.username,
                                                password:
                                                    value === 'sqlite' ? '' : formData.password,
                                                groupId: undefined, // Reset group when engine changes
                                            });
                                        }
                                    }}
                                    size="small"
                                    sx={{ flexWrap: 'wrap' }}
                                >
                                    <ToggleButton value="postgres">PostgreSQL</ToggleButton>
                                    <ToggleButton value="mysql">MySQL</ToggleButton>
                                    <ToggleButton value="mariadb">MariaDB</ToggleButton>
                                    <ToggleButton value="sqlite">SQLite</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        )}

                        {/* Engine Display - For editing connections */}
                        {connection && (
                            <TextField
                                label="Database Engine"
                                value={
                                    formData.engine === 'postgres'
                                        ? 'PostgreSQL'
                                        : formData.engine === 'mysql'
                                          ? 'MySQL'
                                          : formData.engine === 'mariadb'
                                            ? 'MariaDB'
                                            : 'SQLite'
                                }
                                disabled
                                fullWidth
                            />
                        )}

                        {/* PostgreSQL fields */}
                        {!isSqlite && (
                            <>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        label="Host"
                                        value={formData.host}
                                        onChange={(e) =>
                                            setFormData({ ...formData, host: e.target.value })
                                        }
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

                                <TextField
                                    label="Database"
                                    value={formData.database}
                                    onChange={(e) =>
                                        setFormData({ ...formData, database: e.target.value })
                                    }
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
                            </>
                        )}

                        {/* SQLite fields */}
                        {isSqlite && (
                            <TextField
                                label="Database File Path"
                                value={formData.database}
                                onChange={(e) =>
                                    setFormData({ ...formData, database: e.target.value })
                                }
                                placeholder="/path/to/database.db"
                                helperText="Absolute path to the SQLite database file"
                                required
                                fullWidth
                            />
                        )}

                        {/* Default Schema - for Postgres */}
                        {!isSqlite && !isMysql && (
                            <>
                                {connection && schemas.length > 0 ? (
                                    <FormControl fullWidth>
                                        <InputLabel>Default Schema</InputLabel>
                                        <Select
                                            value={formData.defaultSchema || ''}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    defaultSchema: e.target.value,
                                                })
                                            }
                                            label="Default Schema"
                                        >
                                            <MenuItem value="">
                                                <em>None (use &quot;public&quot;)</em>
                                            </MenuItem>
                                            {schemas.map((schema) => (
                                                <MenuItem key={schema} value={schema}>
                                                    {schema}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : (
                                    <TextField
                                        label="Default Schema"
                                        value={formData.defaultSchema || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                defaultSchema: e.target.value,
                                            })
                                        }
                                        placeholder="public"
                                        helperText="Default schema to use (leave empty for 'public')"
                                        fullWidth
                                    />
                                )}
                            </>
                        )}

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
                            {!isSqlite && (
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
                            )}
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
