import { Box, Typography } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import StorageIcon from '@mui/icons-material/Storage';

interface EmptyStateProps {
    readonly connectionSelected: boolean;
}

export function EmptyState({ connectionSelected }: EmptyStateProps) {
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
            }}
        >
            <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                {connectionSelected ? (
                    <>
                        <TableChartIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Select a table
                        </Typography>
                        <Typography variant="body2">
                            Choose a table from the sidebar to view its data, structure, indexes,
                            and foreign keys.
                        </Typography>
                    </>
                ) : (
                    <>
                        <StorageIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            No connection selected
                        </Typography>
                        <Typography variant="body2">
                            Select a database connection from the dropdown above to browse tables
                            and run queries.
                        </Typography>
                    </>
                )}
            </Box>
        </Box>
    );
}
