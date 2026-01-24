import { Box, Typography, Button, Chip } from '@mui/material';
import type { GridFilterModel } from '@mui/x-data-grid';

interface ActiveFiltersProps {
    readonly filterModel: GridFilterModel;
    readonly onFilterModelChange: (model: GridFilterModel) => void;
    readonly show: boolean;
    readonly sx?: Record<string, unknown>;
}

export function ActiveFilters({ filterModel, onFilterModelChange, show, sx }: ActiveFiltersProps) {
    if (!show || filterModel.items.length === 0) {
        return null;
    }

    const handleRemoveFilter = (index: number) => {
        const newItems = filterModel.items.filter((_, i) => i !== index);
        const newModel = { ...filterModel, items: newItems };
        onFilterModelChange(newModel);
    };

    const handleClearAll = () => {
        const newModel = { ...filterModel, items: [] };
        onFilterModelChange(newModel);
    };

    const getOperatorLabel = (operator: string | undefined): string => {
        switch (operator) {
            case 'contains':
                return 'contains';
            case 'equals':
                return '=';
            case 'startsWith':
                return 'starts with';
            case 'endsWith':
                return 'ends with';
            case 'isEmpty':
                return 'is empty';
            case 'isNotEmpty':
                return 'is not empty';
            case 'isAnyOf':
                return 'is any of';
            default:
                return operator || '';
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1.5,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
                flexWrap: 'wrap',
                ...sx,
            }}
        >
            <Typography variant="caption" color="text.secondary">
                Active filters:
            </Typography>
            {filterModel.items.map((filter, index) => {
                // Clean up field name by removing _index suffix
                const cleanFieldName = filter.field.replace(/_\d+$/, '');
                const operatorLabel = getOperatorLabel(filter.operator);
                const valueDisplay =
                    filter.value !== undefined && filter.value !== '' ? ` "${filter.value}"` : '';

                return (
                    <Chip
                        key={filter.id || index}
                        label={`${cleanFieldName} ${operatorLabel}${valueDisplay}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        onDelete={() => handleRemoveFilter(index)}
                    />
                );
            })}
            <Button size="small" onClick={handleClearAll} sx={{ ml: 'auto' }}>
                Clear all
            </Button>
        </Box>
    );
}
