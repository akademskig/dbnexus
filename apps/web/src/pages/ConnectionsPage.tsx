import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
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
    ToggleButton,
    ToggleButtonGroup,
    Collapse,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FolderIcon from '@mui/icons-material/Folder';
import LayersIcon from '@mui/icons-material/Layers';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SyncIcon from '@mui/icons-material/Sync';
import { connectionsApi, projectsApi, groupsApi } from '../lib/api';
import type {
    ConnectionConfig,
    ConnectionCreateInput,
    Project,
    DatabaseGroup,
} from '@dbnexus/shared';
import { useTagsStore } from '../stores/tagsStore';
import { GlassCard } from '../components/GlassCard';

// Project colors for visual distinction
const PROJECT_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#0ea5e9', // sky
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899', // pink
];

export function ConnectionsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [formOpen, setFormOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
    const [projectFormOpen, setProjectFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [groupFormOpen, setGroupFormOpen] = useState(false);
    const [groupFormProjectId, setGroupFormProjectId] = useState<string | null>(null);
    const [editingGroup, setEditingGroup] = useState<DatabaseGroup | null>(null);

    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const { data: projects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['projects'],
        queryFn: projectsApi.getAll,
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    const isLoading = loadingConnections || loadingProjects;

    // Organize connections by project and group
    const organizedData = useMemo(() => {
        const projectMap = new Map<string, Project>();
        projects.forEach((p) => projectMap.set(p.id, p));

        const groupMap = new Map<string, DatabaseGroup>();
        groups.forEach((g) => groupMap.set(g.id, g));

        // Group connections
        const projectConnections = new Map<string, Map<string | null, ConnectionConfig[]>>();
        const ungroupedConnections: ConnectionConfig[] = [];

        connections.forEach((conn) => {
            if (conn.projectId) {
                if (!projectConnections.has(conn.projectId)) {
                    projectConnections.set(conn.projectId, new Map());
                }
                const projectGroups = projectConnections.get(conn.projectId)!;
                const groupKey = conn.groupId || null;
                if (!projectGroups.has(groupKey)) {
                    projectGroups.set(groupKey, []);
                }
                projectGroups.get(groupKey)!.push(conn);
            } else {
                ungroupedConnections.push(conn);
            }
        });

        return {
            projects: projects.map((p) => ({
                project: p,
                groups: projectConnections.get(p.id) || new Map(),
            })),
            ungroupedConnections,
            projectMap,
            groupMap,
        };
    }, [connections, projects, groups]);

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

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
        setProjectFormOpen(true);
    };

    const handleCloseProjectForm = () => {
        setProjectFormOpen(false);
        setEditingProject(null);
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

    const handleCloseGroupForm = () => {
        setGroupFormOpen(false);
        setGroupFormProjectId(null);
        setEditingGroup(null);
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
                        Organize database connections by project and group
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<FolderIcon />}
                        onClick={() => setProjectFormOpen(true)}
                    >
                        New Project
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setFormOpen(true)}
                    >
                        Add Connection
                    </Button>
                </Box>
            </Box>

            {/* Dialogs */}
            <ConnectionFormDialog
                open={formOpen}
                connection={editingConnection}
                projects={projects}
                groups={groups}
                onClose={handleCloseForm}
            />
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

            {/* Content */}
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : connections.length === 0 && projects.length === 0 ? (
                <GlassCard>
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <StorageIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            No connections yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Add your first database connection to get started
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Button variant="outlined" onClick={() => setProjectFormOpen(true)}>
                                Create Project
                            </Button>
                            <Button variant="contained" onClick={() => setFormOpen(true)}>
                                Add Connection
                            </Button>
                        </Box>
                    </Box>
                </GlassCard>
            ) : (
                <Stack spacing={3}>
                    {/* Projects */}
                    {organizedData.projects.map(({ project, groups: projectGroups }) => (
                        <ProjectSection
                            key={project.id}
                            project={project}
                            groupsMap={projectGroups}
                            allGroups={groups.filter((g) => g.projectId === project.id)}
                            onEditProject={() => handleEditProject(project)}
                            onAddGroup={() => handleAddGroup(project.id)}
                            onEditGroup={handleEditGroup}
                            onEditConnection={handleEdit}
                            onDeleteConnection={(id) => deleteMutation.mutate(id)}
                            onQuery={(id) => navigate(`/query/${id}`)}
                        />
                    ))}

                    {/* Ungrouped connections */}
                    {organizedData.ungroupedConnections.length > 0 && (
                        <Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.secondary',
                                    mb: 2,
                                    display: 'block',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontWeight: 500,
                                }}
                            >
                                Ungrouped Connections
                            </Typography>
                            <Stack spacing={1.5}>
                                {organizedData.ungroupedConnections.map((connection) => (
                                    <ConnectionCard
                                        key={connection.id}
                                        connection={connection}
                                        onEdit={() => handleEdit(connection)}
                                        onDelete={() => deleteMutation.mutate(connection.id)}
                                        onQuery={() => navigate(`/query/${connection.id}`)}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Stack>
            )}
        </Box>
    );
}

// Project section with groups and connections
function ProjectSection({
    project,
    groupsMap,
    allGroups,
    onEditProject,
    onAddGroup,
    onEditGroup,
    onEditConnection,
    onDeleteConnection,
    onQuery,
}: {
    project: Project;
    groupsMap: Map<string | null, ConnectionConfig[]>;
    allGroups: DatabaseGroup[];
    onEditProject: () => void;
    onAddGroup: () => void;
    onEditGroup: (group: DatabaseGroup) => void;
    onEditConnection: (conn: ConnectionConfig) => void;
    onDeleteConnection: (id: string) => void;
    onQuery: (id: string) => void;
}) {
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

// Database group section
function DatabaseGroupSection({
    group,
    connections,
    projectColor,
    onEditGroup,
    onEditConnection,
    onDeleteConnection,
    onQuery,
}: {
    group: DatabaseGroup;
    connections: ConnectionConfig[];
    projectColor: string;
    onEditGroup: () => void;
    onEditConnection: (conn: ConnectionConfig) => void;
    onDeleteConnection: (id: string) => void;
    onQuery: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const queryClient = useQueryClient();

    const deleteGroupMutation = useMutation({
        mutationFn: () => projectsApi.deleteGroup(group.projectId, group.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });

    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
            }}
        >
            {/* Group header */}
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 2,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 0.5,
                        bgcolor: `${projectColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <LayersIcon fontSize="small" sx={{ color: projectColor }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                        {group.name}
                    </Typography>
                    {group.description && (
                        <Typography variant="caption" color="text.secondary">
                            {group.description}
                        </Typography>
                    )}
                </Box>
                {(group.syncSchema || group.syncData) && (
                    <Chip
                        label={
                            group.syncSchema && group.syncData
                                ? 'Schema + Data'
                                : group.syncSchema
                                    ? 'Schema'
                                    : 'Data'
                        }
                        size="small"
                        icon={<SyncIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            height: 22,
                            fontSize: 11,
                            bgcolor: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            '& .MuiChip-icon': { color: '#22c55e' },
                        }}
                    />
                )}
                <Typography variant="caption" color="text.secondary">
                    {connections.length} instance{connections.length !== 1 ? 's' : ''}
                </Typography>
                <IconButton size="small">
                    {expanded ? (
                        <ExpandLessIcon fontSize="small" />
                    ) : (
                        <ExpandMoreIcon fontSize="small" />
                    )}
                </IconButton>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget);
                    }}
                    sx={{ color: 'text.secondary' }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Group menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
            >
                <MenuItem
                    component="a"
                    href={`/groups/${group.id}/sync`}
                    onClick={() => setMenuAnchor(null)}
                >
                    <ListItemIcon>
                        <SyncIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Sync Status</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        onEditGroup();
                    }}
                >
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Instance Group</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        deleteGroupMutation.mutate();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Instance Group</ListItemText>
                </MenuItem>
            </Menu>

            {/* Group connections */}
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
                    <Stack spacing={1}>
                        {connections.map((conn) => (
                            <ConnectionCard
                                key={conn.id}
                                connection={conn}
                                compact
                                onEdit={() => onEditConnection(conn)}
                                onDelete={() => onDeleteConnection(conn.id)}
                                onQuery={() => onQuery(conn.id)}
                            />
                        ))}
                        {connections.length === 0 && (
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.disabled', py: 2, textAlign: 'center' }}
                            >
                                No connections in this group
                            </Typography>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
}

// Connection card component
function ConnectionCard({
    connection,
    compact = false,
    onEdit,
    onDelete,
    onQuery,
}: {
    connection: ConnectionConfig;
    compact?: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onQuery: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );
    const { tags: availableTags } = useTagsStore();

    const handleTest = async (e: React.MouseEvent) => {
        e.stopPropagation();
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

    const connectionSummary =
        connection.engine === 'sqlite'
            ? connection.database
            : `${connection.host}:${connection.port}`;

    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
                '&:hover': { borderColor: 'primary.main' },
            }}
        >
            {/* Header */}
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: compact ? 1.5 : 2,
                    px: compact ? 2 : 2.5,
                    py: compact ? 1.25 : 1.75,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <StorageIcon
                    sx={{ fontSize: compact ? 18 : 20, color: 'primary.main', flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography
                            variant={compact ? 'body2' : 'body1'}
                            fontWeight={600}
                            sx={{ lineHeight: 1.3 }}
                        >
                            {connection.name}
                        </Typography>
                        <Chip
                            label={connection.engine.toUpperCase()}
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor:
                                    connection.engine === 'postgres'
                                        ? 'rgba(51, 103, 145, 0.2)'
                                        : 'rgba(0, 122, 204, 0.2)',
                                color: connection.engine === 'postgres' ? '#6BA3D6' : '#47A3F3',
                            }}
                        />
                        {connection.readOnly && (
                            <Chip
                                label="READ-ONLY"
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: 9,
                                    fontWeight: 600,
                                    bgcolor: 'rgba(139, 92, 246, 0.15)',
                                    color: 'rgb(139, 92, 246)',
                                }}
                            />
                        )}
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            mt: 0.25,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            fontFamily="monospace"
                            sx={{ fontSize: 11 }}
                        >
                            {connectionSummary}
                        </Typography>
                        {connection.database && connection.engine !== 'sqlite' && (
                            <>
                                <Typography variant="caption" color="text.disabled">
                                    •
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    fontFamily="monospace"
                                    sx={{ fontSize: 11 }}
                                >
                                    {connection.database}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Box>

                {/* Tags */}
                {connection.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flexShrink: 0 }}>
                        {connection.tags.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{
                                    ...getTagStyle(tag),
                                    height: 20,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    border: '1px solid',
                                }}
                            />
                        ))}
                    </Box>
                )}

                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    sx={{ color: 'text.secondary' }}
                >
                    {expanded ? (
                        <ExpandLessIcon fontSize="small" />
                    ) : (
                        <ExpandMoreIcon fontSize="small" />
                    )}
                </IconButton>

                <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuery();
                    }}
                    sx={{ flexShrink: 0 }}
                >
                    Query
                </Button>
            </Box>

            {/* Expanded content */}
            <Collapse in={expanded}>
                <Box
                    sx={{
                        px: compact ? 2 : 2.5,
                        py: 2,
                        bgcolor: 'background.default',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 2,
                            mb: 2.5,
                        }}
                    >
                        {connection.engine === 'sqlite' ? (
                            <DetailRow label="File" value={connection.database} />
                        ) : (
                            <>
                                <DetailRow
                                    label="Host"
                                    value={`${connection.host}:${connection.port}`}
                                />
                                <DetailRow label="Database" value={connection.database} />
                                <DetailRow label="User" value={connection.username} />
                                {connection.defaultSchema && (
                                    <DetailRow
                                        label="Default Schema"
                                        value={connection.defaultSchema}
                                    />
                                )}
                                {connection.ssl && <DetailRow label="SSL" value="Enabled" />}
                            </>
                        )}
                    </Box>

                    {testResult && (
                        <Alert
                            severity={testResult.success ? 'success' : 'error'}
                            onClose={() => setTestResult(null)}
                            sx={{ mb: 2 }}
                        >
                            {testResult.message}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={testing ? <CircularProgress size={14} /> : <ScienceIcon />}
                            onClick={handleTest}
                            disabled={testing}
                        >
                            Test
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={onEdit}
                        >
                            Edit
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={onDelete}
                        >
                            Delete
                        </Button>
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: 10,
                    fontWeight: 500,
                    mb: 0.25,
                }}
            >
                {label}
            </Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: 13 }}>
                {value}
            </Typography>
        </Box>
    );
}

// Project form dialog
function ProjectFormDialog({
    open,
    project,
    onClose,
}: {
    open: boolean;
    project: Project | null;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
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
function GroupFormDialog({
    open,
    group,
    projectId,
    onClose,
}: {
    open: boolean;
    group: DatabaseGroup | null;
    projectId: string | null;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleEnter = () => {
        if (group) {
            setName(group.name);
            setDescription(group.description || '');
        } else {
            setName('');
            setDescription('');
        }
    };

    const createMutation = useMutation({
        mutationFn: () => projectsApi.createGroup(projectId!, { name, description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: () => projectsApi.updateGroup(projectId!, group!.id, { name, description }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
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
function ConnectionFormDialog({
    open,
    connection,
    projects,
    groups,
    onClose,
}: {
    open: boolean;
    connection: ConnectionConfig | null;
    projects: Project[];
    groups: DatabaseGroup[];
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
    const availableGroups = groups.filter((g) => g.projectId === formData.projectId);

    const createMutation = useMutation({
        mutationFn: connectionsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
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
                                    {availableGroups.map((g) => (
                                        <MenuItem key={g.id} value={g.id}>
                                            {g.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Engine Selection */}
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
                                            port: value === 'sqlite' ? 0 : 5432,
                                            username: value === 'sqlite' ? '' : formData.username,
                                            password: value === 'sqlite' ? '' : formData.password,
                                        });
                                    }
                                }}
                                size="small"
                            >
                                <ToggleButton value="postgres">PostgreSQL</ToggleButton>
                                <ToggleButton value="sqlite">SQLite</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

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

                        {/* Default Schema - only for Postgres */}
                        {!isSqlite && (
                            <TextField
                                label="Default Schema"
                                value={formData.defaultSchema || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, defaultSchema: e.target.value })
                                }
                                placeholder="public"
                                helperText="Default schema to use (leave empty for 'public')"
                                fullWidth
                            />
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
