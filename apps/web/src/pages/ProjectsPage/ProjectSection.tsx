import { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Chip,
    Collapse,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Stack,
    Button,
    alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { StyledTooltip } from '@/components/StyledTooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FolderIcon from '@mui/icons-material/Folder';
import LayersIcon from '@mui/icons-material/Layers';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StorageIcon from '@mui/icons-material/Storage';
import AddIcon from '@mui/icons-material/Add';
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
    allConnections: ConnectionConfig[];
    onEditProject: () => void;
    onAddGroup: () => void;
    onEditGroup: (group: DatabaseGroup) => void;
    onGroupSettings: (group: DatabaseGroup) => void;
    onEditConnection: (conn: ConnectionConfig) => void;
    onDeleteConnection: (id: string) => void;
    onQuery: (id: string) => void;
    onAddConnection: (projectId: string, groupId?: string) => void;
}

export function ProjectSection({
    project,
    groupsMap,
    allGroups,
    allConnections,
    onEditProject,
    onAddGroup,
    onEditGroup,
    onGroupSettings,
    onEditConnection,
    onDeleteConnection,
    onQuery,
    onAddConnection,
}: ProjectSectionProps) {
    const [expanded, setExpanded] = useState(true);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [showAllUngrouped, setShowAllUngrouped] = useState(false);
    const queryClient = useQueryClient();
    const toast = useToastStore();

    const UNGROUPED_LIMIT = 5;

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
            toast.success('Database moved');
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
                <Box sx={{ flex: 1, minWidth: 0 }}>
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
                    <StyledTooltip title="Connections">
                        <Chip
                            icon={<StorageIcon sx={{ fontSize: 14 }} />}
                            label={totalConnections}
                            size="small"
                            sx={{
                                height: 24,
                                fontSize: 12,
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                color: 'info.main',
                                border: '1px solid',
                                borderColor: (theme) => alpha(theme.palette.info.main, 0.3),
                                '& .MuiChip-icon': { color: 'info.main', fontSize: 14 },
                            }}
                        />
                    </StyledTooltip>
                    <StyledTooltip title="Groups">
                        <Chip
                            icon={<LayersIcon sx={{ fontSize: 14 }} />}
                            label={allGroups.length}
                            size="small"
                            sx={{
                                height: 24,
                                fontSize: 12,
                                fontWeight: 600,
                                bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                                color: 'success.main',
                                border: '1px solid',
                                borderColor: (theme) => alpha(theme.palette.success.main, 0.3),
                                '& .MuiChip-icon': { color: 'success.main', fontSize: 14 },
                            }}
                        />
                    </StyledTooltip>
                </Box>
                {/* Quick Actions */}
                <StyledTooltip title="Add Group">
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddGroup();
                        }}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                color: 'primary.main',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            },
                        }}
                    >
                        <AddIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
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
                                allConnections={allConnections}
                                projectColor={projectColor}
                                onEditGroup={() => onEditGroup(group)}
                                onGroupSettings={() => onGroupSettings(group)}
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
                                onAddConnection={() => onAddConnection(project.id, group.id)}
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
                                <Grid container spacing={2}>
                                    {(showAllUngrouped
                                        ? ungroupedInProject
                                        : ungroupedInProject.slice(0, UNGROUPED_LIMIT)
                                    ).map((conn) => (
                                        <Grid size={{ xs: 12 }} key={conn.id}>
                                            <ConnectionCard
                                                connection={conn}
                                                compact
                                                onEdit={() => onEditConnection(conn)}
                                                onDelete={() => onDeleteConnection(conn.id)}
                                                onQuery={() => onQuery(conn.id)}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                                {ungroupedInProject.length > UNGROUPED_LIMIT &&
                                    !showAllUngrouped && (
                                        <Box
                                            sx={{
                                                textAlign: 'center',
                                                pt: 1.5,
                                                borderTop: '1px solid',
                                                borderColor: 'divider',
                                                mt: 1.5,
                                            }}
                                        >
                                            <Button
                                                size="small"
                                                onClick={() => setShowAllUngrouped(true)}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 500,
                                                    fontSize: 13,
                                                    px: 2,
                                                    py: 0.75,
                                                    borderRadius: 1,
                                                    bgcolor: (theme) =>
                                                        alpha(theme.palette.primary.main, 0.05),
                                                    color: 'primary.main',
                                                    '&:hover': {
                                                        bgcolor: (theme) =>
                                                            alpha(theme.palette.primary.main, 0.1),
                                                    },
                                                }}
                                            >
                                                Show {ungroupedInProject.length - UNGROUPED_LIMIT}{' '}
                                                more connections
                                            </Button>
                                        </Box>
                                    )}
                                {showAllUngrouped &&
                                    ungroupedInProject.length > UNGROUPED_LIMIT && (
                                        <Box
                                            sx={{
                                                textAlign: 'center',
                                                pt: 1.5,
                                                borderTop: '1px solid',
                                                borderColor: 'divider',
                                                mt: 1.5,
                                            }}
                                        >
                                            <Button
                                                size="small"
                                                onClick={() => setShowAllUngrouped(false)}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 500,
                                                    fontSize: 13,
                                                    px: 2,
                                                    py: 0.75,
                                                    color: 'text.secondary',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover',
                                                        color: 'primary.main',
                                                    },
                                                }}
                                            >
                                                Show less
                                            </Button>
                                        </Box>
                                    )}
                            </Box>
                        )}

                        {totalConnections === 0 && (
                            <Box
                                sx={{
                                    textAlign: 'center',
                                    py: 4,
                                    px: 3,
                                    borderRadius: 1,
                                    border: '1px dashed',
                                    borderColor: 'divider',
                                }}
                            >
                                <StorageIcon
                                    sx={{
                                        fontSize: 40,
                                        color: 'text.disabled',
                                        mb: 1,
                                        opacity: 0.5,
                                    }}
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    No connections in this project yet
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    sx={{ display: 'block', mb: 2 }}
                                >
                                    Drag connections here or click + to add
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={onAddGroup}
                                    sx={{ textTransform: 'none', fontSize: 12 }}
                                >
                                    Add Instance Group
                                </Button>
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
}
