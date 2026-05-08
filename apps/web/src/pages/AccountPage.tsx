import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { Person as PersonIcon, People as PeopleIcon } from '@mui/icons-material';
import { GlassCard } from '../components/GlassCard';
import { AccountTab } from './SettingsPage/AccountTab';
import { UsersTab } from './SettingsPage/UsersTab';
import { useAuthStore } from '../stores/authStore';

export function AccountPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [tab, setTab] = useState(0);
    const currentUser = useAuthStore((state) => state.user);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'users' || tabParam === 'admin') setTab(1);
        else setTab(0);
    }, [searchParams]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
        const tabNames = ['account', 'users'];
        const tabName = tabNames[newValue];
        if (tabName) {
            setSearchParams({ tab: tabName });
        }
    };

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            <Box sx={{ maxWidth: 850, mx: 'auto' }}>
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            mb: 1,
                        }}
                    >
                        Account
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Manage your account settings and security
                    </Typography>
                </Box>

                <GlassCard sx={{ mb: 3, p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tabs
                            value={tab}
                            onChange={handleTabChange}
                            sx={{
                                flex: 1,
                                px: 2,
                                '& .MuiTabs-indicator': {
                                    bgcolor: 'primary.main',
                                },
                                '& .MuiTab-root': {
                                    color: 'text.secondary',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    gap: 1,
                                    minHeight: 56,
                                    '&.Mui-selected': {
                                        color: 'primary.main',
                                    },
                                },
                            }}
                        >
                            <Tab
                                icon={<PersonIcon fontSize="small" />}
                                iconPosition="start"
                                label="Profile & Security"
                            />
                            {currentUser?.role === 'admin' && (
                                <Tab
                                    icon={<PeopleIcon fontSize="small" />}
                                    iconPosition="start"
                                    label="Users"
                                />
                            )}
                        </Tabs>
                    </Box>
                </GlassCard>

                {tab === 0 && <AccountTab />}
                {tab === 1 && currentUser?.role === 'admin' && <UsersTab />}
            </Box>
        </Box>
    );
}
