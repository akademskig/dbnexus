import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Skeleton,
    Button,
    CircularProgress,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import LockIcon from '@mui/icons-material/Lock';
import StorageIcon from '@mui/icons-material/Storage';
import GridViewIcon from '@mui/icons-material/GridView';
import TableChartIcon from '@mui/icons-material/TableChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import type { ConnectionConfig, DatabaseGroup } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { connectionsApi, schemaApi, projectsApi, groupsApi, serversApi } from '../../lib/api';
import { ConnectionFormDialog } from '../../components/dialogs/ConnectionDialogs';
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
    const toast = useToastStore();
    const { accessToken } = useAuthStore();
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [verifyPasswordDialogOpen, setVerifyPasswordDialogOpen] = useState(false);
    const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
    const [verifyPasswordError, setVerifyPasswordError] = useState<string | null>(null);
    const [verifyingPassword, setVerifyingPassword] = useState(false);

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

    const { data: servers = [] } = useQuery({
        queryKey: ['servers'],
        queryFn: () => serversApi.getAll(),
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

    const handleTogglePassword = async () => {
        if (showPassword) {
            setShowPassword(false);
            setRevealedPassword(null);
        } else {
            setVerifyPasswordDialogOpen(true);
            setVerifyPasswordInput('');
            setVerifyPasswordError(null);
        }
    };

    const handleVerifyAndShowPassword = async () => {
        if (!verifyPasswordInput.trim()) {
            setVerifyPasswordError('Please enter your password');
            return;
        }

        setVerifyingPassword(true);
        setVerifyPasswordError(null);

        try {
            const result = await authApi.verifyPassword(verifyPasswordInput, accessToken!);
            if (result.valid) {
                setVerifyPasswordDialogOpen(false);
                setVerifyPasswordInput('');
                setLoadingPassword(true);
                try {
                    const passwordResult = await connectionsApi.getPassword(connection!.id);
                    setRevealedPassword(passwordResult.password);
                    setShowPassword(true);
                } catch {
                    toast.error('Failed to retrieve password');
                } finally {
                    setLoadingPassword(false);
                }
            } else {
                setVerifyPasswordError('Incorrect password');
            }
        } catch {
            setVerifyPasswordError('Failed to verify password');
        } finally {
            setVerifyingPassword(false);
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

            {/* Database Details */}
            <GlassCard sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <StorageIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">Database Details</Typography>
                </Box>

                {isLoading ? (
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Skeleton height={72} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Skeleton height={72} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Skeleton height={72} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Skeleton height={72} />
                        </Grid>
                    </Grid>
                ) : connection?.engine === 'sqlite' ? (
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <DetailItem label="Database File" value={connection.database} />
                        </Grid>
                    </Grid>
                ) : (
                    <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <DetailItem label="Host" value={connection?.host} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <DetailItem label="Port" value={String(connection?.port)} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <DetailItem label="Database" value={connection?.database} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <DetailItem label="Username" value={connection?.username} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: 'rgba(99, 102, 241, 0.2)',
                                    position: 'relative',
                                    height: '100%',
                                    boxSizing: 'border-box',
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
                                            fontFamily: showPassword ? 'inherit' : 'monospace',
                                            flex: 1,
                                        }}
                                    >
                                        {connection?.username ? (
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
                                    {connection?.username && (
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
                                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
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
                        {connection?.defaultSchema && (
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <DetailItem
                                    label="Default Schema"
                                    value={connection.defaultSchema}
                                />
                            </Grid>
                        )}
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: 'rgba(99, 102, 241, 0.2)',
                                    height: '100%',
                                    boxSizing: 'border-box',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mb: 0.5 }}
                                >
                                    SSL
                                </Typography>
                                <Chip
                                    label={connection?.ssl ? 'Enabled' : 'Disabled'}
                                    size="small"
                                    color={connection?.ssl ? 'success' : 'default'}
                                    variant="outlined"
                                    icon={connection?.ssl ? <LockIcon /> : undefined}
                                    sx={{ height: 24 }}
                                />
                            </Box>
                        </Grid>
                        {serverVersion && (
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <DetailItem
                                    label="Server Version"
                                    value={serverVersion}
                                    copyable={false}
                                />
                            </Grid>
                        )}
                    </Grid>
                )}
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
                servers={servers}
                onClose={() => setEditDialogOpen(false)}
            />

            {/* Password Verification Dialog */}
            <Dialog
                open={verifyPasswordDialogOpen}
                onClose={() => setVerifyPasswordDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Verify Your Identity</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enter your password to view the database credentials.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        type="password"
                        label="Your Password"
                        value={verifyPasswordInput}
                        onChange={(e) => setVerifyPasswordInput(e.target.value)}
                        error={!!verifyPasswordError}
                        helperText={verifyPasswordError}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleVerifyAndShowPassword();
                            }
                        }}
                        size="small"
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setVerifyPasswordDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleVerifyAndShowPassword}
                        disabled={verifyingPassword}
                    >
                        {verifyingPassword ? 'Verifying...' : 'Verify'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function DetailItem({
    label,
    value,
    copyable = true,
}: {
    label: string;
    value: string | undefined;
    copyable?: boolean;
}) {
    const toast = useToastStore();

    const handleCopy = () => {
        if (value) {
            navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        }
    };

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 1,
                border: 1,
                borderColor: 'rgba(99, 102, 241, 0.2)',
                position: 'relative',
                height: '100%',
                boxSizing: 'border-box',
                '&:hover .copy-btn': {
                    opacity: 1,
                },
            }}
        >
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase' }}
            >
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={500}>
                {value || (
                    <Typography component="span" color="text.disabled" fontStyle="italic">
                        Not configured
                    </Typography>
                )}
            </Typography>
            {copyable && value && (
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
