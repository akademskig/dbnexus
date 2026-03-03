import { Box, Typography, Chip, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useState } from 'react';
import { StyledTooltip } from '../../components/StyledTooltip';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ReplayIcon from '@mui/icons-material/Replay';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DataObjectIcon from '@mui/icons-material/DataObject';
import TableChartIcon from '@mui/icons-material/TableChart';
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
    const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

    const getConnectionName = (connectionId: string) => {
        const conn = connections.find((c) => c.id === connectionId);
        return conn?.name ?? 'Unknown';
    };

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleExportJson = () => {
        const exportData = history.map((entry) => ({
            sql: entry.sql,
            connection: getConnectionName(entry.connectionId),
            executedAt: new Date(entry.executedAt).toISOString(),
            success: entry.success,
            rowCount: entry.rowCount,
            executionTimeMs: entry.executionTimeMs,
            error: entry.error || null,
        }));
        const json = JSON.stringify(exportData, null, 2);
        downloadFile(json, `query-history-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        setExportMenuAnchor(null);
    };

    const handleExportCsv = () => {
        const headers = ['SQL', 'Connection', 'Executed At', 'Success', 'Row Count', 'Execution Time (ms)', 'Error'];
        const escapeCSV = (value: string | number | boolean | null) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replaceAll('"', '""')}"`;
            }
            return str;
        };
        const rows = history.map((entry) => [
            escapeCSV(entry.sql),
            escapeCSV(getConnectionName(entry.connectionId)),
            escapeCSV(new Date(entry.executedAt).toISOString()),
            escapeCSV(entry.success),
            escapeCSV(entry.rowCount ?? ''),
            escapeCSV(entry.executionTimeMs ?? ''),
            escapeCSV(entry.error || ''),
        ]);
        const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        downloadFile(csv, `query-history-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        setExportMenuAnchor(null);
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
        const cleaned = sql.replaceAll(/\s+/g, ' ').trim();
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
                <StyledTooltip title="Export History">
                    <span>
                        <IconButton
                            size="small"
                            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                            disabled={history.length === 0}
                        >
                            <FileDownloadIcon fontSize="small" />
                        </IconButton>
                    </span>
                </StyledTooltip>
                <Menu
                    anchorEl={exportMenuAnchor}
                    open={Boolean(exportMenuAnchor)}
                    onClose={() => setExportMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <MenuItem onClick={handleExportJson}>
                        <ListItemIcon>
                            <DataObjectIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Export as JSON</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleExportCsv}>
                        <ListItemIcon>
                            <TableChartIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Export as CSV</ListItemText>
                    </MenuItem>
                </Menu>
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
