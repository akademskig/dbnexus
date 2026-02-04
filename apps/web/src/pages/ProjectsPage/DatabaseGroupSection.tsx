import { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Chip,
    Collapse,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Button,
    alpha,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LayersIcon from '@mui/icons-material/Layers';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../lib/api';
import type { ConnectionConfig, DatabaseGroup } from '@dbnexus/shared';
import { ConnectionCard } from './ConnectionCard';
import { useToastStore } from '../../stores/toastStore';
import { StyledTooltip } from '@/components/StyledTooltip';

interface DatabaseGroupSectionProps {
    readonly group: DatabaseGroup;
    readonly connections: ConnectionConfig[];
    readonly allConnections: ConnectionConfig[];
    readonly projectColor: string;
    readonly onEditGroup: () => void;
    readonly onGroupSettings: () => void;
    readonly onEditConnection: (conn: ConnectionConfig) => void;
    readonly onDeleteConnection: (id: string) => void;
    readonly onQuery: (id: string) => void;
    readonly onMoveConnection?: (connectionId: string) => void;
    readonly onDropComplete?: () => void;
    readonly onAddConnection?: () => void;
}

export function DatabaseGroupSection({
    group,
    connections,
    allConnections,
    projectColor,
    onEditGroup,
    onGroupSettings,
    onEditConnection,
    onDeleteConnection,
    onQuery,
    onMoveConnection,
    onDropComplete,
    onAddConnection,
}: DatabaseGroupSectionProps) {
    const [expanded, setExpanded] = useState(true);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const queryClient = useQueryClient();
    const toast = useToastStore();

    const LIMIT = 5;
    const visibleConnections = showAll ? connections : connections.slice(0, LIMIT);
    const hasMore = connections.length > LIMIT;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent parent from handling
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent parent from handling
        setIsDragOver(false);
        onDropComplete?.(); // Notify parent to reset its drag state

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            // Move to this group
            if (data.connectionId && data.currentGroupId !== group.id && onMoveConnection) {
                // Find the connection being dropped
                const connection = allConnections.find((c) => c.id === data.connectionId);

                if (!connection) {
                    toast.error('Database not found');
                    return;
                }

                // Validate engine compatibility
                if (connection.engine !== group.databaseEngine) {
                    const engineNames: Record<string, string> = {
                        postgres: 'PostgreSQL',
                        mysql: 'MySQL',
                        mariadb: 'MariaDB',
                        sqlite: 'SQLite',
                    };
                    toast.error(
                        `Cannot move ${engineNames[connection.engine] || connection.engine} connection to ${engineNames[group.databaseEngine] || group.databaseEngine} group`
                    );
                    return;
                }

                onMoveConnection(data.connectionId);
            }
        } catch {
            // Invalid drop data
        }
    };

    const deleteGroupMutation = useMutation({
        mutationFn: () => projectsApi.deleteGroup(group.projectId, group.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });

    return (
        <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: isDragOver ? 'primary.main' : 'divider',
                borderStyle: isDragOver ? 'dashed' : 'solid',
                overflow: 'hidden',
                transition: 'border-color 0.15s, background-color 0.15s',
                ...(isDragOver && {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                }),
            }}
        >
            {/* Group header */}
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 2,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 0.5,
                        bgcolor: `${projectColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <LayersIcon fontSize="small" sx={{ color: projectColor }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>
                        {group.name}
                    </Typography>
                    {group.description && (
                        <Typography variant="caption" color="text.secondary">
                            {group.description}
                        </Typography>
                    )}
                </Box>
                <Chip
                    icon={<StorageIcon sx={{ fontSize: 14 }} />}
                    label={connections.length}
                    size="small"
                    sx={{
                        height: 24,
                        fontSize: 12,
                        fontWeight: 600,
                        bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                        color: 'info.main',
                        border: '1px solid',
                        borderColor: (theme) => alpha(theme.palette.info.main, 0.3),
                        '& .MuiChip-icon': { color: 'info.main', fontSize: 14 },
                    }}
                />
                <Chip
                    label={
                        group.databaseEngine === 'postgres'
                            ? 'PostgreSQL'
                            : group.databaseEngine === 'mysql'
                              ? 'MySQL'
                              : group.databaseEngine === 'mariadb'
                                ? 'MariaDB'
                                : 'SQLite'
                    }
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: 11,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontWeight: 500,
                    }}
                />
                {(group.syncSchema || group.syncData) && (
                    <Chip
                        label={
                            group.syncSchema && group.syncData
                                ? 'Schema + Data'
                                : group.syncSchema
                                  ? 'Schema'
                                  : 'Data'
                        }
                        size="small"
                        icon={<SyncIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            height: 22,
                            fontSize: 11,
                            bgcolor: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            '& .MuiChip-icon': { color: '#22c55e' },
                        }}
                    />
                )}
                {/* Quick Action */}
                {onAddConnection && (
                    <StyledTooltip title="Add Database">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddConnection();
                            }}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': {
                                    color: 'primary.main',
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                },
                            }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </StyledTooltip>
                )}
                <StyledTooltip title="Sync Group Settings">
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onGroupSettings();
                        }}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                color: 'primary.main',
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            },
                        }}
                    >
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
                <IconButton size="small">
                    {expanded ? (
                        <ExpandLessIcon fontSize="small" />
                    ) : (
                        <ExpandMoreIcon fontSize="small" />
                    )}
                </IconButton>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget);
                    }}
                    sx={{ color: 'text.secondary' }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Group menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
            >
                <MenuItem
                    component="a"
                    href={`/groups/${group.id}/sync`}
                    onClick={() => setMenuAnchor(null)}
                >
                    <ListItemIcon>
                        <SyncIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Sync Status</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        onEditGroup();
                    }}
                >
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Instance Group</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setMenuAnchor(null);
                        deleteGroupMutation.mutate();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete Instance Group</ListItemText>
                </MenuItem>
            </Menu>

            {/* Group connections */}
            <Collapse in={expanded}>
                <Box
                    sx={{
                        px: 2,
                        py: 2,
                        bgcolor: 'background.default',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {connections.length === 0 ? (
                        <Box
                            sx={{
                                textAlign: 'center',
                                py: 3,
                                borderRadius: 1,
                                border: '1px dashed',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                No connections in this group yet
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ display: 'block', mt: 0.5 }}
                            >
                                Drag connections here to add
                            </Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {visibleConnections.map((conn) => (
                                <Grid size={{ xs: 12, md: 6 }} key={conn.id}>
                                    <ConnectionCard
                                        connection={conn}
                                        compact
                                        onEdit={() => onEditConnection(conn)}
                                        onDelete={() => onDeleteConnection(conn.id)}
                                        onQuery={() => onQuery(conn.id)}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                    {hasMore && !showAll && (
                        <Box
                            sx={{
                                textAlign: 'center',
                                pt: 1.5,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                mt: 1.5,
                            }}
                        >
                            <Button
                                size="small"
                                onClick={() => setShowAll(true)}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    fontSize: 13,
                                    px: 2,
                                    py: 0.75,
                                    borderRadius: 1,
                                    color: 'primary.main',
                                    '&:hover': {
                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                    },
                                }}
                            >
                                Show {connections.length - LIMIT} more connections
                            </Button>
                        </Box>
                    )}
                    {showAll && hasMore && (
                        <Box
                            sx={{
                                textAlign: 'center',
                                pt: 1.5,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                mt: 1.5,
                            }}
                        >
                            <Button
                                size="small"
                                onClick={() => setShowAll(false)}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    fontSize: 13,
                                    px: 2,
                                    py: 0.75,
                                    color: 'text.secondary',
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                        color: 'primary.main',
                                    },
                                }}
                            >
                                Show less
                            </Button>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}
