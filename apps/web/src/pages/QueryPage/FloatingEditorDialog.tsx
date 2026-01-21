import { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    IconButton,
    Button,
    Typography,
    Tooltip,
} from '@mui/material';
import {
    Close as CloseIcon,
    PlayArrow as PlayArrowIcon,
    Save as SaveIcon,
    ContentCopy as CopyIcon,
    AccountTree as ExplainIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { useThemeModeStore } from '../../stores/themeModeStore';

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
    const editorRef = useRef<any>(null);

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

    const handleEditorMount = (editor: any) => {
        editorRef.current = editor;
        editor.focus();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(sql);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={isFullscreen ? false : 'lg'}
            fullWidth={!isFullscreen}
            fullScreen={isFullscreen}
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    minHeight: isFullscreen ? '100vh' : '60vh',
                    maxHeight: isFullscreen ? '100vh' : '80vh',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                    py: 1.5,
                    px: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        SQL Editor
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
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
            </DialogTitle>

            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
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
                        sx={{ minWidth: 120 }}
                    >
                        {loading ? 'Executing...' : 'Execute'}
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

                    <Tooltip title="Copy SQL">
                        <IconButton size="small" onClick={handleCopy} disabled={!sql.trim()}>
                            <CopyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
