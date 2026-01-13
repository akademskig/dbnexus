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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FolderIcon from '@mui/icons-material/Folder';
import LayersIcon from '@mui/icons-material/Layers';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../lib/api';
import type { ConnectionConfig, Project, DatabaseGroup } from '@dbnexus/shared';
import { PROJECT_COLORS } from './constants';
import { ConnectionCard } from './ConnectionCard';
import { DatabaseGroupSection } from './DatabaseGroupSection';

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
    const queryClient = useQueryClient();

    const deleteProjectMutation = useMutation({
        mutationFn: () => projectsApi.delete(project.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });

    const projectColor = project.color || PROJECT_COLORS[0] || '#0ea5e9';
    const totalConnections = Array.from(groupsMap.values()).reduce(
        (sum, conns) => sum + conns.length,
        0
    );
    const ungroupedInProject = groupsMap.get(null) || [];

    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
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
