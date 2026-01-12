import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Collapse,
    IconButton,
    Tabs,
    Tab,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import {
    CompareArrows as CompareIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Edit as ModifyIcon,
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    TableChart as TableIcon,
    ViewColumn as ColumnIcon,
    Key as KeyIcon,
    Link as FkIcon,
    Storage as DatabaseIcon,
    PlayArrow as ApplyIcon,
    History as HistoryIcon,
    Delete as DeleteIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { connectionsApi, schemaApi } from '../lib/api';
import { GlassCard } from '../components/GlassCard';
import type {
    SchemaDiff,
    SchemaDiffItem,
    DiffType,
    ColumnInfo,
    IndexInfo,
    ForeignKeyInfo,
    TableSchema,
} from '@dbnexus/shared';

// Diff type colors and icons
const DIFF_CONFIG: Record<
    DiffType,
    { color: string; bgColor: string; icon: React.ReactNode; label: string }
> = {
    table_added: {
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        icon: <AddIcon fontSize="small" />,
        label: 'Table Added',
    },
    table_removed: {
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: <RemoveIcon fontSize="small" />,
        label: 'Table Removed',
    },
    column_added: {
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        icon: <AddIcon fontSize="small" />,
        label: 'Column Added',
    },
    column_removed: {
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: <RemoveIcon fontSize="small" />,
        label: 'Column Removed',
    },
    column_modified: {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        icon: <ModifyIcon fontSize="small" />,
        label: 'Column Modified',
    },
    index_added: {
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        icon: <AddIcon fontSize="small" />,
        label: 'Index Added',
    },
    index_removed: {
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: <RemoveIcon fontSize="small" />,
        label: 'Index Removed',
    },
    index_modified: {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        icon: <ModifyIcon fontSize="small" />,
        label: 'Index Modified',
    },
    fk_added: {
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        icon: <AddIcon fontSize="small" />,
        label: 'FK Added',
    },
    fk_removed: {
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: <RemoveIcon fontSize="small" />,
        label: 'FK Removed',
    },
    fk_modified: {
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        icon: <ModifyIcon fontSize="small" />,
        label: 'FK Modified',
    },
};

// Connection selector component
function ConnectionSelector({
    label,
    value,
    onChange,
    connections,
}: {
    label: string;
    value: string;
    onChange: (id: string) => void;
    connections: { id: string; name: string; engine: string }[];
}) {
    return (
        <FormControl fullWidth size="small">
            <InputLabel>{label}</InputLabel>
            <Select value={value} onChange={(e) => onChange(e.target.value)} label={label}>
                {connections.map((conn) => (
                    <MenuItem key={conn.id} value={conn.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DatabaseIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            {conn.name}
                            <Chip
                                label={conn.engine.toUpperCase()}
                                size="small"
                                sx={{ ml: 'auto', height: 20, fontSize: 10 }}
                            />
                        </Box>
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}

// Schema selector component
function SchemaSelector({
    connectionId,
    value,
    onChange,
}: {
    connectionId: string;
    value: string;
    onChange: (schema: string) => void;
}) {
    const { data: schemas = [] } = useQuery({
        queryKey: ['schemas', connectionId],
        queryFn: () => schemaApi.getSchemas(connectionId),
        enabled: !!connectionId,
    });

    return (
        <FormControl fullWidth size="small">
            <InputLabel>Schema</InputLabel>
            <Select value={value} onChange={(e) => onChange(e.target.value)} label="Schema">
                {schemas.map((schema) => (
                    <MenuItem key={schema} value={schema}>
                        {schema}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}

// Summary stats component
function DiffSummary({ diff }: { diff: SchemaDiff }) {
    const stats = [
        {
            label: 'Tables',
            added: diff.summary.tablesAdded,
            removed: diff.summary.tablesRemoved,
            modified: 0,
        },
        {
            label: 'Columns',
            added: diff.summary.columnsAdded,
            removed: diff.summary.columnsRemoved,
            modified: diff.summary.columnsModified,
        },
        {
            label: 'Indexes',
            added: diff.summary.indexesAdded,
            removed: diff.summary.indexesRemoved,
            modified: diff.summary.indexesModified,
        },
        {
            label: 'Foreign Keys',
            added: diff.summary.fksAdded,
            removed: diff.summary.fksRemoved,
            modified: diff.summary.fksModified,
        },
    ];

    return (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {stats.map((stat) => (
                <Box
                    key={stat.label}
                    sx={{
                        p: 2,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        minWidth: 140,
                    }}
                >
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {stat.label}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                        {stat.added > 0 && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#22c55e',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                            >
                                <AddIcon sx={{ fontSize: 14 }} />
                                {stat.added}
                            </Typography>
                        )}
                        {stat.removed > 0 && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#ef4444',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                            >
                                <RemoveIcon sx={{ fontSize: 14 }} />
                                {stat.removed}
                            </Typography>
                        )}
                        {stat.modified > 0 && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#f59e0b',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                            >
                                <ModifyIcon sx={{ fontSize: 14 }} />
                                {stat.modified}
                            </Typography>
                        )}
                        {stat.added === 0 && stat.removed === 0 && stat.modified === 0 && (
                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                No changes
                            </Typography>
                        )}
                    </Box>
                </Box>
            ))}
        </Box>
    );
}

// Single diff item component
function DiffItem({ item }: { item: SchemaDiffItem }) {
    const [expanded, setExpanded] = useState(false);
    const config = DIFF_CONFIG[item.type];

    const getIcon = () => {
        if (item.type.startsWith('table_')) return <TableIcon fontSize="small" />;
        if (item.type.startsWith('column_')) return <ColumnIcon fontSize="small" />;
        if (item.type.startsWith('index_')) return <KeyIcon fontSize="small" />;
        if (item.type.startsWith('fk_')) return <FkIcon fontSize="small" />;
        return null;
    };

    const getDetails = () => {
        if (item.type === 'table_added' && item.source) {
            const table = item.source as TableSchema;
            return `${table.columns.length} columns, ${table.indexes.length} indexes, ${table.foreignKeys.length} FKs`;
        }
        if (item.type === 'column_added' || item.type === 'column_removed') {
            const col = (item.source || item.target) as ColumnInfo;
            return `${col.dataType}${col.nullable ? '' : ' NOT NULL'}${col.defaultValue ? ` DEFAULT ${col.defaultValue}` : ''}`;
        }
        if (item.type === 'column_modified') {
            const source = item.source as ColumnInfo;
            const target = item.target as ColumnInfo;
            const changes: string[] = [];
            if (source.dataType !== target.dataType) {
                changes.push(`type: ${target.dataType} → ${source.dataType}`);
            }
            if (source.nullable !== target.nullable) {
                changes.push(`nullable: ${target.nullable} → ${source.nullable}`);
            }
            if (source.defaultValue !== target.defaultValue) {
                changes.push(
                    `default: ${target.defaultValue ?? 'none'} → ${source.defaultValue ?? 'none'}`
                );
            }
            return changes.join(', ');
        }
        if (item.type === 'index_added' || item.type === 'index_removed') {
            const idx = (item.source || item.target) as IndexInfo;
            const idxColumns = Array.isArray(idx.columns) ? idx.columns : [];
            return `${idx.isUnique ? 'UNIQUE ' : ''}(${idxColumns.join(', ')})`;
        }
        if (item.type === 'fk_added' || item.type === 'fk_removed') {
            const fk = (item.source || item.target) as ForeignKeyInfo;
            const fkColumns = Array.isArray(fk.columns) ? fk.columns : [];
            const fkRefColumns = Array.isArray(fk.referencedColumns) ? fk.referencedColumns : [];
            return `(${fkColumns.join(', ')}) → ${fk.referencedSchema}.${fk.referencedTable}(${fkRefColumns.join(', ')})`;
        }
        return null;
    };

    return (
        <Box
            sx={{
                bgcolor: config.bgColor,
                border: '1px solid',
                borderColor: config.color,
                borderLeftWidth: 3,
                mb: 1,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    cursor: item.migrationSql?.length ? 'pointer' : 'default',
                }}
                onClick={() => item.migrationSql?.length && setExpanded(!expanded)}
            >
                <Box sx={{ color: config.color, display: 'flex' }}>{config.icon}</Box>
                <Box sx={{ color: 'text.secondary', display: 'flex' }}>{getIcon()}</Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {item.table}
                    {item.name && (
                        <Typography
                            component="span"
                            sx={{ fontWeight: 400, color: 'text.secondary' }}
                        >
                            .{item.name}
                        </Typography>
                    )}
                </Typography>
                <Chip
                    label={config.label}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: config.bgColor,
                        color: config.color,
                        border: `1px solid ${config.color}`,
                    }}
                />
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        ml: 'auto',
                        mr: 1,
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {getDetails()}
                </Typography>
                {item.migrationSql?.length && (
                    <IconButton size="small" sx={{ color: 'text.secondary' }}>
                        {expanded ? (
                            <CollapseIcon fontSize="small" />
                        ) : (
                            <ExpandIcon fontSize="small" />
                        )}
                    </IconButton>
                )}
            </Box>
            <Collapse in={expanded}>
                <Box
                    sx={{
                        p: 1.5,
                        pt: 0,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', mb: 1, display: 'block' }}
                    >
                        Migration SQL:
                    </Typography>
                    <Box
                        component="pre"
                        sx={{
                            p: 1.5,
                            bgcolor: 'background.default',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            overflow: 'auto',
                            m: 0,
                            color: 'text.primary',
                        }}
                    >
                        {item.migrationSql?.join('\n')}
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}

// Grouped diff items by table
function DiffItemsGrouped({ items }: { items: SchemaDiffItem[] }) {
    const grouped = useMemo(() => {
        const groups = new Map<string, SchemaDiffItem[]>();
        for (const item of items) {
            const key = item.table;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(item);
        }
        return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [items]);

    if (items.length === 0) {
        return (
            <Box sx={{ py: 4, textAlign: 'center' }}>
                <CheckIcon sx={{ fontSize: 48, color: '#22c55e', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.primary' }}>
                    Schemas are identical
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No differences found between the selected schemas.
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {grouped.map(([table, tableItems]) => (
                <Box key={table} sx={{ mb: 2 }}>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            color: 'text.secondary',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <TableIcon fontSize="small" />
                        {table}
                        <Chip
                            label={tableItems.length}
                            size="small"
                            sx={{ height: 18, fontSize: 10 }}
                        />
                    </Typography>
                    {tableItems.map((item, idx) => (
                        <DiffItem key={`${item.type}-${item.name}-${idx}`} item={item} />
                    ))}
                </Box>
            ))}
        </Box>
    );
}

// Migration SQL panel
function MigrationSqlPanel({ diff }: { diff: SchemaDiff }) {
    const [copied, setCopied] = useState(false);

    const allSql = useMemo(() => {
        const sql: string[] = [];
        const orderedTypes: DiffType[] = [
            'fk_removed',
            'fk_modified',
            'index_removed',
            'index_modified',
            'column_removed',
            'column_modified',
            'table_removed',
            'table_added',
            'column_added',
            'index_added',
            'fk_added',
        ];

        for (const type of orderedTypes) {
            for (const item of diff.items.filter((i) => i.type === type)) {
                if (item.migrationSql) {
                    sql.push(...item.migrationSql);
                }
            }
        }
        return sql;
    }, [diff]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(allSql.join('\n\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (allSql.length === 0) {
        return (
            <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No migration SQL needed - schemas are identical.
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                }}
            >
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {allSql.length} statement{allSql.length !== 1 ? 's' : ''} to sync target schema
                </Typography>
                <Button
                    size="small"
                    startIcon={copied ? <CheckIcon /> : <CopyIcon />}
                    onClick={handleCopy}
                    sx={{ textTransform: 'none' }}
                >
                    {copied ? 'Copied!' : 'Copy All'}
                </Button>
            </Box>
            <Box
                component="pre"
                sx={{
                    p: 2,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    maxHeight: 500,
                    m: 0,
                    color: 'text.primary',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}
            >
                {allSql.join('\n\n')}
            </Box>
        </Box>
    );
}

// Migration history panel
function MigrationHistoryPanel() {
    const queryClient = useQueryClient();

    const { data: history = [], isLoading } = useQuery({
        queryKey: ['migrationHistory'],
        queryFn: () => schemaApi.getMigrationHistory({ limit: 20 }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => schemaApi.deleteMigration(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['migrationHistory'] }),
    });

    if (isLoading) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (history.length === 0) {
        return (
            <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No migrations applied yet.
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {history.map((entry) => (
                <Box
                    key={entry.id}
                    sx={{
                        p: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {entry.success ? (
                            <SuccessIcon sx={{ color: '#22c55e', fontSize: 18 }} />
                        ) : (
                            <ErrorIcon sx={{ color: '#ef4444', fontSize: 18 }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {entry.sourceConnectionName} → {entry.targetConnectionName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                            {new Date(entry.appliedAt).toLocaleString()}
                        </Typography>
                        <Tooltip title="Delete record">
                            <IconButton
                                size="small"
                                onClick={() => deleteMutation.mutate(entry.id)}
                                sx={{ color: 'text.secondary' }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {entry.sourceSchema} → {entry.targetSchema} • {entry.sqlStatements.length}{' '}
                        statement
                        {entry.sqlStatements.length !== 1 ? 's' : ''}
                        {entry.description && ` • ${entry.description}`}
                    </Typography>
                    {entry.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                            {entry.error}
                        </Alert>
                    )}
                </Box>
            ))}
        </Box>
    );
}

// Main page component
export function SchemaDiffPage() {
    const queryClient = useQueryClient();
    const [sourceConnectionId, setSourceConnectionId] = useState('');
    const [targetConnectionId, setTargetConnectionId] = useState('');
    const [sourceSchema, setSourceSchema] = useState('public');
    const [targetSchema, setTargetSchema] = useState('public');
    const [activeTab, setActiveTab] = useState(0);
    const [applyDialogOpen, setApplyDialogOpen] = useState(false);
    const [applyDescription, setApplyDescription] = useState('');

    const { data: connections = [] } = useQuery({
        queryKey: ['connections'],
        queryFn: connectionsApi.getAll,
    });

    const compareMutation = useMutation({
        mutationFn: () =>
            schemaApi.compareSchemasApi(
                sourceConnectionId,
                targetConnectionId,
                sourceSchema,
                targetSchema
            ),
    });

    const applyMutation = useMutation({
        mutationFn: () =>
            schemaApi.applyMigration(
                sourceConnectionId,
                targetConnectionId,
                sourceSchema,
                targetSchema,
                applyDescription || undefined
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['migrationHistory'] });
            setApplyDialogOpen(false);
            setApplyDescription('');
            // Re-run comparison to show updated state
            compareMutation.mutate();
        },
    });

    const canCompare = sourceConnectionId && targetConnectionId;
    const hasChanges = compareMutation.data && compareMutation.data.items.length > 0;

    return (
        <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        letterSpacing: '-0.02em',
                        mb: 1,
                    }}
                >
                    Schema Diff
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Compare schemas between two database connections and apply migrations
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 3 }}>
                {/* Main content */}
                <Box sx={{ flex: 1 }}>
                    {/* Connection Selectors */}
                    <GlassCard>
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 3,
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                            }}
                        >
                            {/* Source */}
                            <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{ color: 'text.secondary', mb: 1.5 }}
                                >
                                    Source (what you want)
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <ConnectionSelector
                                        label="Connection"
                                        value={sourceConnectionId}
                                        onChange={setSourceConnectionId}
                                        connections={connections}
                                    />
                                    {sourceConnectionId && (
                                        <SchemaSelector
                                            connectionId={sourceConnectionId}
                                            value={sourceSchema}
                                            onChange={setSourceSchema}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Arrow */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    pt: 5,
                                }}
                            >
                                <CompareIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                            </Box>

                            {/* Target */}
                            <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography
                                    variant="subtitle2"
                                    sx={{ color: 'text.secondary', mb: 1.5 }}
                                >
                                    Target (what will be changed)
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <ConnectionSelector
                                        label="Connection"
                                        value={targetConnectionId}
                                        onChange={setTargetConnectionId}
                                        connections={connections}
                                    />
                                    {targetConnectionId && (
                                        <SchemaSelector
                                            connectionId={targetConnectionId}
                                            value={targetSchema}
                                            onChange={setTargetSchema}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Compare Button */}
                            <Box sx={{ pt: 5 }}>
                                <Button
                                    variant="contained"
                                    onClick={() => compareMutation.mutate()}
                                    disabled={!canCompare || compareMutation.isPending}
                                    startIcon={
                                        compareMutation.isPending ? (
                                            <CircularProgress size={16} color="inherit" />
                                        ) : (
                                            <CompareIcon />
                                        )
                                    }
                                    sx={{ minWidth: 120 }}
                                >
                                    {compareMutation.isPending ? 'Comparing...' : 'Compare'}
                                </Button>
                            </Box>
                        </Box>
                    </GlassCard>

                    {/* Error */}
                    {compareMutation.isError && (
                        <Alert severity="error" sx={{ mt: 3 }}>
                            {compareMutation.error instanceof Error
                                ? compareMutation.error.message
                                : 'Failed to compare schemas'}
                        </Alert>
                    )}

                    {/* Results */}
                    {compareMutation.data && (
                        <Box sx={{ mt: 3 }}>
                            {/* Summary with apply button */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 2,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <DiffSummary diff={compareMutation.data} />
                                {hasChanges && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<ApplyIcon />}
                                        onClick={() => setApplyDialogOpen(true)}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Apply Migration
                                    </Button>
                                )}
                            </Box>

                            {/* Tabs */}
                            <Box sx={{ mt: 3 }}>
                                <Tabs
                                    value={activeTab}
                                    onChange={(_, v) => setActiveTab(v)}
                                    sx={{
                                        mb: 2,
                                        '& .MuiTab-root': {
                                            textTransform: 'none',
                                            fontWeight: 500,
                                        },
                                    }}
                                >
                                    <Tab
                                        label={`Differences (${compareMutation.data.items.length})`}
                                    />
                                    <Tab label="Migration SQL" />
                                </Tabs>

                                <GlassCard>
                                    {activeTab === 0 && (
                                        <DiffItemsGrouped items={compareMutation.data.items} />
                                    )}
                                    {activeTab === 1 && (
                                        <MigrationSqlPanel diff={compareMutation.data} />
                                    )}
                                </GlassCard>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Migration History sidebar */}
                <Box sx={{ width: 350, flexShrink: 0 }}>
                    <GlassCard noPadding>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 2,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <HistoryIcon sx={{ color: 'text.secondary' }} />
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600, color: 'text.primary' }}
                            >
                                Migration History
                            </Typography>
                        </Box>
                        <MigrationHistoryPanel />
                    </GlassCard>
                </Box>
            </Box>

            {/* Apply Migration Dialog */}
            <Dialog open={applyDialogOpen} onClose={() => setApplyDialogOpen(false)}>
                <DialogTitle>Apply Migration</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This will execute the migration SQL on the target database. Make sure you
                        have a backup!
                    </Alert>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Description (optional)"
                        value={applyDescription}
                        onChange={(e) => setApplyDescription(e.target.value)}
                        placeholder="e.g., Add user columns"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={() => applyMutation.mutate()}
                        disabled={applyMutation.isPending}
                        startIcon={
                            applyMutation.isPending ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <ApplyIcon />
                            )
                        }
                    >
                        {applyMutation.isPending ? 'Applying...' : 'Apply'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Apply result */}
            {applyMutation.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {applyMutation.error instanceof Error
                        ? applyMutation.error.message
                        : 'Failed to apply migration'}
                </Alert>
            )}
        </Box>
    );
}
