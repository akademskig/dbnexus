import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Tooltip,
    IconButton,
    Alert,
    CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyIcon from '@mui/icons-material/Key';
import StorageIcon from '@mui/icons-material/Storage';
import SyncIcon from '@mui/icons-material/Sync';
import { schemaApi, syncApi } from '../../lib/api';
import { COMMON_TYPES, type ColumnDefinition } from './utils';
import type { ConnectionConfig } from '@dbnexus/shared';

// ============ Create Table Dialog ============

interface CreateTableDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSubmit: (tableName: string, columns: ColumnDefinition[]) => void;
    readonly engine: string;
}

export function CreateTableDialog({ open, onClose, onSubmit, engine }: CreateTableDialogProps) {
    const [tableName, setTableName] = useState('');
    const [columns, setColumns] = useState<ColumnDefinition[]>([
        {
            name: 'id',
            type: engine === 'sqlite' ? 'INTEGER' : 'SERIAL',
            nullable: false,
            primaryKey: true,
        },
    ]);

    const types =
        engine === 'sqlite'
            ? COMMON_TYPES.sqlite
            : engine === 'mysql' || engine === 'mariadb'
              ? COMMON_TYPES.mysql
              : COMMON_TYPES.postgres;

    const handleAddColumn = () => {
        setColumns([
            ...columns,
            { name: '', type: types[0] ?? 'TEXT', nullable: true, primaryKey: false },
        ]);
    };

    const handleRemoveColumn = (index: number) => {
        setColumns(columns.filter((_, i) => i !== index));
    };

    const handleColumnChange = (
        index: number,
        field: keyof ColumnDefinition,
        value: string | boolean
    ) => {
        const newColumns = [...columns];
        const currentCol = newColumns[index];
        if (currentCol) {
            newColumns[index] = { ...currentCol, [field]: value };
            // If setting primary key, unset others
            if (field === 'primaryKey' && value === true) {
                newColumns.forEach((col, i) => {
                    if (i !== index) col.primaryKey = false;
                });
            }
        }
        setColumns(newColumns);
    };

    const handleSubmit = () => {
        if (!tableName.trim() || columns.length === 0) return;
        onSubmit(
            tableName,
            columns.filter((c) => c.name.trim())
        );
        // Reset form
        setTableName('');
        setColumns([
            {
                name: 'id',
                type: engine === 'sqlite' ? 'INTEGER' : 'SERIAL',
                nullable: false,
                primaryKey: true,
            },
        ]);
    };

    const handleClose = () => {
        setTableName('');
        setColumns([
            {
                name: 'id',
                type: engine === 'sqlite' ? 'INTEGER' : 'SERIAL',
                nullable: false,
                primaryKey: true,
            },
        ]);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Create Table</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Table Name"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        fullWidth
                        size="small"
                        autoFocus
                    />

                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Columns
                    </Typography>

                    {columns.map((col, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                label="Name"
                                value={col.name}
                                onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                            />
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={col.type}
                                    onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                                    label="Type"
                                >
                                    {types.map((t) => (
                                        <MenuItem key={t} value={t}>
                                            {t}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Tooltip title="Primary Key">
                                <IconButton
                                    size="small"
                                    onClick={() =>
                                        handleColumnChange(index, 'primaryKey', !col.primaryKey)
                                    }
                                    color={col.primaryKey ? 'primary' : 'default'}
                                >
                                    <KeyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={col.nullable ? 'Nullable' : 'Not Null'}>
                                <Chip
                                    label={col.nullable ? 'NULL' : 'NOT NULL'}
                                    size="small"
                                    onClick={() =>
                                        handleColumnChange(index, 'nullable', !col.nullable)
                                    }
                                    color={col.nullable ? 'default' : 'warning'}
                                    sx={{ minWidth: 80 }}
                                />
                            </Tooltip>
                            <IconButton
                                size="small"
                                onClick={() => handleRemoveColumn(index)}
                                disabled={columns.length === 1}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}

                    <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddColumn}
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        Add Column
                    </Button>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!tableName.trim() || columns.filter((c) => c.name.trim()).length === 0}
                >
                    Create Table
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ============ Add Row Dialog ============

interface AddRowDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSubmit: (values: Record<string, string>) => void;
    readonly columns: Array<{
        name: string;
        dataType: string;
        nullable: boolean;
        defaultValue?: string | null;
    }>;
    readonly tableName: string;
}

export function AddRowDialog({ open, onClose, onSubmit, columns, tableName }: AddRowDialogProps) {
    const [values, setValues] = useState<Record<string, string>>({});

    const handleSubmit = () => {
        onSubmit(values);
        setValues({});
    };

    const handleClose = () => {
        setValues({});
        onClose();
    };

    // Filter out auto-generated columns (serial, identity, etc.)
    const editableColumns = columns.filter(
        (col) =>
            !col.dataType.toLowerCase().includes('serial') &&
            !col.dataType.toLowerCase().includes('identity')
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Row to {tableName}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {editableColumns.map((col) => (
                        <TextField
                            key={col.name}
                            label={
                                <Box
                                    component="span"
                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                >
                                    {col.name}
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ ml: 0.5 }}
                                    >
                                        ({col.dataType})
                                    </Typography>
                                    {!col.nullable && (
                                        <Typography component="span" color="error.main">
                                            *
                                        </Typography>
                                    )}
                                </Box>
                            }
                            value={values[col.name] || ''}
                            onChange={(e) => setValues({ ...values, [col.name]: e.target.value })}
                            size="small"
                            fullWidth
                            placeholder={col.defaultValue ? `Default: ${col.defaultValue}` : undefined}
                        />
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit}>
                    Add Row
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ============ Sync Row Dialog ============

interface SyncRowDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly rows: Record<string, unknown>[];
    readonly sourceConnectionId: string;
    readonly sourceConnection?: ConnectionConfig;
    readonly schema: string;
    readonly table: string;
    readonly primaryKeys: string[];
    readonly connections: ConnectionConfig[];
}

export function SyncRowDialog({
    open,
    onClose,
    rows,
    sourceConnectionId,
    sourceConnection,
    schema,
    table,
    primaryKeys,
    connections,
}: SyncRowDialogProps) {
    const [targetConnectionId, setTargetConnectionId] = useState('');
    const [targetSchema, setTargetSchema] = useState('');
    const [mode, setMode] = useState<'insert' | 'upsert'>('upsert');
    const [syncing, setSyncing] = useState(false);
    const [result, setResult] = useState<{
        inserted: number;
        updated: number;
        errors: string[];
    } | null>(null);

    // Only allow syncing within the same instance group
    const sourceGroupId = sourceConnection?.groupId;
    const targetConnections = connections.filter(
        (c) => c.id !== sourceConnectionId && c.groupId === sourceGroupId && sourceGroupId
    );

    const isInGroup = !!sourceGroupId;

    // Fetch schemas for target connection
    const { data: targetSchemas = [] } = useQuery({
        queryKey: ['schemas', targetConnectionId],
        queryFn: () => schemaApi.getSchemas(targetConnectionId),
        enabled: !!targetConnectionId,
    });

    // Auto-select schema when target changes
    useEffect(() => {
        if (targetSchemas.length > 0 && !targetSchema) {
            const targetConn = connections.find((c) => c.id === targetConnectionId);
            if (targetConn?.engine === 'mysql' || targetConn?.engine === 'mariadb') {
                if (targetConn.database && targetSchemas.includes(targetConn.database)) {
                    setTargetSchema(targetConn.database);
                    return;
                }
            }
            if (targetSchemas.includes(schema)) {
                setTargetSchema(schema);
            } else {
                setTargetSchema(targetSchemas[0] || '');
            }
        }
    }, [targetSchemas, targetSchema, schema, targetConnectionId, connections]);

    const handleClose = () => {
        setTargetConnectionId('');
        setTargetSchema('');
        setResult(null);
        onClose();
    };

    const handleSync = async () => {
        if (!targetConnectionId || !targetSchema || rows.length === 0) return;

        setSyncing(true);
        setResult(null);

        try {
            const rowIds = rows.map((row) => {
                const pkValues: Record<string, unknown> = {};
                for (const pk of primaryKeys) {
                    pkValues[pk] = row[pk];
                }
                return pkValues;
            });

            const syncResult = await syncApi.syncRows(
                sourceConnectionId,
                targetConnectionId,
                schema,
                targetSchema,
                table,
                rowIds,
                primaryKeys,
                mode
            );
            setResult(syncResult);
        } catch (error) {
            setResult({
                inserted: 0,
                updated: 0,
                errors: [error instanceof Error ? error.message : 'Sync failed'],
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Sync {rows.length} Row{rows.length > 1 ? 's' : ''} Within Instance Group
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {/* Source info */}
                    <Alert severity="info" icon={false}>
                        <Typography variant="body2">
                            <strong>Source:</strong> {sourceConnection?.name || 'Unknown'} →{' '}
                            {schema}.{table}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Primary keys:{' '}
                            {primaryKeys.length > 0 ? primaryKeys.join(', ') : '(none detected)'}
                        </Typography>
                        {sourceConnection?.groupName && (
                            <Typography variant="body2" color="text.secondary">
                                Instance Group: {sourceConnection.groupName}
                            </Typography>
                        )}
                        {rows.length > 0 && rows[0] && (
                            <Typography variant="body2" color="text.secondary">
                                Row IDs to sync:{' '}
                                {primaryKeys.length > 0
                                    ? rows
                                          .map((r) =>
                                              primaryKeys.map((pk) => `${pk}=${r[pk]}`).join(',')
                                          )
                                          .join(' | ')
                                    : `(row keys: ${Object.keys(rows[0] as object).join(', ')})`}
                            </Typography>
                        )}
                    </Alert>

                    {/* Warning if no primary keys */}
                    {primaryKeys.length === 0 && (
                        <Alert severity="error">
                            <Typography variant="body2">
                                No primary keys detected for this table.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Cannot sync rows without primary keys to identify them.
                            </Typography>
                        </Alert>
                    )}

                    {/* Warning if not in a group */}
                    {!isInGroup && (
                        <Alert severity="warning">
                            <Typography variant="body2">
                                This connection is not part of an Instance Group.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Row sync is only available between connections in the same Instance
                                Group. Add this connection to a group on the Connections page to
                                enable syncing.
                            </Typography>
                        </Alert>
                    )}

                    {/* No other connections in group */}
                    {isInGroup && targetConnections.length === 0 && (
                        <Alert severity="warning">
                            <Typography variant="body2">
                                No other connections in this Instance Group.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Add more connections to the same group to enable syncing between
                                them.
                            </Typography>
                        </Alert>
                    )}

                    {/* Target connection */}
                    {isInGroup && targetConnections.length > 0 && (
                        <FormControl fullWidth>
                            <InputLabel>Target Connection</InputLabel>
                            <Select
                                value={targetConnectionId}
                                onChange={(e) => {
                                    setTargetConnectionId(e.target.value);
                                    setTargetSchema('');
                                }}
                                label="Target Connection"
                            >
                                {targetConnections.map((conn) => (
                                    <MenuItem key={conn.id} value={conn.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <StorageIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                            {conn.name}
                                            <Chip
                                                label={conn.engine}
                                                size="small"
                                                sx={{ ml: 'auto' }}
                                            />
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Target schema */}
                    {targetConnectionId && (
                        <FormControl fullWidth>
                            <InputLabel>Target Schema/Database</InputLabel>
                            <Select
                                value={targetSchema}
                                onChange={(e) => setTargetSchema(e.target.value)}
                                label="Target Schema/Database"
                            >
                                {targetSchemas.map((s) => (
                                    <MenuItem key={s} value={s}>
                                        {s}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Sync mode */}
                    {targetConnectionId && (
                        <FormControl fullWidth>
                            <InputLabel>Sync Mode</InputLabel>
                            <Select
                                value={mode}
                                onChange={(e) => setMode(e.target.value as 'insert' | 'upsert')}
                                label="Sync Mode"
                            >
                                <MenuItem value="upsert">
                                    <Box>
                                        <Typography variant="body2">
                                            Upsert (Insert or Update)
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Insert new rows, update existing ones
                                        </Typography>
                                    </Box>
                                </MenuItem>
                                <MenuItem value="insert">
                                    <Box>
                                        <Typography variant="body2">Insert Only</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Only insert new rows, skip existing
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>
                    )}

                    {/* Result */}
                    {result && (
                        <Alert severity={result.errors.length > 0 ? 'warning' : 'success'}>
                            <Typography variant="body2">
                                {result.inserted > 0 && `Inserted: ${result.inserted} `}
                                {result.updated > 0 && `Updated: ${result.updated} `}
                                {result.inserted === 0 &&
                                    result.updated === 0 &&
                                    result.errors.length === 0 &&
                                    'No changes made'}
                            </Typography>
                            {result.errors.length > 0 && (
                                <Typography variant="body2" color="error">
                                    Errors: {result.errors.join(', ')}
                                </Typography>
                            )}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{result ? 'Close' : 'Cancel'}</Button>
                {!result && isInGroup && targetConnections.length > 0 && (
                    <Button
                        variant="contained"
                        onClick={handleSync}
                        disabled={
                            !targetConnectionId ||
                            !targetSchema ||
                            syncing ||
                            primaryKeys.length === 0
                        }
                        startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                    >
                        {syncing ? 'Syncing...' : 'Sync'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
