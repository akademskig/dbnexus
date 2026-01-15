import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
    Tooltip,
    Collapse,
    CircularProgress,
    Menu,
    MenuItem,
    useTheme,
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
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { groupsApi, connectionsApi } from '../lib/api';
import { themeColors } from '../theme';
import type { DatabaseGroup, ConnectionConfig } from '@dbnexus/shared';
import { useNavigationShortcuts } from '../hooks/useKeyboardShortcuts';
import { useConnectionHealthStore } from '../stores/connectionHealthStore';

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 64;

// Sidebar state store
interface SidebarStore {
    collapsed: boolean;
    syncExpanded: boolean;
    connectionsExpanded: boolean;
    toggle: () => void;
    toggleSync: () => void;
    toggleConnections: () => void;
}

const useSidebarStore = create<SidebarStore>()(
    persist(
        (set) => ({
            collapsed: false,
            syncExpanded: true,
            connectionsExpanded: true,
            toggle: () => set((state) => ({ collapsed: !state.collapsed })),
            toggleSync: () => set((state) => ({ syncExpanded: !state.syncExpanded })),
            toggleConnections: () =>
                set((state) => ({ connectionsExpanded: !state.connectionsExpanded })),
        }),
        { name: 'dbnexus-sidebar' }
    )
);

const navItems = [
    { to: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
    { to: '/query', icon: <TerminalIcon />, label: 'Query' },
    { to: '/schema-diagram', icon: <AccountTreeIcon />, label: 'Schema Diagram' },
    { to: '/compare', icon: <CompareArrowsIcon />, label: 'Compare' },
    { to: '/logs', icon: <HistoryIcon />, label: 'Logs' },
];

export function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const { collapsed, syncExpanded, connectionsExpanded, toggle, toggleSync, toggleConnections } =
        useSidebarStore();
    const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;
    const colors = themeColors[theme.palette.mode];

    const [groups, setGroups] = useState<DatabaseGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [syncMenuAnchor, setSyncMenuAnchor] = useState<null | HTMLElement>(null);
    const [connections, setConnections] = useState<ConnectionConfig[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(true);
    const [connectionsMenuAnchor, setConnectionsMenuAnchor] = useState<null | HTMLElement>(null);

    // Connection health store
    const { healthStatus, checkAllConnections } = useConnectionHealthStore();

    // Register global navigation shortcuts
    useNavigationShortcuts(navigate);

    useEffect(() => {
        groupsApi
            .getAll()
            .then(setGroups)
            .catch(() => setGroups([]))
            .finally(() => setLoadingGroups(false));

        connectionsApi
            .getAll()
            .then((conns) => {
                setConnections(conns);
                // Check health of all connections in background
                checkAllConnections(conns.map((c) => c.id));
            })
            .catch(() => setConnections([]))
            .finally(() => setLoadingConnections(false));
    }, [checkAllConnections]);

    const isSyncActive =
        location.pathname.startsWith('/groups/') && location.pathname.includes('/sync');

    const isConnectionsActive = location.pathname.startsWith('/connections/');

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
                    },
                }}
            >
                {/* Logo */}
                <Box
                    sx={{
                        px: collapsed ? 1 : 1,
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                >
                    <Box
                        component="img"
                        src={theme.palette.mode === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
                        alt="DB Nexus"
                        sx={{
                            width: collapsed ? 40 : 66,
                            height: collapsed ? 40 : 66,
                            transition: 'all 0.2s ease',
                        }}
                    />
                    {!collapsed && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                sx={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 700,
                                    fontSize: '1.2rem',
                                    color: colors.primary,
                                    bgcolor: `rgba(${colors.primaryRgb}, 0.1)`,
                                    paddingX: 0.75,
                                    py: 0.25,
                                    borderRadius: 0.5,
                                }}
                            >
                                DB
                            </Typography>
                            <Typography
                                sx={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600,
                                    fontSize: '1.2rem',
                                    color: 'text.primary',
                                }}
                            >
                                Nexus
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Divider />

                {/* Navigation */}
                <List sx={{ px: collapsed ? 1 : 1.5, py: 2, flex: 1 }}>
                    {navItems.map(({ to, icon, label }) => {
                        const isActive =
                            location.pathname === to || location.pathname.startsWith(to + '/');
                        return (
                            <Tooltip
                                key={to}
                                title={collapsed ? label : ''}
                                placement="right"
                                arrow
                            >
                                <ListItemButton
                                    component={NavLink}
                                    to={to}
                                    selected={isActive}
                                    sx={{
                                        mb: 0.5,
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        px: collapsed ? 1.5 : 2,
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: collapsed ? 0 : 40,
                                            color: isActive ? 'primary.main' : 'text.secondary',
                                        }}
                                    >
                                        {icon}
                                    </ListItemIcon>
                                    {!collapsed && <ListItemText primary={label} />}
                                </ListItemButton>
                            </Tooltip>
                        );
                    })}

                    {/* Sync Section */}
                    {!collapsed && groups.length > 0 && (
                        <>
                            <Divider sx={{ my: 1.5 }} />
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
                            <Tooltip title="Instance Sync" placement="right" arrow>
                                <ListItemButton
                                    onClick={(e) => setSyncMenuAnchor(e.currentTarget)}
                                    selected={isSyncActive}
                                    sx={{
                                        mb: 0.5,
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
                            </Tooltip>
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

                    {/* Connections Section */}
                    {!collapsed && connections.length > 0 && (
                        <>
                            <Divider sx={{ my: 1.5 }} />
                            <ListItemButton
                                onClick={toggleConnections}
                                sx={{ px: 2 }}
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
                                    primary="Connections"
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

                                            return (
                                                <Tooltip
                                                    key={conn.id}
                                                    title={isOffline ? 'Offline' : ''}
                                                    placement="right"
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
                                                </Tooltip>
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
                            <Tooltip title="Connections" placement="right" arrow>
                                <ListItemButton
                                    onClick={(e) => setConnectionsMenuAnchor(e.currentTarget)}
                                    selected={isConnectionsActive}
                                    sx={{
                                        mb: 0.5,
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
                            </Tooltip>
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
                                    Connections
                                </Typography>
                                <Divider />
                                {connections.map((conn) => {
                                    const connPath = `/connections/${conn.id}`;
                                    const isConnActive = location.pathname === connPath;
                                    const connHealth = healthStatus[conn.id];
                                    const isOffline = connHealth ? !connHealth.isOnline : false;
                                    const isOnline = connHealth?.isOnline ?? false;

                                    return (
                                        <Tooltip
                                            key={conn.id}
                                            title={isOffline ? 'Offline' : ''}
                                            placement="right"
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
                                        </Tooltip>
                                    );
                                })}
                            </Menu>
                        </>
                    )}
                </List>

                <Divider />

                {/* Footer */}
                <List sx={{ px: collapsed ? 1 : 1.5, py: 1 }}>
                    <Tooltip title={collapsed ? 'Settings' : ''} placement="right" arrow>
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
                    </Tooltip>
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
                    <Tooltip
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        placement="right"
                    >
                        <IconButton size="small" onClick={toggle} sx={{ color: 'text.secondary' }}>
                            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </IconButton>
                    </Tooltip>
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
        </Box>
    );
}
