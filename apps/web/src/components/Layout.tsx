import { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Divider,
    IconButton,
    Collapse,
    CircularProgress,
    Menu,
    MenuItem,
    Avatar,
    AppBar,
    Toolbar,
    Chip,
    alpha,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SyncIcon from '@mui/icons-material/Sync';
import LayersIcon from '@mui/icons-material/Layers';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import HistoryIcon from '@mui/icons-material/History';
import DnsIcon from '@mui/icons-material/Dns';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { groupsApi, connectionsApi, serversApi } from '../lib/api';
import { DynamicLogo } from './DynamicLogo';
import { useNavigationShortcuts } from '../hooks/useKeyboardShortcuts';
import { useConnectionHealthStore } from '../stores/connectionHealthStore';
import { useConnectionStore } from '../stores/connectionStore';
import { useTagsStore } from '../stores/tagsStore';
import { useAuthStore } from '../stores/authStore';
import { StyledTooltip } from './StyledTooltip';
import { OnboardingTour } from './OnboardingTour';
import { ServerFormDialog } from '../pages/ServersPage/ServerFormDialog';

const DRAWER_WIDTH = 220;
const DRAWER_WIDTH_COLLAPSED = 56;
const HEADER_HEIGHT = 55;
const LOGO_SECTION_HEIGHT = 56;

interface SidebarStore {
    collapsed: boolean;
    serversExpanded: boolean;
    databasesExpanded: boolean;
    syncExpanded: boolean;
    expandedServers: Record<string, boolean>;
    toggle: () => void;
    toggleServers: () => void;
    toggleDatabases: () => void;
    toggleSync: () => void;
    toggleServer: (serverId: string) => void;
}

const useSidebarStore = create<SidebarStore>()(
    persist(
        (set) => ({
            collapsed: false,
            serversExpanded: true,
            databasesExpanded: true,
            syncExpanded: true,
            expandedServers: {},
            toggle: () => set((state) => ({ collapsed: !state.collapsed })),
            toggleServers: () => set((state) => ({ serversExpanded: !state.serversExpanded })),
            toggleDatabases: () =>
                set((state) => ({ databasesExpanded: !state.databasesExpanded })),
            toggleSync: () => set((state) => ({ syncExpanded: !state.syncExpanded })),
            toggleServer: (serverId: string) =>
                set((state) => ({
                    expandedServers: {
                        ...state.expandedServers,
                        [serverId]: !state.expandedServers[serverId],
                    },
                })),
        }),
        { name: 'dbnexus-sidebar-v5' }
    )
);

export function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        collapsed,
        serversExpanded,
        databasesExpanded,
        syncExpanded,
        expandedServers,
        toggle,
        toggleServers,
        toggleDatabases,
        toggleSync,
        toggleServer,
    } = useSidebarStore();
    const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

    const [syncMenuAnchor, setSyncMenuAnchor] = useState<null | HTMLElement>(null);
    const [serversMenuAnchor, setServersMenuAnchor] = useState<null | HTMLElement>(null);
    const [databasesMenuAnchor, setDatabasesMenuAnchor] = useState<null | HTMLElement>(null);
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
    const [serverFormOpen, setServerFormOpen] = useState(false);

    const { user, authEnabled, logout } = useAuthStore();
    const { checkAllConnections, isOnline: isConnectionOnline } = useConnectionHealthStore();
    const { selectedConnectionId, setConnectionAndSchema } = useConnectionStore();

    const fetchTags = useTagsStore((state) => state.fetchTags);
    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    useNavigationShortcuts(navigate);

    const queryClient = useQueryClient();

    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ['connections'] });
    }, [location.pathname, queryClient]);

    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const { data: servers = [], isLoading: loadingServers } = useQuery({
        queryKey: ['servers'],
        queryFn: () => serversApi.getAll(),
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const { data: allGroups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    const groups = useMemo(() => {
        const connectionCountByGroup = connections.reduce(
            (acc, conn) => {
                if (conn.groupId) {
                    acc[conn.groupId] = (acc[conn.groupId] || 0) + 1;
                }
                return acc;
            },
            {} as Record<string, number>
        );
        return allGroups.filter(
            (group) =>
                (connectionCountByGroup[group.id] || 0) > 1 && (group.syncSchema || group.syncData)
        );
    }, [connections, allGroups]);

    const connectionsByServer = useMemo(() => {
        const byServer: Record<string, typeof connections> = {};
        const standalone: typeof connections = [];

        connections.forEach((conn) => {
            if (conn.serverId) {
                const serverId = conn.serverId;
                if (!byServer[serverId]) {
                    byServer[serverId] = [];
                }
                byServer[serverId]!.push(conn);
            } else {
                standalone.push(conn);
            }
        });

        return { byServer, standalone };
    }, [connections]);

    useEffect(() => {
        if (connections.length > 0) {
            checkAllConnections(connections.map((c) => c.id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connections.length]);

    const getDefaultSchemaForConnection = useCallback((conn: (typeof connections)[0]) => {
        if (conn.engine === 'mysql') {
            return conn.database || '';
        }
        if (conn.engine === 'sqlite') {
            return 'main';
        }
        return conn.defaultSchema || 'public';
    }, []);

    useEffect(() => {
        if (loadingConnections) return;

        const firstConnection = connections[0];
        if (!firstConnection) return;

        if (!selectedConnectionId) {
            const defaultSchema = getDefaultSchemaForConnection(firstConnection);
            setConnectionAndSchema(firstConnection.id, defaultSchema);
            return;
        }

        const exists = connections.some((c) => c.id === selectedConnectionId);
        if (!exists) {
            const defaultSchema = getDefaultSchemaForConnection(firstConnection);
            setConnectionAndSchema(firstConnection.id, defaultSchema);
        }
    }, [
        loadingConnections,
        connections,
        selectedConnectionId,
        setConnectionAndSchema,
        getDefaultSchemaForConnection,
    ]);

    const isSyncActive =
        location.pathname.startsWith('/groups/') && location.pathname.includes('/sync');

    // Check if any child in Servers section is active
    const isServersChildActive = useMemo(() => {
        return servers.some((server) => {
            const serverConnections = connectionsByServer.byServer[server.id] || [];
            return serverConnections.some(
                (conn) =>
                    location.pathname === `/query/${conn.id}` ||
                    location.pathname === `/connections/${conn.id}`
            );
        });
    }, [servers, connectionsByServer.byServer, location.pathname]);

    // Check if any child in Databases (standalone) section is active
    const isDatabasesChildActive = useMemo(() => {
        return connectionsByServer.standalone.some(
            (conn) =>
                location.pathname === `/query/${conn.id}` ||
                location.pathname === `/connections/${conn.id}`
        );
    }, [connectionsByServer.standalone, location.pathname]);

    const selectedConnection = useMemo(
        () => connections.find((c) => c.id === selectedConnectionId),
        [connections, selectedConnectionId]
    );

    const isConnectionRelatedPage = useMemo(() => {
        const path = location.pathname;
        return (
            path.startsWith('/query/') ||
            path.startsWith('/connections/') ||
            path.startsWith('/schema/') ||
            path === '/schema-diagram'
        );
    }, [location.pathname]);

    const handleDatabaseClick = (connectionId: string) => {
        const conn = connections.find((c) => c.id === connectionId);
        if (conn) {
            const defaultSchema = getDefaultSchemaForConnection(conn);
            setConnectionAndSchema(connectionId, defaultSchema);
        }
        navigate(`/query/${connectionId}`);
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar - Full height */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    transition: 'width 0.2s ease',
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        bgcolor: 'background.paper',
                        transition: 'width 0.2s ease',
                        overflowX: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: '1px solid',
                        borderColor: 'divider',
                    },
                }}
            >
                {/* Logo */}
                <Box
                    sx={{
                        height: LOGO_SECTION_HEIGHT,
                        px: collapsed ? 1 : 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        flexShrink: 0,
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => navigate('/dashboard')}
                >
                    <DynamicLogo size={collapsed ? 32 : 38} />
                    {!collapsed && (
                        <Typography
                            sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 600,
                                fontSize: '1.3rem',
                                color: 'primary.main',
                            }}
                        >
                            Nexus
                        </Typography>
                    )}
                </Box>

                {/* Dashboard Link */}
                {!collapsed ? (
                    <List disablePadding sx={{ px: 0.5, pt: 1 }}>
                        <ListItemButton
                            component={NavLink}
                            to="/dashboard"
                            selected={location.pathname === '/dashboard'}
                            sx={{
                                py: 0.5,
                                minHeight: 32,
                                borderRadius: 1,
                                mx: 0.5,
                                px: 1,
                                mb: 0,
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 24 }}>
                                <DashboardIcon
                                    sx={{
                                        fontSize: 16,
                                        color:
                                            location.pathname === '/dashboard'
                                                ? 'primary.main'
                                                : 'text.secondary',
                                    }}
                                />
                            </ListItemIcon>
                            <ListItemText
                                primary="Dashboard"
                                primaryTypographyProps={{ fontSize: 13 }}
                            />
                        </ListItemButton>
                    </List>
                ) : (
                    <List disablePadding sx={{ pt: 1 }}>
                        <StyledTooltip title="Dashboard" placement="right" arrow>
                            <ListItemButton
                                component={NavLink}
                                to="/dashboard"
                                selected={location.pathname === '/dashboard'}
                                sx={{ justifyContent: 'center', py: 1 }}
                            >
                                <DashboardIcon
                                    sx={{
                                        fontSize: 20,
                                        color:
                                            location.pathname === '/dashboard'
                                                ? 'primary.main'
                                                : 'text.secondary',
                                    }}
                                />
                            </ListItemButton>
                        </StyledTooltip>
                    </List>
                )}

                {/* Scrollable Servers Section */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        minHeight: 0,
                    }}
                >
                    {!collapsed ? (
                        <>
                            <Divider sx={{ my: 1 }} />
                            <ListItemButton
                                onClick={toggleServers}
                                sx={{
                                    px: 1,
                                    py: 0.5,
                                    minHeight: 32,
                                    borderRadius: 1,
                                    mx: 1,
                                    mb: 0,
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 24 }}>
                                    <DnsIcon
                                        sx={{
                                            fontSize: 16,
                                            color: isServersChildActive
                                                ? 'primary.main'
                                                : 'text.secondary',
                                        }}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Servers"
                                    primaryTypographyProps={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                    }}
                                />
                                {serversExpanded ? (
                                    <ExpandLessIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                ) : (
                                    <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                )}
                            </ListItemButton>

                            <Collapse in={serversExpanded}>
                                {loadingServers ? (
                                    <Box sx={{ py: 2, textAlign: 'center' }}>
                                        <CircularProgress size={18} />
                                    </Box>
                                ) : servers.length === 0 ? (
                                    <Box sx={{ px: 2, py: 1, textAlign: 'center' }}>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: 'text.disabled', fontSize: 11 }}
                                        >
                                            No servers yet.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List disablePadding sx={{ pl: 1 }}>
                                        {servers.map((server) => {
                                            const serverConnections =
                                                connectionsByServer.byServer[server.id] || [];
                                            const isExpanded = expandedServers[server.id] ?? true;
                                            const isServerActive =
                                                location.pathname === `/servers/${server.id}`;
                                            const hasActiveChild = serverConnections.some(
                                                (conn) =>
                                                    location.pathname === `/query/${conn.id}` ||
                                                    location.pathname === `/connections/${conn.id}`
                                            );

                                            return (
                                                <Box key={server.id}>
                                                    <ListItemButton
                                                        onClick={() => toggleServer(server.id)}
                                                        sx={{
                                                            px: 1,
                                                            py: 0.5,
                                                            minHeight: 32,
                                                            borderRadius: 1,
                                                            mx: 1,
                                                            '&:hover .server-settings': {
                                                                opacity: 1,
                                                            },
                                                        }}
                                                    >
                                                        <ListItemIcon sx={{ minWidth: 24 }}>
                                                            <DnsIcon
                                                                sx={{
                                                                    fontSize: 16,
                                                                    color:
                                                                        isServerActive ||
                                                                        hasActiveChild
                                                                            ? 'primary.main'
                                                                            : 'text.secondary',
                                                                }}
                                                            />
                                                        </ListItemIcon>
                                                        <StyledTooltip
                                                            title={server.name}
                                                            placement="right"
                                                            disableHoverListener={
                                                                server.name.length < 18
                                                            }
                                                        >
                                                            <ListItemText
                                                                primary={server.name}
                                                                primaryTypographyProps={{
                                                                    fontSize: 13,
                                                                    fontWeight: 500,
                                                                    noWrap: true,
                                                                }}
                                                            />
                                                        </StyledTooltip>
                                                        <IconButton
                                                            className="server-settings"
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/servers/${server.id}`);
                                                            }}
                                                            sx={{
                                                                opacity: 0,
                                                                color: 'text.disabled',
                                                                p: 0.25,
                                                                '&:hover': {
                                                                    color: 'primary.main',
                                                                },
                                                            }}
                                                        >
                                                            <SettingsIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                        {isExpanded ? (
                                                            <ExpandLessIcon
                                                                sx={{
                                                                    fontSize: 16,
                                                                    color: 'text.disabled',
                                                                }}
                                                            />
                                                        ) : (
                                                            <ExpandMoreIcon
                                                                sx={{
                                                                    fontSize: 16,
                                                                    color: 'text.disabled',
                                                                }}
                                                            />
                                                        )}
                                                    </ListItemButton>
                                                    <Collapse in={isExpanded}>
                                                        <List disablePadding sx={{ pl: 1 }}>
                                                            {serverConnections.length === 0 ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        py: 2,
                                                                        display: 'block',
                                                                        color: 'text.disabled',
                                                                        fontSize: 10,
                                                                        fontStyle: 'italic',
                                                                    }}
                                                                >
                                                                    No databases
                                                                </Typography>
                                                            ) : (
                                                                serverConnections
                                                                    .filter((conn) =>
                                                                        isConnectionOnline(conn.id)
                                                                    )
                                                                    .map((conn) => {
                                                                        const isActive =
                                                                            location.pathname ===
                                                                                `/query/${conn.id}` ||
                                                                            location.pathname ===
                                                                                `/connections/${conn.id}`;
                                                                        const displayName =
                                                                            conn.name ||
                                                                            conn.database;
                                                                        return (
                                                                            <StyledTooltip
                                                                                key={conn.id}
                                                                                title={displayName}
                                                                                placement="right"
                                                                                disableHoverListener={
                                                                                    displayName.length <
                                                                                    20
                                                                                }
                                                                            >
                                                                                <ListItemButton
                                                                                    onClick={() =>
                                                                                        handleDatabaseClick(
                                                                                            conn.id
                                                                                        )
                                                                                    }
                                                                                    selected={
                                                                                        isActive
                                                                                    }
                                                                                    sx={{
                                                                                        py: 0.25,
                                                                                        minHeight: 28,
                                                                                        borderRadius: 1,
                                                                                        mx: 1,
                                                                                        '&.Mui-selected':
                                                                                            {
                                                                                                bgcolor:
                                                                                                    (
                                                                                                        theme
                                                                                                    ) =>
                                                                                                        alpha(
                                                                                                            theme
                                                                                                                .palette
                                                                                                                .primary
                                                                                                                .main,
                                                                                                            0.12
                                                                                                        ),
                                                                                            },
                                                                                    }}
                                                                                >
                                                                                    <ListItemIcon
                                                                                        sx={{
                                                                                            minWidth: 20,
                                                                                        }}
                                                                                    >
                                                                                        <StorageIcon
                                                                                            sx={{
                                                                                                fontSize: 14,
                                                                                                color: isActive
                                                                                                    ? 'primary.main'
                                                                                                    : 'text.disabled',
                                                                                            }}
                                                                                        />
                                                                                    </ListItemIcon>
                                                                                    <ListItemText
                                                                                        primary={
                                                                                            displayName
                                                                                        }
                                                                                        primaryTypographyProps={{
                                                                                            fontSize: 12,
                                                                                            noWrap: true,
                                                                                            color: isActive
                                                                                                ? 'primary.main'
                                                                                                : 'text.secondary',
                                                                                        }}
                                                                                    />
                                                                                </ListItemButton>
                                                                            </StyledTooltip>
                                                                        );
                                                                    })
                                                            )}
                                                        </List>
                                                    </Collapse>
                                                </Box>
                                            );
                                        })}
                                    </List>
                                )}
                            </Collapse>

                            {/* Databases Section (standalone connections) */}
                            {connectionsByServer.standalone.filter((conn) =>
                                isConnectionOnline(conn.id)
                            ).length > 0 && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    <ListItemButton
                                        onClick={toggleDatabases}
                                        sx={{
                                            px: 1,
                                            py: 0.5,
                                            minHeight: 32,
                                            borderRadius: 1,
                                            mx: 1,
                                            mb: 0,
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 24 }}>
                                            <StorageIcon
                                                sx={{
                                                    fontSize: 16,
                                                    color: isDatabasesChildActive
                                                        ? 'primary.main'
                                                        : 'text.secondary',
                                                }}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Databases"
                                            primaryTypographyProps={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                            }}
                                        />
                                        {databasesExpanded ? (
                                            <ExpandLessIcon
                                                sx={{ fontSize: 16, color: 'text.disabled' }}
                                            />
                                        ) : (
                                            <ExpandMoreIcon
                                                sx={{ fontSize: 16, color: 'text.disabled' }}
                                            />
                                        )}
                                    </ListItemButton>
                                    <Collapse in={databasesExpanded}>
                                        <List disablePadding sx={{ pl: 1 }}>
                                            {connectionsByServer.standalone
                                                .filter((conn) => isConnectionOnline(conn.id))
                                                .map((conn) => {
                                                    const isActive =
                                                        location.pathname === `/query/${conn.id}` ||
                                                        location.pathname ===
                                                            `/connections/${conn.id}`;
                                                    const displayName = conn.name || conn.database;
                                                    return (
                                                        <StyledTooltip
                                                            key={conn.id}
                                                            title={displayName}
                                                            placement="right"
                                                            disableHoverListener={
                                                                displayName.length < 20
                                                            }
                                                        >
                                                            <ListItemButton
                                                                onClick={() =>
                                                                    handleDatabaseClick(conn.id)
                                                                }
                                                                selected={isActive}
                                                                sx={{
                                                                    py: 0.25,
                                                                    minHeight: 28,
                                                                    borderRadius: 1,
                                                                }}
                                                            >
                                                                <ListItemIcon sx={{ minWidth: 20 }}>
                                                                    <StorageIcon
                                                                        sx={{
                                                                            fontSize: 14,
                                                                            color: isActive
                                                                                ? 'primary.main'
                                                                                : 'text.disabled',
                                                                        }}
                                                                    />
                                                                </ListItemIcon>
                                                                <ListItemText
                                                                    primary={displayName}
                                                                    primaryTypographyProps={{
                                                                        fontSize: 12,
                                                                        noWrap: true,
                                                                    }}
                                                                />
                                                            </ListItemButton>
                                                        </StyledTooltip>
                                                    );
                                                })}
                                        </List>
                                    </Collapse>
                                </>
                            )}

                            {/* Sync Groups Section */}
                            {groups.length > 0 && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    <ListItemButton
                                        onClick={toggleSync}
                                        sx={{
                                            px: 1,
                                            py: 0.5,
                                            minHeight: 32,
                                            borderRadius: 1,
                                            mx: 1,
                                            mb: 0,
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 24 }}>
                                            <SyncIcon
                                                sx={{
                                                    fontSize: 16,
                                                    color: isSyncActive
                                                        ? 'primary.main'
                                                        : 'text.secondary',
                                                }}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Sync Groups"
                                            primaryTypographyProps={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                            }}
                                        />
                                        {syncExpanded ? (
                                            <ExpandLessIcon
                                                sx={{ fontSize: 16, color: 'text.disabled' }}
                                            />
                                        ) : (
                                            <ExpandMoreIcon
                                                sx={{ fontSize: 16, color: 'text.disabled' }}
                                            />
                                        )}
                                    </ListItemButton>
                                    <Collapse in={syncExpanded}>
                                        <List disablePadding>
                                            {groups.map((group) => {
                                                const groupPath = `/groups/${group.id}/sync`;
                                                const isGroupActive =
                                                    location.pathname === groupPath;
                                                return (
                                                    <StyledTooltip
                                                        key={group.id}
                                                        title={group.name}
                                                        placement="right"
                                                        disableHoverListener={
                                                            group.name.length < 20
                                                        }
                                                    >
                                                        <ListItemButton
                                                            onClick={() => navigate(groupPath)}
                                                            selected={isGroupActive}
                                                            sx={{
                                                                pl: 4,
                                                                py: 0.25,
                                                                minHeight: 28,
                                                                borderRadius: 1,
                                                                mx: 0.5,
                                                            }}
                                                        >
                                                            <ListItemIcon sx={{ minWidth: 20 }}>
                                                                <LayersIcon
                                                                    sx={{
                                                                        fontSize: 14,
                                                                        color: isGroupActive
                                                                            ? 'primary.main'
                                                                            : 'text.disabled',
                                                                    }}
                                                                />
                                                            </ListItemIcon>
                                                            <ListItemText
                                                                primary={group.name}
                                                                primaryTypographyProps={{
                                                                    fontSize: 12,
                                                                    noWrap: true,
                                                                }}
                                                            />
                                                        </ListItemButton>
                                                    </StyledTooltip>
                                                );
                                            })}
                                        </List>
                                    </Collapse>
                                </>
                            )}

                            {/* Compare & Logs */}
                            <Divider sx={{ my: 1 }} />
                            <List disablePadding sx={{ px: 0.5 }}>
                                <ListItemButton
                                    component={NavLink}
                                    to="/compare"
                                    selected={location.pathname === '/compare'}
                                    disabled={connections.length === 0}
                                    sx={{
                                        py: 0.5,
                                        minHeight: 32,
                                        borderRadius: 1,
                                        mx: 0.5,
                                        px: 1.5,
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                        <CompareArrowsIcon
                                            sx={{
                                                fontSize: 16,
                                                color:
                                                    location.pathname === '/compare'
                                                        ? 'primary.main'
                                                        : 'text.secondary',
                                            }}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Compare"
                                        primaryTypographyProps={{ fontSize: 13 }}
                                    />
                                </ListItemButton>
                                <ListItemButton
                                    component={NavLink}
                                    to="/logs"
                                    selected={location.pathname === '/logs'}
                                    disabled={connections.length === 0}
                                    sx={{
                                        py: 0.5,
                                        minHeight: 32,
                                        borderRadius: 1,
                                        mx: 0.5,
                                        px: 1.5,
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                        <HistoryIcon
                                            sx={{
                                                fontSize: 16,
                                                color:
                                                    location.pathname === '/logs'
                                                        ? 'primary.main'
                                                        : 'text.secondary',
                                            }}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Logs"
                                        primaryTypographyProps={{ fontSize: 13 }}
                                    />
                                </ListItemButton>
                            </List>
                        </>
                    ) : (
                        /* Collapsed servers menu */
                        <>
                            <StyledTooltip title="Servers" placement="right" arrow>
                                <ListItemButton
                                    onClick={(e) => setServersMenuAnchor(e.currentTarget)}
                                    selected={isServersChildActive}
                                    sx={{ justifyContent: 'center', py: 1.5 }}
                                >
                                    <DnsIcon
                                        sx={{
                                            fontSize: 20,
                                            color: isServersChildActive
                                                ? 'primary.main'
                                                : 'text.secondary',
                                        }}
                                    />
                                </ListItemButton>
                            </StyledTooltip>
                            <Menu
                                anchorEl={serversMenuAnchor}
                                open={Boolean(serversMenuAnchor)}
                                onClose={() => setServersMenuAnchor(null)}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                slotProps={{
                                    paper: {
                                        sx: { maxHeight: 400, overflowY: 'auto' },
                                    },
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        display: 'block',
                                        color: 'text.secondary',
                                    }}
                                >
                                    Servers
                                </Typography>
                                <Divider />
                                {servers.map((server) => {
                                    const serverConnections =
                                        connectionsByServer.byServer[server.id] || [];
                                    const isServerActive =
                                        location.pathname === `/servers/${server.id}`;
                                    return (
                                        <Box key={server.id}>
                                            <MenuItem
                                                onClick={() => {
                                                    navigate(`/servers/${server.id}`);
                                                    setServersMenuAnchor(null);
                                                }}
                                                selected={isServerActive}
                                                sx={{ fontWeight: 500, fontSize: 13 }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 28 }}>
                                                    <DnsIcon sx={{ fontSize: 16 }} />
                                                </ListItemIcon>
                                                {server.name}
                                            </MenuItem>
                                            {serverConnections.map((conn) => {
                                                const isConnActive =
                                                    location.pathname === `/query/${conn.id}` ||
                                                    location.pathname ===
                                                        `/connections/${conn.id}`;
                                                return (
                                                    <MenuItem
                                                        key={conn.id}
                                                        onClick={() => {
                                                            handleDatabaseClick(conn.id);
                                                            setServersMenuAnchor(null);
                                                        }}
                                                        selected={isConnActive}
                                                        sx={{ pl: 4, fontSize: 12 }}
                                                    >
                                                        <ListItemIcon sx={{ minWidth: 24 }}>
                                                            <StorageIcon sx={{ fontSize: 14 }} />
                                                        </ListItemIcon>
                                                        {conn.name || conn.database}
                                                    </MenuItem>
                                                );
                                            })}
                                        </Box>
                                    );
                                })}
                            </Menu>

                            {/* Collapsed databases menu (standalone) */}
                            {connectionsByServer.standalone.filter((conn) =>
                                isConnectionOnline(conn.id)
                            ).length > 0 && (
                                <>
                                    <StyledTooltip title="Databases" placement="right" arrow>
                                        <ListItemButton
                                            onClick={(e) =>
                                                setDatabasesMenuAnchor(e.currentTarget)
                                            }
                                            selected={isDatabasesChildActive}
                                            sx={{ justifyContent: 'center', py: 1.5 }}
                                        >
                                            <StorageIcon
                                                sx={{
                                                    fontSize: 20,
                                                    color: isDatabasesChildActive
                                                        ? 'primary.main'
                                                        : 'text.secondary',
                                                }}
                                            />
                                        </ListItemButton>
                                    </StyledTooltip>
                                    <Menu
                                        anchorEl={databasesMenuAnchor}
                                        open={Boolean(databasesMenuAnchor)}
                                        onClose={() => setDatabasesMenuAnchor(null)}
                                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                        slotProps={{
                                            paper: {
                                                sx: { maxHeight: 400, overflowY: 'auto' },
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                px: 2,
                                                py: 1,
                                                display: 'block',
                                                color: 'text.secondary',
                                            }}
                                        >
                                            Databases
                                        </Typography>
                                        <Divider />
                                        {connectionsByServer.standalone
                                            .filter((conn) => isConnectionOnline(conn.id))
                                            .map((conn) => {
                                                const isActive =
                                                    location.pathname === `/query/${conn.id}` ||
                                                    location.pathname === `/connections/${conn.id}`;
                                                return (
                                                    <MenuItem
                                                        key={conn.id}
                                                        onClick={() => {
                                                            handleDatabaseClick(conn.id);
                                                            setDatabasesMenuAnchor(null);
                                                        }}
                                                        selected={isActive}
                                                        sx={{ fontSize: 13 }}
                                                    >
                                                        <ListItemIcon sx={{ minWidth: 28 }}>
                                                            <StorageIcon sx={{ fontSize: 16 }} />
                                                        </ListItemIcon>
                                                        {conn.name || conn.database}
                                                    </MenuItem>
                                                );
                                            })}
                                    </Menu>
                                </>
                            )}

                            {/* Collapsed sync menu */}
                            {groups.length > 0 && (
                                <>
                                    <StyledTooltip title="Sync Groups" placement="right" arrow>
                                        <ListItemButton
                                            onClick={(e) => setSyncMenuAnchor(e.currentTarget)}
                                            selected={isSyncActive}
                                            sx={{ justifyContent: 'center', py: 1 }}
                                        >
                                            <SyncIcon
                                                sx={{
                                                    fontSize: 20,
                                                    color: isSyncActive
                                                        ? 'primary.main'
                                                        : 'text.secondary',
                                                }}
                                            />
                                        </ListItemButton>
                                    </StyledTooltip>
                                    <Menu
                                        anchorEl={syncMenuAnchor}
                                        open={Boolean(syncMenuAnchor)}
                                        onClose={() => setSyncMenuAnchor(null)}
                                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                        slotProps={{
                                            paper: {
                                                sx: { maxHeight: 300, overflowY: 'auto' },
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                px: 2,
                                                py: 1,
                                                display: 'block',
                                                color: 'text.secondary',
                                            }}
                                        >
                                            Sync Groups
                                        </Typography>
                                        <Divider />
                                        {groups.map((group) => {
                                            const groupPath = `/groups/${group.id}/sync`;
                                            const isGroupActive = location.pathname === groupPath;
                                            return (
                                                <MenuItem
                                                    key={group.id}
                                                    onClick={() => {
                                                        navigate(groupPath);
                                                        setSyncMenuAnchor(null);
                                                    }}
                                                    selected={isGroupActive}
                                                    sx={{ fontSize: 12 }}
                                                >
                                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                                        <LayersIcon sx={{ fontSize: 14 }} />
                                                    </ListItemIcon>
                                                    {group.name}
                                                </MenuItem>
                                            );
                                        })}
                                    </Menu>
                                </>
                            )}

                            {/* Collapsed Compare & Logs */}
                            <Divider sx={{ my: 1 }} />
                            <StyledTooltip title="Compare" placement="right" arrow>
                                <ListItemButton
                                    component={NavLink}
                                    to="/compare"
                                    selected={location.pathname === '/compare'}
                                    disabled={connections.length === 0}
                                    sx={{ justifyContent: 'center', py: 1 }}
                                >
                                    <CompareArrowsIcon
                                        sx={{
                                            fontSize: 20,
                                            color:
                                                location.pathname === '/compare'
                                                    ? 'primary.main'
                                                    : 'text.secondary',
                                        }}
                                    />
                                </ListItemButton>
                            </StyledTooltip>
                            <StyledTooltip title="Logs" placement="right" arrow>
                                <ListItemButton
                                    component={NavLink}
                                    to="/logs"
                                    selected={location.pathname === '/logs'}
                                    disabled={connections.length === 0}
                                    sx={{ justifyContent: 'center', py: 1 }}
                                >
                                    <HistoryIcon
                                        sx={{
                                            fontSize: 20,
                                            color:
                                                location.pathname === '/logs'
                                                    ? 'primary.main'
                                                    : 'text.secondary',
                                        }}
                                    />
                                </ListItemButton>
                            </StyledTooltip>
                        </>
                    )}
                </Box>

                {/* Footer - Settings only */}
                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                    <List disablePadding sx={{ py: 0.5 }}>
                        <StyledTooltip title={collapsed ? 'Settings' : ''} placement="right" arrow>
                            <ListItemButton
                                component={NavLink}
                                to="/settings"
                                selected={location.pathname === '/settings'}
                                sx={{
                                    py: 0.5,
                                    minHeight: 32,
                                    borderRadius: 1,
                                    mx: 1,
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    px: collapsed ? 0 : 1,
                                    mb: 0,
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: collapsed ? 0 : 24,
                                        color:
                                            location.pathname === '/settings'
                                                ? 'primary.main'
                                                : 'text.secondary',
                                    }}
                                >
                                    <SettingsIcon sx={{ fontSize: 18 }} />
                                </ListItemIcon>
                                {!collapsed && (
                                    <ListItemText
                                        primary="Settings"
                                        primaryTypographyProps={{ fontSize: 13 }}
                                    />
                                )}
                            </ListItemButton>
                        </StyledTooltip>
                    </List>

                    {/* Collapse toggle */}
                    <Box
                        sx={{
                            py: 0.5,
                            px: 0.5,
                            mb: 0.5,
                            display: 'flex',
                            justifyContent: collapsed ? 'center' : 'flex-end',
                        }}
                    >
                        <IconButton
                            size="small"
                            onClick={toggle}
                            sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
                        >
                            {collapsed ? (
                                <ChevronRightIcon sx={{ fontSize: 18 }} />
                            ) : (
                                <ChevronLeftIcon sx={{ fontSize: 18 }} />
                            )}
                        </IconButton>
                    </Box>
                </Box>
            </Drawer>

            {/* Main area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                {/* Header */}
                <AppBar
                    position="static"
                    elevation={0}
                    sx={{
                        bgcolor: 'background.paper',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Toolbar variant="dense" sx={{ minHeight: HEADER_HEIGHT, px: 2, gap: 1 }}>
                        {/* Connection String - only show on connection-related pages */}
                        {selectedConnection && isConnectionRelatedPage && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontFamily="monospace"
                                    fontSize={13}
                                >
                                    {selectedConnection.engine === 'sqlite'
                                        ? selectedConnection.database.split('/').pop()
                                        : `${selectedConnection.host}/${selectedConnection.database}`}
                                </Typography>
                                <Chip
                                    label={selectedConnection.engine.toUpperCase()}
                                    size="small"
                                    sx={{
                                        fontSize: 10,
                                        height: 22,
                                        bgcolor: 'primary.dark',
                                        color: 'primary.contrastText',
                                    }}
                                />
                            </Box>
                        )}

                        <Box sx={{ flex: 1 }} />

                        {/* User Menu */}
                        {authEnabled && user ? (
                            <Box
                                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    cursor: 'pointer',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <Avatar
                                    sx={{
                                        width: 26,
                                        height: 26,
                                        bgcolor: 'primary.main',
                                        fontSize: 12,
                                    }}
                                >
                                    {(user.name || user.email || '?').charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography
                                    variant="body2"
                                    sx={{ color: 'text.primary', fontSize: 13 }}
                                >
                                    {user.name || user.email}
                                </Typography>
                            </Box>
                        ) : null}
                    </Toolbar>
                </AppBar>

                {/* User Menu Dropdown */}
                <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={() => setUserMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Box sx={{ px: 2, py: 1, minWidth: 160 }}>
                        <Typography variant="subtitle2" fontWeight={600} fontSize={13}>
                            {user?.name || 'User'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {user?.email}
                        </Typography>
                    </Box>
                    <Divider />
                    <MenuItem
                        onClick={() => {
                            navigate('/account');
                            setUserMenuAnchor(null);
                        }}
                        sx={{ fontSize: 13 }}
                    >
                        <ListItemIcon>
                            <PersonIcon sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        Account
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            navigate('/settings');
                            setUserMenuAnchor(null);
                        }}
                        sx={{ fontSize: 13 }}
                    >
                        <ListItemIcon>
                            <SettingsIcon sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        Settings
                    </MenuItem>
                    <Divider />
                    <MenuItem
                        onClick={() => {
                            logout();
                            setUserMenuAnchor(null);
                        }}
                        sx={{ color: 'error.main', fontSize: 13 }}
                    >
                        <ListItemIcon>
                            <LogoutIcon sx={{ fontSize: 18, color: 'error.main' }} />
                        </ListItemIcon>
                        Sign Out
                    </MenuItem>
                </Menu>

                {/* Main content */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        bgcolor: 'background.default',
                        overflow: 'auto',
                        minWidth: 0,
                        minHeight: 0,
                    }}
                >
                    <Outlet />
                </Box>
            </Box>

            <OnboardingTour hasConnections={connections.length > 0} />

            <ServerFormDialog
                open={serverFormOpen}
                server={null}
                onClose={() => setServerFormOpen(false)}
            />
        </Box>
    );
}
