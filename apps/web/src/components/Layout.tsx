import { Outlet, NavLink, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import TerminalIcon from '@mui/icons-material/Terminal';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 64;

// Sidebar state store
interface SidebarStore {
    collapsed: boolean;
    toggle: () => void;
}

const useSidebarStore = create<SidebarStore>()(
    persist(
        (set) => ({
            collapsed: false,
            toggle: () => set((state) => ({ collapsed: !state.collapsed })),
        }),
        { name: 'dbnexus-sidebar' }
    )
);

const navItems = [
    { to: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
    { to: '/connections', icon: <StorageIcon />, label: 'Connections' },
    { to: '/query', icon: <TerminalIcon />, label: 'Query' },
    { to: '/schema-diff', icon: <CompareArrowsIcon />, label: 'Schema Diff' },
];

export function Layout() {
    const location = useLocation();
    const { collapsed, toggle } = useSidebarStore();
    const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

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
                        py: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                    }}
                >
                    <Box
                        component="img"
                        src="/logo.svg"
                        alt="DB Nexus"
                        sx={{
                            width: collapsed ? 40 : 48,
                            height: collapsed ? 40 : 48,
                            transition: 'all 0.2s ease',
                        }}
                    />
                    {!collapsed && (
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: '-0.02em',
                                    background:
                                        'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                DB
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 300,
                                    letterSpacing: '0.05em',
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
