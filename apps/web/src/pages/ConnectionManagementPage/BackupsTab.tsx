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
import type { BackupType } from '@dbnexus/shared';
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
    const [backupType, setBackupType] = useState<BackupType>('full');
    const [compression, setCompression] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showToolsSetup, setShowToolsSetup] = useState(false);
    const [installDialogOpen, setInstallDialogOpen] = useState(false);
    const [selectedBackupIds, setSelectedBackupIds] = useState<Set<string>>(new Set());
    const [deleteMultipleDialogOpen, setDeleteMultipleDialogOpen] = useState(false);

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

    // Check if tools for the current engine are installed
    const areToolsInstalled = (): boolean => {
        if (engine === 'sqlite') return true; // SQLite doesn't need external tools
        if (!toolsStatus) return false;

        if (engine === 'postgres') {
            const pgDump = toolsStatus.tools.find((t) => t.command === 'pg_dump');
            const psql = toolsStatus.tools.find((t) => t.command === 'psql');
            return !!(pgDump?.installed && psql?.installed);
        } else if (engine === 'mysql') {
            const mysqldump = toolsStatus.tools.find((t) => t.command === 'mysqldump');
            const mysql = toolsStatus.tools.find((t) => t.command === 'mysql');
            return !!(mysqldump?.installed && mysql?.installed);
        }
        return false;
    };

    // Create backup mutation - always use native method
    const createMutation = useMutation({
        mutationFn: () =>
            backupsApi.create({
                connectionId,
                backupType,
                compression,
                method: 'native',
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
        mutationFn: (backupId: string) => backupsApi.restore(backupId, connectionId, 'native'),
        onSuccess: () => {
            setRestoreDialogOpen(false);
            setSelectedBackup(null);
            toast.success('Backup restored successfully');
            // Invalidate all queries related to this connection to refresh data
            queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
            queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
            queryClient.invalidateQueries({ queryKey: ['query-results'] });
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

    // Delete multiple backups mutation
    const deleteMultipleMutation = useMutation({
        mutationFn: async (backupIds: string[]) => {
            await Promise.all(backupIds.map((id) => backupsApi.delete(id)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['backups', connectionId] });
            setDeleteMultipleDialogOpen(false);
            setSelectedBackupIds(new Set());
            toast.success('Backups deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete backups: ${error.message}`);
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

    const handleToggleBackup = (backupId: string) => {
        setSelectedBackupIds((prev) => {
            const next = new Set(prev);
            if (next.has(backupId)) {
                next.delete(backupId);
            } else {
                next.add(backupId);
            }
            return next;
        });
    };

    const handleToggleAll = () => {
        if (selectedBackupIds.size === backups.length) {
            setSelectedBackupIds(new Set());
        } else {
            setSelectedBackupIds(new Set(backups.map((b) => b.id)));
        }
    };

    const handleDeleteMultiple = () => {
        setDeleteMultipleDialogOpen(true);
    };

    const handleConfirmDeleteMultiple = () => {
        deleteMultipleMutation.mutate(Array.from(selectedBackupIds));
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
                <Box sx={{ p: 1, pt: 0, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
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
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {selectedBackupIds.size > 0 && (
                                <>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mr: 1 }}
                                    >
                                        {selectedBackupIds.size} selected
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<DeleteIcon />}
                                        onClick={handleDeleteMultiple}
                                    >
                                        Delete Selected
                                    </Button>
                                </>
                            )}
                            {!areToolsInstalled() && (
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
                            <StyledTooltip
                                title={
                                    !areToolsInstalled()
                                        ? `Database tools required. Click "Setup Tools" to install ${engine === 'postgres' ? 'pg_dump/psql' : 'mysqldump/mysql'}.`
                                        : ''
                                }
                            >
                                <span>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={() => setCreateDialogOpen(true)}
                                        disabled={!areToolsInstalled()}
                                    >
                                        Create Backup
                                    </Button>
                                </span>
                            </StyledTooltip>
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
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={
                                                backups.length > 0 &&
                                                selectedBackupIds.size === backups.length
                                            }
                                            indeterminate={
                                                selectedBackupIds.size > 0 &&
                                                selectedBackupIds.size < backups.length
                                            }
                                            onChange={handleToggleAll}
                                        />
                                    </TableCell>
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
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selectedBackupIds.has(backup.id)}
                                                onChange={() => handleToggleBackup(backup.id)}
                                            />
                                        </TableCell>
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
                                                        <StyledTooltip
                                                            title={
                                                                !areToolsInstalled()
                                                                    ? 'Database tools required'
                                                                    : 'Restore'
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() =>
                                                                        handleRestoreClick(backup)
                                                                    }
                                                                    disabled={!areToolsInstalled()}
                                                                >
                                                                    <RestoreIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
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
                                onChange={(e) => setBackupType(e.target.value as BackupType)}
                            >
                                <MenuItem value="full">Full (Schema + Data)</MenuItem>
                                <MenuItem value="schema">Schema Only</MenuItem>
                                <MenuItem value="data">Data Only</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Native tools info */}
                        {engine !== 'sqlite' && (
                            <StatusAlert severity="success">
                                Using native backup tools (
                                {engine === 'postgres' ? 'pg_dump' : 'mysqldump'}) for optimal
                                performance and reliability.
                            </StatusAlert>
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
                                : ' using native database tools.'}
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

                                {/* Restore info */}
                                <StatusAlert severity="info" sx={{ mt: 2 }}>
                                    {engine === 'sqlite' ? (
                                        <>
                                            SQLite backups are restored by replacing the database
                                            file.
                                        </>
                                    ) : (
                                        <>
                                            This backup will be restored using native database tools
                                            ({engine === 'postgres' ? 'psql' : 'mysql'}).
                                        </>
                                    )}
                                </StatusAlert>
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

            {/* Delete Multiple Backups Dialog */}
            <Dialog
                open={deleteMultipleDialogOpen}
                onClose={() => setDeleteMultipleDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Delete Multiple Backups</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <StatusAlert severity="error" sx={{ mb: 2 }}>
                            This will permanently delete {selectedBackupIds.size} backup
                            {selectedBackupIds.size > 1 ? 's' : ''}. This action cannot be undone.
                        </StatusAlert>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Selected backups:
                        </Typography>
                        <Box
                            component="ul"
                            sx={{
                                pl: 2,
                                maxHeight: 200,
                                overflowY: 'auto',
                                color: 'text.secondary',
                                fontSize: 14,
                            }}
                        >
                            {backups
                                .filter((b) => selectedBackupIds.has(b.id))
                                .map((backup) => (
                                    <li key={backup.id}>{backup.filename}</li>
                                ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 2 }}>
                    <Button onClick={() => setDeleteMultipleDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDeleteMultiple}
                        disabled={deleteMultipleMutation.isPending}
                        startIcon={
                            deleteMultipleMutation.isPending && <CircularProgress size={16} />
                        }
                    >
                        Delete {selectedBackupIds.size} Backup
                        {selectedBackupIds.size > 1 ? 's' : ''}
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
