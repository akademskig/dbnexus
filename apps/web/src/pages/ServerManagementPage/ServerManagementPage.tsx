import { useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    IconButton,
    Chip,
    Breadcrumbs,
    Link,
    Button,
    alpha,
    CircularProgress,
    Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DnsIcon from '@mui/icons-material/Dns';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScienceIcon from '@mui/icons-material/Science';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useTagsStore } from '../../stores/tagsStore';
import { serversApi, connectionsApi, projectsApi, groupsApi } from '../../lib/api';
import type { ConnectionConfig } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { useToastStore } from '../../stores/toastStore';
import { ConnectionCard } from '../ProjectsPage/ConnectionCard';
import { ConnectionFormDialog } from '../ConnectionsPage/Dialogs';
import { ServerFormDialog } from '../ServersPage/ServerFormDialog';
import { CreateDatabaseDialog } from './CreateDatabaseDialog';

const ENGINE_COLORS: Record<string, string> = {
    postgres: '#336791',
    mysql: '#4479A1',
    mariadb: '#003545',
    sqlite: '#003B57',
};

const ENGINE_LABELS: Record<string, string> = {
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    mariadb: 'MariaDB',
    sqlite: 'SQLite',
};

interface InfoBoxProps {
    label: string;
    value: string | number | null | undefined;
    copyable?: boolean;
    onCopy?: () => void;
    children?: React.ReactNode;
}

function InfoBox({ label, value, copyable = true, onCopy, children }: InfoBoxProps) {
    const toast = useToastStore();

    const handleCopy = () => {
        if (value != null) {
            navigator.clipboard.writeText(String(value));
            toast.success(`${label} copied`);
            onCopy?.();
        }
    };

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 1,
                border: 1,
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
                position: 'relative',
                '&:hover .copy-btn': {
                    opacity: 1,
                },
            }}
        >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {label}
            </Typography>
            {children || (
                <Typography variant="body2" fontWeight={500}>
                    {value ?? (
                        <Typography component="span" color="text.disabled" fontStyle="italic">
                            Not configured
                        </Typography>
                    )}
                </Typography>
            )}
            {copyable && value != null && (
                <IconButton
                    className="copy-btn"
                    size="small"
                    onClick={handleCopy}
                    sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        p: 0.5,
                    }}
                >
                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
            )}
        </Box>
    );
}

const TAB_ICONS = [
    <DashboardIcon key="overview" fontSize="small" />,
    <SettingsIcon key="settings" fontSize="small" />,
];

export function ServerManagementPage() {
    const { serverId } = useParams<{ serverId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [searchParams, setSearchParams] = useSearchParams();

    const [activeTab, setActiveTab] = useState(() => {
        const tab = searchParams.get('tab');
        return tab === 'settings' ? 1 : 0;
    });
    const [dbDialogOpen, setDbDialogOpen] = useState(false);
    const [editingDatabase, setEditingDatabase] = useState<ConnectionConfig | null>(null);
    const [serverFormOpen, setServerFormOpen] = useState(false);
    const [createDbDialogOpen, setCreateDbDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );
    const [showPassword, setShowPassword] = useState(false);
    const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
    const [loadingPassword, setLoadingPassword] = useState(false);

    const { tags: availableTags } = useTagsStore();

    const { data: server, isLoading: serverLoading } = useQuery({
        queryKey: ['server', serverId],
        queryFn: () => serversApi.getById(serverId!),
        enabled: !!serverId,
    });

    const { data: databases = [], isLoading: dbLoading } = useQuery({
        queryKey: ['server-databases', serverId],
        queryFn: () => serversApi.getDatabases(serverId!),
        enabled: !!serverId,
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll(),
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupsApi.getAll(),
    });

    const { data: servers = [] } = useQuery({
        queryKey: ['servers'],
        queryFn: () => serversApi.getAll(),
    });

    const deleteDbMutation = useMutation({
        mutationFn: (id: string) => connectionsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['server-databases', serverId] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success('Database deleted');
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete database');
        },
    });

    const deleteServerMutation = useMutation({
        mutationFn: () => serversApi.delete(serverId!),
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['servers'] });
                toast.success('Server deleted');
                navigate('/servers');
            } else {
                toast.error(result.message || 'Failed to delete server');
            }
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete server');
        },
    });

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await serversApi.test(serverId!);
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

    const handleTogglePassword = async () => {
        if (showPassword) {
            setShowPassword(false);
            setRevealedPassword(null);
        } else {
            setLoadingPassword(true);
            try {
                const result = await serversApi.getPassword(serverId!);
                setRevealedPassword(result.password);
                setShowPassword(true);
            } catch {
                toast.error('Failed to retrieve password');
            } finally {
                setLoadingPassword(false);
            }
        }
    };

    const handleTabChange = useCallback(
        (_: unknown, newTab: number) => {
            setActiveTab(newTab);
            setSearchParams({ tab: newTab === 1 ? 'settings' : 'overview' }, { replace: true });
        },
        [setSearchParams]
    );

    const handleAddDatabase = () => {
        setEditingDatabase(null);
        setDbDialogOpen(true);
    };

    const handleEditDatabase = (db: ConnectionConfig) => {
        setEditingDatabase(db);
        setDbDialogOpen(true);
    };

    const handleQueryDatabase = (db: ConnectionConfig) => {
        navigate(`/query?connectionId=${db.id}`);
    };

    const handleCloseDbDialog = () => {
        setDbDialogOpen(false);
        setEditingDatabase(null);
    };

    const isLoading = serverLoading || dbLoading;

    if (isLoading) {
        return (
            <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
                <LoadingState message="Loading server..." size="large" />
            </Box>
        );
    }

    if (!server) {
        return (
            <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
                <GlassCard>
                    <EmptyState
                        icon={<DnsIcon />}
                        title="Server not found"
                        description="The requested server could not be found."
                        action={{
                            label: 'Back to Servers',
                            onClick: () => navigate('/servers'),
                        }}
                        size="large"
                    />
                </GlassCard>
            </Box>
        );
    }

    const serverColor = ENGINE_COLORS[server.engine] || '#666';

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                {/* Breadcrumbs */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <IconButton size="small" onClick={() => navigate('/servers')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Breadcrumbs>
                        <Link
                            component="button"
                            variant="body2"
                            onClick={() => navigate('/servers')}
                            sx={{ cursor: 'pointer' }}
                            underline="hover"
                        >
                            Servers
                        </Link>
                        <Typography variant="body2" color="text.primary">
                            {server.name}
                        </Typography>
                    </Breadcrumbs>
                </Box>

                {/* Server Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1.5,
                            bgcolor: `${serverColor}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <DnsIcon sx={{ color: serverColor, fontSize: 28 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="h5" fontWeight={600}>
                                {server.name}
                            </Typography>
                            <Chip
                                label={ENGINE_LABELS[server.engine] || server.engine}
                                size="small"
                                sx={{
                                    bgcolor: `${serverColor}20`,
                                    color: serverColor,
                                    fontWeight: 500,
                                }}
                            />
                            {server.ssl && (
                                <Chip label="SSL" size="small" color="success" variant="outlined" />
                            )}
                            <Chip
                                icon={<StorageIcon sx={{ fontSize: 14 }} />}
                                label={`${databases.length} database${databases.length === 1 ? '' : 's'}`}
                                size="small"
                                sx={{
                                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                    color: 'info.main',
                                    border: '1px solid',
                                    borderColor: (theme) => alpha(theme.palette.info.main, 0.3),
                                    '& .MuiChip-icon': { color: 'info.main' },
                                }}
                            />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {server.host}:{server.port}
                            {server.username ? ` • ${server.username}` : ''}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab
                        icon={TAB_ICONS[0]}
                        iconPosition="start"
                        label="Databases"
                        sx={{ minHeight: 48 }}
                    />
                    <Tab
                        icon={TAB_ICONS[1]}
                        iconPosition="start"
                        label="Settings"
                        sx={{ minHeight: 48 }}
                    />
                </Tabs>
            </Box>

            {/* Tab Content */}
            {activeTab === 0 && (
                <Box>
                    {/* Actions */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={handleAddDatabase}
                        >
                            Add Existing
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<StorageIcon />}
                            onClick={() => setCreateDbDialogOpen(true)}
                        >
                            Create Database
                        </Button>
                    </Box>

                    {/* Databases Grid */}
                    {databases.length === 0 ? (
                        <GlassCard>
                            <EmptyState
                                icon={<StorageIcon />}
                                title="No databases yet"
                                description="Create a new database on this server or add an existing one."
                                action={{
                                    label: 'Create Database',
                                    onClick: () => setCreateDbDialogOpen(true),
                                }}
                                size="medium"
                            />
                        </GlassCard>
                    ) : (
                        <Grid container spacing={2}>
                            {databases.map((db) => (
                                <Grid size={{ xs: 12, md: 6 }} key={db.id}>
                                    <ConnectionCard
                                        connection={db}
                                        compact
                                        onEdit={() => handleEditDatabase(db)}
                                        onDelete={() => deleteDbMutation.mutate(db.id)}
                                        onQuery={() => handleQueryDatabase(db)}
                                        draggable={false}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>
            )}

            {activeTab === 1 && (
                <Stack spacing={3}>
                    {/* Server Configuration Card */}
                    <GlassCard>
                        <Box sx={{ p: 3 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 3,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <DnsIcon sx={{ color: 'primary.main' }} />
                                    <Typography variant="h6">Server Configuration</Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<EditIcon />}
                                    onClick={() => setServerFormOpen(true)}
                                >
                                    Edit Server
                                </Button>
                            </Box>

                            {/* Connection Details */}
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                Connection
                            </Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <InfoBox label="Host" value={server.host} />
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <InfoBox label="Port" value={server.port} />
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <InfoBox
                                        label="Engine"
                                        value={ENGINE_LABELS[server.engine] || server.engine}
                                        copyable={false}
                                    />
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                    <InfoBox
                                        label="SSL"
                                        value={server.ssl ? 'Enabled' : 'Disabled'}
                                        copyable={false}
                                    >
                                        <Chip
                                            label={server.ssl ? 'Enabled' : 'Disabled'}
                                            size="small"
                                            color={server.ssl ? 'success' : 'default'}
                                            variant="outlined"
                                            icon={server.ssl ? <LockIcon /> : undefined}
                                            sx={{ height: 24 }}
                                        />
                                    </InfoBox>
                                </Grid>
                            </Grid>

                            {/* Admin Credentials */}
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                                Admin Credentials
                                <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ ml: 1, fontWeight: 400 }}
                                >
                                    (for creating databases)
                                </Typography>
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                    <InfoBox label="Username" value={server.username} />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 1,
                                            border: 1,
                                            borderColor: (theme) =>
                                                alpha(theme.palette.primary.main, 0.2),
                                            position: 'relative',
                                            '&:hover .copy-btn': {
                                                opacity: 1,
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: 'block', mb: 0.5 }}
                                        >
                                            Password
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={500}
                                                sx={{
                                                    fontFamily: showPassword
                                                        ? 'inherit'
                                                        : 'monospace',
                                                    flex: 1,
                                                }}
                                            >
                                                {server.username ? (
                                                    showPassword && revealedPassword !== null ? (
                                                        revealedPassword
                                                    ) : (
                                                        '••••••••'
                                                    )
                                                ) : (
                                                    <Typography
                                                        component="span"
                                                        color="text.disabled"
                                                        fontStyle="italic"
                                                    >
                                                        Not configured
                                                    </Typography>
                                                )}
                                            </Typography>
                                            {server.username && (
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {showPassword && revealedPassword && (
                                                        <IconButton
                                                            className="copy-btn"
                                                            size="small"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(
                                                                    revealedPassword
                                                                );
                                                                toast.success('Password copied');
                                                            }}
                                                            sx={{
                                                                p: 0.5,
                                                                opacity: 0,
                                                                transition: 'opacity 0.2s',
                                                            }}
                                                        >
                                                            <ContentCopyIcon
                                                                sx={{ fontSize: 14 }}
                                                            />
                                                        </IconButton>
                                                    )}
                                                    <IconButton
                                                        size="small"
                                                        onClick={handleTogglePassword}
                                                        disabled={loadingPassword}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        {loadingPassword ? (
                                                            <CircularProgress size={16} />
                                                        ) : showPassword ? (
                                                            <VisibilityOffIcon fontSize="small" />
                                                        ) : (
                                                            <VisibilityIcon fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>

                            {/* Test Connection */}
                            <Box
                                sx={{
                                    mt: 3,
                                    pt: 3,
                                    borderTop: 1,
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    startIcon={
                                        testing ? <CircularProgress size={16} /> : <ScienceIcon />
                                    }
                                    onClick={handleTestConnection}
                                    disabled={testing || !server.username}
                                >
                                    {testing ? 'Testing...' : 'Test Connection'}
                                </Button>
                                {testResult && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {testResult.success ? (
                                            <CheckCircleIcon
                                                sx={{ color: 'success.main', fontSize: 20 }}
                                            />
                                        ) : (
                                            <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                                        )}
                                        <Typography
                                            variant="body2"
                                            color={
                                                testResult.success ? 'success.main' : 'error.main'
                                            }
                                        >
                                            {testResult.message}
                                        </Typography>
                                    </Box>
                                )}
                                {!server.username && !testResult && (
                                    <Typography variant="body2" color="text.secondary">
                                        Configure admin credentials to test
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </GlassCard>

                    {/* Tags Card */}
                    {server.tags && server.tags.length > 0 && (
                        <GlassCard>
                            <Box sx={{ p: 3 }}>
                                <Box
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}
                                >
                                    <LocalOfferIcon sx={{ color: 'info.main' }} />
                                    <Typography variant="h6">Tags</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {server.tags.map((tagName) => {
                                        const tag = availableTags.find((t) => t.name === tagName);
                                        const color = tag?.color || '128, 128, 128';
                                        return (
                                            <Chip
                                                key={tagName}
                                                label={tagName}
                                                sx={{
                                                    bgcolor: `rgba(${color}, 0.15)`,
                                                    color: `rgb(${color})`,
                                                    border: `1px solid rgba(${color}, 0.3)`,
                                                    fontWeight: 500,
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        </GlassCard>
                    )}

                    {/* Danger Zone */}
                    <GlassCard>
                        <Box sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <DeleteIcon sx={{ color: 'error.main' }} />
                                <Typography variant="h6" color="error.main">
                                    Danger Zone
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: (theme) => alpha(theme.palette.error.main, 0.3),
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle2">
                                            Delete this server
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {databases.length > 0
                                                ? `Cannot delete while ${databases.length} database${databases.length === 1 ? ' is' : 's are'} linked`
                                                : 'This action cannot be undone'}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={() => setDeleteDialogOpen(true)}
                                        disabled={databases.length > 0}
                                    >
                                        Delete Server
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </GlassCard>
                </Stack>
            )}

            {/* Dialogs */}
            <ConnectionFormDialog
                open={dbDialogOpen}
                connection={editingDatabase}
                projects={projects}
                groups={groups}
                servers={servers}
                preselectedServerId={serverId}
                onClose={handleCloseDbDialog}
            />

            <ServerFormDialog
                open={serverFormOpen}
                server={server}
                onClose={() => setServerFormOpen(false)}
            />

            <CreateDatabaseDialog
                open={createDbDialogOpen}
                server={server}
                onClose={() => setCreateDbDialogOpen(false)}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete Server"
                message={`Are you sure you want to delete "${server.name}"? This action cannot be undone.`}
                onConfirm={() => deleteServerMutation.mutate()}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                confirmColor="error"
            />
        </Box>
    );
}
