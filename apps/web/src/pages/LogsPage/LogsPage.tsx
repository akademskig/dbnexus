import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import {
    History as HistoryIcon,
    CompareArrows as MigrationIcon,
    Sync as SyncIcon,
    Timeline as ActivityIcon,
    Security as AuditIcon,
    Backup as BackupIcon,
} from '@mui/icons-material';
import { QueryHistoryTab } from './QueryHistoryTab';
import { MigrationHistoryTab } from './MigrationHistoryTab';
import { SyncRunsTab } from './SyncRunsTab';
import { ActivityLogTab } from './ActivityLogTab';
import { AuditLogsTab } from './AuditLogsTab';
import { BackupLogsTab } from './BackupLogsTab';
import { connectionsApi } from '../../lib/api';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            sx={{
                flex: 1,
                display: value === index ? 'flex' : 'none',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {value === index && children}
        </Box>
    );
}

const TAB_NAMES = ['query-history', 'migrations', 'data-sync', 'activity', 'audit-logs', 'backups'];

function getTabIndex(tabName: string): number {
    const index = TAB_NAMES.indexOf(tabName);
    return index >= 0 ? index : 0;
}

export function LogsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(urlTab ? getTabIndex(urlTab) : 0);

    // Fetch connections to check if any exist
    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    // Update URL when tab changes
    useEffect(() => {
        const currentTab = TAB_NAMES[activeTab];
        if (currentTab) {
            setSearchParams({ tab: currentTab }, { replace: true });
        }
    }, [activeTab, setSearchParams]);

    // Sync tab from URL
    useEffect(() => {
        if (urlTab) {
            const index = getTabIndex(urlTab);
            if (index !== activeTab) {
                setActiveTab(index);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlTab]); // Only react to URL changes, not state changes

    // Redirect to dashboard if no connections after loading
    if (!loadingConnections && connections.length === 0) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <Box
            sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                    Logs & History
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Review query history, migrations, and system activity
                </Typography>
            </Box>

            {/* Tabs */}
            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        minHeight: 48,
                        '& .MuiTab-root': {
                            minHeight: 48,
                            textTransform: 'none',
                        },
                    }}
                >
                    <Tab
                        icon={<HistoryIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Query History"
                        data-tour="query-history"
                    />
                    <Tab
                        icon={<MigrationIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Migrations"
                    />
                    <Tab
                        icon={<SyncIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Data Sync"
                    />
                    <Tab
                        icon={<ActivityIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Activity"
                    />
                    <Tab
                        icon={<AuditIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Audit Logs"
                    />
                    <Tab
                        icon={<BackupIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Backups"
                    />
                </Tabs>

                <Box
                    sx={{
                        flex: 1,
                        p: 2,
                        pt: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <TabPanel value={activeTab} index={0}>
                        <QueryHistoryTab />
                    </TabPanel>
                    <TabPanel value={activeTab} index={1}>
                        <MigrationHistoryTab />
                    </TabPanel>
                    <TabPanel value={activeTab} index={2}>
                        <SyncRunsTab />
                    </TabPanel>
                    <TabPanel value={activeTab} index={3}>
                        <ActivityLogTab />
                    </TabPanel>
                    <TabPanel value={activeTab} index={4}>
                        <AuditLogsTab />
                    </TabPanel>
                    <TabPanel value={activeTab} index={5}>
                        <BackupLogsTab />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
