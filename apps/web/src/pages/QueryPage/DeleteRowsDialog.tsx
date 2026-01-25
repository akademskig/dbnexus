import { Box, Typography, Chip, Divider, alpha } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import KeyIcon from '@mui/icons-material/Key';
import TableChartIcon from '@mui/icons-material/TableChart';
import { ConfirmDialog } from './Dialogs';
import type { TableSchema } from '@dbnexus/shared';

interface DeleteRowsDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
    readonly rows: Record<string, unknown>[] | null;
    readonly tableName: string | undefined;
    readonly tableSchema: TableSchema | undefined;
    readonly loading: boolean;
}

export function DeleteRowsDialog({
    open,
    onClose,
    onConfirm,
    rows,
    tableName,
    tableSchema,
    loading,
}: DeleteRowsDialogProps) {
    const primaryKeys = tableSchema?.columns.filter((c) => c.isPrimaryKey).map((c) => c.name) || [];
    const rowCount = rows?.length ?? 0;

    return (
        <ConfirmDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Delete Multiple Rows"
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
                        <DeleteSweepIcon
                            sx={{
                                color: 'error.main',
                                fontSize: 28,
                            }}
                        />
                        <Typography>
                            Are you sure you want to delete{' '}
                            <Chip
                                label={`${rowCount} row${rowCount !== 1 ? 's' : ''}`}
                                size="small"
                                color="error"
                                sx={{
                                    mx: 0.5,
                                    fontWeight: 700,
                                }}
                            />{' '}
                            from{' '}
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

                    {/* Rows List */}
                    {rows && tableSchema && primaryKeys.length > 0 && (
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
                                    Rows to delete ({rowCount})
                                </Typography>
                                <Box
                                    sx={{
                                        maxHeight: 300,
                                        overflow: 'auto',
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                    }}
                                >
                                    {rows.map((row, index) => {
                                        const key = primaryKeys.length
                                            ? primaryKeys.map((pk) => String(row[pk])).join('|')
                                            : JSON.stringify(row);

                                        return (
                                            <Box
                                                key={key}
                                                sx={{
                                                    p: 1.5,
                                                    py: 1,
                                                    borderBottom: index < rows.length - 1 ? 1 : 0,
                                                    borderColor: 'divider',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover',
                                                    },
                                                }}
                                            >
                                                {primaryKeys.map((pk, pkIndex) => (
                                                    <Box
                                                        key={pk}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            mb:
                                                                pkIndex < primaryKeys.length - 1
                                                                    ? 0.5
                                                                    : 0,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            fontWeight={600}
                                                            color="text.secondary"
                                                            sx={{ minWidth: 80 }}
                                                        >
                                                            {pk}:
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            fontFamily="monospace"
                                                        >
                                                            {String(row[pk])}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        );
                                    })}
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
            confirmText={`Delete ${rowCount} Row${rowCount !== 1 ? 's' : ''}`}
            confirmColor="error"
            loading={loading}
        />
    );
}
