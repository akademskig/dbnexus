import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import {
    History as HistoryIcon,
    CompareArrows as MigrationIcon,
    Timeline as ActivityIcon,
} from '@mui/icons-material';
import { QueryHistoryTab } from './QueryHistoryTab';
import { MigrationHistoryTab } from './MigrationHistoryTab';
import { ActivityLogTab } from './ActivityLogTab';

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

export function LogsPage() {
    const [activeTab, setActiveTab] = useState(0);

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
                    />
                    <Tab
                        icon={<MigrationIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Migrations"
                    />
                    <Tab
                        icon={<ActivityIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        label="Activity"
                    />
                </Tabs>

                <Box sx={{ flex: 1, p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <TabPanel value={activeTab} index={0}>
                        <QueryHistoryTab />
                    </TabPanel>
                    <TabPanel value={activeTab} index={1}>
                        <MigrationHistoryTab />
                    </TabPanel>
                    <TabPanel value={activeTab} index={2}>
                        <ActivityLogTab />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
