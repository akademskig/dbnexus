import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import {
    Box,
    Typography,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { connectionsApi, queriesApi } from '../lib/api';
import type { QueryResult } from '@dbnexus/shared';

export function QueryPage() {
    const { connectionId } = useParams();
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>(connectionId ?? '');
    const [sql, setSql] = useState('SELECT * FROM ');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmDangerous, setConfirmDangerous] = useState<{
        message: string;
        type: string;
    } | null>(null);

    const { data: connections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const selectedConnection = connections.find((c) => c.id === selectedConnectionId);

    const executeMutation = useMutation({
        mutationFn: async ({ confirmed }: { confirmed?: boolean } = {}) => {
            if (!selectedConnectionId) throw new Error('No connection selected');
            return queriesApi.execute(selectedConnectionId, sql, confirmed);
        },
        onSuccess: (data) => {
            setResult(data);
            setError(null);
            setConfirmDangerous(null);
        },
        onError: (err: Error) => {
            try {
                const parsed = JSON.parse(err.message);
                if (parsed.requiresConfirmation) {
                    setConfirmDangerous({
                        message: parsed.message,
                        type: parsed.dangerousType,
                    });
                    return;
                }
            } catch {
                // Not a JSON error
            }
            setError(err.message);
            setResult(null);
            setConfirmDangerous(null);
        },
    });

    const handleExecute = useCallback(() => {
        setConfirmDangerous(null);
        executeMutation.mutate({});
    }, [executeMutation]);

    const handleConfirmDangerous = () => {
        executeMutation.mutate({ confirmed: true });
    };

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleExecute();
            }
        },
        [handleExecute]
    );

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                {/* Connection selector */}
                <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel>Connection</InputLabel>
                    <Select
                        value={selectedConnectionId}
                        onChange={(e) => setSelectedConnectionId(e.target.value)}
                        label="Connection"
                    >
                        {connections.map((conn) => (
                            <MenuItem key={conn.id} value={conn.id}>
                                {conn.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {selectedConnection && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: 'text.secondary',
                        }}
                    >
                        <StorageIcon fontSize="small" />
                        <Typography variant="body2" fontFamily="monospace">
                            {selectedConnection.host}:{selectedConnection.port}/
                            {selectedConnection.database}
                        </Typography>
                        {selectedConnection.readOnly && (
                            <Chip
                                label="read-only"
                                size="small"
                                color="warning"
                                variant="outlined"
                            />
                        )}
                    </Box>
                )}

                <Box sx={{ flex: 1 }} />

                {/* Execute button */}
                <Tooltip title="⌘ + Enter">
                    <span>
                        <Button
                            variant="contained"
                            startIcon={
                                executeMutation.isPending ? (
                                    <CircularProgress size={18} color="inherit" />
                                ) : (
                                    <PlayArrowIcon />
                                )
                            }
                            onClick={handleExecute}
                            disabled={
                                !selectedConnectionId || !sql.trim() || executeMutation.isPending
                            }
                        >
                            {executeMutation.isPending ? 'Running...' : 'Run'}
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            {/* Editor and Results */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* SQL Editor */}
                <Box
                    sx={{ height: 300, borderBottom: 1, borderColor: 'divider' }}
                    onKeyDown={handleKeyDown}
                >
                    <Editor
                        height="100%"
                        defaultLanguage="sql"
                        value={sql}
                        onChange={(value) => setSql(value ?? '')}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            fontFamily: 'JetBrains Mono, Fira Code, monospace',
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            wordWrap: 'on',
                            padding: { top: 16, bottom: 16 },
                        }}
                    />
                </Box>

                {/* Dangerous query confirmation */}
                {confirmDangerous && (
                    <Alert
                        severity="warning"
                        icon={<WarningIcon />}
                        sx={{ borderRadius: 0 }}
                        action={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => setConfirmDangerous(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    color="error"
                                    size="small"
                                    variant="contained"
                                    onClick={handleConfirmDangerous}
                                >
                                    Execute Anyway
                                </Button>
                            </Box>
                        }
                    >
                        <Typography variant="subtitle2">Dangerous Query Detected</Typography>
                        <Typography variant="body2">{confirmDangerous.message}</Typography>
                    </Alert>
                )}

                {/* Results */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {error && (
                        <Box sx={{ p: 2 }}>
                            <Alert severity="error" icon={<ErrorIcon />}>
                                <Typography variant="subtitle2">Query Error</Typography>
                                <Typography variant="body2" fontFamily="monospace" sx={{ mt: 0.5 }}>
                                    {error}
                                </Typography>
                            </Alert>
                        </Box>
                    )}

                    {result && (
                        <Box>
                            {/* Result stats */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    px: 2,
                                    py: 1.5,
                                    bgcolor: 'background.paper',
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        color: 'success.main',
                                    }}
                                >
                                    <CheckCircleIcon fontSize="small" />
                                    <Typography variant="body2">{result.rowCount} rows</Typography>
                                </Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        color: 'text.secondary',
                                    }}
                                >
                                    <AccessTimeIcon fontSize="small" />
                                    <Typography variant="body2">
                                        {result.executionTimeMs}ms
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Results table */}
                            {result.rows.length > 0 ? (
                                <TableContainer>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                {result.columns.map((col, i) => (
                                                    <TableCell key={i}>
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight={600}
                                                        >
                                                            {col.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            {col.dataType}
                                                        </Typography>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {result.rows.map((row, rowIndex) => (
                                                <TableRow key={rowIndex} hover>
                                                    {result.columns.map((col, colIndex) => (
                                                        <TableCell key={colIndex}>
                                                            <CellValue value={row[col.name]} />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                    Query executed successfully. No rows returned.
                                </Box>
                            )}
                        </Box>
                    )}

                    {!result && !error && !confirmDangerous && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'text.secondary',
                            }}
                        >
                            <Box sx={{ textAlign: 'center' }}>
                                <StorageIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                                <Typography variant="body1">
                                    Select a connection and write a query to get started
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    Press{' '}
                                    <Box
                                        component="span"
                                        sx={{
                                            px: 0.75,
                                            py: 0.25,
                                            bgcolor: 'action.hover',
                                            borderRadius: 0.5,
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        ⌘
                                    </Box>{' '}
                                    +{' '}
                                    <Box
                                        component="span"
                                        sx={{
                                            px: 0.75,
                                            py: 0.25,
                                            bgcolor: 'action.hover',
                                            borderRadius: 0.5,
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        Enter
                                    </Box>{' '}
                                    to execute
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

function CellValue({ value }: { value: unknown }) {
    if (value === null) {
        return (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
                NULL
            </Typography>
        );
    }

    if (typeof value === 'boolean') {
        return (
            <Typography
                variant="body2"
                color={value ? 'success.main' : 'error.main'}
                fontFamily="monospace"
            >
                {String(value)}
            </Typography>
        );
    }

    if (typeof value === 'object') {
        const json = JSON.stringify(value);
        return (
            <Typography
                variant="body2"
                color="warning.main"
                fontFamily="monospace"
                sx={{ maxWidth: 300 }}
                noWrap
            >
                {json.length > 100 ? json.slice(0, 100) + '...' : json}
            </Typography>
        );
    }

    return (
        <Typography variant="body2" fontFamily="monospace">
            {String(value)}
        </Typography>
    );
}
