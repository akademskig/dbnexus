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
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import TerminalIcon from '@mui/icons-material/Terminal';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SyncIcon from '@mui/icons-material/Sync';
import LayersIcon from '@mui/icons-material/Layers';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import HistoryIcon from '@mui/icons-material/History';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FolderIcon from '@mui/icons-material/Folder';
import DnsIcon from '@mui/icons-material/Dns';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { groupsApi, connectionsApi, serversApi } from '../lib/api';
import { DynamicLogo } from './DynamicLogo';
// Types are inferred from React Query
import { useNavigationShortcuts } from '../hooks/useKeyboardShortcuts';
import { useConnectionHealthStore } from '../stores/connectionHealthStore';
import { useConnectionStore } from '../stores/connectionStore';
import { StyledTooltip } from './StyledTooltip';
import { OnboardingTour } from './OnboardingTour';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 64;

// Sidebar state store
interface SidebarStore {
    collapsed: boolean;
    syncExpanded: boolean;
    connectionsExpanded: boolean;
    serversExpanded: boolean;
    toggle: () => void;
    toggleSync: () => void;
    toggleConnections: () => void;
    toggleServers: () => void;
}

const useSidebarStore = create<SidebarStore>()(
    persist(
        (set) => ({
            collapsed: false,
            syncExpanded: true,
            connectionsExpanded: true,
            serversExpanded: true,
            toggle: () => set((state) => ({ collapsed: !state.collapsed })),
            toggleSync: () => set((state) => ({ syncExpanded: !state.syncExpanded })),
            toggleConnections: () =>
                set((state) => ({ connectionsExpanded: !state.connectionsExpanded })),
            toggleServers: () => set((state) => ({ serversExpanded: !state.serversExpanded })),
        }),
        { name: 'dbnexus-sidebar' }
    )
);

const navItems = [
    { to: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard', requiresConnections: false },
    { to: '/servers', icon: <DnsIcon />, label: 'Servers', requiresConnections: false },
    { to: '/projects', icon: <FolderIcon />, label: 'Projects', requiresConnections: false },
    { to: '/query', icon: <TerminalIcon />, label: 'Query', requiresConnections: true },
    {
        to: '/schema-diagram',
        icon: <AccountTreeIcon />,
        label: 'Schema Diagram',
        requiresConnections: true,
    },
    { to: '/compare', icon: <CompareArrowsIcon />, label: 'Compare', requiresConnections: true },
    { to: '/logs', icon: <HistoryIcon />, label: 'Logs', requiresConnections: true },
];

export function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        collapsed,
        syncExpanded,
        connectionsExpanded,
        serversExpanded,
        toggle,
        toggleSync,
        toggleConnections,
        toggleServers,
    } = useSidebarStore();
    const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

    const [syncMenuAnchor, setSyncMenuAnchor] = useState<null | HTMLElement>(null);
    const [connectionsMenuAnchor, setConnectionsMenuAnchor] = useState<null | HTMLElement>(null);
    const [serversMenuAnchor, setServersMenuAnchor] = useState<null | HTMLElement>(null);

    // Connection health store
    const { healthStatus, checkAllConnections } = useConnectionHealthStore();

    // Global connection selection
    const { selectedConnectionId, setConnectionAndSchema } = useConnectionStore();

    // Register global navigation shortcuts
    useNavigationShortcuts(navigate);

    const queryClient = useQueryClient();

    // Refetch connections when route changes to ensure fresh data
    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ['connections'] });
    }, [location.pathname, queryClient]);

    // Use React Query for connections - this automatically updates when invalidated
    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
        staleTime: 0, // Always consider data stale to ensure fresh data
        refetchOnWindowFocus: true, // Refetch when user returns to the app
    });

    // Use React Query for servers
    const { data: servers = [], isLoading: loadingServers } = useQuery({
        queryKey: ['servers'],
        queryFn: () => serversApi.getAll(),
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    // Use React Query for groups
    const { data: allGroups = [], isLoading: loadingGroups } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    // Filter groups that have more than 1 connection
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

        return allGroups.filter((group) => (connectionCountByGroup[group.id] || 0) > 1);
    }, [connections, allGroups]);

    // Check health of all connections when connections change
    useEffect(() => {
        if (connections.length > 0) {
            checkAllConnections(connections.map((c) => c.id));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connections.length]);

    // Helper to get default schema for a connection
    const getDefaultSchemaForConnection = useCallback((conn: (typeof connections)[0]) => {
        if (conn.engine === 'mysql' || conn.engine === 'mariadb') {
            return conn.database || '';
        }
        if (conn.engine === 'sqlite') {
            return 'main';
        }
        // PostgreSQL and others
        return conn.defaultSchema || 'public';
    }, []);

    // Auto-select first connection when none is selected
    useEffect(() => {
        if (loadingConnections) return;

        const firstConnection = connections[0];
        if (!firstConnection) return;

        // If no connection is selected and we have connections, select the first one
        if (!selectedConnectionId) {
            const defaultSchema = getDefaultSchemaForConnection(firstConnection);
            setConnectionAndSchema(firstConnection.id, defaultSchema);
            return;
        }

        // If selected connection no longer exists, select first available
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

    const isConnectionsActive = location.pathname.startsWith('/connections/');

    const isServersActive = location.pathname.startsWith('/servers/');

    // Redirect from pages that require connections when there are none
    useEffect(() => {
        if (loadingConnections) return; // Wait for connections to load

        if (connections.length === 0) {
            // Check if current page requires connections
            const currentNavItem = navItems.find(
                (item) =>
                    location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            );

            if (currentNavItem?.requiresConnections) {
                navigate('/projects', { replace: true });
            }

            // Also redirect from connection details pages
            if (location.pathname.startsWith('/connections/')) {
                navigate('/projects', { replace: true });
            }

            // Redirect from group sync pages
            if (location.pathname.startsWith('/groups/') && location.pathname.includes('/sync')) {
                navigate('/projects', { replace: true });
            }
        }
    }, [connections.length, loadingConnections, location.pathname, navigate]);

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar */}
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
                    },
                }}
            >
                {/* Logo */}
                <Box
                    sx={{
                        px: 1,
                        py: 1,
                        ml: collapsed ? 0 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                >
                    <DynamicLogo size={collapsed ? 40 : 50} />
                    {!collapsed && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                sx={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600,
                                    fontSize: '1.5rem',
                                    color: 'primary.main',
                                }}
                            >
                                Nexus
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Divider />

                {/* Main Navigation - Fixed at top */}
                <List disablePadding sx={{ px: collapsed ? 1 : 1.5, pt: 2 }}>
                    {navItems.map(({ to, icon, label, requiresConnections }) => {
                        const isActive =
                            location.pathname === to || location.pathname.startsWith(to + '/');
                        const isDisabled = requiresConnections && connections.length === 0;
                        const tooltipTitle = collapsed
                            ? isDisabled
                                ? `${label} (No connections)`
                                : label
                            : isDisabled
                              ? 'No connections available'
                              : '';

                        return (
                            <StyledTooltip key={to} title={tooltipTitle} placement="right" arrow>
                                <span>
                                    <ListItemButton
                                        component={isDisabled ? 'div' : NavLink}
                                        to={isDisabled ? undefined : to}
                                        selected={isActive}
                                        disabled={isDisabled}
                                        sx={{
                                            mb: 0.5,
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                            px: collapsed ? 1.5 : 2,
                                            opacity: isDisabled ? 0.5 : 1,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: collapsed ? 0 : 40,
                                                color: isActive
                                                    ? 'primary.main'
                                                    : isDisabled
                                                      ? 'text.disabled'
                                                      : 'text.secondary',
                                            }}
                                        >
                                            {icon}
                                        </ListItemIcon>
                                        {!collapsed && <ListItemText primary={label} />}
                                    </ListItemButton>
                                </span>
                            </StyledTooltip>
                        );
                    })}
                </List>

                {/* Scrollable middle section for Sync and Connections */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        px: collapsed ? 1 : 1.5,
                        pb: 0,
                    }}
                >
                    {/* Sync Section */}
                    {!collapsed && groups.length > 0 && (
                        <>
                            <Divider sx={{ my: 0.5 }} />
                            <ListItemButton
                                onClick={toggleSync}
                                sx={{ px: 2 }}
                                selected={isSyncActive}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 40,
                                        color: isSyncActive ? 'primary.main' : 'text.secondary',
                                    }}
                                >
                                    <SyncIcon />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Instance Sync"
                                    primaryTypographyProps={{ fontSize: 14 }}
                                />
                                {syncExpanded ? (
                                    <ExpandLessIcon fontSize="small" />
                                ) : (
                                    <ExpandMoreIcon fontSize="small" />
                                )}
                            </ListItemButton>
                            <Collapse in={syncExpanded}>
                                <List disablePadding>
                                    {loadingGroups ? (
                                        <Box sx={{ py: 2, textAlign: 'center' }}>
                                            <CircularProgress size={16} />
                                        </Box>
                                    ) : (
                                        groups.map((group) => {
                                            const groupPath = `/groups/${group.id}/sync`;
                                            const isGroupActive = location.pathname === groupPath;
                                            return (
                                                <ListItemButton
                                                    key={group.id}
                                                    onClick={() => navigate(groupPath)}
                                                    selected={isGroupActive}
                                                    sx={{
                                                        pl: 4,
                                                        py: 0.75,
                                                    }}
                                                >
                                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                                        <LayersIcon
                                                            sx={{
                                                                fontSize: 18,
                                                                color: isGroupActive
                                                                    ? 'primary.main'
                                                                    : 'text.disabled',
                                                            }}
                                                        />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={group.name}
                                                        primaryTypographyProps={{
                                                            fontSize: 13,
                                                            noWrap: true,
                                                        }}
                                                        secondary={group.projectName}
                                                        secondaryTypographyProps={{
                                                            fontSize: 11,
                                                            noWrap: true,
                                                        }}
                                                    />
                                                </ListItemButton>
                                            );
                                        })
                                    )}
                                </List>
                            </Collapse>
                        </>
                    )}

                    {/* Collapsed sync icon with menu */}
                    {collapsed && groups.length > 0 && (
                        <>
                            <StyledTooltip title="Instance Sync" placement="right" arrow>
                                <ListItemButton
                                    onClick={(e) => setSyncMenuAnchor(e.currentTarget)}
                                    selected={isSyncActive}
                                    sx={{
                                        justifyContent: 'center',
                                        px: 1.5,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            color: isSyncActive ? 'primary.main' : 'text.secondary',
                                        }}
                                    >
                                        <SyncIcon />
                                    </ListItemIcon>
                                </ListItemButton>
                            </StyledTooltip>
                            <Menu
                                anchorEl={syncMenuAnchor}
                                open={Boolean(syncMenuAnchor)}
                                onClose={() => setSyncMenuAnchor(null)}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}
                                >
                                    Instance Sync Groups
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
                                            sx={{ minWidth: 180 }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                <LayersIcon
                                                    sx={{
                                                        fontSize: 18,
                                                        color: isGroupActive
                                                            ? 'primary.main'
                                                            : 'text.disabled',
                                                    }}
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={group.name}
                                                secondary={group.projectName}
                                                primaryTypographyProps={{ fontSize: 13 }}
                                                secondaryTypographyProps={{ fontSize: 11 }}
                                            />
                                        </MenuItem>
                                    );
                                })}
                            </Menu>
                        </>
                    )}

                    {/* Servers Section */}
                    {!collapsed && servers.length > 0 && (
                        <>
                            <Divider sx={{ my: 0.5 }} />
                            <ListItemButton
                                onClick={toggleServers}
                                sx={{ px: 2 }}
                                selected={isServersActive}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 40,
                                        color: isServersActive ? 'primary.main' : 'text.secondary',
                                    }}
                                >
                                    <DnsIcon />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Servers"
                                    primaryTypographyProps={{ fontSize: 14 }}
                                />
                                {serversExpanded ? (
                                    <ExpandLessIcon fontSize="small" />
                                ) : (
                                    <ExpandMoreIcon fontSize="small" />
                                )}
                            </ListItemButton>
                            <Collapse in={serversExpanded}>
                                <List disablePadding>
                                    {loadingServers ? (
                                        <Box sx={{ py: 2, textAlign: 'center' }}>
                                            <CircularProgress size={16} />
                                        </Box>
                                    ) : (
                                        servers.map((server) => {
                                            const serverPath = `/servers/${server.id}`;
                                            const isServerActive = location.pathname === serverPath;
                                            return (
                                                <ListItemButton
                                                    key={server.id}
                                                    onClick={() => navigate(serverPath)}
                                                    selected={isServerActive}
                                                    sx={{
                                                        pl: 4,
                                                        py: 0.75,
                                                    }}
                                                >
                                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                                        <DnsIcon
                                                            sx={{
                                                                fontSize: 18,
                                                                color: isServerActive
                                                                    ? 'primary.main'
                                                                    : 'text.disabled',
                                                            }}
                                                        />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={server.name}
                                                        primaryTypographyProps={{
                                                            fontSize: 13,
                                                            noWrap: true,
                                                        }}
                                                        secondary={`${server.host}:${server.port}`}
                                                        secondaryTypographyProps={{
                                                            fontSize: 11,
                                                            noWrap: true,
                                                        }}
                                                    />
                                                </ListItemButton>
                                            );
                                        })
                                    )}
                                </List>
                            </Collapse>
                        </>
                    )}

                    {/* Collapsed servers icon with menu */}
                    {collapsed && servers.length > 0 && (
                        <>
                            <StyledTooltip title="Servers" placement="right" arrow>
                                <ListItemButton
                                    onClick={(e) => setServersMenuAnchor(e.currentTarget)}
                                    selected={isServersActive}
                                    sx={{
                                        justifyContent: 'center',
                                        px: 1.5,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            color: isServersActive
                                                ? 'primary.main'
                                                : 'text.secondary',
                                        }}
                                    >
                                        <DnsIcon />
                                    </ListItemIcon>
                                </ListItemButton>
                            </StyledTooltip>
                            <Menu
                                anchorEl={serversMenuAnchor}
                                open={Boolean(serversMenuAnchor)}
                                onClose={() => setServersMenuAnchor(null)}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}
                                >
                                    Servers
                                </Typography>
                                <Divider />
                                {servers.map((server) => {
                                    const serverPath = `/servers/${server.id}`;
                                    const isServerActive = location.pathname === serverPath;
                                    return (
                                        <MenuItem
                                            key={server.id}
                                            onClick={() => {
                                                navigate(serverPath);
                                                setServersMenuAnchor(null);
                                            }}
                                            selected={isServerActive}
                                            sx={{ minWidth: 180 }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                <DnsIcon
                                                    sx={{
                                                        fontSize: 18,
                                                        color: isServerActive
                                                            ? 'primary.main'
                                                            : 'text.disabled',
                                                    }}
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={server.name}
                                                secondary={`${server.host}:${server.port}`}
                                                primaryTypographyProps={{ fontSize: 13 }}
                                                secondaryTypographyProps={{ fontSize: 11 }}
                                            />
                                        </MenuItem>
                                    );
                                })}
                            </Menu>
                        </>
                    )}

                    {/* Connections Section */}
                    {!collapsed && connections.length > 0 && (
                        <>
                            <Divider sx={{ my: 0.5 }} />
                            <ListItemButton
                                onClick={toggleConnections}
                                sx={{ px: 2, mb: 0 }}
                                selected={isConnectionsActive}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 40,
                                        color: isConnectionsActive
                                            ? 'primary.main'
                                            : 'text.secondary',
                                    }}
                                >
                                    <StorageIcon />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Databases"
                                    primaryTypographyProps={{ fontSize: 14 }}
                                />
                                {connectionsExpanded ? (
                                    <ExpandLessIcon fontSize="small" />
                                ) : (
                                    <ExpandMoreIcon fontSize="small" />
                                )}
                            </ListItemButton>
                            <Collapse in={connectionsExpanded}>
                                <List disablePadding>
                                    {loadingConnections ? (
                                        <Box sx={{ py: 2, textAlign: 'center' }}>
                                            <CircularProgress size={16} />
                                        </Box>
                                    ) : (
                                        connections.map((conn) => {
                                            const connPath = `/connections/${conn.id}`;
                                            const isConnActive = location.pathname === connPath;
                                            const connHealth = healthStatus[conn.id];
                                            const isOffline = connHealth
                                                ? !connHealth.isOnline
                                                : false;
                                            const isOnline = connHealth?.isOnline ?? false;

                                            const isSqlite = conn.engine === 'sqlite';
                                            const statusColor = isOnline
                                                ? 'success.main'
                                                : isOffline
                                                  ? 'error.main'
                                                  : 'text.disabled';
                                            const statusText = isOnline
                                                ? 'Online'
                                                : isOffline
                                                  ? 'Offline'
                                                  : 'Unknown';

                                            const tooltipContent = (
                                                <Box sx={{ p: 0.5 }}>
                                                    <Typography
                                                        variant="subtitle2"
                                                        fontWeight={600}
                                                    >
                                                        {conn.name}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            display: 'block',
                                                            color: 'text.secondary',
                                                        }}
                                                    >
                                                        {conn.engine.toUpperCase()}
                                                    </Typography>
                                                    {!isSqlite && conn.host && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ display: 'block' }}
                                                        >
                                                            {conn.host}:{conn.port}
                                                        </Typography>
                                                    )}
                                                    {conn.database && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'block',
                                                                wordBreak: 'break-all',
                                                            }}
                                                        >
                                                            {isSqlite
                                                                ? conn.database
                                                                : `DB: ${conn.database}`}
                                                        </Typography>
                                                    )}
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            mt: 0.5,
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 6,
                                                                height: 6,
                                                                borderRadius: '50%',
                                                                bgcolor: statusColor,
                                                            }}
                                                        />
                                                        <Typography
                                                            variant="caption"
                                                            color={statusColor}
                                                        >
                                                            {statusText}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            );

                                            return (
                                                <StyledTooltip
                                                    key={conn.id}
                                                    title={tooltipContent}
                                                    placement="right"
                                                    arrow
                                                >
                                                    <span>
                                                        <ListItemButton
                                                            onClick={() => navigate(connPath)}
                                                            selected={isConnActive}
                                                            disabled={isOffline}
                                                            sx={{
                                                                pl: 4,
                                                                py: 0.75,
                                                                opacity: isOffline ? 0.5 : 1,
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    bgcolor: isOnline
                                                                        ? 'success.main'
                                                                        : isOffline
                                                                          ? 'error.main'
                                                                          : 'text.disabled',
                                                                    ml: 1,
                                                                    mr: 2,
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            <ListItemText
                                                                primary={conn.name}
                                                                primaryTypographyProps={{
                                                                    fontSize: 13,
                                                                    noWrap: true,
                                                                }}
                                                                secondary={conn.engine}
                                                                secondaryTypographyProps={{
                                                                    fontSize: 11,
                                                                    noWrap: true,
                                                                }}
                                                            />
                                                        </ListItemButton>
                                                    </span>
                                                </StyledTooltip>
                                            );
                                        })
                                    )}
                                </List>
                            </Collapse>
                        </>
                    )}

                    {/* Collapsed connections icon with menu */}
                    {collapsed && connections.length > 0 && (
                        <>
                            <StyledTooltip title="Databases" placement="right" arrow>
                                <ListItemButton
                                    onClick={(e) => setConnectionsMenuAnchor(e.currentTarget)}
                                    selected={isConnectionsActive}
                                    sx={{
                                        justifyContent: 'center',
                                        px: 1.5,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            color: isConnectionsActive
                                                ? 'primary.main'
                                                : 'text.secondary',
                                        }}
                                    >
                                        <StorageIcon />
                                    </ListItemIcon>
                                </ListItemButton>
                            </StyledTooltip>
                            <Menu
                                anchorEl={connectionsMenuAnchor}
                                open={Boolean(connectionsMenuAnchor)}
                                onClose={() => setConnectionsMenuAnchor(null)}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}
                                >
                                    Databases
                                </Typography>
                                <Divider />
                                {connections.map((conn) => {
                                    const connPath = `/connections/${conn.id}`;
                                    const isConnActive = location.pathname === connPath;
                                    const connHealth = healthStatus[conn.id];
                                    const isOffline = connHealth ? !connHealth.isOnline : false;
                                    const isOnline = connHealth?.isOnline ?? false;

                                    const isSqliteMenu = conn.engine === 'sqlite';
                                    const menuTooltipContent = (
                                        <Box sx={{ p: 0.5 }}>
                                            {!isSqliteMenu && conn.host && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{ display: 'block' }}
                                                >
                                                    {conn.host}:{conn.port}
                                                </Typography>
                                            )}
                                            {conn.database && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: 'block',
                                                        wordBreak: 'break-all',
                                                    }}
                                                >
                                                    {isSqliteMenu
                                                        ? conn.database
                                                        : `DB: ${conn.database}`}
                                                </Typography>
                                            )}
                                        </Box>
                                    );

                                    return (
                                        <StyledTooltip
                                            key={conn.id}
                                            title={menuTooltipContent}
                                            placement="right"
                                            arrow
                                        >
                                            <span>
                                                <MenuItem
                                                    onClick={() => {
                                                        if (!isOffline) {
                                                            navigate(connPath);
                                                            setConnectionsMenuAnchor(null);
                                                        }
                                                    }}
                                                    selected={isConnActive}
                                                    disabled={isOffline}
                                                    sx={{
                                                        minWidth: 180,
                                                        opacity: isOffline ? 0.5 : 1,
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            bgcolor: isOnline
                                                                ? 'success.main'
                                                                : isOffline
                                                                  ? 'error.main'
                                                                  : 'text.disabled',
                                                            ml: 1,
                                                            mr: 2,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <ListItemText
                                                        primary={conn.name}
                                                        secondary={conn.engine}
                                                        primaryTypographyProps={{ fontSize: 13 }}
                                                        secondaryTypographyProps={{ fontSize: 11 }}
                                                    />
                                                </MenuItem>
                                            </span>
                                        </StyledTooltip>
                                    );
                                })}
                            </Menu>
                        </>
                    )}
                </Box>

                {/* Footer - Fixed at bottom */}
                <Divider />

                <List sx={{ px: collapsed ? 1 : 1.5, py: 1 }}>
                    <StyledTooltip title={collapsed ? 'Settings' : ''} placement="right" arrow>
                        <ListItemButton
                            component={NavLink}
                            to="/settings"
                            selected={location.pathname === '/settings'}
                            sx={{
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                px: collapsed ? 1.5 : 2,
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: collapsed ? 0 : 40,
                                    color:
                                        location.pathname === '/settings'
                                            ? 'primary.main'
                                            : 'text.secondary',
                                }}
                            >
                                <SettingsIcon />
                            </ListItemIcon>
                            {!collapsed && <ListItemText primary="Settings" />}
                        </ListItemButton>
                    </StyledTooltip>
                </List>

                {/* Collapse toggle */}
                <Box
                    sx={{
                        p: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: collapsed ? 'center' : 'flex-end',
                    }}
                >
                    <StyledTooltip
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        placement="right"
                        arrow
                    >
                        <IconButton size="small" onClick={toggle} sx={{ color: 'text.secondary' }}>
                            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </IconButton>
                    </StyledTooltip>
                </Box>
            </Drawer>

            {/* Main content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    bgcolor: 'background.default',
                    overflow: 'auto',
                }}
            >
                <Outlet />
            </Box>

            {/* Interactive onboarding tour */}
            <OnboardingTour hasConnections={connections.length > 0} />
        </Box>
    );
}
