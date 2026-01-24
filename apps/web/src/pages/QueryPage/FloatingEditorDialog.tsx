import { useState, useRef, useEffect } from 'react';
import { Paper, Box, IconButton, Button, Typography, Tooltip } from '@mui/material';
import {
    Close as CloseIcon,
    PlayArrow as PlayArrowIcon,
    Save as SaveIcon,
    ContentCopy as CopyIcon,
    AccountTree as ExplainIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
    DragIndicator as DragIcon,
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import Draggable from 'react-draggable';
import { useThemeModeStore } from '../../stores/themeModeStore';
import { StyledTooltip } from '../../components/StyledTooltip';

interface FloatingEditorDialogProps {
    open: boolean;
    onClose: () => void;
    sql: string;
    onSqlChange: (sql: string) => void;
    onExecute: () => void;
    onSave: () => void;
    onExplain: () => void;
    loading?: boolean;
}

export function FloatingEditorDialog({
    open,
    onClose,
    sql,
    onSqlChange,
    onExecute,
    onSave,
    onExplain,
    loading = false,
}: FloatingEditorDialogProps) {
    const { mode } = useThemeModeStore();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [size] = useState({ width: 800, height: 600 });
    const editorRef = useRef<unknown>(null);
    const nodeRef = useRef(null);

    // Handle Ctrl/Cmd+Enter to execute
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                onExecute();
            }
        };

        if (open) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [open, onExecute]);

    // Reset fullscreen when closing
    useEffect(() => {
        if (!open) {
            setIsFullscreen(false);
        }
    }, [open]);

    const handleEditorMount = (editor: unknown) => {
        editorRef.current = editor;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editor as any)?.focus?.();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(sql);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    if (!open) return null;

    const content = (
        <Paper
            ref={nodeRef}
            elevation={8}
            sx={{
                position: 'fixed',
                top: isFullscreen ? 0 : '10%',
                left: isFullscreen ? 0 : '50%',
                transform: isFullscreen ? 'none' : 'translateX(-50%)',
                width: isFullscreen ? '100vw' : size.width,
                height: isFullscreen ? '100vh' : size.height,
                minWidth: isFullscreen ? '100vw' : 400,
                minHeight: isFullscreen ? '100vh' : 300,
                maxWidth: isFullscreen ? '100vw' : '90vw',
                maxHeight: isFullscreen ? '100vh' : '85vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                zIndex: 1300,
                overflow: 'hidden',
                resize: isFullscreen ? 'none' : 'both',
            }}
        >
            {/* Title Bar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                    py: 1,
                    px: 2,
                    bgcolor: 'background.default',
                    cursor: isFullscreen ? 'default' : 'move',
                }}
                className="drag-handle"
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!isFullscreen && <DragIcon sx={{ color: 'text.secondary', fontSize: 20 }} />}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        SQL Editor
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Ctrl/Cmd+Enter to execute
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                        <IconButton size="small" onClick={toggleFullscreen}>
                            {isFullscreen ? (
                                <FullscreenExitIcon fontSize="small" />
                            ) : (
                                <FullscreenIcon fontSize="small" />
                            )}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Close">
                        <IconButton size="small" onClick={onClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Editor */}
            <Box sx={{ flex: 1, minHeight: 0 }}>
                <Editor
                    height="100%"
                    language="sql"
                    value={sql}
                    onChange={(value) => onSqlChange(value || '')}
                    onMount={handleEditorMount}
                    theme={mode === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                        minimap: { enabled: true },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                        padding: { top: 16, bottom: 16 },
                        lineNumbersMinChars: 3,
                        lineDecorationsWidth: 1,
                    }}
                />
            </Box>

            {/* Action Bar */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    p: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                }}
            >
                <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={onExecute}
                    disabled={loading || !sql.trim()}
                    sx={{ minWidth: 80 }}
                >
                    {loading ? 'Running...' : 'Run'}
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<ExplainIcon />}
                    onClick={onExplain}
                    disabled={loading || !sql.trim()}
                >
                    Explain
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={onSave}
                    disabled={!sql.trim()}
                >
                    Save
                </Button>

                <Box sx={{ flex: 1 }} />

                <StyledTooltip title="Copy SQL">
                    <IconButton size="small" onClick={handleCopy} disabled={!sql.trim()}>
                        <CopyIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
            </Box>
        </Paper>
    );

    // Wrap in Draggable only when not fullscreen
    if (isFullscreen) {
        return content;
    }

    return (
        <Draggable handle=".drag-handle" nodeRef={nodeRef}>
            {content}
        </Draggable>
    );
}
