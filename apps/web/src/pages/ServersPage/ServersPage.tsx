import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Stack,
    IconButton,
    Chip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Collapse,
    alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/Add';
import DnsIcon from '@mui/icons-material/Dns';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import { serversApi, projectsApi, groupsApi, connectionsApi } from '../../lib/api';
import { StyledTooltip } from '../../components/StyledTooltip';
import type { ServerConfig, DatabaseEngine, ConnectionConfig } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { useToastStore } from '../../stores/toastStore';
import { useTagsStore } from '../../stores/tagsStore';
import { ServerFormDialog } from './ServerFormDialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ConnectionFormDialog } from '../ConnectionsPage/Dialogs';
import { ConnectionCard } from '../ProjectsPage/ConnectionCard';

const ENGINE_COLORS: Record<DatabaseEngine, string> = {
    postgres: '#336791',
    mysql: '#4479A1',
    mariadb: '#003545',
    sqlite: '#003B57',
};

const ENGINE_LABELS: Record<DatabaseEngine, string> = {
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    mariadb: 'MariaDB',
    sqlite: 'SQLite',
};

interface ServerCardProps {
    server: ServerConfig;
    databases: ConnectionConfig[];
    onManage: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onAddDatabase: () => void;
    onEditDatabase: (db: ConnectionConfig) => void;
    onDeleteDatabase: (id: string) => void;
    onQueryDatabase: (db: ConnectionConfig) => void;
    tagColors: Record<string, string>;
}

const LIMIT = 5;

function ServerCard({
    server,
    databases,
    onManage,
    onEdit,
    onDelete,
    onAddDatabase,
    onEditDatabase,
    onDeleteDatabase,
    onQueryDatabase,
    tagColors,
}: ServerCardProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [expanded, setExpanded] = useState(true);
    const [showAll, setShowAll] = useState(false);

    const visibleDatabases = showAll ? databases : databases.slice(0, LIMIT);
    const hasMore = databases.length > LIMIT;

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const serverColor = ENGINE_COLORS[server.engine];

    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: 'divider',
                overflow: 'hidden',
            }}
        >
            {/* Server header */}
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 2,
                    cursor: 'pointer',
                    borderLeft: `3px solid ${serverColor}`,
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: `${serverColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <DnsIcon sx={{ color: serverColor, fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {server.name}
                        </Typography>
                        <Chip
                            label={ENGINE_LABELS[server.engine]}
                            size="small"
                            sx={{
                                bgcolor: `${serverColor}20`,
                                color: serverColor,
                                fontWeight: 500,
                                fontSize: '0.7rem',
                            }}
                        />
                        {server.ssl && (
                            <Chip
                                label="SSL"
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ height: 22 }}
                            />
                        )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {server.host}:{server.port} {server.username ? `• ${server.username}` : ''}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        icon={<StorageIcon sx={{ fontSize: 14 }} />}
                        label={databases.length}
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
                    {server.tags?.map((tagName) => {
                        const color = tagColors[tagName] || '128, 128, 128';
                        return (
                            <Chip
                                key={tagName}
                                label={tagName}
                                size="small"
                                sx={{
                                    height: 22,
                                    borderRadius: '16px',
                                    fontWeight: 500,
                                    bgcolor: `rgba(${color}, 0.15)`,
                                    color: `rgb(${color})`,
                                    border: `1px solid rgba(${color}, 0.3)`,
                                }}
                            />
                        );
                    })}
                </Box>
                <StyledTooltip title="Manage Server">
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onManage();
                        }}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                color: 'primary.main',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            },
                        }}
                    >
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
                <IconButton size="small" sx={{ ml: 0.5 }}>
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <IconButton size="small" onClick={handleMenuClick} sx={{ color: 'text.secondary' }}>
                    <MoreVertIcon />
                </IconButton>
            </Box>

            {/* Server menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem
                    onClick={() => {
                        handleMenuClose();
                        onManage();
                    }}
                >
                    <ListItemIcon>
                        <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Manage Server</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleMenuClose();
                        onAddDatabase();
                    }}
                >
                    <ListItemIcon>
                        <StorageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Add Database</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleMenuClose();
                        onEdit();
                    }}
                >
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Server</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleMenuClose();
                        onDelete();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Server</ListItemText>
                </MenuItem>
            </Menu>

            {/* Databases content */}
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
                    {databases.length === 0 ? (
                        <Box
                            sx={{
                                textAlign: 'center',
                                py: 3,
                                borderRadius: 1,
                                border: '1px dashed',
                                borderColor: 'divider',
                            }}
                        >
                            <StorageIcon
                                sx={{ fontSize: 40, color: 'text.disabled', mb: 1, opacity: 0.5 }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                No databases on this server yet
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ display: 'block', mb: 2 }}
                            >
                                Add a database to get started
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={onAddDatabase}
                                sx={{ textTransform: 'none', fontSize: 12 }}
                            >
                                Add Database
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <Grid container spacing={2}>
                                {visibleDatabases.map((db) => (
                                    <Grid size={{ xs: 12, md: 6 }} key={db.id}>
                                        <ConnectionCard
                                            connection={db}
                                            compact
                                            onEdit={() => onEditDatabase(db)}
                                            onDelete={() => onDeleteDatabase(db.id)}
                                            onQuery={() => onQueryDatabase(db)}
                                            draggable={false}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                            {hasMore && !showAll && (
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
                                        onClick={() => setShowAll(true)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            fontSize: 13,
                                            px: 2,
                                            py: 0.75,
                                            borderRadius: 1,
                                            color: 'primary.main',
                                            '&:hover': {
                                                bgcolor: (theme) =>
                                                    alpha(theme.palette.primary.main, 0.1),
                                            },
                                        }}
                                    >
                                        Show {databases.length - LIMIT} more databases
                                    </Button>
                                </Box>
                            )}
                            {showAll && hasMore && (
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
                                        onClick={() => setShowAll(false)}
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
                        </>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}

export function ServersPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const toast = useToastStore();
    const { tags: availableTags } = useTagsStore();
    const [formOpen, setFormOpen] = useState(false);
    const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingServer, setDeletingServer] = useState<ServerConfig | null>(null);
    const [dbDialogOpen, setDbDialogOpen] = useState(false);
    const [dbDialogServerId, setDbDialogServerId] = useState<string | undefined>(undefined);
    const [editingDatabase, setEditingDatabase] = useState<ConnectionConfig | null>(null);

    // Build tag name to color map
    const tagColors = availableTags.reduce(
        (acc, tag) => {
            acc[tag.name] = tag.color;
            return acc;
        },
        {} as Record<string, string>
    );

    const { data: servers = [], isLoading } = useQuery({
        queryKey: ['servers'],
        queryFn: () => serversApi.getAll(),
    });

    // Fetch all connections to group by server
    const { data: allConnections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: () => connectionsApi.getAll(),
    });

    // Group connections by server
    const connectionsByServer: Record<string, ConnectionConfig[]> = {};
    for (const conn of allConnections) {
        const serverId = conn.serverId;
        if (serverId) {
            const existing = connectionsByServer[serverId] ?? [];
            connectionsByServer[serverId] = [...existing, conn];
        }
    }

    // Fetch projects and groups for add database dialog
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll(),
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    const deleteMutation = useMutation({
        mutationFn: serversApi.delete,
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['servers'] });
                toast.success('Server deleted');
            } else {
                toast.error(result.message || 'Failed to delete server');
            }
            setDeleteConfirmOpen(false);
            setDeletingServer(null);
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete server');
        },
    });

    const handleEdit = (server: ServerConfig) => {
        setEditingServer(server);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingServer(null);
    };

    const handleDeleteClick = (server: ServerConfig) => {
        setDeletingServer(server);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (deletingServer) {
            deleteMutation.mutate(deletingServer.id);
        }
    };

    const handleAddDatabase = (server: ServerConfig) => {
        setEditingDatabase(null);
        setDbDialogServerId(server.id);
        setDbDialogOpen(true);
    };

    const handleEditDatabase = (db: ConnectionConfig) => {
        setEditingDatabase(db);
        setDbDialogServerId(db.serverId);
        setDbDialogOpen(true);
    };

    const handleQueryDatabase = (db: ConnectionConfig) => {
        navigate(`/query?connectionId=${db.id}`);
    };

    const deleteDbMutation = useMutation({
        mutationFn: (id: string) => connectionsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['servers'] });
            toast.success('Database deleted');
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete database');
        },
    });

    const handleDeleteDatabase = (id: string) => {
        deleteDbMutation.mutate(id);
    };

    const handleCloseDbDialog = () => {
        setDbDialogOpen(false);
        setDbDialogServerId(undefined);
        setEditingDatabase(null);
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
                        Servers
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage database server credentials. Link databases to servers to reuse
                        connection settings.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    Add Server
                </Button>
            </Box>

            {/* Server Form Dialog */}
            <ServerFormDialog open={formOpen} server={editingServer} onClose={handleCloseForm} />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setDeletingServer(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Server"
                message={
                    (deletingServer?.databaseCount ?? 0) > 0
                        ? `Are you sure you want to delete "${deletingServer?.name}"? This server has ${deletingServer?.databaseCount} linked database(s). They will be unlinked but not deleted.`
                        : `Are you sure you want to delete "${deletingServer?.name}"?`
                }
                confirmLabel="Delete"
                confirmColor="error"
            />

            {/* Content */}
            {isLoading ? (
                <LoadingState message="Loading servers..." size="large" />
            ) : servers.length === 0 ? (
                <GlassCard>
                    <EmptyState
                        icon={<DnsIcon />}
                        title="No servers yet"
                        description="Add a server to store database credentials. You can then link multiple databases to a server to reuse connection settings."
                        action={{
                            label: 'Add Server',
                            onClick: () => setFormOpen(true),
                        }}
                        size="large"
                    />
                </GlassCard>
            ) : (
                <Stack spacing={2}>
                    {servers.map((server) => (
                        <ServerCard
                            key={server.id}
                            server={server}
                            databases={connectionsByServer[server.id] || []}
                            onManage={() => navigate(`/servers/${server.id}`)}
                            onEdit={() => handleEdit(server)}
                            onDelete={() => handleDeleteClick(server)}
                            onAddDatabase={() => handleAddDatabase(server)}
                            onEditDatabase={handleEditDatabase}
                            onDeleteDatabase={handleDeleteDatabase}
                            onQueryDatabase={handleQueryDatabase}
                            tagColors={tagColors}
                        />
                    ))}
                </Stack>
            )}

            {/* Add/Edit Database Dialog */}
            <ConnectionFormDialog
                open={dbDialogOpen}
                connection={editingDatabase}
                projects={projects}
                groups={groups}
                servers={servers}
                preselectedServerId={dbDialogServerId}
                onClose={handleCloseDbDialog}
            />
        </Box>
    );
}
