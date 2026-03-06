import { useState, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    LinearProgress,
    Alert,
    IconButton,
    Chip,
    alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import TableChartIcon from '@mui/icons-material/TableChart';
import type { TableSchema } from '@dbnexus/shared';
import { importApi, type ImportPreviewResult } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';

interface ImportDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly connectionId: string;
    readonly schema: string;
    readonly tableName: string;
    readonly tableSchema?: TableSchema;
    readonly onSuccess?: () => void;
}

const STEPS = ['Upload File', 'Map Columns', 'Import'];

export function ImportDialog({
    open,
    onClose,
    connectionId,
    schema,
    tableName,
    tableSchema,
    onSuccess,
}: ImportDialogProps) {
    const toast = useToastStore();
    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [skipColumns, setSkipColumns] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{
        inserted: number;
        updated: number;
        errors: string[];
    } | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const targetColumns = useMemo(() => {
        if (!tableSchema) return [];
        return tableSchema.columns.map((c) => c.name);
    }, [tableSchema]);

    const handleFileSelect = useCallback(
        async (selectedFile: File) => {
            setFile(selectedFile);
            setError(null);
            setLoading(true);

            try {
                const result = await importApi.preview(selectedFile);
                setPreview(result);

                const autoMapping: Record<string, string> = {};
                for (const sourceCol of result.columns) {
                    const lowerSource = sourceCol.toLowerCase();
                    const match = targetColumns.find((tc) => tc.toLowerCase() === lowerSource);
                    if (match) {
                        autoMapping[sourceCol] = match;
                    }
                }
                setColumnMapping(autoMapping);
                setSkipColumns(new Set());
                setActiveStep(1);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to parse file');
            } finally {
                setLoading(false);
            }
        },
        [targetColumns]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) {
                handleFileSelect(droppedFile);
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const handleMappingChange = useCallback((sourceCol: string, targetCol: string) => {
        setColumnMapping((prev) => ({
            ...prev,
            [sourceCol]: targetCol,
        }));
    }, []);

    const handleSkipToggle = useCallback((sourceCol: string) => {
        setSkipColumns((prev) => {
            const next = new Set(prev);
            if (next.has(sourceCol)) {
                next.delete(sourceCol);
            } else {
                next.add(sourceCol);
            }
            return next;
        });
    }, []);

    const handleImport = useCallback(async () => {
        if (!preview) return;

        setLoading(true);
        setError(null);

        const effectiveMapping: Record<string, string> = {};
        for (const [source, target] of Object.entries(columnMapping)) {
            if (!skipColumns.has(source) && target) {
                effectiveMapping[source] = target;
            }
        }

        if (Object.keys(effectiveMapping).length === 0) {
            setError('At least one column must be mapped');
            setLoading(false);
            return;
        }

        try {
            const result = await importApi.execute({
                connectionId,
                schema,
                table: tableName,
                columnMapping: effectiveMapping,
                rows: preview.rows,
            });

            setImportResult(result);
            setActiveStep(2);

            if (result.errors.length === 0) {
                toast.success(`Successfully imported ${result.inserted} rows`);
            } else {
                toast.warning(
                    `Imported ${result.inserted} rows with ${result.errors.length} errors`
                );
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setLoading(false);
        }
    }, [preview, columnMapping, skipColumns, connectionId, schema, tableName, toast]);

    const handleClose = useCallback(() => {
        if (importResult && importResult.inserted > 0) {
            onSuccess?.();
        }
        setActiveStep(0);
        setFile(null);
        setPreview(null);
        setColumnMapping({});
        setSkipColumns(new Set());
        setError(null);
        setImportResult(null);
        onClose();
    }, [importResult, onSuccess, onClose]);

    const unmappedColumns = useMemo(() => {
        if (!preview) return [];
        return preview.columns.filter((col) => !skipColumns.has(col) && !columnMapping[col]);
    }, [preview, columnMapping, skipColumns]);

    const mappedCount = useMemo(() => {
        if (!preview) return 0;
        return preview.columns.filter((col) => !skipColumns.has(col) && columnMapping[col]).length;
    }, [preview, columnMapping, skipColumns]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CloudUploadIcon color="primary" />
                Import Data to {tableName}
                <Box sx={{ flex: 1 }} />
                <IconButton size="small" onClick={handleClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {activeStep === 0 && (
                    <Box
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        sx={{
                            border: 2,
                            borderStyle: 'dashed',
                            borderColor: dragOver ? 'primary.main' : 'divider',
                            borderRadius: 2,
                            p: 4,
                            textAlign: 'center',
                            bgcolor: dragOver
                                ? (theme) => alpha(theme.palette.primary.main, 0.05)
                                : 'background.default',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                        }}
                        onClick={() => document.getElementById('import-file-input')?.click()}
                    >
                        <input
                            id="import-file-input"
                            type="file"
                            accept=".csv,.json"
                            hidden
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileSelect(f);
                            }}
                        />
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Drop CSV or JSON file here
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            or click to browse
                        </Typography>
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Chip label="CSV" size="small" variant="outlined" />
                            <Chip label="JSON" size="small" variant="outlined" />
                        </Box>
                    </Box>
                )}

                {activeStep === 1 && preview && (
                    <Box>
                        <Box
                            sx={{
                                mb: 2,
                                p: 2,
                                bgcolor: 'background.default',
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <TableChartIcon color="primary" />
                            <Box>
                                <Typography variant="body2" fontWeight={600}>
                                    {file?.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {preview.totalRows} rows, {preview.columns.length} columns (
                                    {preview.format.toUpperCase()})
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }} />
                            <Chip
                                label={`${mappedCount} mapped`}
                                color={unmappedColumns.length === 0 ? 'success' : 'default'}
                                size="small"
                            />
                            {unmappedColumns.length > 0 && (
                                <Chip
                                    label={`${unmappedColumns.length} unmapped`}
                                    color="warning"
                                    size="small"
                                />
                            )}
                        </Box>

                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Column Mapping
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 2, display: 'block' }}
                        >
                            Map source columns to target table columns. Uncheck to skip a column.
                        </Typography>

                        <Box
                            sx={{
                                maxHeight: 300,
                                overflow: 'auto',
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            {preview.columns.map((sourceCol) => (
                                <Box
                                    key={sourceCol}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        p: 1.5,
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        '&:last-child': { borderBottom: 0 },
                                        bgcolor: skipColumns.has(sourceCol)
                                            ? 'action.disabledBackground'
                                            : 'transparent',
                                    }}
                                >
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={!skipColumns.has(sourceCol)}
                                                onChange={() => handleSkipToggle(sourceCol)}
                                                size="small"
                                            />
                                        }
                                        label=""
                                        sx={{ m: 0 }}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            width: 150,
                                            fontFamily: 'monospace',
                                            opacity: skipColumns.has(sourceCol) ? 0.5 : 1,
                                        }}
                                    >
                                        {sourceCol}
                                    </Typography>
                                    <Typography color="text.secondary">→</Typography>
                                    <FormControl
                                        size="small"
                                        sx={{ minWidth: 200 }}
                                        disabled={skipColumns.has(sourceCol)}
                                    >
                                        <InputLabel>Target Column</InputLabel>
                                        <Select
                                            value={columnMapping[sourceCol] || ''}
                                            onChange={(e) =>
                                                handleMappingChange(sourceCol, e.target.value)
                                            }
                                            label="Target Column"
                                        >
                                            <MenuItem value="">
                                                <em>Not mapped</em>
                                            </MenuItem>
                                            {targetColumns.map((tc) => (
                                                <MenuItem key={tc} value={tc}>
                                                    {tc}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    {!skipColumns.has(sourceCol) && columnMapping[sourceCol] && (
                                        <CheckCircleIcon fontSize="small" color="success" />
                                    )}
                                    {!skipColumns.has(sourceCol) && !columnMapping[sourceCol] && (
                                        <ErrorIcon fontSize="small" color="warning" />
                                    )}
                                </Box>
                            ))}
                        </Box>

                        {preview.rows.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Preview (first {Math.min(5, preview.rows.length)} rows)
                                </Typography>
                                <Box
                                    sx={{
                                        overflow: 'auto',
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        fontSize: 12,
                                    }}
                                >
                                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                        <thead>
                                            <tr>
                                                {preview.columns
                                                    .filter((c) => !skipColumns.has(c))
                                                    .map((col) => (
                                                        <th
                                                            key={col}
                                                            style={{
                                                                padding: '8px',
                                                                borderBottom: '1px solid',
                                                                textAlign: 'left',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {col}
                                                        </th>
                                                    ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.rows.slice(0, 5).map((row, idx) => (
                                                <tr key={idx}>
                                                    {preview.columns
                                                        .filter((c) => !skipColumns.has(c))
                                                        .map((col) => (
                                                            <td
                                                                key={col}
                                                                style={{
                                                                    padding: '8px',
                                                                    borderBottom: '1px solid',
                                                                    maxWidth: 200,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                {String(row[col] ?? '')}
                                                            </td>
                                                        ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}

                {activeStep === 2 && importResult && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        {importResult.errors.length === 0 ? (
                            <>
                                <CheckCircleIcon
                                    sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
                                />
                                <Typography variant="h6" gutterBottom>
                                    Import Successful
                                </Typography>
                                <Typography color="text.secondary">
                                    {importResult.inserted} rows inserted
                                </Typography>
                            </>
                        ) : (
                            <>
                                <ErrorIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
                                <Typography variant="h6" gutterBottom>
                                    Import Completed with Errors
                                </Typography>
                                <Typography color="text.secondary" gutterBottom>
                                    {importResult.inserted} rows inserted,{' '}
                                    {importResult.errors.length} errors
                                </Typography>
                                <Box
                                    sx={{
                                        mt: 2,
                                        maxHeight: 200,
                                        overflow: 'auto',
                                        textAlign: 'left',
                                        bgcolor: 'background.default',
                                        p: 2,
                                        borderRadius: 1,
                                    }}
                                >
                                    {importResult.errors.map((err, idx) => (
                                        <Typography
                                            key={idx}
                                            variant="body2"
                                            color="error"
                                            sx={{ fontFamily: 'monospace', mb: 0.5 }}
                                        >
                                            {err}
                                        </Typography>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Box>
                )}

                {loading && <LinearProgress sx={{ mt: 2 }} />}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                {activeStep === 0 && <Button onClick={handleClose}>Cancel</Button>}
                {activeStep === 1 && (
                    <>
                        <Button onClick={() => setActiveStep(0)}>Back</Button>
                        <Box sx={{ flex: 1 }} />
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleImport}
                            disabled={loading || mappedCount === 0}
                        >
                            Import {preview?.totalRows} Rows
                        </Button>
                    </>
                )}
                {activeStep === 2 && (
                    <Button variant="contained" onClick={handleClose}>
                        Done
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
