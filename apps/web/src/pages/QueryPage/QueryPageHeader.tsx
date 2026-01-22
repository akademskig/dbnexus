import { Box, Typography, Chip, IconButton } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import { StyledTooltip } from '../../components/StyledTooltip';
import { formatBytes } from './utils';
import type { TableInfo, TableSchema } from '@dbnexus/shared';

interface QueryPageHeaderProps {
    selectedTable: TableInfo;
    tableSchema: TableSchema | undefined;
    onManageTable: () => void;
    onAddRow: () => void;
}

export function QueryPageHeader({
    selectedTable,
    tableSchema,
    onManageTable,
    onAddRow,
}: QueryPageHeaderProps) {
    return (
        <Box
            sx={{
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectedTable.type === 'view' ? (
                    <VisibilityIcon color="secondary" />
                ) : (
                    <TableChartIcon color="primary" />
                )}
                <Typography variant="h6" fontWeight={600}>
                    {selectedTable.name}
                </Typography>
                <Chip
                    label={selectedTable.type}
                    size="small"
                    color={selectedTable.type === 'view' ? 'secondary' : 'default'}
                    sx={{ textTransform: 'uppercase', fontSize: 10 }}
                />
            </Box>

            {selectedTable.rowCount !== undefined && (
                <Typography variant="body2" color="text.secondary">
                    ~{selectedTable.rowCount.toLocaleString()} rows
                </Typography>
            )}

            {selectedTable.sizeBytes !== undefined && (
                <Typography variant="body2" color="text.secondary">
                    {formatBytes(selectedTable.sizeBytes)}
                </Typography>
            )}

            <Box sx={{ flex: 1 }} />

            {/* Table Actions */}
            <StyledTooltip title="Manage Table">
                <IconButton size="small" onClick={onManageTable}>
                    <SettingsIcon fontSize="small" />
                </IconButton>
            </StyledTooltip>

            {selectedTable.type !== 'view' && (
                <StyledTooltip title="Add Row">
                    <IconButton size="small" onClick={onAddRow} disabled={!tableSchema}>
                        <AddIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
            )}
        </Box>
    );
}
