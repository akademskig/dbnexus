import { useEffect, useCallback } from 'react';
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
import { StyledTooltip } from '../../components/StyledTooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorageIcon from '@mui/icons-material/Storage';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GridViewIcon from '@mui/icons-material/GridView';
import BuildIcon from '@mui/icons-material/Build';
import TableChartIcon from '@mui/icons-material/TableChart';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BackupIcon from '@mui/icons-material/Backup';
import { connectionsApi, schemaApi } from '../../lib/api';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { useConnectionManagementStore } from '../../stores/connectionManagementStore';
import { OverviewTab } from './OverviewTab';
import { SchemasTab } from './SchemasTab';
import { MaintenanceTab } from './MaintenanceTab';
import { TablesTab } from './TablesTab';
import { TableDetailsTab } from './TableDetailsTab';
import { BackupsTab } from './BackupsTab';

const TAB_ICONS = [
    <DashboardIcon key="overview" fontSize="small" />,
    <GridViewIcon key="schemas" fontSize="small" />,
    <TableChartIcon key="tables" fontSize="small" />,
    <SettingsIcon key="table-management" fontSize="small" />,
    <BuildIcon key="maintenance" fontSize="small" />,
    <BackupIcon key="backups" fontSize="small" />,
];

export function ConnectionManagementPage() {
    const { connectionId } = useParams<{ connectionId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Use the store for state management
    const {
        activeTab,
        selectedSchema,
        selectedTable,
        setActiveTab,
        setSelectedSchema,
        setSelection,
        initFromUrl,
    } = useConnectionManagementStore();

    // Initialize store from URL on mount
    useEffect(() => {
        initFromUrl(searchParams);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Handler for tab change
    const handleTabChange = useCallback(
        (_: unknown, newTab: number) => {
            setActiveTab(newTab);
            // Sync URL after state update
            setTimeout(() => {
                const params = useConnectionManagementStore.getState().getUrlParams();
                setSearchParams(params, { replace: true });
            }, 0);
        },
        [setActiveTab, setSearchParams]
    );

    // Handler to navigate to Tables tab with a specific schema selected
    const handleViewTablesForSchema = useCallback(
        (schemaName: string) => {
            setActiveTab(2);
            setSelection(schemaName, null);
            setTimeout(() => {
                const params = useConnectionManagementStore.getState().getUrlParams();
                setSearchParams(params, { replace: true });
            }, 0);
        },
        [setActiveTab, setSelection, setSearchParams]
    );

    // Handler to navigate to Table Management tab with a specific table selected
    const handleManageTable = useCallback(
        (schemaName: string, tableName: string) => {
            setActiveTab(3);
            setSelection(schemaName, tableName);
            setTimeout(() => {
                const params = useConnectionManagementStore.getState().getUrlParams();
                setSearchParams(params, { replace: true });
            }, 0);
        },
        [setActiveTab, setSelection, setSearchParams]
    );

    // Handler for schema change
    const handleSchemaChange = useCallback(
        (schemaName: string) => {
            setSelectedSchema(schemaName);
            setTimeout(() => {
                const params = useConnectionManagementStore.getState().getUrlParams();
                setSearchParams(params, { replace: true });
            }, 0);
        },
        [setSelectedSchema, setSearchParams]
    );

    // Handler for schema/table change together
    const handleSelectionChange = useCallback(
        (schemaName: string, tableName?: string) => {
            setSelection(schemaName, tableName ?? null);
            setTimeout(() => {
                const params = useConnectionManagementStore.getState().getUrlParams();
                setSearchParams(params, { replace: true });
            }, 0);
        },
        [setSelection, setSearchParams]
    );

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

    // Set default schema when schemas load and no schema is selected
    useEffect(() => {
        if (schemas.length > 0 && !selectedSchema && connection) {
            // Use connection's default schema, or fall back to first available
            const defaultSchema =
                connection.defaultSchema && schemas.includes(connection.defaultSchema)
                    ? connection.defaultSchema
                    : schemas[0]!;
            setSelectedSchema(defaultSchema);
            // Update URL with default schema
            setTimeout(() => {
                const params = useConnectionManagementStore.getState().getUrlParams();
                setSearchParams(params, { replace: true });
            }, 0);
        }
    }, [schemas, selectedSchema, connection, setSelectedSchema, setSearchParams]);

    // Handle missing connection
    useEffect(() => {
        if (connectionError) {
            navigate('/dashboard');
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

    // Show full-page loading state while connection is loading
    if (loadingConnection && !connection) {
        return (
            <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
                {/* Header skeleton */}
                <Box sx={{ mb: 4 }}>
                    <Skeleton width={150} height={20} sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="circular" width={32} height={32} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton width={250} height={36} />
                            <Skeleton width={180} height={20} sx={{ mt: 0.5 }} />
                        </Box>
                    </Box>
                </Box>

                {/* Tabs skeleton */}
                <GlassCard sx={{ mb: 3, p: 0 }}>
                    <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} width={100} height={40} />
                        ))}
                    </Box>
                </GlassCard>

                {/* Content skeleton */}
                <GlassCard>
                    <LoadingState message="Loading connection details..." size="large" />
                </GlassCard>
            </Box>
        );
    }

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
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tabs
                        value={activeTab}
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
                        <Tab icon={TAB_ICONS[5]} iconPosition="start" label="Backups" />
                    </Tabs>

                    {/* Schema Diagram shortcut */}
                    <StyledTooltip title="Open Schema Diagram">
                        <IconButton
                            onClick={() =>
                                navigate(
                                    `/schema-diagram?connection=${connectionId}${selectedSchema ? `&schema=${selectedSchema}` : ''}`
                                )
                            }
                            sx={{
                                mr: 2,
                                color: 'text.secondary',
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                '&:hover': {
                                    color: 'primary.main',
                                    borderColor: 'primary.main',
                                },
                            }}
                        >
                            <AccountTreeIcon fontSize="small" />
                        </IconButton>
                    </StyledTooltip>
                </Box>
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
                    initialSchema={selectedSchema}
                    onSchemaViewed={() => {}}
                    onManageTable={handleManageTable}
                    onSchemaChange={handleSchemaChange}
                />
            )}
            {activeTab === 3 && (
                <TableDetailsTab
                    connectionId={connectionId}
                    connection={connection}
                    schemas={schemas}
                    isLoading={loadingSchemas}
                    initialSchema={selectedSchema}
                    initialTable={selectedTable}
                    onSelectionChange={handleSelectionChange}
                />
            )}
            {activeTab === 4 && (
                <MaintenanceTab
                    connectionId={connectionId}
                    connection={connection}
                    schemas={schemas}
                    selectedSchema={selectedSchema}
                    onSchemaChange={handleSchemaChange}
                />
            )}
            {activeTab === 5 && connection && (
                <BackupsTab
                    connectionId={connectionId}
                    connectionName={connection.name}
                    engine={connection.engine}
                />
            )}
        </Box>
    );
}
