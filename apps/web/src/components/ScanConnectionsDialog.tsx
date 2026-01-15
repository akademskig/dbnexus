import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Checkbox,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    Chip,
    IconButton,
    Tooltip,
    Divider,
    LinearProgress,
    Collapse,
} from '@mui/material';
import {
    Search as SearchIcon,
    Storage as StorageIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { scannerApi, connectionsApi, type ScanResult } from '../lib/api';
import { useToastStore } from '../stores/toastStore';

interface ScanConnectionsDialogProps {
    open: boolean;
    onClose: () => void;
    projectId?: string;
    groupId?: string;
}

const ENGINE_LABELS: Record<string, string> = {
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    mariadb: 'MariaDB',
    sqlite: 'SQLite',
};

const SOURCE_LABELS: Record<string, string> = {
    'port-scan': 'Port Scan',
    docker: 'Docker Container',
    'env-file': 'Environment File',
    'docker-compose': 'Docker Compose',
    'sqlite-file': 'SQLite File',
    'config-file': 'Config File',
};

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

    const scanMutation = useMutation({
        mutationFn: () => scannerApi.scanAll(),
        onSuccess: (result) => {
            setScanResult(result);
            // Auto-select high confidence connections
            const highConfidence = result.connections
                .map((c, i) => (c.confidence === 'high' ? i : -1))
                .filter((i) => i >= 0);
            setSelectedConnections(new Set(highConfidence));
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
        const newSelected = new Set(selectedConnections);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedConnections(newSelected);
    };

    const handleSelectAll = () => {
        if (scanResult) {
            if (selectedConnections.size === scanResult.connections.length) {
                setSelectedConnections(new Set());
            } else {
                setSelectedConnections(new Set(scanResult.connections.map((_, i) => i)));
            }
        }
    };

    const handleAddSelected = async () => {
        if (!scanResult) return;

        setAddingConnections(true);
        const selected = Array.from(selectedConnections)
            .map((i) => scanResult.connections[i])
            .filter((conn) => conn !== undefined);
        let addedCount = 0;
        const errors: string[] = [];

        for (const conn of selected) {
            try {
                const isSqlite = conn.engine === 'sqlite';
                const isPostgres = conn.engine === 'postgres';
                const defaultPort = isPostgres ? 5432 : 3306;
                const defaultDb = isPostgres ? 'postgres' : 'mysql';
                const defaultUser = isPostgres ? 'postgres' : 'root';

                await connectionsApi.create({
                    name: conn.name,
                    engine: conn.engine,
                    host: isSqlite ? '' : conn.host || 'localhost',
                    port: isSqlite ? 0 : conn.port || defaultPort,
                    // For SQLite, database field stores the file path
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

    const getEngineIcon = (_engine: string) => {
        return <StorageIcon fontSize="small" />;
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SearchIcon />
                Scan for Database Connections
            </DialogTitle>
            <DialogContent>
                {!scanResult && !scanMutation.isPending && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            Scan your system for database connections
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            This will check local ports, Docker containers, environment files, and
                            more.
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

                {scanMutation.isPending && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={48} sx={{ mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                            Scanning for database connections...
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Checking ports, Docker, environment files, and more
                        </Typography>
                    </Box>
                )}

                {scanResult && (
                    <Box>
                        {/* Summary */}
                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body1">
                                Found <strong>{scanResult.connections.length}</strong> connection
                                {scanResult.connections.length !== 1 ? 's' : ''}
                            </Typography>
                            <Tooltip title="Scan again">
                                <IconButton size="small" onClick={handleScan}>
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {/* Errors */}
                        {scanResult.errors.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Button
                                    size="small"
                                    startIcon={showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    onClick={() => setShowErrors(!showErrors)}
                                    color="warning"
                                >
                                    {scanResult.errors.length} warning
                                    {scanResult.errors.length > 1 ? 's' : ''}
                                </Button>
                                <Collapse in={showErrors}>
                                    <Alert severity="warning" sx={{ mt: 1 }}>
                                        {scanResult.errors.map((err, i) => (
                                            <Typography key={i} variant="body2">
                                                • {err}
                                            </Typography>
                                        ))}
                                    </Alert>
                                </Collapse>
                            </Box>
                        )}

                        {/* Connection List */}
                        {scanResult.connections.length > 0 ? (
                            <>
                                <Box
                                    sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                                >
                                    <Button size="small" onClick={handleSelectAll}>
                                        {selectedConnections.size === scanResult.connections.length
                                            ? 'Deselect All'
                                            : 'Select All'}
                                    </Button>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedConnections.size} selected
                                    </Typography>
                                </Box>
                                <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                                    {scanResult.connections.map((conn, index) => (
                                        <ListItem
                                            key={index}
                                            sx={{
                                                border: 1,
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                                mb: 1,
                                                bgcolor: selectedConnections.has(index)
                                                    ? 'action.selected'
                                                    : 'background.paper',
                                            }}
                                        >
                                            <ListItemIcon>
                                                <Checkbox
                                                    edge="start"
                                                    checked={selectedConnections.has(index)}
                                                    onChange={() => handleToggleConnection(index)}
                                                />
                                            </ListItemIcon>
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                {getEngineIcon(conn.engine)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                        }}
                                                    >
                                                        <Typography variant="body1">
                                                            {conn.name}
                                                        </Typography>
                                                        <Chip
                                                            label={
                                                                ENGINE_LABELS[conn.engine] ||
                                                                conn.engine
                                                            }
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            {conn.filepath
                                                                ? conn.filepath
                                                                : `${conn.host || 'localhost'}:${conn.port || '?'}${conn.database ? `/${conn.database}` : ''}`}
                                                        </Typography>
                                                        {conn.details && (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                {conn.details}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                            <ListItemSecondaryAction>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Chip
                                                        label={
                                                            SOURCE_LABELS[conn.source] ||
                                                            conn.source
                                                        }
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                    <Tooltip
                                                        title={`${conn.confidence} confidence${conn.password ? ' • credentials found' : ''}`}
                                                    >
                                                        {conn.confidence === 'high' ? (
                                                            <CheckCircleIcon
                                                                fontSize="small"
                                                                color="success"
                                                            />
                                                        ) : conn.confidence === 'medium' ? (
                                                            <WarningIcon
                                                                fontSize="small"
                                                                color="warning"
                                                            />
                                                        ) : (
                                                            <InfoIcon
                                                                fontSize="small"
                                                                color="info"
                                                            />
                                                        )}
                                                    </Tooltip>
                                                </Box>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            </>
                        ) : (
                            <Alert severity="info">
                                No database connections were found. Make sure your databases are
                                running and accessible.
                            </Alert>
                        )}

                        {/* Scanned Sources */}
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="caption" color="text.secondary">
                            Scanned: {scanResult.scannedSources.join(' • ')}
                        </Typography>
                    </Box>
                )}

                {addingConnections && <LinearProgress sx={{ mt: 2 }} />}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                {scanResult && scanResult.connections.length > 0 && (
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
