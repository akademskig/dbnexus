import { Box, Typography } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { TableInfo } from '@dbnexus/shared';

interface TableListItemProps {
    readonly table: TableInfo;
    readonly selected: boolean;
    readonly onClick: () => void;
}

export function TableListItem({ table, selected, onClick }: TableListItemProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 0.75,
                pl: 4,
                cursor: 'pointer',
                bgcolor: selected ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
                borderLeft: selected ? 2 : 0,
                borderColor: 'primary.main',
            }}
            onClick={onClick}
        >
            {table.type === 'view' ? (
                <VisibilityIcon
                    fontSize="small"
                    sx={{ mr: 1, fontSize: 16, color: 'secondary.main' }}
                />
            ) : (
                <TableChartIcon
                    fontSize="small"
                    sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }}
                />
            )}
            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: selected ? 600 : 400,
                }}
            >
                {table.name}
            </Typography>
            {table.rowCount !== undefined && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {table.rowCount.toLocaleString()}
                </Typography>
            )}
        </Box>
    );
}
