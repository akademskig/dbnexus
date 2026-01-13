import { Box } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import StorageIcon from '@mui/icons-material/Storage';
import { EmptyState as BaseEmptyState } from '../../components/EmptyState';

interface QueryEmptyStateProps {
    readonly connectionSelected: boolean;
}

export function EmptyState({ connectionSelected }: QueryEmptyStateProps) {
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {connectionSelected ? (
                <BaseEmptyState
                    icon={<TableChartIcon />}
                    title="Select a table"
                    description="Choose a table from the sidebar to view its data, structure, indexes, and foreign keys. Or write a custom SQL query above."
                    size="medium"
                />
            ) : (
                <BaseEmptyState
                    icon={<StorageIcon />}
                    title="No connection selected"
                    description="Select a database connection from the dropdown above to browse tables and run queries."
                    size="medium"
                />
            )}
        </Box>
    );
}
