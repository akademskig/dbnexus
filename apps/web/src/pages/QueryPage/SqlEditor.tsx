import { Box, Button, IconButton, CircularProgress } from '@mui/material';
import { Editor } from '@monaco-editor/react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { StyledTooltip } from '../../components/StyledTooltip';
import { useThemeModeStore } from '../../stores/themeModeStore';
import { useToastStore } from '../../stores/toastStore';

interface SqlEditorProps {
    sql: string;
    onSqlChange: (sql: string) => void;
    onExecute: () => void;
    onSave: () => void;
    onExplain: () => void;
    onPopOut: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    executeLoading?: boolean;
    explainLoading?: boolean;
}

export function SqlEditor({
    sql,
    onSqlChange,
    onExecute,
    onSave,
    onExplain,
    onPopOut,
    onKeyDown,
    executeLoading,
    explainLoading,
}: SqlEditorProps) {
    const { mode } = useThemeModeStore();
    const toast = useToastStore();

    const handleCopy = () => {
        navigator.clipboard.writeText(sql);
        toast.success('SQL copied to clipboard');
    };

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
                            sx={{ height: 28 }}
                            data-tour="run-query"
                            startIcon={
                                executeLoading ? (
                                    <CircularProgress size={16} color="inherit" />
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

                <StyledTooltip title="Explain Query">
                    <span>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={
                                explainLoading ? (
                                    <CircularProgress size={16} color="inherit" />
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

                <StyledTooltip title="Save Query">
                    <Button size="small" variant="outlined" onClick={onSave} disabled={!sql.trim()}>
                        <SaveIcon fontSize="small" />
                        Save
                    </Button>
                </StyledTooltip>

                <Box sx={{ flex: 1 }} />

                <StyledTooltip title="Copy SQL">
                    <span>
                        <IconButton size="small" onClick={handleCopy} disabled={!sql.trim()}>
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </span>
                </StyledTooltip>

                <StyledTooltip title="Pop Out Editor">
                    <IconButton size="small" onClick={onPopOut}>
                        <OpenInNewIcon fontSize="small" />
                    </IconButton>
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
                        wordWrap: 'on',
                        wrappingIndent: 'indent',
                        padding: { top: 12, bottom: 12 },
                        lineNumbersMinChars: 3,
                    }}
                />
            </Box>
        </Box>
    );
}
