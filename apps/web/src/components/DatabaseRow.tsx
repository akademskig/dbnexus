import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    alpha,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TerminalIcon from '@mui/icons-material/Terminal';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ConnectionConfig } from '@dbnexus/shared';
import { StyledTooltip } from './StyledTooltip';
import { useConnectionHealthStore } from '../stores/connectionHealthStore';

interface DatabaseRowProps {
    readonly connection: ConnectionConfig;
    readonly onEdit?: (connection: ConnectionConfig) => void;
    readonly onDelete?: (connection: ConnectionConfig) => void;
    readonly draggable?: boolean;
    readonly indent?: number;
}

function StatusDot({ online }: { readonly online: boolean }) {
    return (
        <Box
            sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: online ? 'success.main' : 'error.main',
                flexShrink: 0,
            }}
        />
    );
}

export function DatabaseRow({
    connection,
    onEdit,
    onDelete,
    draggable = false,
    indent,
}: DatabaseRowProps) {
    const navigate = useNavigate();
    const { isOnline } = useConnectionHealthStore();
    const online = isOnline(connection.id);
    const displayName = connection.name || connection.database;
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    const handleMenuClose = () => setMenuAnchor(null);

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
                connectionId: connection.id,
                connectionName: connection.name,
                currentProjectId: connection.projectId || null,
                currentGroupId: connection.groupId || null,
            })
        );
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <StyledTooltip
            title="Connection is offline"
            placement="top"
            disableHoverListener={online}
        >
            <Box
                draggable={draggable}
                onDragStart={draggable ? handleDragStart : undefined}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 0.75,
                    px: 2,
                    pl: indent ?? 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                    cursor: draggable ? 'grab' : 'default',
                    transition: 'background 0.15s, opacity 0.15s',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                    '&:first-of-type': {
                        borderTop: 'none',
                    },
                    ...(draggable && {
                        '&:active': {
                            cursor: 'grabbing',
                            opacity: 0.6,
                        },
                    }),
                }}
            >
                <StorageIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <StatusDot online={online} />
                <Typography
                    variant="body2"
                    sx={{
                        flex: 1,
                        fontWeight: 500,
                        fontSize: 13,
                        color: online ? 'text.primary' : 'text.disabled',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {displayName}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0, fontSize: 10, textTransform: 'uppercase' }}
                >
                    {connection.engine}
                </Typography>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor(e.currentTarget);
                    }}
                    sx={{ p: 0.25, color: 'text.secondary' }}
                >
                    <MoreVertIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={handleMenuClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <MenuItem
                        onClick={() => {
                            handleMenuClose();
                            navigate(`/query/${connection.id}`);
                        }}
                        disabled={!online}
                    >
                        <ListItemIcon>
                            <TerminalIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Query</ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            handleMenuClose();
                            navigate(`/connections/${connection.id}?tab=overview`);
                        }}
                    >
                        <ListItemIcon>
                            <OpenInNewIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Manage</ListItemText>
                    </MenuItem>
                    {onEdit && (
                        <MenuItem
                            onClick={() => {
                                handleMenuClose();
                                onEdit(connection);
                            }}
                        >
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Edit</ListItemText>
                        </MenuItem>
                    )}
                    {onDelete && (
                        <MenuItem
                            onClick={() => {
                                handleMenuClose();
                                onDelete(connection);
                            }}
                            sx={{ color: 'error.main' }}
                        >
                            <ListItemIcon>
                                <DeleteIcon fontSize="small" color="error" />
                            </ListItemIcon>
                            <ListItemText>Remove</ListItemText>
                        </MenuItem>
                    )}
                </Menu>
            </Box>
        </StyledTooltip>
    );
}
