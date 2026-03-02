import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    IconButton,
    Chip,
    Collapse,
    alpha,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TerminalIcon from '@mui/icons-material/Terminal';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { ServerConfig, ConnectionConfig, DatabaseEngine } from '@dbnexus/shared';
import { StyledTooltip } from '../../components/StyledTooltip';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useConnectionHealthStore } from '../../stores/connectionHealthStore';
import { useToastStore } from '../../stores/toastStore';
import { connectionsApi, projectsApi, serversApi, groupsApi } from '../../lib/api';
import { ServerFormDialog } from '../ServersPage/ServerFormDialog';
import { ConnectionFormDialog } from '../ConnectionsPage/Dialogs';

const ENGINE_COLORS: Record<DatabaseEngine, string> = {
    postgres: '#336791',
    mysql: '#4479A1',
    sqlite: '#003B57',
};

const ENGINE_LABELS: Record<DatabaseEngine, string> = {
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    sqlite: 'SQLite',
};

interface ServerDatabaseTableProps {
    servers: ServerConfig[];
    connections: ConnectionConfig[];
    loading?: boolean;
}

interface ServerRowProps {
    server: ServerConfig;
    databases: ConnectionConfig[];
    defaultExpanded?: boolean;
    onEditConnection: (connection: ConnectionConfig) => void;
    onDeleteConnection: (connection: ConnectionConfig) => void;
}

function StatusDot({ online }: { online: boolean }) {
    return (
        <Box
            sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: online ? 'success.main' : 'error.main',
                flexShrink: 0,
            }}
        />
    );
}

interface DatabaseRowProps {
    connection: ConnectionConfig;
    onEdit: (connection: ConnectionConfig) => void;
    onDelete: (connection: ConnectionConfig) => void;
}

function DatabaseRow({ connection, onEdit, onDelete }: DatabaseRowProps) {
    const navigate = useNavigate();
    const { isOnline } = useConnectionHealthStore();
    const online = isOnline(connection.id);
    const displayName = connection.name || connection.database;
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    const handleMenuClose = () => setMenuAnchor(null);

    return (
        <StyledTooltip
            title="Connection is offline"
            placement="top"
            arrow
            disableHoverListener={online}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1,
                    px: 2,
                    pl: 5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}
            >
                <StorageIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                <StatusDot online={online} />
                <Typography
                    variant="body2"
                    sx={{
                        flex: 1,
                        fontWeight: 500,
                        color: online ? 'text.primary' : 'text.disabled',
                    }}
                >
                    {displayName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <StyledTooltip title="Query">
                        <IconButton
                            size="small"
                            onClick={() => navigate(`/query/${connection.id}`)}
                            disabled={!online}
                        >
                            <TerminalIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </StyledTooltip>
                    <StyledTooltip title="Manage">
                        <IconButton
                            size="small"
                            onClick={() => navigate(`/connections/${connection.id}?tab=overview`)}
                        >
                            <SettingsIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </StyledTooltip>
                    <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                        <MoreVertIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={handleMenuClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem
                            onClick={() => {
                                handleMenuClose();
                                onEdit(connection);
                            }}
                        >
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Edit Database</ListItemText>
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                handleMenuClose();
                                onDelete(connection);
                            }}
                            sx={{ color: 'error.main' }}
                        >
                            <ListItemIcon>
                                <DeleteIcon fontSize="small" color="error" />
                            </ListItemIcon>
                            <ListItemText>Remove</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>
        </StyledTooltip>
    );
}

function ServerRow({
    server,
    databases,
    defaultExpanded = false,
    onEditConnection,
    onDeleteConnection,
}: ServerRowProps) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(defaultExpanded);
    const engineColor = ENGINE_COLORS[server.engine] || '#666';

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1.5,
                    px: 2,
                    cursor: 'pointer',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <IconButton size="small" sx={{ p: 0 }}>
                    {expanded ? (
                        <ExpandLessIcon sx={{ fontSize: 20 }} />
                    ) : (
                        <ExpandMoreIcon sx={{ fontSize: 20 }} />
                    )}
                </IconButton>
                <DnsIcon sx={{ fontSize: 18, color: engineColor }} />
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                    {server.name}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: 'monospace' }}
                >
                    {server.host}:{server.port}
                </Typography>
                <Chip
                    label={ENGINE_LABELS[server.engine]}
                    size="small"
                    sx={{
                        bgcolor: alpha(engineColor, 0.1),
                        color: engineColor,
                        fontWeight: 600,
                        fontSize: 10,
                        height: 20,
                    }}
                />
                <Typography variant="caption" color="text.secondary">
                    {databases.length} db{databases.length !== 1 ? 's' : ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                    <StyledTooltip title="Manage Server">
                        <IconButton size="small" onClick={() => navigate(`/servers/${server.id}`)}>
                            <SettingsIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </StyledTooltip>
                </Box>
            </Box>
            <Collapse in={expanded}>
                {databases.length === 0 ? (
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            pl: 5,
                            py: 1,
                            color: 'text.disabled',
                            fontStyle: 'italic',
                        }}
                    >
                        No databases
                    </Typography>
                ) : (
                    databases.map((db) => (
                        <DatabaseRow
                            key={db.id}
                            connection={db}
                            onEdit={onEditConnection}
                            onDelete={onDeleteConnection}
                        />
                    ))
                )}
            </Collapse>
        </Box>
    );
}

interface StandaloneDatabasesSectionProps {
    databases: ConnectionConfig[];
    onEditConnection: (connection: ConnectionConfig) => void;
    onDeleteConnection: (connection: ConnectionConfig) => void;
}

function StandaloneDatabasesSection({
    databases,
    onEditConnection,
    onDeleteConnection,
}: StandaloneDatabasesSectionProps) {
    const [expanded, setExpanded] = useState(false);

    if (databases.length === 0) {
        return null;
    }

    return (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1.5,
                    px: 2,
                    cursor: 'pointer',
                    bgcolor: (theme) => alpha(theme.palette.background.default, 0.3),
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <IconButton size="small" sx={{ p: 0 }}>
                    {expanded ? (
                        <ExpandLessIcon sx={{ fontSize: 20 }} />
                    ) : (
                        <ExpandMoreIcon sx={{ fontSize: 20 }} />
                    )}
                </IconButton>
                <StorageIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, flex: 1, color: 'text.secondary' }}
                >
                    Standalone Databases
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {databases.length} db{databases.length !== 1 ? 's' : ''}
                </Typography>
            </Box>
            <Collapse in={expanded}>
                {databases.map((db) => (
                    <DatabaseRow
                        key={db.id}
                        connection={db}
                        onEdit={onEditConnection}
                        onDelete={onDeleteConnection}
                    />
                ))}
            </Collapse>
        </Box>
    );
}

export function ServerDatabaseTable({ servers, connections, loading }: ServerDatabaseTableProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [serverFormOpen, setServerFormOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [connectionToEdit, setConnectionToEdit] = useState<ConnectionConfig | null>(null);
    const [connectionToDelete, setConnectionToDelete] = useState<ConnectionConfig | null>(null);

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: projectsApi.getAll,
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    const { data: serversData = [] } = useQuery({
        queryKey: ['servers'],
        queryFn: () => serversApi.getAll(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => connectionsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Connection removed');
            setDeleteDialogOpen(false);
            setConnectionToDelete(null);
        },
        onError: (error: Error) => {
            toast.error(`Failed to remove connection: ${error.message}`);
        },
    });

    const handleEditClick = (connection: ConnectionConfig) => {
        setConnectionToEdit(connection);
        setEditDialogOpen(true);
    };

    const handleDeleteClick = (connection: ConnectionConfig) => {
        setConnectionToDelete(connection);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (connectionToDelete) {
            deleteMutation.mutate(connectionToDelete.id);
        }
    };

    const { serverDatabases, standaloneDatabases } = useMemo(() => {
        const byServer = new Map<string, ConnectionConfig[]>();
        const standalone: ConnectionConfig[] = [];

        for (const conn of connections) {
            if (conn.serverId) {
                const existing = byServer.get(conn.serverId) || [];
                existing.push(conn);
                byServer.set(conn.serverId, existing);
            } else {
                standalone.push(conn);
            }
        }

        return {
            serverDatabases: byServer,
            standaloneDatabases: standalone,
        };
    }, [connections]);

    if (!loading && servers.length === 0 && connections.length === 0) {
        return (
            <>
                <GlassCard>
                    <EmptyState
                        icon={<DnsIcon />}
                        title="No servers or databases"
                        description="Add a server to get started with your databases."
                        action={{
                            label: 'Add Server',
                            onClick: () => setServerFormOpen(true),
                        }}
                    />
                </GlassCard>
                <ServerFormDialog
                    open={serverFormOpen}
                    server={null}
                    onClose={() => setServerFormOpen(false)}
                />
            </>
        );
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
                    <DnsIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Servers & Databases
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                        {servers.length} server{servers.length !== 1 ? 's' : ''},{' '}
                        {connections.length} database{connections.length !== 1 ? 's' : ''}
                    </Typography>
                    <StyledTooltip title="Add Server">
                        <IconButton size="small" onClick={() => setServerFormOpen(true)}>
                            <AddIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </StyledTooltip>
                </Box>

                {servers.map((server, index) => (
                    <Box
                        key={server.id}
                        sx={{
                            borderTop: index > 0 ? '1px solid' : 'none',
                            borderColor: 'divider',
                        }}
                    >
                        <ServerRow
                            server={server}
                            databases={serverDatabases.get(server.id) || []}
                            onEditConnection={handleEditClick}
                            onDeleteConnection={handleDeleteClick}
                        />
                    </Box>
                ))}

                <StandaloneDatabasesSection
                    databases={standaloneDatabases}
                    onEditConnection={handleEditClick}
                    onDeleteConnection={handleDeleteClick}
                />
            </GlassCard>

            <ServerFormDialog
                open={serverFormOpen}
                server={null}
                onClose={() => setServerFormOpen(false)}
            />

            <ConnectionFormDialog
                open={editDialogOpen}
                connection={connectionToEdit}
                projects={projects}
                groups={groups}
                servers={serversData}
                onClose={() => {
                    setEditDialogOpen(false);
                    setConnectionToEdit(null);
                }}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                onCancel={() => {
                    setDeleteDialogOpen(false);
                    setConnectionToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Remove Connection"
                message={`Remove "${connectionToDelete?.name || connectionToDelete?.database}" from DB Nexus? The actual database will not be affected.`}
                confirmLabel="Remove"
                confirmColor="warning"
            />
        </>
    );
}
