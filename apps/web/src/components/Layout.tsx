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
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import TerminalIcon from '@mui/icons-material/Terminal';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const DRAWER_WIDTH = 260;

const navItems = [
    { to: '/dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
    { to: '/connections', icon: <StorageIcon />, label: 'Connections' },
    { to: '/query', icon: <TerminalIcon />, label: 'Query' },
    { to: '/showcase', icon: <PaletteIcon />, label: 'Showcase v1' },
    { to: '/showcase2', icon: <ViewQuiltIcon />, label: 'Showcase v2' },
    { to: '/showcase3', icon: <AutoAwesomeIcon />, label: 'Showcase v3' },
];

export function Layout() {
    const location = useLocation();

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: 'background.paper',
                    },
                }}
            >
                {/* Logo */}
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        component="img"
                        src="/logo.svg"
                        alt="DB Nexus"
                        sx={{
                            width: 40,
                            height: 40,
                        }}
                    />
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                            DB Nexus
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Database Manager
                        </Typography>
                    </Box>
                </Box>

                <Divider />

                {/* Navigation */}
                <List sx={{ px: 1.5, py: 2, flex: 1 }}>
                    {navItems.map(({ to, icon, label }) => {
                        const isActive =
                            location.pathname === to || location.pathname.startsWith(to + '/');
                        return (
                            <ListItemButton
                                key={to}
                                component={NavLink}
                                to={to}
                                selected={isActive}
                                sx={{ mb: 0.5 }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 40,
                                        color: isActive ? 'primary.main' : 'text.secondary',
                                    }}
                                >
                                    {icon}
                                </ListItemIcon>
                                <ListItemText primary={label} />
                            </ListItemButton>
                        );
                    })}
                </List>

                <Divider />

                {/* Footer */}
                <List sx={{ px: 1.5, py: 1 }}>
                    <ListItemButton
                        component={NavLink}
                        to="/settings"
                        selected={location.pathname === '/settings'}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 40,
                                color:
                                    location.pathname === '/settings'
                                        ? 'primary.main'
                                        : 'text.secondary',
                            }}
                        >
                            <SettingsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Settings" />
                    </ListItemButton>
                </List>
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
