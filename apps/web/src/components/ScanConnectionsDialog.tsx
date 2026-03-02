import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress,
    Checkbox,
    Chip,
    IconButton,
    LinearProgress,
    Collapse,
    alpha,
    Paper,
} from '@mui/material';
import { StyledTooltip } from './StyledTooltip';
import { StatusAlert } from './StatusAlert';
import {
    Search as SearchIcon,
    Storage as StorageIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Refresh as RefreshIcon,
    RadarOutlined as RadarIcon,
} from '@mui/icons-material';
import { scannerApi, connectionsApi, type ScanResult, type DiscoveredConnection } from '../lib/api';
import { useToastStore } from '../stores/toastStore';
import type { ConnectionConfig } from '@dbnexus/shared';

interface ScanConnectionsDialogProps {
    open: boolean;
    onClose: () => void;
    projectId?: string;
    groupId?: string;
}

const ENGINE_COLORS: Record<string, string> = {
    postgres: '#336791',
    mysql: '#00758f',
    sqlite: '#003b57',
};

const SOURCE_LABELS: Record<string, string> = {
    'port-scan': 'Port Scan',
    docker: 'Docker',
    'env-file': 'Env File',
    'docker-compose': 'Compose',
    'sqlite-file': 'SQLite File',
    'config-file': 'Config',
};

function connectionExists(discovered: DiscoveredConnection, existing: ConnectionConfig[]): boolean {
    return existing.some((conn) => {
        if (discovered.engine === 'sqlite') {
            return conn.engine === 'sqlite' && conn.database === discovered.filepath;
        }
        const discoveredHost = discovered.host || 'localhost';
        const connHost = conn.host || 'localhost';
        const normalizeHost = (h: string) =>
            h === '127.0.0.1' || h === '0.0.0.0' ? 'localhost' : h;
        return (
            normalizeHost(connHost) === normalizeHost(discoveredHost) &&
            conn.port === discovered.port
        );
    });
}

export function ScanConnectionsDialog({
    open,
    onClose,
    projectId,
    groupId,
}: ScanConnectionsDialogProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [selectedConnections, setSelectedConnections] = useState<Set<number>>(new Set());
    const [showErrors, setShowErrors] = useState(false);
    const [addingConnections, setAddingConnections] = useState(false);

    const { data: existingConnections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const isExistingConnection = (index: number): boolean => {
        const conn = scanResult?.connections[index];
        if (!conn) return false;
        return connectionExists(conn, existingConnections);
    };

    const newConnectionIndices = useMemo(() => {
        if (!scanResult) return [];
        return scanResult.connections
            .map((conn, i) => (connectionExists(conn, existingConnections) ? -1 : i))
            .filter((i) => i >= 0);
    }, [scanResult, existingConnections]);

    const scanMutation = useMutation({
        mutationFn: () => scannerApi.scanAll(),
        onSuccess: (result) => {
            setScanResult(result);
            const highConfidenceNew = result.connections
                .map((c, i) =>
                    c.confidence === 'high' && !connectionExists(c, existingConnections) ? i : -1
                )
                .filter((i) => i >= 0);
            setSelectedConnections(new Set(highConfidenceNew));
        },
        onError: (error: Error) => {
            toast.error(`Scan failed: ${error.message}`);
        },
    });

    const handleScan = () => {
        setScanResult(null);
        setSelectedConnections(new Set());
        scanMutation.mutate();
    };

    const handleToggleConnection = (index: number) => {
        if (isExistingConnection(index)) return;

        const newSelected = new Set(selectedConnections);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedConnections(newSelected);
    };

    const handleSelectAll = () => {
        if (newConnectionIndices.length > 0) {
            const allNewSelected = newConnectionIndices.every((i) => selectedConnections.has(i));
            if (allNewSelected) {
                setSelectedConnections(new Set());
            } else {
                setSelectedConnections(new Set(newConnectionIndices));
            }
        }
    };

    const handleAddSelected = async () => {
        if (!scanResult || selectedConnections.size === 0) return;

        setAddingConnections(true);
        const selected = Array.from(selectedConnections)
            .map((i) => scanResult.connections[i])
            .filter((conn): conn is DiscoveredConnection => conn !== undefined);
        let addedCount = 0;
        const errors: string[] = [];

        for (const conn of selected) {
            try {
                const isSqlite = conn.engine === 'sqlite';
                const isPostgres = conn.engine === 'postgres';
                const defaultPort = isPostgres ? 5432 : 3306;
                const defaultDb = isPostgres ? 'postgres' : 'mysql';
                const defaultUser = isPostgres ? 'postgres' : 'root';

                const connectionType =
                    conn.source === 'docker' || conn.source === 'docker-compose'
                        ? 'docker'
                        : conn.source === 'port-scan' || conn.source === 'sqlite-file'
                          ? 'local'
                          : 'local';

                await connectionsApi.create({
                    name: conn.name,
                    engine: conn.engine,
                    connectionType,
                    host: isSqlite ? '' : conn.host || 'localhost',
                    port: isSqlite ? 0 : conn.port || defaultPort,
                    database: isSqlite ? conn.filepath || '' : conn.database || defaultDb,
                    username: isSqlite ? '' : conn.username || defaultUser,
                    password: isSqlite ? '' : conn.password || '',
                    projectId,
                    groupId,
                });
                addedCount++;
            } catch (error) {
                errors.push(`${conn.name}: ${error instanceof Error ? error.message : 'Failed'}`);
            }
        }

        setAddingConnections(false);

        if (addedCount > 0) {
            toast.success(`Added ${addedCount} connection${addedCount > 1 ? 's' : ''}`);
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        }

        if (errors.length > 0) {
            toast.error(`Failed to add ${errors.length} connection${errors.length > 1 ? 's' : ''}`);
        }

        if (addedCount > 0 && errors.length === 0) {
            onClose();
        }
    };

    const handleClose = () => {
        setScanResult(null);
        setSelectedConnections(new Set());
        onClose();
    };

    const existingCount = scanResult
        ? scanResult.connections.length - newConnectionIndices.length
        : 0;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <RadarIcon color="primary" />
                    <Typography variant="h6" component="span">
                        Scan for Databases
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                {/* Initial State */}
                {!scanResult && !scanMutation.isPending && (
                    <Box
                        sx={{
                            textAlign: 'center',
                            py: 5,
                            px: 2,
                        }}
                    >
                        <Box
                            sx={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2.5,
                            }}
                        >
                            <SearchIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                        </Box>
                        <Typography variant="h6" gutterBottom>
                            Discover Database Connections
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 3, maxWidth: 320, mx: 'auto' }}
                        >
                            Automatically find databases running locally, in Docker containers, or
                            configured in environment files.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={handleScan}
                            size="large"
                        >
                            Start Scan
                        </Button>
                    </Box>
                )}

                {/* Scanning State */}
                {scanMutation.isPending && (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                        <CircularProgress size={48} sx={{ mb: 2.5 }} />
                        <Typography variant="h6" gutterBottom>
                            Scanning...
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Checking ports, Docker containers, and config files
                        </Typography>
                    </Box>
                )}

                {/* Results */}
                {scanResult && (
                    <Box>
                        {/* Header */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {scanResult.connections.length} found
                                </Typography>
                                {existingCount > 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        ({existingCount} already added)
                                    </Typography>
                                )}
                            </Box>
                            <StyledTooltip title="Scan again">
                                <IconButton size="small" onClick={handleScan}>
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </StyledTooltip>
                        </Box>

                        {/* Errors */}
                        {scanResult.errors.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Button
                                    size="small"
                                    startIcon={showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    onClick={() => setShowErrors(!showErrors)}
                                    color="warning"
                                    sx={{ textTransform: 'none' }}
                                >
                                    {scanResult.errors.length} warning
                                    {scanResult.errors.length > 1 ? 's' : ''}
                                </Button>
                                <Collapse in={showErrors}>
                                    <StatusAlert severity="warning" sx={{ mt: 1 }}>
                                        {scanResult.errors.map((err, i) => (
                                            <Typography key={i} variant="body2">
                                                • {err}
                                            </Typography>
                                        ))}
                                    </StatusAlert>
                                </Collapse>
                            </Box>
                        )}

                        {/* Connection List */}
                        {scanResult.connections.length > 0 ? (
                            <>
                                {newConnectionIndices.length > 0 && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mb: 1.5,
                                        }}
                                    >
                                        <Button
                                            size="small"
                                            onClick={handleSelectAll}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            {selectedConnections.size ===
                                                newConnectionIndices.length &&
                                            newConnectionIndices.length > 0
                                                ? 'Deselect all'
                                                : 'Select all new'}
                                        </Button>
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedConnections.size} selected
                                        </Typography>
                                    </Box>
                                )}

                                <Box
                                    sx={{
                                        maxHeight: 380,
                                        overflow: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    {scanResult.connections.map((conn, index) => {
                                        const alreadyExists = isExistingConnection(index);
                                        const isSelected = selectedConnections.has(index);
                                        const engineColor = ENGINE_COLORS[conn.engine] || '#666';

                                        return (
                                            <Paper
                                                key={index}
                                                variant="outlined"
                                                onClick={() => handleToggleConnection(index)}
                                                sx={{
                                                    p: 1.5,
                                                    cursor: alreadyExists ? 'default' : 'pointer',
                                                    borderColor: alreadyExists
                                                        ? 'primary.main'
                                                        : isSelected
                                                          ? 'primary.main'
                                                          : 'divider',
                                                    bgcolor: alreadyExists
                                                        ? (theme) =>
                                                              alpha(
                                                                  theme.palette.primary.main,
                                                                  0.04
                                                              )
                                                        : isSelected
                                                          ? (theme) =>
                                                                alpha(
                                                                    theme.palette.primary.main,
                                                                    0.08
                                                                )
                                                          : 'background.paper',
                                                    opacity: alreadyExists ? 0.7 : 1,
                                                    transition: 'all 0.15s ease',
                                                    '&:hover': !alreadyExists
                                                        ? {
                                                              borderColor: 'primary.main',
                                                              bgcolor: (theme) =>
                                                                  alpha(
                                                                      theme.palette.primary.main,
                                                                      0.04
                                                                  ),
                                                          }
                                                        : {},
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: 1.5,
                                                    }}
                                                >
                                                    <Checkbox
                                                        checked={isSelected}
                                                        disabled={alreadyExists}
                                                        size="small"
                                                        sx={{ p: 0, mt: 0.25 }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={() =>
                                                            handleToggleConnection(index)
                                                        }
                                                    />

                                                    <Box
                                                        sx={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 1,
                                                            bgcolor: engineColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <StorageIcon
                                                            sx={{
                                                                fontSize: 18,
                                                                color: 'white',
                                                            }}
                                                        />
                                                    </Box>

                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                                mb: 0.25,
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight={600}
                                                                noWrap
                                                                sx={{
                                                                    color: alreadyExists
                                                                        ? 'text.secondary'
                                                                        : 'text.primary',
                                                                }}
                                                            >
                                                                {conn.name}
                                                            </Typography>
                                                            {alreadyExists && (
                                                                <Chip
                                                                    label="Added"
                                                                    size="small"
                                                                    color="primary"
                                                                    variant="filled"
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: 11,
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>

                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            noWrap
                                                            component="div"
                                                        >
                                                            {conn.filepath
                                                                ? conn.filepath
                                                                : `${conn.host || 'localhost'}:${conn.port || '?'}${conn.database ? ` / ${conn.database}` : ''}`}
                                                        </Typography>
                                                    </Box>

                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.75,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Chip
                                                            label={
                                                                SOURCE_LABELS[conn.source] ||
                                                                conn.source
                                                            }
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                height: 22,
                                                                fontSize: 11,
                                                                '& .MuiChip-label': { px: 1 },
                                                            }}
                                                        />
                                                        <StyledTooltip
                                                            title={`${conn.confidence} confidence${conn.password ? ' • credentials found' : ''}`}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                }}
                                                            >
                                                                {conn.confidence === 'high' ? (
                                                                    <CheckCircleIcon
                                                                        sx={{
                                                                            fontSize: 18,
                                                                            color: 'success.main',
                                                                        }}
                                                                    />
                                                                ) : conn.confidence === 'medium' ? (
                                                                    <WarningIcon
                                                                        sx={{
                                                                            fontSize: 18,
                                                                            color: 'warning.main',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <InfoIcon
                                                                        sx={{
                                                                            fontSize: 18,
                                                                            color: 'info.main',
                                                                        }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </StyledTooltip>
                                                    </Box>
                                                </Box>
                                            </Paper>
                                        );
                                    })}
                                </Box>
                            </>
                        ) : (
                            <StatusAlert severity="info">
                                No database connections found. Make sure your databases are running.
                            </StatusAlert>
                        )}

                        {/* Scanned Sources */}
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 2 }}
                        >
                            Scanned: {scanResult.scannedSources.join(' • ')}
                        </Typography>
                    </Box>
                )}

                {addingConnections && <LinearProgress sx={{ mt: 2 }} />}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} color="inherit">
                    {scanResult ? 'Close' : 'Cancel'}
                </Button>
                {scanResult && newConnectionIndices.length > 0 && (
                    <Button
                        variant="contained"
                        onClick={handleAddSelected}
                        disabled={selectedConnections.size === 0 || addingConnections}
                    >
                        Add {selectedConnections.size} Connection
                        {selectedConnections.size !== 1 ? 's' : ''}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
