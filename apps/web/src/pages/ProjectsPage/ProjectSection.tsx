import { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Collapse,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Stack,
    alpha,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FolderIcon from '@mui/icons-material/Folder';
import LayersIcon from '@mui/icons-material/Layers';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, connectionsApi } from '../../lib/api';
import type { ConnectionConfig, Project, DatabaseGroup } from '@dbnexus/shared';
import { PROJECT_COLORS } from './constants';
import { ConnectionCard } from './ConnectionCard';
import { DatabaseGroupSection } from './DatabaseGroupSection';
import { useToastStore } from '../../stores/toastStore';

interface ProjectSectionProps {
    project: Project;
    groupsMap: Map<string | null, ConnectionConfig[]>;
    allGroups: DatabaseGroup[];
    onEditProject: () => void;
    onAddGroup: () => void;
    onEditGroup: (group: DatabaseGroup) => void;
    onEditConnection: (conn: ConnectionConfig) => void;
    onDeleteConnection: (id: string) => void;
    onQuery: (id: string) => void;
}

export function ProjectSection({
    project,
    groupsMap,
    allGroups,
    onEditProject,
    onAddGroup,
    onEditGroup,
    onEditConnection,
    onDeleteConnection,
    onQuery,
}: ProjectSectionProps) {
    const [expanded, setExpanded] = useState(true);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const queryClient = useQueryClient();
    const toast = useToastStore();

    const deleteProjectMutation = useMutation({
        mutationFn: () => projectsApi.delete(project.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });

    const moveConnectionMutation = useMutation({
        mutationFn: ({
            connectionId,
            projectId,
            groupId,
        }: {
            connectionId: string;
            projectId: string | null;
            groupId: string | null;
        }) => connectionsApi.update(connectionId, { projectId, groupId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Connection moved');
        },
        onError: () => {
            toast.error('Failed to move connection');
        },
    });

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only set isDragOver to false if we're leaving the container, not entering a child
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };

    // Called when a child element handles a drop - reset parent drag state
    const handleChildDrop = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            // Move to this project, remove from group (ungrouped within project)
            if (
                data.connectionId &&
                (data.currentProjectId !== project.id || data.currentGroupId)
            ) {
                moveConnectionMutation.mutate({
                    connectionId: data.connectionId,
                    projectId: project.id,
                    groupId: null,
                });
            }
        } catch {
            // Invalid drop data
        }
    };

    const projectColor = project.color || PROJECT_COLORS[0] || '#0ea5e9';
    const totalConnections = Array.from(groupsMap.values()).reduce(
        (sum, conns) => sum + conns.length,
        0
    );
    const ungroupedInProject = groupsMap.get(null) || [];

    return (
        <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: isDragOver ? 'primary.main' : 'divider',
                borderStyle: isDragOver ? 'dashed' : 'solid',
                overflow: 'hidden',
                transition: 'border-color 0.15s, background-color 0.15s',
                ...(isDragOver && {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                }),
            }}
        >
            {/* Project header */}
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 2,
                    cursor: 'pointer',
                    borderLeft: `3px solid ${projectColor}`,
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: `${projectColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <FolderIcon sx={{ color: projectColor, fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {project.name}
                    </Typography>
                    {project.description && (
                        <Typography variant="caption" color="text.secondary">
                            {project.description}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {totalConnections} connection{totalConnections !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        •
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {allGroups.length} group{allGroups.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>
                <IconButton size="small" sx={{ ml: 1 }}>
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget);
                    }}
                    sx={{ color: 'text.secondary' }}
                >
                    <MoreVertIcon />
                </IconButton>
            </Box>

            {/* Project menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
            >
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        onAddGroup();
                    }}
                >
                    <ListItemIcon>
                        <LayersIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Add Instance Group</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        onEditProject();
                    }}
                >
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Project</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        deleteProjectMutation.mutate();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Project</ListItemText>
                </MenuItem>
            </Menu>

            {/* Project content */}
            <Collapse in={expanded}>
                <Box
                    sx={{
                        px: 2,
                        py: 2,
                        bgcolor: 'background.default',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Stack spacing={2}>
                        {/* Database groups */}
                        {allGroups.map((group) => (
                            <DatabaseGroupSection
                                key={group.id}
                                group={group}
                                connections={groupsMap.get(group.id) || []}
                                projectColor={projectColor}
                                onEditGroup={() => onEditGroup(group)}
                                onEditConnection={onEditConnection}
                                onDeleteConnection={onDeleteConnection}
                                onQuery={onQuery}
                                onMoveConnection={(connectionId) =>
                                    moveConnectionMutation.mutate({
                                        connectionId,
                                        projectId: project.id,
                                        groupId: group.id,
                                    })
                                }
                                onDropComplete={handleChildDrop}
                            />
                        ))}

                        {/* Ungrouped connections in project */}
                        {ungroupedInProject.length > 0 && (
                            <Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        mb: 1.5,
                                        display: 'block',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontWeight: 500,
                                    }}
                                >
                                    Ungrouped
                                </Typography>
                                <Stack spacing={1}>
                                    {ungroupedInProject.map((conn) => (
                                        <ConnectionCard
                                            key={conn.id}
                                            connection={conn}
                                            compact
                                            onEdit={() => onEditConnection(conn)}
                                            onDelete={() => onDeleteConnection(conn.id)}
                                            onQuery={() => onQuery(conn.id)}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {totalConnections === 0 && allGroups.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    No connections or groups yet
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    Add an instance group to organize related database instances
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
}
