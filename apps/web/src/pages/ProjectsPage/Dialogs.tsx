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
    Stack,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';
import type { Project, DatabaseGroup } from '@dbnexus/shared';
import { PROJECT_COLORS } from './constants';

// Project form dialog
interface ProjectFormDialogProps {
    readonly open: boolean;
    readonly project: Project | null;
    readonly onClose: () => void;
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
                <DialogActions sx={{ p: 2 }}>
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
                <DialogActions sx={{ p: 2 }}>
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
