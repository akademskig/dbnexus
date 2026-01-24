import { Box, Typography, Chip, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { StyledTooltip } from '../../components/StyledTooltip';
import { ConnectionSelector } from '../../components/ConnectionSelector';
import { QueryTemplateIcon } from '../../components/icons/QueryTemplateIcon';

interface Connection {
    id: string;
    engine: string;
    host?: string;
    database: string;
}

interface QueryPageToolbarProps {
    selectedConnectionId: string;
    selectedConnection: Connection | undefined;
    templatesOpen: boolean;
    savedQueriesOpen: boolean;
    historyOpen: boolean;
    onConnectionChange: (connectionId: string) => void;
    onTemplatesToggle: () => void;
    onSavedQueriesToggle: () => void;
    onHistoryToggle: () => void;
    onRefresh: () => void;
}

export function QueryPageToolbar({
    selectedConnectionId,
    selectedConnection,
    templatesOpen,
    savedQueriesOpen,
    historyOpen,
    onConnectionChange,
    onTemplatesToggle,
    onSavedQueriesToggle,
    onHistoryToggle,
    onRefresh,
}: QueryPageToolbarProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <ConnectionSelector
                value={selectedConnectionId}
                onChange={onConnectionChange}
                disableOffline={true}
            />

            {selectedConnection && (
                <>
                    <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                        {selectedConnection.engine === 'sqlite'
                            ? selectedConnection.database.split('/').pop()
                            : `${selectedConnection.host}/${selectedConnection.database}`}
                    </Typography>
                    <Chip
                        label={selectedConnection.engine.toUpperCase()}
                        size="small"
                        sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: 'primary.dark',
                            color: 'primary.contrastText',
                        }}
                    />
                </>
            )}

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

            <StyledTooltip title="Refresh">
                <IconButton size="small" onClick={onRefresh}>
                    <RefreshIcon fontSize="small" />
                </IconButton>
            </StyledTooltip>
        </Box>
    );
}
