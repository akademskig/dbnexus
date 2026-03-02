import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    IconButton,
    alpha,
    Collapse,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Button,
    Chip,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import LayersIcon from '@mui/icons-material/Layers';
import SyncIcon from '@mui/icons-material/Sync';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Project, ConnectionConfig, DatabaseGroup } from '@dbnexus/shared';
import { StyledTooltip } from '../../components/StyledTooltip';
import { GlassCard } from '../../components/GlassCard';
import { useConnectionHealthStore } from '../../stores/connectionHealthStore';
import { useToastStore } from '../../stores/toastStore';
import { projectsApi, connectionsApi, groupsApi } from '../../lib/api';
import { ProjectFormDialog, GroupFormDialog } from '../ProjectsPage/Dialogs';
import { GroupSettingsDialog } from '../GroupSyncPage/GroupSettingsDialog';

interface ProjectsSectionProps {
    projects: Project[];
    connections: ConnectionConfig[];
    loading?: boolean;
}

function ConnectionRow({
    connection,
    onNavigate,
    indent,
}: {
    connection: ConnectionConfig;
    onNavigate: (path: string) => void;
    indent?: number;
}) {
    const { isOnline } = useConnectionHealthStore();
    const online = isOnline(connection.id);

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
                connectionId: connection.id,
                connectionName: connection.name,
                currentProjectId: connection.projectId || null,
                currentGroupId: connection.groupId || null,
            })
        );
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <StyledTooltip title="Connection is offline" placement="top" disableHoverListener={online}>
            <Box
                draggable
                onDragStart={handleDragStart}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 0.75,
                    px: 2,
                    pl: indent || 5,
                    cursor: 'grab',
                    transition: 'background 0.15s, opacity 0.15s',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                    '&:active': {
                        cursor: 'grabbing',
                        opacity: 0.6,
                    },
                }}
            >
                <Box
                    sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: online ? 'success.main' : 'error.main',
                        flexShrink: 0,
                    }}
                />
                <StorageIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography
                    variant="caption"
                    sx={{
                        flex: 1,
                        fontWeight: 500,
                        color: online ? 'text.primary' : 'text.disabled',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {connection.name}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0, fontSize: 10 }}
                >
                    {connection.engine.toUpperCase()}
                </Typography>
                <StyledTooltip title="Query">
                    <span>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(`/query/${connection.id}`);
                            }}
                            disabled={!online}
                            sx={{ p: 0.25 }}
                        >
                            <PlayArrowIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </span>
                </StyledTooltip>
            </Box>
        </StyledTooltip>
    );
}

function GroupSection({
    group,
    connections,
    onNavigate,
    onEdit,
    onDelete,
    onSyncSettings,
    onMoveConnection,
}: {
    group: DatabaseGroup;
    connections: ConnectionConfig[];
    onNavigate: (path: string) => void;
    onEdit: () => void;
    onDelete: () => void;
    onSyncSettings: () => void;
    onMoveConnection: (connectionId: string, groupId: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    const groupConnections = connections.filter((c) => c.groupId === group.id);
    const hasSyncEnabled = group.syncSchema || group.syncData;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.connectionId && data.currentGroupId !== group.id) {
                onMoveConnection(data.connectionId, group.id);
            }
        } catch {
            // Invalid drop data
        }
    };

    const isSyncEnabled = hasSyncEnabled;

    return (
        <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
                ml: 1,
                mr: 1,
                borderRadius: 1,
                border: '1px solid',
                borderColor: isDragOver ? 'primary.main' : 'divider',
                borderStyle: isDragOver ? 'dashed' : 'solid',
                bgcolor: isDragOver
                    ? (theme) => alpha(theme.palette.primary.main, 0.05)
                    : 'transparent',
                transition: 'all 0.15s',
                overflow: 'hidden',
            }}
        >
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 1,
                    px: 1.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    bgcolor: expanded
                        ? (theme) => alpha(theme.palette.primary.main, 0.04)
                        : 'transparent',
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                    },
                }}
            >
                <LayersIcon
                    sx={{ fontSize: 14, color: isSyncEnabled ? 'success.main' : 'text.primary' }}
                />
                <Typography
                    variant="caption"
                    sx={{
                        flex: 1,
                        fontWeight: 500,
                        fontSize: 12,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {group.name}
                </Typography>
                {hasSyncEnabled && (
                    <StyledTooltip title="Sync enabled">
                        <SyncIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    </StyledTooltip>
                )}
                <StyledTooltip
                    title={`${groupConnections.length} connection${groupConnections.length !== 1 ? 's' : ''}`}
                >
                    <Chip
                        label={groupConnections.length}
                        size="small"
                        variant="outlined"
                        sx={{ height: 16, fontSize: 10, minWidth: 20, borderColor: 'divider' }}
                    />
                </StyledTooltip>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    sx={{
                        p: 0.25,
                        transition: 'transform 0.2s',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                >
                    <ExpandMoreIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget);
                    }}
                    sx={{ p: 0.25, color: 'text.secondary' }}
                >
                    <MoreVertIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </Box>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
            >
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        onSyncSettings();
                    }}
                >
                    <ListItemIcon>
                        <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Sync Settings</ListItemText>
                </MenuItem>
                {hasSyncEnabled && (
                    <MenuItem
                        onClick={() => {
                            setMenuAnchor(null);
                            onNavigate(`/groups/${group.id}/sync`);
                        }}
                    >
                        <ListItemIcon>
                            <OpenInNewIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Open Sync Page</ListItemText>
                    </MenuItem>
                )}
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        onEdit();
                    }}
                >
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Group</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        onDelete();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Group</ListItemText>
                </MenuItem>
            </Menu>

            <Collapse in={expanded}>
                <Box sx={{ py: 0.5, bgcolor: 'background.default', borderRadius: '0 0 4px 4px' }}>
                    {groupConnections.length > 0 ? (
                        groupConnections.map((conn) => (
                            <ConnectionRow
                                key={conn.id}
                                connection={conn}
                                onNavigate={onNavigate}
                                indent={3}
                            />
                        ))
                    ) : (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', textAlign: 'center', py: 1 }}
                        >
                            {isDragOver ? 'Drop to add' : 'Drag connections here'}
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}

function ProjectRow({
    project,
    connections,
    groups,
    onEdit,
    onDelete,
    onNavigate,
    onMoveConnection,
    onMoveConnectionToGroup,
    onAddGroup,
    onEditGroup,
    onDeleteGroup,
    onSyncSettings,
}: {
    project: Project;
    connections: ConnectionConfig[];
    groups: DatabaseGroup[];
    onEdit: () => void;
    onDelete: () => void;
    onNavigate: (path: string) => void;
    onMoveConnection: (connectionId: string, projectId: string | null) => void;
    onMoveConnectionToGroup: (connectionId: string, projectId: string, groupId: string) => void;
    onAddGroup: () => void;
    onEditGroup: (group: DatabaseGroup) => void;
    onDeleteGroup: (groupId: string) => void;
    onSyncSettings: (group: DatabaseGroup) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const projectColor = project.color || '#6366f1';
    const projectConnections = connections.filter((c) => c.projectId === project.id);
    const projectGroups = groups.filter((g) => g.projectId === project.id);
    const ungroupedProjectConnections = projectConnections.filter((c) => !c.groupId);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.connectionId && data.currentProjectId !== project.id) {
                onMoveConnection(data.connectionId, project.id);
            }
        } catch {
            // Invalid drop data
        }
    };

    return (
        <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                transition: 'background 0.15s',
                ...(isDragOver && {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                }),
                '&:last-child': {
                    borderBottom: 'none',
                },
            }}
        >
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.25,
                    px: 2,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    bgcolor: expanded
                        ? (theme) => alpha(theme.palette.primary.main, 0.04)
                        : 'transparent',
                    '&:hover': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                    },
                }}
            >
                <Box
                    sx={{
                        width: 26,
                        height: 26,
                        borderRadius: 1,
                        bgcolor: alpha(projectColor, 0.12),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <FolderIcon sx={{ fontSize: 14, color: projectColor }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 500,
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {project.name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {projectGroups.length > 0 && (
                        <StyledTooltip
                            title={`${projectGroups.length} group${projectGroups.length !== 1 ? 's' : ''}`}
                        >
                            <Chip
                                icon={<LayersIcon sx={{ fontSize: 12 }} />}
                                label={projectGroups.length}
                                size="small"
                                variant="outlined"
                                sx={{
                                    height: 18,
                                    fontSize: 10,
                                    '& .MuiChip-icon': { ml: 0.5 },
                                    borderColor: 'divider',
                                }}
                            />
                        </StyledTooltip>
                    )}
                    <StyledTooltip
                        title={`${projectConnections.length} database${projectConnections.length !== 1 ? 's' : ''}`}
                    >
                        <Chip
                            icon={<StorageIcon sx={{ fontSize: 12 }} />}
                            label={projectConnections.length}
                            size="small"
                            variant="outlined"
                            sx={{
                                height: 18,
                                fontSize: 10,
                                '& .MuiChip-icon': { ml: 0.5 },
                                borderColor: 'divider',
                            }}
                        />
                    </StyledTooltip>
                </Box>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    sx={{
                        transition: 'transform 0.2s',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                >
                    <ExpandMoreIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget);
                    }}
                    sx={{ color: 'text.secondary' }}
                >
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Box>

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
                    <ListItemText>Add Sync Group</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        onEdit();
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
                        onDelete();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Project</ListItemText>
                </MenuItem>
            </Menu>

            <Collapse in={expanded}>
                <Box
                    sx={{
                        bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                        py: 1.5,
                        borderLeft: '3px solid transparent',
                    }}
                >
                    {/* Groups */}
                    {projectGroups.map((group) => (
                        <GroupSection
                            key={group.id}
                            group={group}
                            connections={connections}
                            onNavigate={onNavigate}
                            onEdit={() => onEditGroup(group)}
                            onDelete={() => onDeleteGroup(group.id)}
                            onSyncSettings={() => onSyncSettings(group)}
                            onMoveConnection={(connId, groupId) =>
                                onMoveConnectionToGroup(connId, project.id, groupId)
                            }
                        />
                    ))}

                    {/* Ungrouped connections */}
                    {ungroupedProjectConnections.length > 0 && (
                        <Box sx={{ mt: projectGroups.length > 0 ? 1 : 0 }}>
                            {projectGroups.length > 0 && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        display: 'block',
                                        px: 2,
                                        py: 0.5,
                                        fontWeight: 500,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        fontSize: 9,
                                    }}
                                >
                                    Ungrouped
                                </Typography>
                            )}
                            {ungroupedProjectConnections.map((conn) => (
                                <ConnectionRow
                                    key={conn.id}
                                    connection={conn}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </Box>
                    )}

                    {/* Empty state */}
                    {projectConnections.length === 0 && projectGroups.length === 0 && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', textAlign: 'center', py: 2 }}
                        >
                            {isDragOver
                                ? 'Drop here to add'
                                : 'No connections - drag databases here'}
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}

export function ProjectsSection({ projects, connections, loading }: ProjectsSectionProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [projectFormOpen, setProjectFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [groupFormOpen, setGroupFormOpen] = useState(false);
    const [groupFormProjectId, setGroupFormProjectId] = useState<string | null>(null);
    const [editingGroup, setEditingGroup] = useState<DatabaseGroup | null>(null);
    const [settingsGroup, setSettingsGroup] = useState<DatabaseGroup | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    const ungroupedConnections = useMemo(
        () => connections.filter((c) => !c.projectId),
        [connections]
    );

    const deleteProjectMutation = useMutation({
        mutationFn: (projectId: string) => projectsApi.delete(projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Project deleted');
        },
        onError: () => {
            toast.error('Failed to delete project');
        },
    });

    const deleteGroupMutation = useMutation({
        mutationFn: ({ projectId, groupId }: { projectId: string; groupId: string }) =>
            projectsApi.deleteGroup(projectId, groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Group deleted');
        },
        onError: () => {
            toast.error('Failed to delete group');
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

    const handleMoveConnection = (connectionId: string, projectId: string | null) => {
        moveConnectionMutation.mutate({ connectionId, projectId, groupId: null });
    };

    const handleMoveConnectionToGroup = (
        connectionId: string,
        projectId: string,
        groupId: string
    ) => {
        moveConnectionMutation.mutate({ connectionId, projectId, groupId });
    };

    const handleUngroupedDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleUngroupedDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };

    const handleUngroupedDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.connectionId && (data.currentProjectId || data.currentGroupId)) {
                moveConnectionMutation.mutate({
                    connectionId: data.connectionId,
                    projectId: null,
                    groupId: null,
                });
            }
        } catch {
            // Invalid drop data
        }
    };

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
        setProjectFormOpen(true);
    };

    const handleAddGroup = (projectId: string) => {
        setGroupFormProjectId(projectId);
        setEditingGroup(null);
        setGroupFormOpen(true);
    };

    const handleEditGroup = (group: DatabaseGroup) => {
        setEditingGroup(group);
        setGroupFormProjectId(group.projectId);
        setGroupFormOpen(true);
    };

    const handleCloseProjectForm = () => {
        setProjectFormOpen(false);
        setEditingProject(null);
    };

    const handleCloseGroupForm = () => {
        setGroupFormOpen(false);
        setGroupFormProjectId(null);
        setEditingGroup(null);
    };

    if (!loading && projects.length === 0 && connections.length === 0) {
        return null;
    }

    return (
        <>
            <GlassCard noPadding>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <FolderIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Projects & Groups
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                        {projects.length} project{projects.length !== 1 ? 's' : ''}
                    </Typography>
                    <StyledTooltip title="New Project">
                        <IconButton size="small" onClick={() => setProjectFormOpen(true)}>
                            <AddIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </StyledTooltip>
                </Box>

                {projects.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3, px: 2 }}>
                        <FolderIcon
                            sx={{ fontSize: 32, color: 'text.disabled', mb: 1, opacity: 0.5 }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            No projects yet
                        </Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => setProjectFormOpen(true)}
                        >
                            Create Project
                        </Button>
                    </Box>
                ) : (
                    projects.map((project) => (
                        <ProjectRow
                            key={project.id}
                            project={project}
                            connections={connections}
                            groups={groups}
                            onEdit={() => handleEditProject(project)}
                            onDelete={() => deleteProjectMutation.mutate(project.id)}
                            onNavigate={(path) => navigate(path)}
                            onMoveConnection={handleMoveConnection}
                            onMoveConnectionToGroup={handleMoveConnectionToGroup}
                            onAddGroup={() => handleAddGroup(project.id)}
                            onEditGroup={handleEditGroup}
                            onDeleteGroup={(groupId) =>
                                deleteGroupMutation.mutate({ projectId: project.id, groupId })
                            }
                            onSyncSettings={(group) => setSettingsGroup(group)}
                        />
                    ))
                )}

                {ungroupedConnections.length > 0 && (
                    <Box
                        onDragOver={handleUngroupedDragOver}
                        onDragLeave={handleUngroupedDragLeave}
                        onDrop={handleUngroupedDrop}
                        sx={{
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            transition: 'background 0.15s',
                            ...(isDragOver && {
                                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                            }),
                        }}
                    >
                        <Box sx={{ px: 2, py: 1, bgcolor: 'background.default' }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                }}
                            >
                                Unassigned ({ungroupedConnections.length})
                            </Typography>
                        </Box>
                        {ungroupedConnections.slice(0, 5).map((conn) => (
                            <ConnectionRow
                                key={conn.id}
                                connection={conn}
                                onNavigate={(path) => navigate(path)}
                            />
                        ))}
                        {ungroupedConnections.length > 5 && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', textAlign: 'center', py: 1 }}
                            >
                                +{ungroupedConnections.length - 5} more
                            </Typography>
                        )}
                    </Box>
                )}
            </GlassCard>

            <ProjectFormDialog
                open={projectFormOpen}
                project={editingProject}
                onClose={handleCloseProjectForm}
            />

            <GroupFormDialog
                open={groupFormOpen}
                group={editingGroup}
                projectId={groupFormProjectId}
                onClose={handleCloseGroupForm}
            />

            {settingsGroup && (
                <GroupSettingsDialog
                    open={Boolean(settingsGroup)}
                    onClose={() => setSettingsGroup(null)}
                    group={settingsGroup}
                    connections={connections.filter((c) => c.groupId === settingsGroup.id)}
                />
            )}
        </>
    );
}
