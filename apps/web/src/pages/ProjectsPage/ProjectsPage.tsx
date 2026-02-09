import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Stack,
    alpha,
    TextField,
    InputAdornment,
    Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import FolderIcon from '@mui/icons-material/Folder';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { connectionsApi, projectsApi, groupsApi, serversApi } from '../../lib/api';
import type { ConnectionConfig, Project, DatabaseGroup } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { useToastStore } from '../../stores/toastStore';
import { useDragAutoScroll } from '../../hooks/useDragAutoScroll';
import { ProjectSection } from './ProjectSection';
import { ConnectionCard } from './ConnectionCard';
import { ProjectFormDialog, GroupFormDialog } from './Dialogs';
import { ConnectionFormDialog } from '../ConnectionsPage/Dialogs';
import { ScanConnectionsDialog } from '../../components/ScanConnectionsDialog';
import { GroupSettingsDialog } from '../GroupSyncPage/GroupSettingsDialog';

export function ProjectsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const toast = useToastStore();

    // Enable auto-scroll when dragging near viewport edges
    useDragAutoScroll({ scrollZone: 300, scrollSpeed: 15 });
    const [formOpen, setFormOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
    const [connectionFormProjectId, setConnectionFormProjectId] = useState<string | undefined>(
        undefined
    );
    const [connectionFormGroupId, setConnectionFormGroupId] = useState<string | undefined>(
        undefined
    );
    const [projectFormOpen, setProjectFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [groupFormOpen, setGroupFormOpen] = useState(false);
    const [groupFormProjectId, setGroupFormProjectId] = useState<string | null>(null);
    const [editingGroup, setEditingGroup] = useState<DatabaseGroup | null>(null);
    const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
    const [settingsGroup, setSettingsGroup] = useState<DatabaseGroup | null>(null);
    const [scanDialogOpen, setScanDialogOpen] = useState(false);
    const [isUngroupedDragOver, setIsUngroupedDragOver] = useState(false);
    const [showAllUngrouped, setShowAllUngrouped] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const UNGROUPED_LIMIT = 5;

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

    const { data: servers = [] } = useQuery({
        queryKey: ['servers'],
        queryFn: () => serversApi.getAll(),
    });

    const isLoading = loadingConnections || loadingProjects;

    // Organize connections by project and group with search filtering
    const organizedData = useMemo(() => {
        const projectMap = new Map<string, Project>();
        projects.forEach((p) => projectMap.set(p.id, p));

        const groupMap = new Map<string, DatabaseGroup>();
        groups.forEach((g) => groupMap.set(g.id, g));

        // Filter connections by search query
        const query = searchQuery.toLowerCase().trim();
        const filteredConnections = query
            ? connections.filter((conn) => {
                const matchesName = conn.name.toLowerCase().includes(query);
                const matchesHost = conn.host?.toLowerCase().includes(query);
                const matchesDatabase = conn.database?.toLowerCase().includes(query);
                const matchesEngine = conn.engine.toLowerCase().includes(query);
                const matchesType = conn.connectionType?.toLowerCase().includes(query);
                return (
                    matchesName || matchesHost || matchesDatabase || matchesEngine || matchesType
                );
            })
            : connections;

        // Group connections
        const projectConnections = new Map<string, Map<string | null, ConnectionConfig[]>>();
        const ungroupedConnections: ConnectionConfig[] = [];

        filteredConnections.forEach((conn) => {
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

        // Filter projects to only show those with connections (when searching)
        const filteredProjects = query
            ? projects.filter((p) => {
                const hasConnections = (projectConnections.get(p.id)?.size ?? 0) > 0;
                return hasConnections;
            })
            : projects;

        return {
            projects: filteredProjects.map((p) => ({
                project: p,
                groups: projectConnections.get(p.id) || new Map(),
            })),
            ungroupedConnections,
            projectMap,
            groupMap,
            totalFiltered: filteredConnections.length,
            totalOriginal: connections.length,
        };
    }, [connections, projects, groups, searchQuery]);

    const deleteMutation = useMutation({
        mutationFn: connectionsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Database deleted');
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
            toast.error('Failed to move database');
        },
    });

    const handleUngroupedDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsUngroupedDragOver(true);
    };

    const handleUngroupedDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsUngroupedDragOver(false);
        }
    };

    const handleUngroupedDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsUngroupedDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            // Move to ungrouped (remove from project and group)
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

    const handleEdit = (connection: ConnectionConfig) => {
        setEditingConnection(connection);
        setFormOpen(true);
    };

    const handleAddConnection = (projectId: string, groupId?: string) => {
        setConnectionFormProjectId(projectId);
        setConnectionFormGroupId(groupId);
        setEditingConnection(null);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingConnection(null);
        setConnectionFormProjectId(undefined);
        setConnectionFormGroupId(undefined);
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

    const handleGroupSettings = (group: DatabaseGroup) => {
        setSettingsGroup(group);
        setGroupSettingsOpen(true);
    };

    const handleCloseGroupForm = () => {
        setGroupFormOpen(false);
        setGroupFormProjectId(null);
        setEditingGroup(null);
    };

    return (
        <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
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
                        Projects
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
                        data-tour="create-project"
                    >
                        New Project
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<SearchIcon />}
                        onClick={() => setScanDialogOpen(true)}
                    >
                        Scan
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setFormOpen(true)}
                        data-tour="add-connection"
                    >
                        Add Database
                    </Button>
                </Box>
            </Box>

            {/* Search Bar */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    placeholder="Search databases by name, host, database, or engine..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                            <InputAdornment position="end">
                                <Button
                                    size="small"
                                    onClick={() => setSearchQuery('')}
                                    sx={{ minWidth: 'auto', p: 0.5 }}
                                >
                                    <ClearIcon fontSize="small" />
                                </Button>
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.paper',
                        },
                    }}
                />
                {searchQuery && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Found {organizedData.totalFiltered} of {organizedData.totalOriginal}{' '}
                            connections
                        </Typography>
                        {organizedData.totalFiltered === 0 && (
                            <Chip
                                label="No results"
                                size="small"
                                color="warning"
                                sx={{ height: 20, fontSize: 11 }}
                            />
                        )}
                    </Box>
                )}
            </Box>

            {/* Dialogs */}
            <ConnectionFormDialog
                open={formOpen}
                connection={editingConnection}
                projects={projects}
                groups={groups}
                servers={servers}
                onClose={handleCloseForm}
                initialProjectId={connectionFormProjectId}
                initialGroupId={connectionFormGroupId}
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
            {settingsGroup && (
                <GroupSettingsDialog
                    open={groupSettingsOpen}
                    onClose={() => setGroupSettingsOpen(false)}
                    group={settingsGroup}
                    connections={connections.filter((c) => c.groupId === settingsGroup.id)}
                />
            )}
            <ScanConnectionsDialog open={scanDialogOpen} onClose={() => setScanDialogOpen(false)} />

            {/* Content */}
            {isLoading ? (
                <LoadingState message="Loading connections..." size="large" />
            ) : connections.length === 0 && projects.length === 0 ? (
                <GlassCard>
                    <EmptyState
                        icon={<StorageIcon />}
                        title="No connections yet"
                        description="Add your first database connection to start exploring your data. You can scan for databases automatically or add them manually."
                        action={{
                            label: 'Scan for Databases',
                            onClick: () => setScanDialogOpen(true),
                            icon: <SearchIcon />,
                        }}
                        secondaryAction={{
                            label: 'Add Manually',
                            onClick: () => setFormOpen(true),
                        }}
                        tertiaryAction={{
                            label: 'Create Project',
                            onClick: () => setProjectFormOpen(true),
                        }}
                        size="large"
                    />
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
                            allConnections={connections}
                            onEditProject={() => handleEditProject(project)}
                            onAddGroup={() => handleAddGroup(project.id)}
                            onEditGroup={handleEditGroup}
                            onGroupSettings={handleGroupSettings}
                            onEditConnection={handleEdit}
                            onDeleteConnection={(id) => deleteMutation.mutate(id)}
                            onQuery={(id) => navigate(`/query/${id}`)}
                            onAddConnection={handleAddConnection}
                        />
                    ))}

                    {/* Ungrouped connections - also acts as drop zone */}
                    <Box
                        onDragOver={handleUngroupedDragOver}
                        onDragLeave={handleUngroupedDragLeave}
                        onDrop={handleUngroupedDrop}
                        sx={{
                            p: 2,
                            border: '2px solid',
                            borderColor: isUngroupedDragOver ? 'primary.main' : 'transparent',
                            borderStyle: isUngroupedDragOver ? 'dashed' : 'solid',
                            borderRadius: 1,
                            transition: 'border-color 0.15s, background-color 0.15s',
                            minHeight:
                                organizedData.ungroupedConnections.length === 0 ? 100 : 'auto',
                            ...(isUngroupedDragOver && {
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                            }),
                        }}
                    >
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
                            {isUngroupedDragOver && (
                                <Typography
                                    component="span"
                                    sx={{ ml: 1, color: 'primary.main', fontWeight: 600 }}
                                >
                                    — Drop here to remove from project
                                </Typography>
                            )}
                        </Typography>
                        {organizedData.ungroupedConnections.length > 0 ? (
                            <Stack spacing={1.5}>
                                {(showAllUngrouped
                                    ? organizedData.ungroupedConnections
                                    : organizedData.ungroupedConnections.slice(0, UNGROUPED_LIMIT)
                                ).map((connection) => (
                                    <ConnectionCard
                                        key={connection.id}
                                        connection={connection}
                                        onEdit={() => handleEdit(connection)}
                                        onDelete={() => deleteMutation.mutate(connection.id)}
                                        onQuery={() => navigate(`/query/${connection.id}`)}
                                    />
                                ))}
                                {organizedData.ungroupedConnections.length > UNGROUPED_LIMIT &&
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
                                                Show{' '}
                                                {organizedData.ungroupedConnections.length -
                                                    UNGROUPED_LIMIT}{' '}
                                                more connections
                                            </Button>
                                        </Box>
                                    )}
                                {showAllUngrouped &&
                                    organizedData.ungroupedConnections.length > UNGROUPED_LIMIT && (
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
                            </Stack>
                        ) : (
                            <Typography
                                variant="body2"
                                color="text.disabled"
                                sx={{ textAlign: 'center', py: 2 }}
                            >
                                {isUngroupedDragOver
                                    ? 'Release to move here'
                                    : 'Drag connections here to remove from projects'}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            )}
        </Box>
    );
}
