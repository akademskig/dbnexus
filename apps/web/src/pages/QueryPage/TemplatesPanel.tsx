import { useState } from 'react';
import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemText,
    Chip,
    Collapse,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Search as SearchIcon,
    Code as CodeIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../components/GlassCard';
import {
    QUERY_TEMPLATES,
    getTemplateCategories,
    generateContextAwareSQL,
    type QueryTemplate,
} from './queryTemplates';
import type { TableInfo, TableSchema } from '@dbnexus/shared';

interface TemplatesPanelProps {
    onTemplateSelect: (sql: string) => void;
    selectedTable?: TableInfo | null;
    tableSchema?: TableSchema | null;
    engine?: string;
}

export function TemplatesPanel({
    onTemplateSelect,
    selectedTable,
    tableSchema,
    engine,
}: TemplatesPanelProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategory, setExpandedCategory] = useState<string | null>('select');

    const categories = getTemplateCategories();

    // Filter templates based on search
    const filteredTemplates = QUERY_TEMPLATES.filter((template) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            template.name.toLowerCase().includes(query) ||
            template.description.toLowerCase().includes(query) ||
            template.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
            template.sql.toLowerCase().includes(query)
        );
    });

    const handleCategoryToggle = (categoryId: string) => {
        setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    };

    const getCategoryColor = (category: QueryTemplate['category']) => {
        const colors: Record<QueryTemplate['category'], string> = {
            select: 'primary.main',
            join: 'secondary.main',
            aggregate: 'success.main',
            insert: 'warning.main',
            update: 'info.main',
            delete: 'error.main',
            ddl: 'purple',
            window: 'teal',
        };
        return colors[category];
    };

    return (
        <GlassCard
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CodeIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Query Templates
                    </Typography>
                </Box>

                {/* Search */}
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
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

            {/* Templates List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {categories.map((category) => {
                    const categoryTemplates = filteredTemplates.filter(
                        (t) => t.category === category.id
                    );

                    if (categoryTemplates.length === 0) return null;

                    const isExpanded = expandedCategory === category.id;

                    return (
                        <Box key={category.id}>
                            {/* Category Header */}
                            <ListItemButton
                                onClick={() => handleCategoryToggle(category.id)}
                                sx={{
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    bgcolor: isExpanded ? 'action.hover' : 'transparent',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        flex: 1,
                                    }}
                                >
                                    <Chip
                                        label={category.label}
                                        size="small"
                                        sx={{
                                            bgcolor: getCategoryColor(category.id),
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: 11,
                                        }}
                                    />
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {categoryTemplates.length}{' '}
                                        {categoryTemplates.length === 1 ? 'template' : 'templates'}
                                    </Typography>
                                </Box>
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </ListItemButton>

                            {/* Templates in Category */}
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <List disablePadding>
                                    {categoryTemplates.map((template) => {
                                        const contextAwareSQL = generateContextAwareSQL(
                                            template,
                                            selectedTable?.name,
                                            tableSchema || undefined,
                                            engine
                                        );

                                        return (
                                            <ListItemButton
                                                key={template.id}
                                                onClick={() => onTemplateSelect(contextAwareSQL)}
                                                sx={{
                                                    pl: 3,
                                                    borderBottom: 1,
                                                    borderColor: 'divider',
                                                    '&:hover': {
                                                        bgcolor: 'action.hover',
                                                    },
                                                }}
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 500,
                                                                color: 'text.primary',
                                                            }}
                                                        >
                                                            {template.name}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Box>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: 'text.secondary',
                                                                    display: 'block',
                                                                    mb: 0.5,
                                                                }}
                                                            >
                                                                {template.description}
                                                            </Typography>
                                                            {template.tags && (
                                                                <Box
                                                                    sx={{
                                                                        display: 'flex',
                                                                        gap: 0.5,
                                                                        flexWrap: 'wrap',
                                                                    }}
                                                                >
                                                                    {template.tags.map((tag) => (
                                                                        <Chip
                                                                            key={tag}
                                                                            label={tag}
                                                                            size="small"
                                                                            sx={{
                                                                                height: 18,
                                                                                fontSize: 10,
                                                                                bgcolor:
                                                                                    'action.selected',
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    }
                                                />
                                            </ListItemButton>
                                        );
                                    })}
                                </List>
                            </Collapse>
                        </Box>
                    );
                })}

                {/* No Results */}
                {filteredTemplates.length === 0 && (
                    <Box
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            color: 'text.secondary',
                        }}
                    >
                        <Typography variant="body2">No templates found</Typography>
                        <Typography variant="caption">Try a different search term</Typography>
                    </Box>
                )}
            </Box>
        </GlassCard>
    );
}
