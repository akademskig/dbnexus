import { Box, Typography, Chip, Divider, alpha } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CodeIcon from '@mui/icons-material/Code';
import { ConfirmDialog } from './Dialogs';
import type { SavedQuery } from '@dbnexus/shared';

interface DeleteSavedQueryDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    query: SavedQuery | null;
    loading: boolean;
}

export function DeleteSavedQueryDialog({
    open,
    onClose,
    onConfirm,
    query,
    loading,
}: DeleteSavedQueryDialogProps) {
    return (
        <ConfirmDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Delete Saved Query"
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
                        <DeleteOutlineIcon
                            sx={{
                                color: 'error.main',
                                fontSize: 24,
                            }}
                        />
                        <Typography>
                            Are you sure you want to delete the saved query{' '}
                            <Chip
                                icon={<BookmarkIcon sx={{ fontSize: 14 }} />}
                                label={query?.name}
                                size="small"
                                sx={{
                                    mx: 0.5,
                                    fontWeight: 600,
                                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1),
                                }}
                            />
                            ?
                        </Typography>
                    </Box>

                    {/* Query Preview */}
                    {query?.sql && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ mb: 1 }}>
                                <Typography
                                    variant="caption"
                                    fontWeight={600}
                                    textTransform="uppercase"
                                    color="text.secondary"
                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}
                                >
                                    <CodeIcon sx={{ fontSize: 14 }} />
                                    SQL Preview
                                </Typography>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.05),
                                        borderLeft: 3,
                                        borderColor: 'error.main',
                                        borderRadius: 1,
                                        maxHeight: 150,
                                        overflow: 'auto',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        fontFamily="monospace"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all',
                                            color: 'text.secondary',
                                        }}
                                    >
                                        {query.sql.slice(0, 200)}
                                        {query.sql.length > 200 && '...'}
                                    </Typography>
                                </Box>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                        </>
                    )}

                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        This action cannot be undone.
                    </Typography>
                </Box>
            }
            confirmText="Delete Query"
            confirmColor="error"
            loading={loading}
        />
    );
}
