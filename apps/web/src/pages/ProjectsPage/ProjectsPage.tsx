import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack, alpha } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import FolderIcon from '@mui/icons-material/Folder';
import SearchIcon from '@mui/icons-material/Search';
import { connectionsApi, projectsApi, groupsApi } from '../../lib/api';
import type { ConnectionConfig, Project, DatabaseGroup } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { useToastStore } from '../../stores/toastStore';
import { ProjectSection } from './ProjectSection';
import { ConnectionCard } from './ConnectionCard';
import { ConnectionFormDialog, ProjectFormDialog, GroupFormDialog } from './Dialogs';
import { ScanConnectionsDialog } from '../../components/ScanConnectionsDialog';

export function ProjectsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const toast = useToastStore();
    const [formOpen, setFormOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
    const [projectFormOpen, setProjectFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [groupFormOpen, setGroupFormOpen] = useState(false);
    const [groupFormProjectId, setGroupFormProjectId] = useState<string | null>(null);
    const [editingGroup, setEditingGroup] = useState<DatabaseGroup | null>(null);
    const [scanDialogOpen, setScanDialogOpen] = useState(false);
    const [isUngroupedDragOver, setIsUngroupedDragOver] = useState(false);

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
            toast.success('Connection deleted');
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
                            onEditProject={() => handleEditProject(project)}
                            onAddGroup={() => handleAddGroup(project.id)}
                            onEditGroup={handleEditGroup}
                            onEditConnection={handleEdit}
                            onDeleteConnection={(id) => deleteMutation.mutate(id)}
                            onQuery={(id) => navigate(`/query/${id}`)}
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
