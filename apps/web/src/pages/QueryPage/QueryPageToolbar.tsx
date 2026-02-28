import {
    Box,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    InputAdornment,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GridViewIcon from '@mui/icons-material/GridView';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { StyledTooltip } from '../../components/StyledTooltip';
import { QueryTemplateIcon } from '../../components/icons/QueryTemplateIcon';

interface QueryPageToolbarProps {
    selectedConnectionId: string;
    schemas: string[];
    selectedSchema: string;
    onSchemaChange: (schema: string) => void;
    templatesOpen: boolean;
    savedQueriesOpen: boolean;
    historyOpen: boolean;
    onTemplatesToggle: () => void;
    onSavedQueriesToggle: () => void;
    onHistoryToggle: () => void;
}

export function QueryPageToolbar({
    selectedConnectionId,
    schemas,
    selectedSchema,
    onSchemaChange,
    templatesOpen,
    savedQueriesOpen,
    historyOpen,
    onTemplatesToggle,
    onSavedQueriesToggle,
    onHistoryToggle,
}: QueryPageToolbarProps) {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            {/* Schema Selector */}
            {selectedConnectionId && schemas.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Schema</InputLabel>
                    <Select
                        value={selectedSchema}
                        onChange={(e) => onSchemaChange(e.target.value)}
                        label="Schema"
                        startAdornment={
                            <InputAdornment position="start">
                                <GridViewIcon fontSize="small" sx={{ color: 'primary.main' }} />
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
            )}

            <StyledTooltip title="Manage Database">
                <IconButton
                    size="small"
                    onClick={() => navigate(`/connections/${selectedConnectionId}?tab=overview`)}
                    disabled={!selectedConnectionId}
                >
                    <SettingsIcon fontSize="small" />
                </IconButton>
            </StyledTooltip>

            <StyledTooltip title="Schema Diagram">
                <IconButton
                    size="small"
                    onClick={() => navigate(`/schema-diagram?connectionId=${selectedConnectionId}`)}
                    disabled={!selectedConnectionId}
                >
                    <AccountTreeIcon fontSize="small" />
                </IconButton>
            </StyledTooltip>

            <Box sx={{ flex: 1 }} />

            <StyledTooltip title="Query Templates">
                <IconButton
                    size="small"
                    onClick={onTemplatesToggle}
                    color={templatesOpen ? 'primary' : 'default'}
                >
                    <QueryTemplateIcon fontSize="small" />
                </IconButton>
            </StyledTooltip>

            <StyledTooltip title="Saved Queries">
                <IconButton
                    size="small"
                    onClick={onSavedQueriesToggle}
                    color={savedQueriesOpen ? 'primary' : 'default'}
                >
                    <BookmarkIcon fontSize="small" />
                </IconButton>
            </StyledTooltip>

            <StyledTooltip title="Query History">
                <IconButton
                    size="small"
                    onClick={onHistoryToggle}
                    color={historyOpen ? 'primary' : 'default'}
                >
                    <HistoryIcon fontSize="small" />
                </IconButton>
            </StyledTooltip>
        </Box>
    );
}
