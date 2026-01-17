import { Box, Typography, Chip, IconButton } from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ReplayIcon from '@mui/icons-material/Replay';
import type { QueryHistoryEntry } from '@dbnexus/shared';

interface HistoryPanelProps {
    readonly history: QueryHistoryEntry[];
    readonly connections: { id: string; name: string }[];
    readonly onSelect: (entry: QueryHistoryEntry) => void;
    readonly onRerun: (entry: QueryHistoryEntry) => void;
    readonly onClear: () => void;
    readonly onClose: () => void;
    readonly onRefresh: () => void;
    readonly clearing: boolean;
}

export function HistoryPanel({
    history,
    connections,
    onSelect,
    onRerun,
    onClear,
    onClose,
    onRefresh,
    clearing,
}: HistoryPanelProps) {
    const getConnectionName = (connectionId: string) => {
        const conn = connections.find((c) => c.id === connectionId);
        return conn?.name ?? 'Unknown';
    };

    const formatTime = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString();
    };

    const truncateSql = (sql: string, maxLength = 150) => {
        const cleaned = sql.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= maxLength) return cleaned;
        return cleaned.slice(0, maxLength) + '...';
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <HistoryIcon color="primary" />
                <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
                    Query History
                </Typography>
                <StyledTooltip title="Refresh">
                    <IconButton size="small" onClick={onRefresh}>
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
                <StyledTooltip title="Clear All">
                    <IconButton
                        size="small"
                        onClick={onClear}
                        disabled={clearing || history.length === 0}
                        color="error"
                    >
                        <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* History List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {history.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <HistoryIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                        <Typography variant="body2">No query history yet</Typography>
                        <Typography variant="caption">Executed queries will appear here</Typography>
                    </Box>
                ) : (
                    history.map((entry) => (
                        <Box
                            key={entry.id}
                            sx={{
                                p: 2,
                                borderBottom: 1,
                                borderColor: 'divider',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                                transition: 'background-color 0.15s',
                            }}
                            onClick={() => onSelect(entry)}
                        >
                            {/* Status & Time */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                {entry.success ? (
                                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                ) : (
                                    <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                )}
                                <Typography variant="caption" color="text.secondary">
                                    {formatTime(entry.executedAt)}
                                </Typography>
                                <Box sx={{ flex: 1 }} />
                                <Chip
                                    label={getConnectionName(entry.connectionId)}
                                    size="small"
                                    sx={{ height: 18, fontSize: 10 }}
                                />
                            </Box>

                            {/* SQL Preview */}
                            <Typography
                                variant="body2"
                                fontFamily="monospace"
                                sx={{
                                    fontSize: 12,
                                    color: entry.success ? 'text.primary' : 'error.main',
                                    bgcolor: 'action.hover',
                                    p: 1,
                                    borderRadius: 0.5,
                                    mb: 1,
                                    wordBreak: 'break-all',
                                }}
                            >
                                {truncateSql(entry.sql)}
                            </Typography>

                            {/* Stats & Actions */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                }}
                            >
                                {entry.success ? (
                                    <>
                                        <Typography variant="caption" color="text.secondary">
                                            {entry.rowCount} rows
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {entry.executionTimeMs}ms
                                        </Typography>
                                    </>
                                ) : (
                                    <Typography
                                        variant="caption"
                                        color="error.main"
                                        sx={{
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {entry.error}
                                    </Typography>
                                )}
                                <Box sx={{ flex: 1 }} />
                                <StyledTooltip title="Run Again">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRerun(entry);
                                        }}
                                        sx={{
                                            bgcolor: 'primary.dark',
                                            '&:hover': { bgcolor: 'primary.main' },
                                        }}
                                    >
                                        <ReplayIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </StyledTooltip>
                            </Box>
                        </Box>
                    ))
                )}
            </Box>

            {/* Footer Stats */}
            {history.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        borderTop: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        {history.length} queries • {history.filter((h) => h.success).length}{' '}
                        successful • {history.filter((h) => !h.success).length} failed
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
