import { Box, Button, IconButton } from '@mui/material';
import { Editor } from '@monaco-editor/react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { StyledTooltip } from '../../components/StyledTooltip';
import { useThemeModeStore } from '../../stores/themeModeStore';

interface SqlEditorProps {
    sql: string;
    onSqlChange: (sql: string) => void;
    onExecute: () => void;
    onSave: () => void;
    onExplain: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    loading?: boolean;
}

export function SqlEditor({
    sql,
    onSqlChange,
    onExecute,
    onSave,
    onExplain,
    onKeyDown,
    loading,
}: SqlEditorProps) {
    const { mode } = useThemeModeStore();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            {/* Toolbar */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    p: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <StyledTooltip title="Run Query (⌘+Enter)">
                    <span>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            onClick={onExecute}
                            disabled={!sql.trim() || loading}
                        >
                            Run
                        </Button>
                    </span>
                </StyledTooltip>

                <StyledTooltip title="Save Query">
                    <span>
                        <IconButton size="small" onClick={onSave} disabled={!sql.trim()}>
                            <SaveIcon fontSize="small" />
                        </IconButton>
                    </span>
                </StyledTooltip>

                <StyledTooltip title="Explain Query">
                    <span>
                        <IconButton size="small" onClick={onExplain} disabled={!sql.trim()}>
                            <AccountTreeIcon fontSize="small" />
                        </IconButton>
                    </span>
                </StyledTooltip>
            </Box>

            {/* Editor */}
            <Box sx={{ flex: 1, overflow: 'hidden' }} onKeyDown={onKeyDown}>
                <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={sql}
                    onChange={(value) => onSqlChange(value || '')}
                    theme={mode === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        roundedSelection: true,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                    }}
                />
            </Box>
        </Box>
    );
}
