import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    InputAdornment,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import { StyledTooltip } from '../../components/StyledTooltip';
import Editor from '@monaco-editor/react';
import type { TableSchema } from '@dbnexus/shared';

interface EditRowDialogProps {
    open: boolean;
    row: Record<string, unknown> | null;
    schema?: TableSchema;
    onClose: () => void;
    onSave: (originalRow: Record<string, unknown>, updatedRow: Record<string, unknown>) => void;
}

export function EditRowDialog({ open, row, schema, onClose, onSave }: EditRowDialogProps) {
    const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});
    const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
    const [jsonDialogField, setJsonDialogField] = useState<string | null>(null);
    const [jsonDialogValue, setJsonDialogValue] = useState<string>('');

    useEffect(() => {
        if (row) {
            setEditedValues(row);
        }
    }, [row]);

    const handleOpenJsonDialog = (field: string, value: unknown) => {
        setJsonDialogField(field);
        setJsonDialogValue(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
        setJsonDialogOpen(true);
    };

    const handleSaveJsonDialog = () => {
        if (jsonDialogField) {
            setEditedValues({
                ...editedValues,
                [jsonDialogField]: jsonDialogValue,
            });
        }
        setJsonDialogOpen(false);
        setJsonDialogField(null);
    };

    const handleSave = () => {
        if (!row) return;

        // Only send changed fields
        const changedValues: Record<string, unknown> = {};
        Object.keys(editedValues).forEach((key) => {
            if (editedValues[key] !== row[key]) {
                changedValues[key] = editedValues[key];
            }
        });

        if (Object.keys(changedValues).length > 0) {
            const newRow = { ...row, ...changedValues };
            onSave(row, newRow);
        }

        onClose();
    };

    // Check if a column type is JSON-like
    const isJsonColumn = (dataType: string): boolean => {
        const jsonTypes = ['json', 'jsonb', 'text'];
        return jsonTypes.some((type) => dataType.toLowerCase().includes(type));
    };

    if (!row) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: '70vh',
                    height: '70vh',
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Fixed Header */}
                <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                    <DialogTitle sx={{ p: 0, mb: 0.5 }}>Edit Row</DialogTitle>
                    <Typography variant="body2" color="text.secondary">
                        Make changes to the row and click Save to update
                    </Typography>
                </Box>

                {/* Scrollable Content */}
                <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {Object.keys(row).map((key) => {
                            const value = editedValues[key];
                            const column = schema?.columns.find((c) => c.name === key);
                            const isJson = column ? isJsonColumn(column.dataType) : false;

                            return (
                                <Box key={key}>
                                    {isJson ? (
                                        <TextField
                                            fullWidth
                                            label={key}
                                            value={
                                                typeof value === 'string'
                                                    ? value
                                                    : JSON.stringify(value)
                                            }
                                            onChange={(e) =>
                                                setEditedValues({
                                                    ...editedValues,
                                                    [key]: e.target.value,
                                                })
                                            }
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <StyledTooltip title="Open JSON editor">
                                                            <IconButton
                                                                color="primary"
                                                                size="small"
                                                                onClick={() =>
                                                                    handleOpenJsonDialog(key, value)
                                                                }
                                                                edge="end"
                                                            >
                                                                <CodeIcon fontSize="small" />
                                                            </IconButton>
                                                        </StyledTooltip>
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiInputBase-root': {
                                                    pr: 1,
                                                },
                                                '& .MuiInputBase-input': {
                                                    fontFamily: 'monospace',
                                                    fontSize: 12,
                                                },
                                            }}
                                        />
                                    ) : (
                                        <TextField
                                            fullWidth
                                            label={key}
                                            value={value ?? ''}
                                            onChange={(e) =>
                                                setEditedValues({
                                                    ...editedValues,
                                                    [key]: e.target.value,
                                                })
                                            }
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    fontFamily: 'monospace',
                                                    fontSize: 12,
                                                },
                                            }}
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                </DialogContent>

                {/* Fixed Footer */}
                <DialogActions
                    sx={{
                        p: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                        flexShrink: 0,
                    }}
                >
                    <Button onClick={onClose} variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Box>

            {/* JSON Editor Dialog */}
            <Dialog
                open={jsonDialogOpen}
                onClose={() => setJsonDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        height: '80vh',
                    },
                }}
            >
                <DialogTitle>Edit JSON: {jsonDialogField}</DialogTitle>
                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={jsonDialogValue}
                            onChange={(value) => setJsonDialogValue(value || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                wordWrap: 'on',
                                wrappingIndent: 'indent',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                formatOnPaste: true,
                                formatOnType: true,
                            }}
                            theme="vs-dark"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setJsonDialogOpen(false)} variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleSaveJsonDialog} variant="contained" color="primary">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}
