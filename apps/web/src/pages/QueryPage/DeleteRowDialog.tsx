import { Box, Typography, Chip, Divider, alpha } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import TableChartIcon from '@mui/icons-material/TableChart';
import { ConfirmDialog } from './Dialogs';
import type { TableSchema } from '@dbnexus/shared';

interface DeleteRowDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    row: Record<string, unknown> | null;
    tableName: string | undefined;
    tableSchema: TableSchema | undefined;
    loading: boolean;
}

export function DeleteRowDialog({
    open,
    onClose,
    onConfirm,
    row,
    tableName,
    tableSchema,
    loading,
}: DeleteRowDialogProps) {
    const primaryKeys = tableSchema?.columns.filter((c) => c.isPrimaryKey) || [];

    return (
        <ConfirmDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Delete Row"
            message={
                <Box>
                    {/* Warning Message */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 2,
                        }}
                    >
                        <Typography>
                            Are you sure you want to delete this row from{' '}
                            <Chip
                                icon={<TableChartIcon sx={{ fontSize: 14 }} />}
                                label={tableName}
                                size="small"
                                sx={{
                                    mx: 0.5,
                                    fontWeight: 600,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                }}
                            />
                            ?
                        </Typography>
                    </Box>

                    {/* Primary Key Values */}
                    {row && tableSchema && primaryKeys.length > 0 && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box>
                                <Typography
                                    variant="caption"
                                    fontWeight={600}
                                    textTransform="uppercase"
                                    color="text.secondary"
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        mb: 1.5,
                                    }}
                                >
                                    <KeyIcon sx={{ fontSize: 14 }} />
                                    Primary Key Values
                                </Typography>
                                <Box
                                    sx={{
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                    }}
                                >
                                    {primaryKeys.map((c, index) => (
                                        <Box
                                            key={c.name}
                                            sx={{
                                                p: 1.5,
                                                borderBottom:
                                                    index < primaryKeys.length - 1 ? 1 : 0,
                                                borderColor: 'divider',
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    color="text.secondary"
                                                    sx={{ minWidth: 100 }}
                                                >
                                                    {c.name}:
                                                </Typography>
                                                <Typography variant="body2" fontFamily="monospace">
                                                    {String(row[c.name])}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontStyle: 'italic' }}
                            >
                                This action cannot be undone.
                            </Typography>
                        </>
                    )}
                </Box>
            }
            confirmText="Delete Row"
            confirmColor="error"
            loading={loading}
        />
    );
}
