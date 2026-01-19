import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Skeleton, Button, CircularProgress } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import GridViewIcon from '@mui/icons-material/GridView';
import TableChartIcon from '@mui/icons-material/TableChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditIcon from '@mui/icons-material/Edit';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConnectionConfig, DatabaseGroup } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { connectionsApi, schemaApi, projectsApi, groupsApi } from '../../lib/api';
import { ConnectionFormDialog } from '../ProjectsPage/Dialogs';
import { StatusAlert } from '@/components/StatusAlert';

interface StatCardProps {
    readonly icon: React.ReactNode;
    readonly label: string;
    readonly value: string | number;
    readonly isLoading?: boolean;
    readonly color?: string;
}

function StatCard({ icon, label, value, isLoading, color = 'primary.main' }: StatCardProps) {
    return (
        <GlassCard
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
            }}
        >
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: `${color}15`,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                    {label}
                </Typography>
                {isLoading ? (
                    <Skeleton width={60} height={28} />
                ) : (
                    <Typography variant="h5" fontWeight={600}>
                        {value}
                    </Typography>
                )}
            </Box>
        </GlassCard>
    );
}

interface OverviewTabProps {
    readonly connection: ConnectionConfig | undefined;
    readonly schemas: string[];
    readonly serverVersion: string | undefined;
    readonly isLoading: boolean;
}

export function OverviewTab({ connection, schemas, serverVersion, isLoading }: OverviewTabProps) {
    const navigate = useNavigate();
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Fetch total table count across all schemas
    const { data: totalTables = 0, isLoading: loadingTables } = useQuery({
        queryKey: ['totalTables', connection?.id],
        queryFn: async () => {
            if (!connection?.id) return 0;
            let total = 0;
            for (const schema of schemas) {
                const tables = await schemaApi.getTables(connection.id, schema);
                total += tables.length;
            }
            return total;
        },
        enabled: !!connection?.id && schemas.length > 0,
    });

    // Fetch projects and groups for the edit dialog
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: projectsApi.getAll,
    });

    const { data: groups = [] } = useQuery<DatabaseGroup[]>({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    const handleTest = async () => {
        if (!connection?.id) return;
        setTesting(true);
        setTestResult(null);
        try {
            const result = await connectionsApi.test(connection.id);
            setTestResult(result);
        } catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : 'Test failed',
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <Box>
            {/* Stats Grid */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 2,
                    mb: 3,
                }}
            >
                <StatCard
                    icon={<GridViewIcon />}
                    label="Schemas"
                    value={schemas.length}
                    isLoading={isLoading}
                    color="#8b5cf6"
                />
                <StatCard
                    icon={<TableChartIcon />}
                    label="Tables"
                    value={totalTables}
                    isLoading={loadingTables}
                    color="#06b6d4"
                />
                <StatCard
                    icon={<StorageIcon />}
                    label="Engine"
                    value={connection?.engine?.toUpperCase() || '-'}
                    isLoading={isLoading}
                    color="#f59e0b"
                />
            </Box>

            {/* Connection Details */}
            <GlassCard sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Connection Details
                </Typography>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 2,
                        mt: 2,
                    }}
                >
                    {isLoading && (
                        <>
                            <Skeleton height={40} />
                            <Skeleton height={40} />
                            <Skeleton height={40} />
                            <Skeleton height={40} />
                        </>
                    )}
                    {!isLoading && connection?.engine === 'sqlite' && (
                        <DetailItem label="Database File" value={connection.database} />
                    )}
                    {!isLoading && connection?.engine !== 'sqlite' && (
                        <>
                            <DetailItem
                                label="Host"
                                value={`${connection?.host}:${connection?.port}`}
                            />
                            <DetailItem label="Database" value={connection?.database} />
                            <DetailItem label="Username" value={connection?.username} />
                            {connection?.defaultSchema && (
                                <DetailItem
                                    label="Default Schema"
                                    value={connection.defaultSchema}
                                />
                            )}
                            <DetailItem
                                label="SSL"
                                value={connection?.ssl ? 'Enabled' : 'Disabled'}
                            />
                            {serverVersion && (
                                <DetailItem label="Server Version" value={serverVersion} />
                            )}
                        </>
                    )}
                </Box>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Quick Actions
                </Typography>

                {testResult && (
                    <StatusAlert
                        severity={testResult.success ? 'success' : 'error'}
                        onClose={() => setTestResult(null)}
                        sx={{ mb: 2 }}
                    >
                        {testResult.message}
                    </StatusAlert>
                )}

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => navigate(`/query/${connection?.id}`)}
                    >
                        Open Query Editor
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<AccountTreeIcon />}
                        onClick={() =>
                            navigate(
                                `/schema-diagram?connection=${connection?.id}${connection?.defaultSchema ? `&schema=${connection.defaultSchema}` : ''}`
                            )
                        }
                    >
                        Open Schema Diagram
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => setEditDialogOpen(true)}
                    >
                        Edit Connection
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={testing ? <CircularProgress size={16} /> : <ScienceIcon />}
                        onClick={handleTest}
                        disabled={testing}
                    >
                        Test Connection
                    </Button>
                </Box>
            </GlassCard>

            {/* Edit Connection Dialog */}
            <ConnectionFormDialog
                open={editDialogOpen}
                connection={connection || null}
                projects={projects}
                groups={groups}
                onClose={() => setEditDialogOpen(false)}
            />
        </Box>
    );
}

function DetailItem({ label, value }: { label: string; value: string | undefined }) {
    return (
        <Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
                {label}
            </Typography>
            <Typography variant="body1" fontFamily="monospace" sx={{ mt: 0.5 }}>
                {value || '-'}
            </Typography>
        </Box>
    );
}
