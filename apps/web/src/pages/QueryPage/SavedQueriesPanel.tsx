import { useState } from 'react';
import {
    Box,
    Typography,
    Chip,
    Tooltip,
    IconButton,
    TextField,
    InputAdornment,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CodeIcon from '@mui/icons-material/Code';
import type { SavedQuery } from '@dbnexus/shared';

interface SavedQueriesPanelProps {
    readonly queries: SavedQuery[];
    readonly connections: { id: string; name: string }[];
    readonly onSelect: (query: SavedQuery) => void;
    readonly onRun: (query: SavedQuery) => void;
    readonly onEdit: (query: SavedQuery) => void;
    readonly onDelete: (query: SavedQuery) => void;
    readonly onClose: () => void;
    readonly onRefresh: () => void;
}

export function SavedQueriesPanel({
    queries,
    connections,
    onSelect,
    onRun,
    onEdit,
    onDelete,
    onClose,
    onRefresh,
}: SavedQueriesPanelProps) {
    const [search, setSearch] = useState('');
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);

    const getConnectionName = (connectionId?: string) => {
        if (!connectionId) return 'Any connection';
        const conn = connections.find((c) => c.id === connectionId);
        return conn?.name ?? 'Unknown';
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays < 1) return 'Today';
        if (diffDays < 2) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return d.toLocaleDateString();
    };

    const truncateSql = (sql: string, maxLength = 120) => {
        const cleaned = sql.replace(/\s+/g, ' ').trim();
        if (cleaned.length <= maxLength) return cleaned;
        return cleaned.slice(0, maxLength) + '...';
    };

    const filteredQueries = queries.filter(
        (q) =>
            q.name.toLowerCase().includes(search.toLowerCase()) ||
            q.sql.toLowerCase().includes(search.toLowerCase())
    );

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, query: SavedQuery) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
        setSelectedQuery(query);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setSelectedQuery(null);
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
                <BookmarkIcon color="primary" />
                <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
                    Saved Queries
                </Typography>
                <Tooltip title="Refresh">
                    <IconButton size="small" onClick={onRefresh}>
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Search */}
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                    size="small"
                    placeholder="Search saved queries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ opacity: 0.5 }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* Queries List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {filteredQueries.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <BookmarkIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                        <Typography variant="body2">
                            {search ? 'No matching queries' : 'No saved queries yet'}
                        </Typography>
                        <Typography variant="caption">
                            {search
                                ? 'Try a different search term'
                                : 'Save queries from the SQL tab to access them here'}
                        </Typography>
                    </Box>
                ) : (
                    filteredQueries.map((query) => (
                        <Box
                            key={query.id}
                            sx={{
                                p: 2,
                                borderBottom: 1,
                                borderColor: 'divider',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                                transition: 'background-color 0.15s',
                            }}
                            onClick={() => onSelect(query)}
                        >
                            {/* Name & Connection */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                <CodeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                                    {query.name}
                                </Typography>
                                <Chip
                                    label={getConnectionName(query.connectionId)}
                                    size="small"
                                    sx={{ height: 18, fontSize: 10 }}
                                />
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuOpen(e, query)}
                                    sx={{ ml: -0.5 }}
                                >
                                    <MoreVertIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>

                            {/* SQL Preview */}
                            <Typography
                                variant="body2"
                                fontFamily="monospace"
                                sx={{
                                    fontSize: 12,
                                    color: 'text.secondary',
                                    bgcolor: 'action.hover',
                                    p: 1,
                                    borderRadius: 0.5,
                                    mb: 1,
                                    wordBreak: 'break-all',
                                }}
                            >
                                {truncateSql(query.sql)}
                            </Typography>

                            {/* Date & Actions */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                }}
                            >
                                <Typography variant="caption" color="text.secondary">
                                    {formatDate(query.updatedAt)}
                                </Typography>
                                <Box sx={{ flex: 1 }} />
                                <Tooltip title="Run Query">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRun(query);
                                        }}
                                        sx={{
                                            bgcolor: 'primary.dark',
                                            '&:hover': { bgcolor: 'primary.main' },
                                        }}
                                    >
                                        <PlayArrowIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    ))
                )}
            </Box>

            {/* Footer Stats */}
            {queries.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        borderTop: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        {filteredQueries.length === queries.length
                            ? `${queries.length} saved queries`
                            : `${filteredQueries.length} of ${queries.length} queries`}
                    </Typography>
                </Box>
            )}

            {/* Context Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem
                    onClick={() => {
                        if (selectedQuery) onRun(selectedQuery);
                        handleMenuClose();
                    }}
                >
                    <ListItemIcon>
                        <PlayArrowIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Run</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (selectedQuery) onSelect(selectedQuery);
                        handleMenuClose();
                    }}
                >
                    <ListItemIcon>
                        <CodeIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Load to Editor</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (selectedQuery) onEdit(selectedQuery);
                        handleMenuClose();
                    }}
                >
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (selectedQuery) onDelete(selectedQuery);
                        handleMenuClose();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
}
