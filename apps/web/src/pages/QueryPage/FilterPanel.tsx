import {
    Box,
    Button,
    TextField,
    Select,
    FormControl,
    MenuItem,
    IconButton,
    Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import type { GridFilterModel, GridFilterItem } from '@mui/x-data-grid';

interface FilterPanelProps {
    readonly open: boolean;
    readonly filterModel: GridFilterModel;
    readonly columns: Array<{ field: string; headerName?: string }>;
    readonly onFilterModelChange: (model: GridFilterModel) => void;
    readonly sx?: Record<string, unknown>;
}

export function FilterPanel({
    open,
    filterModel,
    columns,
    onFilterModelChange,
    sx,
}: FilterPanelProps) {
    const handleAddFilter = () => {
        const newFilter: GridFilterItem = {
            id: Date.now(),
            field: columns[0]?.field || '',
            operator: 'contains',
            value: '',
        };
        onFilterModelChange({
            items: [...filterModel.items, newFilter],
        });
    };

    const handleClearAll = () => {
        onFilterModelChange({ items: [] });
    };

    const handleUpdateFilter = (index: number, updates: Partial<GridFilterItem>) => {
        const newItems = [...filterModel.items];
        const currentFilter = newItems[index];
        if (currentFilter) {
            newItems[index] = { ...currentFilter, ...updates };
            onFilterModelChange({ items: newItems });
        }
    };

    const handleRemoveFilter = (index: number) => {
        const newItems = filterModel.items.filter((_, i) => i !== index);
        onFilterModelChange({ items: newItems });
    };

    return (
        <Collapse in={open}>
            <Box
                sx={{
                    p: 1.5,
                    bgcolor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider',
                    ...sx,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAddFilter}
                        disabled={columns.length === 0}
                    >
                        Add filter
                    </Button>
                    {filterModel.items.length > 0 && (
                        <Button size="small" onClick={handleClearAll} color="error">
                            Clear all
                        </Button>
                    )}
                </Box>

                {filterModel.items.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                        {filterModel.items.map((filter, index) => (
                            <Box
                                key={filter.id}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                                {/* Column selector */}
                                <FormControl size="small" sx={{ minWidth: 200 }}>
                                    <Select
                                        value={filter.field}
                                        onChange={(e) =>
                                            handleUpdateFilter(index, { field: e.target.value })
                                        }
                                    >
                                        {columns.map((col) => (
                                            <MenuItem key={col.field} value={col.field}>
                                                {col.headerName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* Operator selector */}
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <Select
                                        value={filter.operator}
                                        onChange={(e) =>
                                            handleUpdateFilter(index, { operator: e.target.value })
                                        }
                                    >
                                        <MenuItem value="contains">Contains</MenuItem>
                                        <MenuItem value="equals">Equals</MenuItem>
                                        <MenuItem value="startsWith">Starts with</MenuItem>
                                        <MenuItem value="endsWith">Ends with</MenuItem>
                                        <MenuItem value=">">Greater than</MenuItem>
                                        <MenuItem value=">=">Greater than or equal</MenuItem>
                                        <MenuItem value="<">Less than</MenuItem>
                                        <MenuItem value="<=">Less than or equal</MenuItem>
                                        <MenuItem value="isEmpty">Is empty</MenuItem>
                                        <MenuItem value="isNotEmpty">Is not empty</MenuItem>
                                    </Select>
                                </FormControl>

                                {/* Value input (hide for isEmpty/isNotEmpty) */}
                                {filter.operator !== 'isEmpty' &&
                                    filter.operator !== 'isNotEmpty' && (
                                        <TextField
                                            size="small"
                                            placeholder="Value"
                                            value={filter.value || ''}
                                            onChange={(e) =>
                                                handleUpdateFilter(index, {
                                                    value: e.target.value,
                                                })
                                            }
                                            sx={{ flex: 1 }}
                                        />
                                    )}

                                {/* Remove button */}
                                <IconButton
                                    size="small"
                                    onClick={() => handleRemoveFilter(index)}
                                    sx={{ ml: 'auto' }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Collapse>
    );
}
