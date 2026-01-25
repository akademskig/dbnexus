import { useState } from 'react';
import {
    Box,
    Button,
    IconButton,
    CircularProgress,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import { Editor } from '@monaco-editor/react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TerminalIcon from '@mui/icons-material/Terminal';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { StyledTooltip } from '../../components/StyledTooltip';
import { useThemeModeStore } from '../../stores/themeModeStore';
import { useToastStore } from '../../stores/toastStore';
import type { QueryResult } from '@dbnexus/shared';

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
    result?: QueryResult | null;
    error?: string | null;
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
    result,
    error,
}: SqlEditorProps) {
    const { mode } = useThemeModeStore();
    const toast = useToastStore();
    const [outputPanelOpen, setOutputPanelOpen] = useState(false);
    const theme = useTheme();
    const handleCopy = () => {
        navigator.clipboard.writeText(sql);
        toast.success('SQL copied to clipboard');
    };

    // Auto-open output panel when there's a result or error
    const hasOutput = result !== null || error !== null;
    const shouldShowOutput = outputPanelOpen && hasOutput;

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

                {/* Output Panel Toggle */}
                {hasOutput && (
                    <StyledTooltip
                        title={
                            outputPanelOpen
                                ? 'Hide Output'
                                : error
                                  ? 'Show Error Output'
                                  : 'Show Query Output'
                        }
                    >
                        <IconButton
                            size="small"
                            onClick={() => setOutputPanelOpen(!outputPanelOpen)}
                            sx={{
                                bgcolor: outputPanelOpen
                                    ? alpha(theme.palette.primary.main, 0.2)
                                    : 'transparent',
                                color: outputPanelOpen
                                    ? 'text.primary'
                                    : error
                                      ? 'error.main'
                                      : 'success.main',
                                '&:hover': {
                                    bgcolor: outputPanelOpen
                                        ? 'rgba(25, 118, 210, 0.2)'
                                        : 'action.hover',
                                },
                            }}
                        >
                            <TerminalIcon fontSize="small" />
                        </IconButton>
                    </StyledTooltip>
                )}

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

            {/* Editor with optional output panel */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {shouldShowOutput ? (
                    <Group orientation="vertical">
                        {/* Editor Panel */}
                        <Panel
                            defaultSize={60}
                            minSize={30}
                            style={{ display: 'flex', flexDirection: 'column' }}
                        >
                            <Box sx={{ height: '100%', overflow: 'hidden' }} onKeyDown={onKeyDown}>
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
                        </Panel>

                        <Separator
                            style={{
                                height: '2px',
                                background: theme.palette.divider,
                                cursor: 'col-resize',
                                position: 'relative',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                (e.target as HTMLDivElement).style.background =
                                    theme.palette.primary.main;
                            }}
                            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                (e.target as HTMLDivElement).style.background =
                                    theme.palette.divider;
                            }}
                            onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                                (e.target as HTMLDivElement).style.cursor = 'col-resize';
                            }}
                            onMouseUp={(e: React.MouseEvent<HTMLDivElement>) => {
                                (e.target as HTMLDivElement).style.cursor = 'col-resize';
                            }}
                        />

                        {/* Output Panel */}
                        <Panel
                            defaultSize={40}
                            minSize={20}
                            style={{ display: 'flex', flexDirection: 'column' }}
                        >
                            <Box
                                sx={{
                                    height: '100%',
                                    overflow: 'auto',
                                    bgcolor: 'background.paper',
                                    p: 2,
                                }}
                            >
                                {error ? (
                                    <Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 1,
                                                color: 'error.main',
                                            }}
                                        >
                                            <ErrorIcon fontSize="small" />
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                Query Error
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="body2"
                                            component="pre"
                                            sx={{
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                p: 1.5,
                                                borderRadius: 1,
                                                border: 1,
                                                borderColor: 'error.main',
                                            }}
                                        >
                                            {error}
                                        </Typography>
                                    </Box>
                                ) : result ? (
                                    <Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 1,
                                                color: 'success.main',
                                            }}
                                        >
                                            <CheckCircleIcon fontSize="small" />
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                Query Successful
                                            </Typography>
                                        </Box>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 2,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                <strong>Rows:</strong> {result.rowCount}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                <strong>Execution Time:</strong>{' '}
                                                {result.executionTimeMs}ms
                                            </Typography>
                                            {result.columns.length > 0 && (
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Columns:</strong>{' '}
                                                    {result.columns.length}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                ) : null}
                            </Box>
                        </Panel>
                    </Group>
                ) : (
                    <Box sx={{ height: '100%', overflow: 'hidden' }} onKeyDown={onKeyDown}>
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
                )}
            </Box>
        </Box>
    );
}
