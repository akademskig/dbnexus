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
    Stack,
    alpha,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LayersIcon from '@mui/icons-material/Layers';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SyncIcon from '@mui/icons-material/Sync';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../lib/api';
import type { ConnectionConfig, DatabaseGroup } from '@dbnexus/shared';
import { ConnectionCard } from './ConnectionCard';

interface DatabaseGroupSectionProps {
    group: DatabaseGroup;
    connections: ConnectionConfig[];
    projectColor: string;
    onEditGroup: () => void;
    onEditConnection: (conn: ConnectionConfig) => void;
    onDeleteConnection: (id: string) => void;
    onQuery: (id: string) => void;
    onMoveConnection?: (connectionId: string) => void;
    onDropComplete?: () => void;
}

export function DatabaseGroupSection({
    group,
    connections,
    projectColor,
    onEditGroup,
    onEditConnection,
    onDeleteConnection,
    onQuery,
    onMoveConnection,
    onDropComplete,
}: DatabaseGroupSectionProps) {
    const [expanded, setExpanded] = useState(true);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const queryClient = useQueryClient();

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
                <Box sx={{ flex: 1 }}>
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
                <Typography variant="caption" color="text.secondary">
                    {connections.length} instance{connections.length !== 1 ? 's' : ''}
                </Typography>
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
                    <Stack spacing={1}>
                        {connections.map((conn) => (
                            <ConnectionCard
                                key={conn.id}
                                connection={conn}
                                compact
                                onEdit={() => onEditConnection(conn)}
                                onDelete={() => onDeleteConnection(conn.id)}
                                onQuery={() => onQuery(conn.id)}
                            />
                        ))}
                        {connections.length === 0 && (
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.disabled', py: 2, textAlign: 'center' }}
                            >
                                No connections in this group
                            </Typography>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
}
