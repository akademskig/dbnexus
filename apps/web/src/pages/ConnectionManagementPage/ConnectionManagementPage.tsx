import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    IconButton,
    Chip,
    Breadcrumbs,
    Link,
    Skeleton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorageIcon from '@mui/icons-material/Storage';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GridViewIcon from '@mui/icons-material/GridView';
import BuildIcon from '@mui/icons-material/Build';
import TableChartIcon from '@mui/icons-material/TableChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { connectionsApi, schemaApi } from '../../lib/api';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { OverviewTab } from './OverviewTab';
import { SchemasTab } from './SchemasTab';
import { MaintenanceTab } from './MaintenanceTab';
import { TablesTab } from './TablesTab';
import { TableDetailsTab } from './TableDetailsTab';

const TAB_ICONS = [
    <DashboardIcon key="overview" fontSize="small" />,
    <GridViewIcon key="schemas" fontSize="small" />,
    <TableChartIcon key="tables" fontSize="small" />,
    <SettingsIcon key="table-management" fontSize="small" />,
    <BuildIcon key="maintenance" fontSize="small" />,
];

export function ConnectionManagementPage() {
    const { connectionId } = useParams<{ connectionId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Get tab, schema, and table from URL
    const urlTab = searchParams.get('tab');
    const urlSchema = searchParams.get('schema');
    const urlTable = searchParams.get('table');

    const [activeTab, setActiveTab] = useState(() => {
        if (urlTab === 'schemas') return 1;
        if (urlTab === 'tables') return 2;
        if (urlTab === 'management') return 3;
        if (urlTab === 'maintenance') return 4;
        return 0;
    });
    const [selectedSchemaForTables, setSelectedSchemaForTables] = useState<string | null>(null);

    // Handler to navigate to Tables tab with a specific schema selected
    const handleViewTablesForSchema = (schemaName: string) => {
        setSelectedSchemaForTables(schemaName);
        setActiveTab(2); // Tables tab index
        setSearchParams({ tab: 'tables', schema: schemaName });
    };

    // Handler to navigate to Table Management tab with a specific table selected
    const handleManageTable = (schemaName: string, tableName: string) => {
        setActiveTab(3); // Table Management tab index
        setSearchParams({ tab: 'management', schema: schemaName, table: tableName });
    };

    // Handler for schema change in Tables tab
    const handleTablesSchemaChange = (schemaName: string) => {
        setSearchParams({ tab: 'tables', schema: schemaName });
    };

    // Handler for schema/table change in Table Management tab
    const handleManagementSelectionChange = (schemaName: string, tableName?: string) => {
        const params: Record<string, string> = { tab: 'management', schema: schemaName };
        if (tableName) params.table = tableName;
        setSearchParams(params);
    };

    // Update URL when tab changes
    const handleTabChange = (_: unknown, newTab: number) => {
        setActiveTab(newTab);
        const tabNames = ['overview', 'schemas', 'tables', 'management', 'maintenance'] as const;
        const params: Record<string, string> = { tab: tabNames[newTab] || 'overview' };
        // Preserve schema/table params for tables and management tabs
        if ((newTab === 2 || newTab === 3) && urlSchema) {
            params.schema = urlSchema;
            if (newTab === 3 && urlTable) params.table = urlTable;
        }
        setSearchParams(params);
    };

    // Fetch connection details
    const {
        data: connection,
        isLoading: loadingConnection,
        error: connectionError,
    } = useQuery({
        queryKey: ['connection', connectionId],
        queryFn: () => connectionsApi.getById(connectionId!),
        enabled: !!connectionId,
    });

    // Fetch schemas for stats
    const { data: schemas = [], isLoading: loadingSchemas } = useQuery({
        queryKey: ['schemas', connectionId],
        queryFn: () => schemaApi.getSchemas(connectionId!),
        enabled: !!connectionId,
    });

    // Fetch server version
    const { data: versionData } = useQuery({
        queryKey: ['serverVersion', connectionId],
        queryFn: () => schemaApi.getServerVersion(connectionId!),
        enabled: !!connectionId,
    });

    // Handle missing connection
    useEffect(() => {
        if (connectionError) {
            navigate('/connections');
        }
    }, [connectionError, navigate]);

    if (!connectionId) {
        return (
            <Box sx={{ p: 4 }}>
                <EmptyState
                    icon={<StorageIcon />}
                    title="No connection selected"
                    description="Please select a connection from the connections page."
                    action={{
                        label: 'Go to Connections',
                        onClick: () => navigate('/connections'),
                    }}
                />
            </Box>
        );
    }

    const isLoading = loadingConnection || loadingSchemas;

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                {/* Breadcrumbs */}
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => navigate('/connections')}
                        sx={{
                            color: 'text.secondary',
                            textDecoration: 'none',
                            '&:hover': { color: 'primary.main' },
                        }}
                    >
                        Connections
                    </Link>
                    <Typography variant="body2" color="text.primary">
                        {loadingConnection ? <Skeleton width={100} /> : connection?.name}
                    </Typography>
                </Breadcrumbs>

                {/* Title row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton
                        onClick={() => navigate('/connections')}
                        sx={{ color: 'text.secondary' }}
                    >
                        <ArrowBackIcon />
                    </IconButton>

                    <StorageIcon sx={{ fontSize: 32, color: 'primary.main' }} />

                    <Box sx={{ flex: 1 }}>
                        {loadingConnection ? (
                            <>
                                <Skeleton width={200} height={32} />
                                <Skeleton width={150} height={20} />
                            </>
                        ) : (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Typography variant="h4" fontWeight={600}>
                                        {connection?.name}
                                    </Typography>
                                    <Chip
                                        label={connection?.engine?.toUpperCase()}
                                        size="small"
                                        sx={{
                                            height: 22,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            bgcolor:
                                                connection?.engine === 'postgres'
                                                    ? 'rgba(51, 103, 145, 0.2)'
                                                    : 'rgba(0, 122, 204, 0.2)',
                                            color:
                                                connection?.engine === 'postgres'
                                                    ? '#6BA3D6'
                                                    : '#47A3F3',
                                        }}
                                    />
                                    {connection?.readOnly && (
                                        <Chip
                                            label="READ-ONLY"
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: 10,
                                                fontWeight: 600,
                                                bgcolor: 'rgba(139, 92, 246, 0.15)',
                                                color: 'rgb(139, 92, 246)',
                                            }}
                                        />
                                    )}
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {connection?.engine === 'sqlite'
                                        ? connection?.database
                                        : `${connection?.host}:${connection?.port} • ${connection?.database}`}
                                    {versionData?.version && ` • ${versionData.version}`}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* Tabs */}
            <GlassCard sx={{ mb: 3, p: 0 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    sx={{
                        px: 2,
                        '& .MuiTabs-indicator': {
                            bgcolor: 'primary.main',
                        },
                        '& .MuiTab-root': {
                            color: 'text.secondary',
                            textTransform: 'none',
                            fontWeight: 500,
                            minHeight: 56,
                            gap: 1,
                            '&.Mui-selected': {
                                color: 'primary.main',
                            },
                        },
                    }}
                >
                    <Tab icon={TAB_ICONS[0]} iconPosition="start" label="Overview" />
                    <Tab
                        icon={TAB_ICONS[1]}
                        iconPosition="start"
                        label={`Schemas${schemas.length > 0 ? ` (${schemas.length})` : ''}`}
                    />
                    <Tab icon={TAB_ICONS[2]} iconPosition="start" label="Tables" />
                    <Tab icon={TAB_ICONS[3]} iconPosition="start" label="Table Management" />
                    <Tab icon={TAB_ICONS[4]} iconPosition="start" label="Maintenance" />
                </Tabs>
            </GlassCard>

            {/* Tab Content */}
            {activeTab === 0 && (
                <OverviewTab
                    connection={connection}
                    schemas={schemas}
                    serverVersion={versionData?.version}
                    isLoading={isLoading}
                />
            )}
            {activeTab === 1 && (
                <SchemasTab
                    connectionId={connectionId}
                    connection={connection}
                    schemas={schemas}
                    isLoading={loadingSchemas}
                    onViewTables={handleViewTablesForSchema}
                />
            )}
            {activeTab === 2 && (
                <TablesTab
                    connectionId={connectionId}
                    connection={connection}
                    schemas={schemas}
                    isLoading={loadingSchemas}
                    initialSchema={selectedSchemaForTables || urlSchema}
                    onSchemaViewed={() => setSelectedSchemaForTables(null)}
                    onManageTable={handleManageTable}
                    onSchemaChange={handleTablesSchemaChange}
                />
            )}
            {activeTab === 3 && (
                <TableDetailsTab
                    connectionId={connectionId}
                    connection={connection}
                    schemas={schemas}
                    isLoading={loadingSchemas}
                    initialSchema={urlSchema}
                    initialTable={urlTable}
                    onSelectionChange={handleManagementSelectionChange}
                />
            )}
            {activeTab === 4 && (
                <MaintenanceTab
                    connectionId={connectionId}
                    connection={connection}
                    schemas={schemas}
                />
            )}
        </Box>
    );
}
