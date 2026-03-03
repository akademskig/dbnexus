import { useState } from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    Typography,
    Collapse,
    LinearProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StarIcon from '@mui/icons-material/Star';
import { TableListItem } from './TableListItem';
import { SIDEBAR_WIDTH } from './utils';
import { useFavoriteTablesStore } from '../../stores/favoriteTablesStore';
import type { TableInfo } from '@dbnexus/shared';

interface QueryPageSidebarProps {
    readonly selectedConnectionId: string | null;
    readonly selectedSchema: string;
    readonly tableSearch: string;
    readonly onTableSearchChange: (search: string) => void;
    readonly filteredTables: TableInfo[];
    readonly selectedTable: TableInfo | null;
    readonly onTableSelect: (table: TableInfo) => void;
    readonly tablesLoading: boolean;
    readonly tablesExpanded: boolean;
    readonly onToggleTablesExpanded: () => void;
    readonly viewsExpanded: boolean;
    readonly onToggleViewsExpanded: () => void;
}

export function QueryPageSidebar({
    selectedConnectionId,
    selectedSchema,
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
    const { isFavorite, toggleFavorite } = useFavoriteTablesStore();
    const [favoritesExpanded, setFavoritesExpanded] = useState(true);

    const tables = filteredTables.filter((t) => t.type === 'table');
    const views = filteredTables.filter((t) => t.type === 'view');

    const favoriteTables = filteredTables.filter(
        (t) => selectedConnectionId && isFavorite(selectedConnectionId, t.schema || selectedSchema, t.name)
    );
    const nonFavoriteTables = tables.filter(
        (t) => !selectedConnectionId || !isFavorite(selectedConnectionId, t.schema || selectedSchema, t.name)
    );

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
                        {/* Favorites Section */}
                        {favoriteTables.length > 0 && (
                            <>
                                <Box
                                    onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <StarIcon sx={{ fontSize: 14, color: 'warning.main', mr: 0.75 }} />
                                    <Typography
                                        variant="caption"
                                        fontWeight={600}
                                        textTransform="uppercase"
                                        color="text.secondary"
                                        sx={{ flex: 1 }}
                                    >
                                        Favorites ({favoriteTables.length})
                                    </Typography>
                                    {favoritesExpanded ? (
                                        <ExpandLessIcon fontSize="small" />
                                    ) : (
                                        <ExpandMoreIcon fontSize="small" />
                                    )}
                                </Box>
                                <Collapse in={favoritesExpanded}>
                                    {favoriteTables.map((table) => (
                                        <TableListItem
                                            key={`fav-${table.name}`}
                                            table={table}
                                            selected={selectedTable?.name === table.name}
                                            onClick={() => onTableSelect(table)}
                                            isFavorite={true}
                                            onToggleFavorite={() =>
                                                selectedConnectionId &&
                                                toggleFavorite(
                                                    selectedConnectionId,
                                                    table.schema || selectedSchema,
                                                    table.name
                                                )
                                            }
                                        />
                                    ))}
                                </Collapse>
                            </>
                        )}

                        {/* Tables Section */}
                        {nonFavoriteTables.length > 0 && (
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
                                        Tables ({nonFavoriteTables.length})
                                    </Typography>
                                    {tablesExpanded ? (
                                        <ExpandLessIcon fontSize="small" />
                                    ) : (
                                        <ExpandMoreIcon fontSize="small" />
                                    )}
                                </Box>
                                <Collapse in={tablesExpanded}>
                                    {nonFavoriteTables.map((table) => (
                                        <TableListItem
                                            key={table.name}
                                            table={table}
                                            selected={selectedTable?.name === table.name}
                                            onClick={() => onTableSelect(table)}
                                            isFavorite={false}
                                            onToggleFavorite={() =>
                                                selectedConnectionId &&
                                                toggleFavorite(
                                                    selectedConnectionId,
                                                    table.schema || selectedSchema,
                                                    table.name
                                                )
                                            }
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
