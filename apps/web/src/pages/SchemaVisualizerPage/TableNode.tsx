import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Chip, alpha, useTheme } from '@mui/material';
import { Key as KeyIcon, Link as ForeignKeyIcon } from '@mui/icons-material';

export interface TableColumn {
    name: string;
    dataType: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey?: boolean;
    references?: {
        table: string;
        column: string;
    };
}

export interface TableNodeData extends Record<string, unknown> {
    label: string;
    columns: TableColumn[];
    schema: string;
    rowCount?: number;
}

function TableNodeComponent({ data, selected }: NodeProps) {
    const theme = useTheme();
    const { label, columns, schema, rowCount } = data as TableNodeData;

    return (
        <Box
            sx={{
                minWidth: 220,
                maxWidth: 320,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '2px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                boxShadow: selected
                    ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}`
                    : '0 4px 12px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
            }}
        >
            {/* Table Header */}
            <Box
                sx={{
                    px: 1.5,
                    py: 1,
                    bgcolor: selected ? 'primary.main' : alpha(theme.palette.primary.main, 0.1),
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Box>
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
                {rowCount !== undefined && (
                    <Chip
                        label={rowCount.toLocaleString()}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: 10,
                            bgcolor: selected
                                ? alpha('#fff', 0.2)
                                : alpha(theme.palette.primary.main, 0.1),
                            color: selected ? '#fff' : 'text.secondary',
                        }}
                    />
                )}
            </Box>

            {/* Columns */}
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {columns.map((column, index) => (
                    <Box
                        key={column.name}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.5,
                            py: 0.5,
                            borderBottom: index < columns.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                            bgcolor: column.isPrimaryKey
                                ? alpha(theme.palette.warning.main, 0.05)
                                : column.isForeignKey
                                  ? alpha(theme.palette.info.main, 0.05)
                                  : 'transparent',
                            position: 'relative',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                            },
                        }}
                    >
                        {/* Icons */}
                        <Box sx={{ width: 16, display: 'flex', justifyContent: 'center' }}>
                            {column.isPrimaryKey && (
                                <KeyIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                            )}
                            {column.isForeignKey && !column.isPrimaryKey && (
                                <ForeignKeyIcon sx={{ fontSize: 12, color: 'info.main' }} />
                            )}
                        </Box>

                        {/* Column Name */}
                        <Typography
                            variant="body2"
                            sx={{
                                flex: 1,
                                fontFamily: 'monospace',
                                fontSize: 11,
                                fontWeight: column.isPrimaryKey ? 600 : 400,
                                color: 'text.primary',
                            }}
                        >
                            {column.name}
                        </Typography>

                        {/* Data Type */}
                        <Typography
                            variant="caption"
                            sx={{
                                fontFamily: 'monospace',
                                fontSize: 10,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                            }}
                        >
                            {column.dataType}
                        </Typography>

                        {/* Nullable indicator */}
                        {!column.nullable && (
                            <Typography
                                variant="caption"
                                sx={{
                                    fontSize: 9,
                                    color: 'error.main',
                                    fontWeight: 600,
                                }}
                            >
                                NN
                            </Typography>
                        )}

                        {/* Connection handles for foreign keys */}
                        {column.isForeignKey && (
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`${column.name}-source`}
                                style={{
                                    width: 8,
                                    height: 8,
                                    background: theme.palette.info.main,
                                    border: `2px solid ${theme.palette.background.paper}`,
                                    right: -6,
                                }}
                            />
                        )}
                        {column.isPrimaryKey && (
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`${column.name}-target`}
                                style={{
                                    width: 8,
                                    height: 8,
                                    background: theme.palette.warning.main,
                                    border: `2px solid ${theme.palette.background.paper}`,
                                    left: -6,
                                }}
                            />
                        )}
                    </Box>
                ))}
            </Box>

            {/* Default handles for general connections */}
            <Handle
                type="target"
                position={Position.Top}
                id="top"
                style={{
                    width: 10,
                    height: 10,
                    background: theme.palette.primary.main,
                    border: `2px solid ${theme.palette.background.paper}`,
                    top: -6,
                }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                style={{
                    width: 10,
                    height: 10,
                    background: theme.palette.primary.main,
                    border: `2px solid ${theme.palette.background.paper}`,
                    bottom: -6,
                }}
            />
        </Box>
    );
}

export const TableNode = memo(TableNodeComponent);
