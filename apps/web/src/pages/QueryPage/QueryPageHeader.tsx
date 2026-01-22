import { Box, Typography, Chip, IconButton, Button, CircularProgress } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { StyledTooltip } from '../../components/StyledTooltip';
import { formatBytes } from './utils';
import type { TableInfo, TableSchema } from '@dbnexus/shared';

interface QueryPageHeaderProps {
    selectedTable: TableInfo;
    tableSchema: TableSchema | undefined;
    sql: string;
    explainLoading: boolean;
    executeLoading: boolean;
    onManageTable: () => void;
    onAddRow: () => void;
    onExplain: () => void;
    onExecute: () => void;
}

export function QueryPageHeader({
    selectedTable,
    tableSchema,
    sql,
    explainLoading,
    executeLoading,
    onManageTable,
    onAddRow,
    onExplain,
    onExecute,
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
                    color={
                        selectedTable.type === 'view'
                            ? 'secondary'
                            : 'default'
                    }
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
                <IconButton
                    size="small"
                    onClick={onManageTable}
                >
                    <SettingsIcon fontSize="small" />
                </IconButton>
            </StyledTooltip>

            {selectedTable.type !== 'view' && (
                <StyledTooltip title="Add Row">
                    <IconButton
                        size="small"
                        onClick={onAddRow}
                        disabled={!tableSchema}
                    >
                        <AddIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
            )}

            <StyledTooltip title="Explain Query">
                <span>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                            explainLoading ? (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                />
                            ) : (
                                <AccountTreeIcon />
                            )
                        }
                        onClick={onExplain}
                        disabled={!sql.trim() || explainLoading}
                    >
                        Explain
                    </Button>
                </span>
            </StyledTooltip>

            <StyledTooltip title="Run Query (⌘+Enter)">
                <span>
                    <Button
                        variant="contained"
                        size="small"
                        data-tour="run-query"
                        startIcon={
                            executeLoading ? (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                />
                            ) : (
                                <PlayArrowIcon />
                            )
                        }
                        onClick={onExecute}
                        disabled={!sql.trim() || executeLoading}
                    >
                        Run
                    </Button>
                </span>
            </StyledTooltip>
        </Box>
    );
}
