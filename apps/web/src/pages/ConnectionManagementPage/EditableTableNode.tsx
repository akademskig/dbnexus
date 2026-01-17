import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
    Box,
    Typography,
    Chip,
    alpha,
    useTheme,
    IconButton,

    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

export interface EditableColumn {
    id: string;
    name: string;
    dataType: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey?: boolean;
    defaultValue?: string;
}

export interface EditableTableNodeData extends Record<string, unknown> {
    label: string;
    columns: EditableColumn[];
    schema: string;
    isNew?: boolean;
    onAddColumn?: (tableId: string) => void;
    onEditColumn?: (tableId: string, column: EditableColumn) => void;
    onDeleteColumn?: (tableId: string, column: EditableColumn) => void;
    onEditTable?: (tableId: string) => void;
    onDeleteTable?: (tableId: string) => void;
}

function EditableTableNodeComponent({ id, data, selected }: NodeProps) {
    const theme = useTheme();
    const {
        label,
        columns,
        schema,
        isNew,
        onAddColumn,
        onEditColumn,
        onDeleteColumn,
        onEditTable,
        onDeleteTable,
    } = data as EditableTableNodeData;

    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleAddColumn = () => {
        handleMenuClose();
        onAddColumn?.(id);
    };

    const handleEditTable = () => {
        handleMenuClose();
        onEditTable?.(id);
    };

    const handleDeleteTable = () => {
        handleMenuClose();
        onDeleteTable?.(id);
    };

    return (
        // Outer wrapper with padding to make room for handles
        <Box sx={{ px: 1 }}>
            <Box
                sx={{
                    minWidth: 240,
                    maxWidth: 350,
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: selected ? 'primary.main' : isNew ? 'success.main' : 'divider',
                    boxShadow: selected
                        ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`
                        : isNew
                          ? `0 0 0 2px ${alpha(theme.palette.success.main, 0.3)}`
                          : '0 4px 12px rgba(0,0,0,0.15)',
                    // Allow handles to overflow outside the box
                    overflow: 'visible',
                    transition: 'all 0.2s ease',
                }}
            >
                {/* Table Header */}
                <Box
                    sx={{
                        px: 1.5,
                        py: 1,
                        bgcolor: selected
                            ? 'primary.main'
                            : isNew
                              ? alpha(theme.palette.success.main, 0.15)
                              : alpha(theme.palette.primary.main, 0.1),
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <DragIndicatorIcon
                        sx={{
                            fontSize: 16,
                            color: selected ? alpha('#fff', 0.7) : 'text.disabled',
                            cursor: 'grab',
                        }}
                    />
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 700,
                                color: selected ? 'primary.contrastText' : 'text.primary',
                                fontFamily: 'monospace',
                            }}
                        >
                            {label}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: selected ? alpha('#fff', 0.7) : 'text.secondary',
                                fontSize: 10,
                            }}
                        >
                            {schema}
                        </Typography>
                    </Box>
                    {isNew && (
                        <Chip
                            label="NEW"
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: 9,
                                bgcolor: 'success.main',
                                color: '#fff',
                            }}
                        />
                    )}
                    <IconButton
                        size="small"
                        onClick={handleMenuOpen}
                        sx={{
                            color: selected ? '#fff' : 'text.secondary',
                            '&:hover': {
                                bgcolor: selected
                                    ? alpha('#fff', 0.1)
                                    : alpha(theme.palette.primary.main, 0.1),
                            },
                        }}
                    >
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={handleMenuClose}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MenuItem onClick={handleAddColumn}>
                            <ListItemIcon>
                                <AddIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Add Column</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={handleEditTable}>
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Rename Table</ListItemText>
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleDeleteTable} sx={{ color: 'error.main' }}>
                            <ListItemIcon>
                                <DeleteIcon fontSize="small" color="error" />
                            </ListItemIcon>
                            <ListItemText>Drop Table</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>

                {/* Columns */}
                <Box sx={{ maxHeight: 600, overflow: 'visible' }}>
                    {columns.length === 0 ? (
                        <Box
                            sx={{
                                p: 2,
                                textAlign: 'center',
                                color: 'text.secondary',
                            }}
                        >
                            <Typography variant="caption">No columns yet</Typography>
                            <Box sx={{ mt: 1 }}>
                                <Chip
                                    icon={<AddIcon />}
                                    label="Add Column"
                                    size="small"
                                    onClick={() => onAddColumn?.(id)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            </Box>
                        </Box>
                    ) : (
                        columns.map((column, index) => (
                            <Box
                                key={column.id}
                                onMouseEnter={() => setHoveredColumn(column.id)}
                                onMouseLeave={() => setHoveredColumn(null)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    px: 1.5,
                                    py: 0.75,
                                    borderBottom: index < columns.length - 1 ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                    bgcolor: column.isPrimaryKey
                                        ? alpha(theme.palette.warning.main, 0.08)
                                        : column.isForeignKey
                                          ? alpha(theme.palette.info.main, 0.08)
                                          : 'transparent',
                                    position: 'relative',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                }}
                            >
                                {/* Icons */}
                                <Box sx={{ width: 16, display: 'flex', justifyContent: 'center' }}>
                                    {column.isPrimaryKey && (
                                        <StyledTooltip title="Primary Key">
                                            <KeyIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                        </StyledTooltip>
                                    )}
                                    {column.isForeignKey && !column.isPrimaryKey && (
                                        <StyledTooltip title="Foreign Key">
                                            <LinkIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                        </StyledTooltip>
                                    )}
                                </Box>

                                {/* Column Name */}
                                <Typography
                                    variant="body2"
                                    sx={{
                                        flex: 1,
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        fontWeight: column.isPrimaryKey ? 600 : 400,
                                        color: 'text.primary',
                                    }}
                                >
                                    {column.name}
                                </Typography>

                                {/* Data Type */}
                                <Chip
                                    label={column.dataType}
                                    size="small"
                                    sx={{
                                        height: 18,
                                        fontSize: 9,
                                        fontFamily: 'monospace',
                                        bgcolor: alpha(theme.palette.info.main, 0.1),
                                        color: 'info.main',
                                    }}
                                />

                                {/* Nullable indicator */}
                                {!column.nullable && (
                                    <StyledTooltip title="NOT NULL">
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: 9,
                                                color: 'error.main',
                                                fontWeight: 700,
                                            }}
                                        >
                                            NN
                                        </Typography>
                                    </StyledTooltip>
                                )}

                                {/* Action buttons on hover */}
                                {hoveredColumn === column.id && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 0.25,
                                            position: 'absolute',
                                            right: 4,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            boxShadow: 1,
                                        }}
                                    >
                                        <StyledTooltip title="Edit Column">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditColumn?.(id, column);
                                                }}
                                                sx={{ p: 0.25 }}
                                            >
                                                <EditIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </StyledTooltip>
                                        {!column.isPrimaryKey && (
                                            <StyledTooltip title="Delete Column">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteColumn?.(id, column);
                                                    }}
                                                    sx={{ p: 0.25, color: 'error.main' }}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </StyledTooltip>
                                        )}
                                    </Box>
                                )}

                                {/* Connection handles for columns */}
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`${column.id}-source`}
                                    style={{
                                        width: 12,
                                        height: 12,
                                        background: column.isForeignKey
                                            ? theme.palette.info.main
                                            : theme.palette.primary.main,
                                        border: `2px solid ${theme.palette.background.paper}`,
                                        right: -7,
                                        opacity:
                                            hoveredColumn === column.id
                                                ? 1
                                                : column.isForeignKey
                                                  ? 0.8
                                                  : 0.3,
                                        transition: 'opacity 0.2s, transform 0.2s',
                                        cursor: 'crosshair',
                                        transform:
                                            hoveredColumn === column.id ? 'scale(1.2)' : 'scale(1)',
                                    }}
                                />
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    id={`${column.id}-target`}
                                    style={{
                                        width: 12,
                                        height: 12,
                                        background: column.isPrimaryKey
                                            ? theme.palette.warning.main
                                            : theme.palette.success.main,
                                        border: `2px solid ${theme.palette.background.paper}`,
                                        left: -7,
                                        opacity:
                                            hoveredColumn === column.id
                                                ? 1
                                                : column.isPrimaryKey
                                                  ? 0.8
                                                  : 0.3,
                                        transition: 'opacity 0.2s, transform 0.2s',
                                        cursor: 'crosshair',
                                        transform:
                                            hoveredColumn === column.id ? 'scale(1.2)' : 'scale(1)',
                                    }}
                                />
                            </Box>
                        ))
                    )}
                </Box>

                {/* Add Column Footer */}
                {columns.length > 0 && (
                    <Box
                        onClick={() => onAddColumn?.(id)}
                        sx={{
                            px: 1.5,
                            py: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            cursor: 'pointer',
                            borderTop: '1px dashed',
                            borderColor: 'divider',
                            color: 'text.disabled',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                color: 'primary.main',
                            },
                        }}
                    >
                        <AddIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption" sx={{ fontSize: 11 }}>
                            Add column
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

export const EditableTableNode = memo(EditableTableNodeComponent);
