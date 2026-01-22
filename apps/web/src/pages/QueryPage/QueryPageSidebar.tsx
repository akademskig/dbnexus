import { Box, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment, Typography, Collapse, LinearProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { TableListItem } from './TableListItem';
import { SIDEBAR_WIDTH } from './utils';
import type { TableInfo } from '@dbnexus/shared';

interface QueryPageSidebarProps {
    selectedConnectionId: string | null;
    schemas: string[];
    selectedSchema: string;
    onSchemaChange: (schema: string) => void;
    tableSearch: string;
    onTableSearchChange: (search: string) => void;
    filteredTables: TableInfo[];
    selectedTable: TableInfo | null;
    onTableSelect: (table: TableInfo) => void;
    tablesLoading: boolean;
    tablesExpanded: boolean;
    onToggleTablesExpanded: () => void;
    viewsExpanded: boolean;
    onToggleViewsExpanded: () => void;
}

export function QueryPageSidebar({
    selectedConnectionId,
    schemas,
    selectedSchema,
    onSchemaChange,
    tableSearch,
    onTableSearchChange,
    filteredTables,
    selectedTable,
    onTableSelect,
    tablesLoading,
    tablesExpanded,
    onToggleTablesExpanded,
    viewsExpanded,
    onToggleViewsExpanded,
}: QueryPageSidebarProps) {
    const tables = filteredTables.filter((t) => t.type === 'table');
    const views = filteredTables.filter((t) => t.type === 'view');

    return (
        <Box
            sx={{
                width: SIDEBAR_WIDTH,
                borderRight: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.default',
            }}
        >
            {/* Schema Selector */}
            {selectedConnectionId && schemas.length > 0 && (
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Schema</InputLabel>
                        <Select
                            value={selectedSchema}
                            onChange={(e) => onSchemaChange(e.target.value)}
                            label="Schema"
                            startAdornment={
                                <InputAdornment position="start">
                                    <GridViewIcon
                                        fontSize="small"
                                        sx={{ color: 'primary.main' }}
                                    />
                                </InputAdornment>
                            }
                        >
                            {schemas.map((schema) => (
                                <MenuItem key={schema} value={schema}>
                                    {schema}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            {/* Search Tables */}
            <Box sx={{ p: 1.5 }}>
                <TextField
                    size="small"
                    placeholder="Search tables..."
                    value={tableSearch}
                    onChange={(e) => onTableSearchChange(e.target.value)}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ opacity: 0.5 }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'background.paper',
                        },
                    }}
                />
            </Box>

            {/* Tables List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {tablesLoading ? (
                    <LinearProgress />
                ) : filteredTables.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No tables found
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {/* Tables Section */}
                        {tables.length > 0 && (
                            <>
                                <Box
                                    onClick={onToggleTablesExpanded}
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        fontWeight={600}
                                        textTransform="uppercase"
                                        color="text.secondary"
                                        sx={{ flex: 1 }}
                                    >
                                        Tables ({tables.length})
                                    </Typography>
                                    {tablesExpanded ? (
                                        <ExpandLessIcon fontSize="small" />
                                    ) : (
                                        <ExpandMoreIcon fontSize="small" />
                                    )}
                                </Box>
                                <Collapse in={tablesExpanded}>
                                    {tables.map((table) => (
                                        <TableListItem
                                            key={table.name}
                                            table={table}
                                            selected={selectedTable?.name === table.name}
                                            onClick={() => onTableSelect(table)}
                                        />
                                    ))}
                                </Collapse>
                            </>
                        )}

                        {/* Views Section */}
                        {views.length > 0 && (
                            <>
                                <Box
                                    onClick={onToggleViewsExpanded}
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        fontWeight={600}
                                        textTransform="uppercase"
                                        color="text.secondary"
                                        sx={{ flex: 1 }}
                                    >
                                        Views ({views.length})
                                    </Typography>
                                    {viewsExpanded ? (
                                        <ExpandLessIcon fontSize="small" />
                                    ) : (
                                        <ExpandMoreIcon fontSize="small" />
                                    )}
                                </Box>
                                <Collapse in={viewsExpanded}>
                                    {views.map((view) => (
                                        <TableListItem
                                            key={view.name}
                                            table={view}
                                            selected={selectedTable?.name === view.name}
                                            onClick={() => onTableSelect(view)}
                                        />
                                    ))}
                                </Collapse>
                            </>
                        )}
                    </>
                )}
            </Box>

            {/* Stats */}
            {selectedConnectionId && filteredTables.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        borderTop: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        {tables.length} tables, {views.length} views
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
