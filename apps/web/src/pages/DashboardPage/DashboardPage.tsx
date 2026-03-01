import { useEffect, useState } from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search as SearchIcon } from '@mui/icons-material';
import { connectionsApi, serversApi, syncApi, projectsApi } from '../../lib/api';
import { GlassCard } from '../../components/GlassCard';
import { LoadingState } from '../../components/LoadingState';
import type { InstanceGroupSyncStatus } from '@dbnexus/shared';
import { QuickAccessSection } from './QuickAccessSection';
import { SyncGroupsSection } from './SyncGroupsSection';
import { ServerDatabaseTable } from './ServerDatabaseTable';
import { ProjectsSection } from './ProjectsSection';
import { useConnectionHealthStore } from '../../stores/connectionHealthStore';
import { ScanConnectionsDialog } from '../../components/ScanConnectionsDialog';
import { StyledTooltip } from '../../components/StyledTooltip';

export function DashboardPage() {
    const queryClient = useQueryClient();
    const [syncStatuses, setSyncStatuses] = useState<Record<string, InstanceGroupSyncStatus>>({});
    const [syncChecking, setSyncChecking] = useState<Record<string, boolean>>({});
    const [scanDialogOpen, setScanDialogOpen] = useState(false);

    const { checkAllConnections } = useConnectionHealthStore();

    const { data: servers = [], isLoading: loadingServers } = useQuery({
        queryKey: ['servers'],
        queryFn: () => serversApi.getAll(),
    });

    const { data: connections = [], isLoading: loadingConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: () => connectionsApi.getAll(),
    });

    const { data: projects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll(),
    });

    const { data: syncGroups = [] } = useQuery({
        queryKey: ['syncGroups'],
        queryFn: () => syncApi.getSyncEnabledGroups().catch(() => []),
    });

    const loading = loadingServers || loadingConnections || loadingProjects;

    const checkGroupSyncStatus = async (groupId: string) => {
        setSyncChecking((prev) => ({ ...prev, [groupId]: true }));
        try {
            const status = await syncApi.getGroupSyncStatus(groupId);
            setSyncStatuses((prev) => ({ ...prev, [groupId]: status }));
            queryClient.setQueryData(['groupSyncStatus', groupId], status);
        } catch (error) {
            console.error(`Failed to check sync status for group ${groupId}:`, error);
        } finally {
            setSyncChecking((prev) => ({ ...prev, [groupId]: false }));
        }
    };

    useEffect(() => {
        if (connections.length > 0) {
            checkAllConnections(connections.map((c) => c.id));
        }
    }, [connections, checkAllConnections]);

    useEffect(() => {
        syncGroups.forEach((group) => {
            if (group.sourceConnectionId && (group.syncSchema || group.syncData)) {
                checkGroupSyncStatus(group.id);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncGroups]);

    useEffect(() => {
        const REFRESH_INTERVAL = 10 * 60 * 1000;

        const refreshSyncStatuses = () => {
            syncGroups.forEach((group) => {
                if (group.sourceConnectionId && (group.syncSchema || group.syncData)) {
                    checkGroupSyncStatus(group.id);
                }
            });
        };

        const intervalId = setInterval(refreshSyncStatuses, REFRESH_INTERVAL);
        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncGroups]);

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box
                sx={{
                    mb: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            letterSpacing: '-0.02em',
                            mb: 0.5,
                        }}
                    >
                        Dashboard
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Manage your servers and databases
                    </Typography>
                </Box>
                <StyledTooltip title="Scan for database connections">
                    <Button
                        variant="outlined"
                        startIcon={<SearchIcon />}
                        onClick={() => setScanDialogOpen(true)}
                    >
                        Scan
                    </Button>
                </StyledTooltip>
            </Box>

            {/* Two Column Layout */}
            <Grid container spacing={3}>
                {/* Left Column - Servers, Databases & Projects */}
                <Grid item xs={12} lg={8}>
                    {loading ? (
                        <GlassCard>
                            <LoadingState message="Loading servers and databases..." />
                        </GlassCard>
                    ) : (
                        <>
                            <ServerDatabaseTable
                                servers={servers}
                                connections={connections}
                                loading={loading}
                            />
                            <Box sx={{ mt: 3 }}>
                                <ProjectsSection
                                    projects={projects}
                                    connections={connections}
                                    loading={loadingProjects}
                                />
                            </Box>
                        </>
                    )}
                </Grid>

                {/* Right Column - Quick Access & Sync Groups */}
                <Grid item xs={12} lg={4}>
                    {/* Quick Access Section */}
                    <QuickAccessSection />

                    {/* Sync Groups Section */}
                    <SyncGroupsSection
                        syncGroups={syncGroups}
                        syncStatuses={syncStatuses}
                        syncChecking={syncChecking}
                        connections={connections}
                        onCheckStatus={checkGroupSyncStatus}
                    />
                </Grid>
            </Grid>

            {/* Scan Connections Dialog */}
            <ScanConnectionsDialog
                open={scanDialogOpen}
                onClose={() => {
                    setScanDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['servers'] });
                    queryClient.invalidateQueries({ queryKey: ['connections'] });
                    queryClient.invalidateQueries({ queryKey: ['syncGroups'] });
                }}
            />
        </Box>
    );
}
