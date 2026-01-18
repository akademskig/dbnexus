import { useState } from 'react';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Alert,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import Editor from '@monaco-editor/react';
import CodeIcon from '@mui/icons-material/Code';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';

interface CellValueProps {
    readonly value: unknown;
    readonly onSaveJson?: (newValue: unknown) => void;
}

export function CellValue({ value, onSaveJson }: CellValueProps) {
    const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    if (value === null) {
        return (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
                NULL
            </Typography>
        );
    }

    if (typeof value === 'boolean') {
        return (
            <Chip
                label={String(value)}
                size="small"
                color={value ? 'success' : 'error'}
                sx={{ fontSize: 10 }}
            />
        );
    }

    // Check if value is JSON object/array or a JSON string
    const isJsonObject = typeof value === 'object';
    let parsedJson: unknown = null;
    let isJsonString = false;

    if (typeof value === 'string') {
        try {
            const trimmed = value.trim();
            if (
                (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))
            ) {
                parsedJson = JSON.parse(value);
                isJsonString = true;
            }
        } catch {
            // Not valid JSON
        }
    }

    if (isJsonObject || isJsonString) {
        const jsonValue = isJsonObject ? value : parsedJson;
        const jsonPreview = JSON.stringify(jsonValue);
        const formattedJson = JSON.stringify(jsonValue, null, 2);

        const handleOpen = (e: React.MouseEvent) => {
            e.stopPropagation();
            setJsonDialogOpen(true);
            setIsEditing(false);
            setEditValue(formattedJson);
            setJsonError(null);
        };

        const handleClose = () => {
            setJsonDialogOpen(false);
            setIsEditing(false);
            setJsonError(null);
        };

        const handleStartEdit = () => {
            setIsEditing(true);
            setEditValue(formattedJson);
        };

        const handleCancelEdit = () => {
            setIsEditing(false);
            setEditValue(formattedJson);
            setJsonError(null);
        };

        const handleSave = () => {
            try {
                const parsed = JSON.parse(editValue);
                if (onSaveJson) {
                    onSaveJson(parsed);
                }
                setJsonDialogOpen(false);
                setIsEditing(false);
            } catch (e) {
                setJsonError('Invalid JSON: ' + (e as Error).message);
            }
        };

        return (
            <>
                <Box
                    onClick={handleOpen}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                    }}
                >
                    <CodeIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                    <Typography
                        variant="body2"
                        color="warning.main"
                        fontFamily="monospace"
                        sx={{ maxWidth: 180 }}
                        noWrap
                    >
                        {jsonPreview.length > 40 ? jsonPreview.slice(0, 40) + '...' : jsonPreview}
                    </Typography>
                </Box>

                {/* JSON Viewer/Editor Dialog */}
                <Dialog
                    open={jsonDialogOpen}
                    onClose={handleClose}
                    maxWidth={false}
                    PaperProps={{
                        sx: {
                            width: '60vw',
                            maxWidth: '900px',
                            minWidth: '400px',
                            height: '70vh',
                            maxHeight: '800px',
                            minHeight: '300px',
                            resize: 'both',
                            overflow: 'auto',
                        },
                    }}
                >
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon color="warning" />
                        {isEditing ? 'Edit JSON' : 'JSON Viewer'}
                        <Box sx={{ flex: 1 }} />
                        {!isEditing && (
                            <>
                                {onSaveJson && (
                                    <StyledTooltip title="Edit">
                                        <IconButton
                                            size="small"
                                            onClick={handleStartEdit}
                                            sx={{ mr: 1 }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </StyledTooltip>
                                )}
                                <StyledTooltip title="Copy to clipboard">
                                    <IconButton
                                        size="small"
                                        onClick={() => navigator.clipboard.writeText(formattedJson)}
                                        sx={{ mr: 1 }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </StyledTooltip>
                            </>
                        )}
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent
                        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                    >
                        {jsonError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {jsonError}
                            </Alert>
                        )}
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                value={isEditing ? editValue : formattedJson}
                                onChange={(val) => setEditValue(val ?? '')}
                                theme="vs-dark"
                                options={{
                                    readOnly: !isEditing,
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 2,
                                    wordWrap: 'on',
                                }}
                            />
                        </Box>
                    </DialogContent>
                    {isEditing && (
                        <DialogActions sx={{ p: 2 }}>
                            <Button onClick={handleCancelEdit}>Cancel</Button>
                            <Button variant="contained" onClick={handleSave}>
                                Save
                            </Button>
                        </DialogActions>
                    )}
                </Dialog>
            </>
        );
    }

    const strValue = String(value);
    if (strValue.length > 100) {
        return (
            <StyledTooltip title={strValue}>
                <Typography
                    variant="body2"
                    fontFamily="monospace"
                    sx={{ maxWidth: 200, cursor: 'pointer' }}
                    noWrap
                >
                    {strValue.slice(0, 100)}...
                </Typography>
            </StyledTooltip>
        );
    }

    return (
        <Typography variant="body2" fontFamily="monospace">
            {strValue}
        </Typography>
    );
}
