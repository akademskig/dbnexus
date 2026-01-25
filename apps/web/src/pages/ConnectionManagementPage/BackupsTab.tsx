import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    CircularProgress,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Upload as UploadIcon,
    Delete as DeleteIcon,
    Restore as RestoreIcon,
    Add as AddIcon,
    CloudDownload as BackupIcon,
    ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { backupsApi, type Backup } from '../../lib/api';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { useToastStore } from '../../stores/toastStore';
import { StyledTooltip } from '../../components/StyledTooltip';
import { StatusAlert } from '@/components/StatusAlert';

interface BackupsTabProps {
    connectionId: string;
    connectionName: string;
    engine: string;
}

export function BackupsTab({ connectionId, connectionName, engine }: BackupsTabProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

    // Form state
    const [backupType, setBackupType] = useState<'full' | 'schema' | 'data'>('full');
    const [compression, setCompression] = useState(false);
    const [backupMethod, setBackupMethod] = useState<'native' | 'sql'>('sql');
    const [restoreMethod, setRestoreMethod] = useState<'native' | 'sql'>('native');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showToolsSetup, setShowToolsSetup] = useState(false);
    const [installDialogOpen, setInstallDialogOpen] = useState(false);

    // Fetch backups
    const { data: backups = [], isLoading } = useQuery({
        queryKey: ['backups', connectionId],
        queryFn: () => backupsApi.getAll(connectionId),
    });

    // Fetch tool status
    const { data: toolsStatus } = useQuery({
        queryKey: ['backup-tools-status'],
        queryFn: () => backupsApi.checkTools(),
        staleTime: 60000, // Cache for 1 minute
    });

    // Create backup mutation
    const createMutation = useMutation({
        mutationFn: () =>
            backupsApi.create({
                connectionId,
                backupType,
                compression,
                method: backupMethod,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups', connectionId] });
            setCreateDialogOpen(false);
            toast.success('Backup created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create backup: ${error.message}`);
        },
    });

    // Install tools mutation
    const installToolsMutation = useMutation({
        mutationFn: () => backupsApi.installTools(),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['backup-tools-status'] });
            if (result.success) {
                toast.success('Database tools installed successfully');
                setShowToolsSetup(false);
            } else {
                toast.error(`Installation failed: ${result.message}`);
            }
        },
        onError: (error: Error) => {
            toast.error(`Failed to install tools: ${error.message}`);
        },
    });

    // Upload backup mutation
    const uploadMutation = useMutation({
        mutationFn: (file: File) => backupsApi.upload(connectionId, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups', connectionId] });
            setUploadDialogOpen(false);
            setSelectedFile(null);
            toast.success('Backup uploaded successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to upload backup: ${error.message}`);
        },
    });

    // Restore backup mutation
    const restoreMutation = useMutation({
        mutationFn: (backupId: string) => backupsApi.restore(backupId, connectionId, restoreMethod),
        onSuccess: () => {
            setRestoreDialogOpen(false);
            setSelectedBackup(null);
            toast.success('Backup restored successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to restore backup: ${error.message}`);
        },
    });

    // Delete backup mutation
    const deleteMutation = useMutation({
        mutationFn: (backupId: string) => backupsApi.delete(backupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups', connectionId] });
            setDeleteDialogOpen(false);
            setSelectedBackup(null);
            toast.success('Backup deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete backup: ${error.message}`);
        },
    });

    const handleCreateBackup = () => {
        createMutation.mutate();
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadDialogOpen(true);
        }
    };

    const handleUploadBackup = () => {
        if (selectedFile) {
            uploadMutation.mutate(selectedFile);
        }
    };

    const handleDownload = (backup: Backup) => {
        window.location.href = backupsApi.download(backup.id);
    };

    const handleRestoreClick = (backup: Backup) => {
        setSelectedBackup(backup);
        // Pre-select restore method based on backup method
        setRestoreMethod(backup.method);
        setRestoreDialogOpen(true);
    };

    const handleRestoreBackup = () => {
        if (selectedBackup) {
            restoreMutation.mutate(selectedBackup.id);
        }
    };

    const handleDeleteClick = (backup: Backup) => {
        setSelectedBackup(backup);
        setDeleteDialogOpen(true);
    };

    const handleDeleteBackup = () => {
        if (selectedBackup) {
            deleteMutation.mutate(selectedBackup.id);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    if (isLoading) {
        return (
            <GlassCard>
                <LoadingState message="Loading backups..." />
            </GlassCard>
        );
    }

    return (
        <>
            <GlassCard>
                {/* Header */}
                <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Box>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Database Backups
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Create, upload, and restore database backups for {connectionName}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {toolsStatus && !toolsStatus.allInstalled && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setShowToolsSetup(true)}
                                    sx={{ mr: 1 }}
                                >
                                    Setup Tools
                                </Button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".sql,.sql.gz"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                            <Button
                                variant="outlined"
                                startIcon={<UploadIcon />}
                                onClick={handleUploadClick}
                            >
                                Upload
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateDialogOpen(true)}
                            >
                                Create Backup
                            </Button>
                        </Box>
                    </Box>
                </Box>

                {/* Backups List */}
                {backups.length === 0 ? (
                    <EmptyState
                        icon={<BackupIcon sx={{ fontSize: 64, color: 'text.disabled' }} />}
                        title="No backups yet"
                        description="Create your first backup to protect your data"
                    />
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Filename</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell>Size</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {backups.map((backup) => (
                                    <TableRow key={backup.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                                {backup.filename}
                                            </Typography>
                                            {backup.compression === 'gzip' && (
                                                <Chip
                                                    label="GZIP"
                                                    size="small"
                                                    sx={{ ml: 1, height: 20, fontSize: 10 }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={backup.backupType.toUpperCase()}
                                                size="small"
                                                color={
                                                    backup.backupType === 'full'
                                                        ? 'primary'
                                                        : 'default'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={backup.method === 'sql' ? 'SQL' : 'Native'}
                                                size="small"
                                                variant="outlined"
                                                color={backup.method === 'sql' ? 'info' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={backup.status.toUpperCase()}
                                                size="small"
                                                color={
                                                    backup.status === 'completed'
                                                        ? 'success'
                                                        : backup.status === 'failed'
                                                          ? 'error'
                                                          : 'warning'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatDate(backup.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 0.5,
                                                    justifyContent: 'flex-end',
                                                }}
                                            >
                                                {backup.status === 'completed' && (
                                                    <>
                                                        <StyledTooltip title="Download">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    handleDownload(backup)
                                                                }
                                                            >
                                                                <DownloadIcon fontSize="small" />
                                                            </IconButton>
                                                        </StyledTooltip>
                                                        <StyledTooltip title="Restore">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    handleRestoreClick(backup)
                                                                }
                                                            >
                                                                <RestoreIcon fontSize="small" />
                                                            </IconButton>
                                                        </StyledTooltip>
                                                    </>
                                                )}
                                                <StyledTooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteClick(backup)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </StyledTooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </GlassCard>

            {/* Create Backup Dialog */}
            <Dialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create Database Backup</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Backup Type</InputLabel>
                            <Select
                                value={backupType}
                                label="Backup Type"
                                onChange={(e) =>
                                    setBackupType(e.target.value as 'full' | 'schema' | 'data')
                                }
                            >
                                <MenuItem value="full">Full (Schema + Data)</MenuItem>
                                <MenuItem value="schema">Schema Only</MenuItem>
                                <MenuItem value="data">Data Only</MenuItem>
                            </Select>
                        </FormControl>

                        {/* SQLite doesn't need backup method selector - always uses native file copy */}
                        {engine !== 'sqlite' && (
                            <FormControl fullWidth size="small">
                                <InputLabel>Backup Method</InputLabel>
                                <Select
                                    value={backupMethod}
                                    onChange={(e) =>
                                        setBackupMethod(e.target.value as 'native' | 'sql')
                                    }
                                    label="Backup Method"
                                >
                                    <MenuItem value="sql">SQL-based (No tools required)</MenuItem>
                                    <MenuItem
                                        value="native"
                                        disabled={toolsStatus && !toolsStatus.allInstalled}
                                    >
                                        Native (pg_dump/mysqldump){' '}
                                        {toolsStatus &&
                                            !toolsStatus.allInstalled &&
                                            '- Tools not installed'}
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={compression}
                                    onChange={(e) => setCompression(e.target.checked)}
                                />
                            }
                            label="Enable compression (GZIP)"
                        />

                        <StatusAlert severity="info">
                            This will create a backup of the <strong>{connectionName}</strong>{' '}
                            database
                            {engine === 'sqlite'
                                ? ' by copying the database file.'
                                : ` using the ${backupMethod === 'sql' ? 'SQL-based' : 'native'} method.`}
                            {backupType === 'schema' &&
                                ' Only the database schema will be backed up.'}
                            {backupType === 'data' &&
                                ' Only the data will be backed up (no schema).'}
                        </StatusAlert>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 2 }}>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateBackup}
                        disabled={createMutation.isPending}
                        startIcon={createMutation.isPending && <CircularProgress size={16} />}
                    >
                        Create Backup
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Upload Backup Dialog */}
            <Dialog
                open={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Upload Backup File</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        {selectedFile && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Selected file:
                                </Typography>
                                <Typography variant="body1" fontWeight={500}>
                                    {selectedFile.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Size: {formatFileSize(selectedFile.size)}
                                </Typography>
                            </Box>
                        )}
                        <StatusAlert severity="info">
                            The backup file will be uploaded and associated with{' '}
                            <strong>{connectionName}</strong>.
                        </StatusAlert>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 2 }}>
                    <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleUploadBackup}
                        disabled={uploadMutation.isPending}
                        startIcon={uploadMutation.isPending && <CircularProgress size={16} />}
                    >
                        Upload
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Restore Backup Dialog */}
            <Dialog
                open={restoreDialogOpen}
                onClose={() => setRestoreDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Restore Database Backup</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <StatusAlert severity="warning" sx={{ mb: 2 }}>
                            <strong>Warning:</strong> This will restore the database from the backup
                            file. This action cannot be undone.
                        </StatusAlert>
                        {selectedBackup && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Backup file:
                                </Typography>
                                <Typography variant="body1" fontWeight={500} gutterBottom>
                                    {selectedBackup.filename}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Created: {formatDate(selectedBackup.createdAt)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Backup method:{' '}
                                    {selectedBackup.method === 'sql' ? 'SQL-based' : 'Native'}
                                </Typography>

                                {/* SQLite doesn't need restore method selector - always uses native */}
                                {engine !== 'sqlite' && (
                                    <>
                                        <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                                            <InputLabel>Restore Method</InputLabel>
                                            <Select
                                                value={restoreMethod}
                                                onChange={(e) =>
                                                    setRestoreMethod(
                                                        e.target.value as 'native' | 'sql'
                                                    )
                                                }
                                                label="Restore Method"
                                                disabled={true}
                                            >
                                                <MenuItem value="sql">
                                                    SQL-based (No tools required)
                                                </MenuItem>
                                                <MenuItem
                                                    value="native"
                                                    disabled={
                                                        toolsStatus && !toolsStatus.allInstalled
                                                    }
                                                >
                                                    Native (pg_dump/mysqldump){' '}
                                                    {toolsStatus &&
                                                        !toolsStatus.allInstalled &&
                                                        '- Tools not installed'}
                                                </MenuItem>
                                            </Select>
                                        </FormControl>

                                        <StatusAlert severity="info" sx={{ mt: 2 }}>
                                            Restore method is automatically selected based on how
                                            the backup was created.
                                            {selectedBackup.method === 'native' &&
                                                toolsStatus &&
                                                !toolsStatus.allInstalled && (
                                                    <>
                                                        {' '}
                                                        Native restore requires database client
                                                        tools to be installed.
                                                    </>
                                                )}
                                        </StatusAlert>
                                    </>
                                )}

                                {engine === 'sqlite' && (
                                    <StatusAlert severity="info" sx={{ mt: 2 }}>
                                        SQLite backups are restored by replacing the database file.
                                    </StatusAlert>
                                )}
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 2 }}>
                    <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleRestoreBackup}
                        disabled={restoreMutation.isPending}
                        startIcon={restoreMutation.isPending && <CircularProgress size={16} />}
                    >
                        Restore
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Backup Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Delete Backup</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <StatusAlert severity="error" sx={{ mb: 2 }}>
                            This will permanently delete the backup file. This action cannot be
                            undone.
                        </StatusAlert>
                        {selectedBackup && (
                            <Typography variant="body2">
                                Are you sure you want to delete{' '}
                                <strong>{selectedBackup.filename}</strong>?
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteBackup}
                        disabled={deleteMutation.isPending}
                        startIcon={deleteMutation.isPending && <CircularProgress size={16} />}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Tools Setup Dialog */}
            <Dialog
                open={showToolsSetup}
                onClose={() => setShowToolsSetup(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Database Backup Tools Setup</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Native backup tools provide faster and more complete backups. The
                            SQL-based method works without these tools but may be slower for large
                            databases.
                        </Typography>

                        {/* Tool Status */}
                        {toolsStatus && (
                            <>
                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                    Tool Status
                                </Typography>
                                <TableContainer sx={{ mb: 3 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Tool</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Version</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {toolsStatus.tools.map((tool) => (
                                                <TableRow key={tool.command}>
                                                    <TableCell>{tool.name}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={
                                                                tool.installed
                                                                    ? 'Installed'
                                                                    : 'Not Installed'
                                                            }
                                                            color={
                                                                tool.installed
                                                                    ? 'success'
                                                                    : 'default'
                                                            }
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            {tool.version || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Installation Instructions */}
                                {!toolsStatus.allInstalled && (
                                    <>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 1,
                                            }}
                                        >
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                Installation Instructions (
                                                {toolsStatus.instructions.platform})
                                            </Typography>
                                            <Button
                                                size="small"
                                                startIcon={<CopyIcon />}
                                                onClick={() => {
                                                    const commands =
                                                        toolsStatus.instructions.instructions
                                                            .filter(
                                                                (line) =>
                                                                    line.trim() &&
                                                                    !line.includes(':')
                                                            )
                                                            .join('\n');
                                                    navigator.clipboard.writeText(commands);
                                                    toast.success('Commands copied to clipboard');
                                                }}
                                            >
                                                Copy Commands
                                            </Button>
                                        </Box>
                                        <Box
                                            sx={{
                                                p: 2,
                                                borderRadius: 1,
                                                border: 1,
                                                borderColor: 'primary.main',
                                                fontFamily: 'monospace',
                                                fontSize: '0.875rem',
                                                mb: 2,
                                            }}
                                        >
                                            {toolsStatus.instructions.instructions.map(
                                                (line, i) => (
                                                    <Typography
                                                        key={i}
                                                        variant="body2"
                                                        sx={{ fontFamily: 'monospace' }}
                                                    >
                                                        {line}
                                                    </Typography>
                                                )
                                            )}
                                        </Box>

                                        {toolsStatus.instructions.canAutoInstall && (
                                            <StatusAlert severity="info" sx={{ mb: 2 }}>
                                                Click &quot;Auto Install&quot; to automatically
                                                install the required tools. You will be prompted for
                                                your sudo/administrator password.
                                            </StatusAlert>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 2 }}>
                    <Button onClick={() => setShowToolsSetup(false)}>Close</Button>
                    {toolsStatus?.instructions.canAutoInstall && !toolsStatus.allInstalled && (
                        <Button
                            variant="contained"
                            onClick={() => setInstallDialogOpen(true)}
                            disabled={installToolsMutation.isPending}
                            startIcon={
                                installToolsMutation.isPending && <CircularProgress size={16} />
                            }
                        >
                            {installToolsMutation.isPending ? 'Installing...' : 'Auto Install'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Install Confirmation Dialog */}
            <Dialog
                open={installDialogOpen}
                onClose={() => setInstallDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Install Database Tools</DialogTitle>
                <DialogContent>
                    <StatusAlert severity="warning" sx={{ mb: 2 }}>
                        This will prompt for your sudo/administrator password to install system
                        packages.
                    </StatusAlert>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        The following tools will be installed:
                    </Typography>
                    <Box
                        component="ul"
                        sx={{ pl: 2, mb: 2, color: 'text.secondary', fontSize: 14 }}
                    >
                        {toolsStatus?.tools
                            .filter((tool) => !tool.installed)
                            .map((tool) => (
                                <li key={tool.name}>{tool.name}</li>
                            ))}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Commands to be executed:
                    </Typography>
                    <Box
                        sx={{
                            mt: 1,
                            p: 1.5,
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'primary.main',
                            fontFamily: 'monospace',
                            fontSize: 12,
                        }}
                    >
                        {toolsStatus?.instructions.instructions.map((line, i) => (
                            <Typography
                                key={i}
                                variant="body2"
                                sx={{ fontFamily: 'monospace', fontSize: 11 }}
                            >
                                {line}
                            </Typography>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button onClick={() => setInstallDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setInstallDialogOpen(false);
                            installToolsMutation.mutate();
                        }}
                        autoFocus
                    >
                        Install
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
