import { useState } from 'react';
import {
    Box,
    Typography,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    CircularProgress,
} from '@mui/material';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    Storage as StorageIcon,
    Sync as SyncIcon,
    Code as CodeIcon,
    Settings as SettingsIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CompareArrows as CompareIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { connectionsApi, queriesApi, schemaApi } from '../../lib/api';

interface ActivityDetails {
    connectionId?: string;
    connectionName?: string;
    executionTimeMs?: number;
    rowCount?: number;
    error?: string;
    sourceConnection?: string;
    targetConnection?: string;
    sourceSchema?: string;
    targetSchema?: string;
    statementCount?: number;
}

interface ActivityItem {
    id: string;
    type: 'query' | 'migration' | 'connection' | 'sync';
    action: string;
    description: string;
    timestamp: Date;
    status: 'success' | 'error' | 'info';
    details?: ActivityDetails;
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function getActivityIcon(type: string, action: string) {
    switch (type) {
        case 'query':
            return <CodeIcon />;
        case 'migration':
            return <CompareIcon />;
        case 'sync':
            return <SyncIcon />;
        case 'connection':
            if (action.includes('create')) return <AddIcon />;
            if (action.includes('delete')) return <DeleteIcon />;
            if (action.includes('update')) return <EditIcon />;
            return <StorageIcon />;
        default:
            return <SettingsIcon />;
    }
}

function getActivityColor(type: string, status: string) {
    if (status === 'error') return '#ef4444';
    switch (type) {
        case 'query':
            return '#8b5cf6';
        case 'migration':
            return '#f59e0b';
        case 'sync':
            return '#22c55e';
        case 'connection':
            return '#0ea5e9';
        default:
            return '#6b7280';
    }
}

export function ActivityLogTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Fetch data from multiple sources
    const { data: queryHistory = [], isLoading: loadingQueries } = useQuery({
        queryKey: ['queryHistory'],
        queryFn: () => queriesApi.getHistory(undefined, 100),
    });

    const { data: migrations = [], isLoading: loadingMigrations } = useQuery({
        queryKey: ['migrationHistory'],
        queryFn: () => schemaApi.getMigrationHistory({ limit: 100 }),
    });

    const { data: connections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const isLoading = loadingQueries || loadingMigrations;

    // Build unified activity list
    const activities: ActivityItem[] = [
        // Query activities
        ...queryHistory.map((q): ActivityItem => ({
            id: `query-${q.id}`,
            type: 'query',
            action: 'execute',
            description: q.sql.substring(0, 100) + (q.sql.length > 100 ? '...' : ''),
            timestamp: new Date(q.executedAt),
            status: q.success ? 'success' : 'error',
            details: {
                connectionId: q.connectionId,
                connectionName: connections.find((c) => c.id === q.connectionId)?.name,
                executionTimeMs: q.executionTimeMs,
                rowCount: q.rowCount,
                error: q.error,
            },
        })),
        // Migration activities
        ...migrations.map((m): ActivityItem => ({
            id: `migration-${m.id}`,
            type: 'migration',
            action: 'apply',
            description: m.description || `Migration from ${m.sourceConnectionName} to ${m.targetConnectionName}`,
            timestamp: new Date(m.appliedAt),
            status: m.success ? 'success' : 'error',
            details: {
                sourceConnection: m.sourceConnectionName,
                targetConnection: m.targetConnectionName,
                sourceSchema: m.sourceSchema,
                targetSchema: m.targetSchema,
                statementCount: m.sqlStatements.length,
                error: m.error,
            },
        })),
    ];

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Filter activities
    const filteredActivities = activities.filter((activity) => {
        if (typeFilter !== 'all' && activity.type !== typeFilter) return false;
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            return (
                activity.description.toLowerCase().includes(search) ||
                activity.action.toLowerCase().includes(search) ||
                activity.type.toLowerCase().includes(search)
            );
        }
        return true;
    });

    // Group activities by date
    const groupedActivities: Record<string, ActivityItem[]> = {};
    filteredActivities.forEach((activity) => {
        const dateKey = activity.timestamp.toDateString();
        if (!groupedActivities[dateKey]) {
            groupedActivities[dateKey] = [];
        }
        groupedActivities[dateKey].push(activity);
    });

    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filters */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    mb: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        label="Type"
                    >
                        <MenuItem value="all">All Activity</MenuItem>
                        <MenuItem value="query">Queries</MenuItem>
                        <MenuItem value="migration">Migrations</MenuItem>
                        <MenuItem value="sync">Sync Operations</MenuItem>
                        <MenuItem value="connection">Connections</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    size="small"
                    placeholder="Search activity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ minWidth: 300 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchQuery('')}>
                                    <ClearIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <Box sx={{ flex: 1 }} />

                <Typography variant="body2" color="text.secondary">
                    {filteredActivities.length} activities
                </Typography>
            </Box>

            {/* Activity List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredActivities.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">No activity found</Typography>
                    </Paper>
                ) : (
                    Object.entries(groupedActivities).map(([dateKey, items]) => (
                        <Box key={dateKey} sx={{ mb: 3 }}>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: 'text.secondary',
                                    mb: 1,
                                    px: 1,
                                    fontWeight: 600,
                                }}
                            >
                                {formatDateHeader(dateKey)}
                            </Typography>
                            <Paper>
                                <List disablePadding>
                                    {items.map((activity, idx) => (
                                        <Box key={activity.id}>
                                            {idx > 0 && <Divider />}
                                            <ListItem
                                                sx={{
                                                    py: 1.5,
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                }}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar
                                                        sx={{
                                                            bgcolor: `${getActivityColor(activity.type, activity.status)}20`,
                                                            color: getActivityColor(
                                                                activity.type,
                                                                activity.status
                                                            ),
                                                            width: 36,
                                                            height: 36,
                                                        }}
                                                    >
                                                        {getActivityIcon(
                                                            activity.type,
                                                            activity.action
                                                        )}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontFamily:
                                                                        activity.type === 'query'
                                                                            ? 'monospace'
                                                                            : 'inherit',
                                                                    fontSize: 13,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: 500,
                                                                }}
                                                            >
                                                                {activity.description}
                                                            </Typography>
                                                            <Chip
                                                                label={activity.type}
                                                                size="small"
                                                                sx={{
                                                                    fontSize: 10,
                                                                    height: 18,
                                                                    bgcolor: `${getActivityColor(activity.type, activity.status)}15`,
                                                                    color: getActivityColor(
                                                                        activity.type,
                                                                        activity.status
                                                                    ),
                                                                }}
                                                            />
                                                            {activity.status === 'error' && (
                                                                <Chip
                                                                    label="Error"
                                                                    size="small"
                                                                    sx={{
                                                                        fontSize: 10,
                                                                        height: 18,
                                                                        bgcolor:
                                                                            'rgba(239, 68, 68, 0.1)',
                                                                        color: '#ef4444',
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                gap: 2,
                                                                mt: 0.5,
                                                            }}
                                                        >
                                                            {activity.details?.connectionName && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {activity.details.connectionName}
                                                                </Typography>
                                                            )}
                                                            {activity.details?.executionTimeMs !== undefined && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {activity.details.executionTimeMs}ms
                                                                </Typography>
                                                            )}
                                                            {activity.details?.rowCount !== undefined && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {activity.details.rowCount} rows
                                                                </Typography>
                                                            )}
                                                            {activity.details?.statementCount !== undefined && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {activity.details.statementCount} statements
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    }
                                                />
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ flexShrink: 0 }}
                                                >
                                                    {formatTimeAgo(activity.timestamp)}
                                                </Typography>
                                            </ListItem>
                                        </Box>
                                    ))}
                                </List>
                            </Paper>
                        </Box>
                    ))
                )}
            </Box>
        </Box>
    );
}
