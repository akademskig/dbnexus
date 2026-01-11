import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Tabs,
    Tab,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import ViewListIcon from '@mui/icons-material/ViewList';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import { schemaApi, connectionsApi } from '../lib/api';

export function SchemaPage() {
    const { connectionId } = useParams<{ connectionId: string }>();
    const [selectedSchema, setSelectedSchema] = useState('public');
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);

    const { data: connection } = useQuery({
        queryKey: ['connection', connectionId],
        queryFn: () => connectionsApi.getById(connectionId!),
        enabled: !!connectionId,
    });

    const { data: schemas = [] } = useQuery({
        queryKey: ['schemas', connectionId],
        queryFn: () => schemaApi.getSchemas(connectionId!),
        enabled: !!connectionId,
    });

    const { data: tables = [], isLoading: loadingTables } = useQuery({
        queryKey: ['tables', connectionId, selectedSchema],
        queryFn: () => schemaApi.getTables(connectionId!, selectedSchema),
        enabled: !!connectionId,
    });

    const { data: tableSchema, isLoading: loadingTableSchema } = useQuery({
        queryKey: ['tableSchema', connectionId, selectedSchema, selectedTable],
        queryFn: () => schemaApi.getTableSchema(connectionId!, selectedSchema, selectedTable!),
        enabled: !!connectionId && !!selectedTable,
    });

    if (!connectionId) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                No connection selected
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Tables sidebar */}
            <Paper
                sx={{
                    width: 280,
                    borderRadius: 0,
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {connection?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {connection?.database}
                    </Typography>
                </Box>

                {/* Schema selector */}
                <Tabs
                    value={schemas.indexOf(selectedSchema)}
                    onChange={(_, idx) => setSelectedSchema(schemas[idx] ?? 'public')}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
                >
                    {schemas.map((schema) => (
                        <Tab key={schema} label={schema} sx={{ minHeight: 40, py: 0 }} />
                    ))}
                </Tabs>

                {/* Tables list */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    {loadingTables ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <List dense sx={{ py: 1 }}>
                            {tables.map((table) => (
                                <ListItemButton
                                    key={`${table.schema}.${table.name}`}
                                    selected={selectedTable === table.name}
                                    onClick={() => setSelectedTable(table.name)}
                                >
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        {table.type === 'view' ? (
                                            <ViewListIcon fontSize="small" />
                                        ) : (
                                            <TableChartIcon fontSize="small" />
                                        )}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={table.name}
                                        secondary={
                                            table.rowCount !== undefined
                                                ? `~${table.rowCount} rows`
                                                : undefined
                                        }
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </Box>
            </Paper>

            {/* Table details */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {selectedTable && tableSchema ? (
                    <Box>
                        <Typography variant="h5" fontWeight={600} gutterBottom>
                            {selectedSchema}.{selectedTable}
                        </Typography>

                        <Tabs
                            value={tabValue}
                            onChange={(_, v) => setTabValue(v)}
                            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                        >
                            <Tab label="Columns" />
                            <Tab label="Indexes" />
                            <Tab label="Foreign Keys" />
                        </Tabs>

                        {/* Columns */}
                        {tabValue === 0 && (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Nullable</TableCell>
                                            <TableCell>Default</TableCell>
                                            <TableCell>Constraints</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tableSchema.columns.map((col) => (
                                            <TableRow key={col.name}>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontFamily="monospace"
                                                        fontWeight={500}
                                                    >
                                                        {col.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontFamily="monospace"
                                                        color="text.secondary"
                                                    >
                                                        {col.dataType}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={col.nullable ? 'NULL' : 'NOT NULL'}
                                                        size="small"
                                                        color={col.nullable ? 'default' : 'primary'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontFamily="monospace"
                                                        color="text.secondary"
                                                    >
                                                        {col.defaultValue ?? '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        {col.isPrimaryKey && (
                                                            <Chip
                                                                icon={<KeyIcon />}
                                                                label="PK"
                                                                size="small"
                                                                color="warning"
                                                            />
                                                        )}
                                                        {col.isUnique && !col.isPrimaryKey && (
                                                            <Chip
                                                                label="UNIQUE"
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* Indexes */}
                        {tabValue === 1 && (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Columns</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Properties</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tableSchema.indexes.map((idx) => (
                                            <TableRow key={idx.name}>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontFamily="monospace"
                                                    >
                                                        {idx.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        fontFamily="monospace"
                                                        color="text.secondary"
                                                    >
                                                        {idx.columns.join(', ')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        {idx.type}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        {idx.isPrimary && (
                                                            <Chip
                                                                label="PRIMARY"
                                                                size="small"
                                                                color="warning"
                                                            />
                                                        )}
                                                        {idx.isUnique && !idx.isPrimary && (
                                                            <Chip
                                                                label="UNIQUE"
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* Foreign Keys */}
                        {tabValue === 2 && (
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Columns</TableCell>
                                            <TableCell>References</TableCell>
                                            <TableCell>On Delete</TableCell>
                                            <TableCell>On Update</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tableSchema.foreignKeys.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    sx={{
                                                        textAlign: 'center',
                                                        color: 'text.secondary',
                                                    }}
                                                >
                                                    No foreign keys
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            tableSchema.foreignKeys.map((fk) => (
                                                <TableRow key={fk.name}>
                                                    <TableCell>
                                                        <Typography
                                                            variant="body2"
                                                            fontFamily="monospace"
                                                        >
                                                            {fk.name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography
                                                            variant="body2"
                                                            fontFamily="monospace"
                                                            color="text.secondary"
                                                        >
                                                            {fk.columns.join(', ')}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.5,
                                                            }}
                                                        >
                                                            <LinkIcon
                                                                fontSize="small"
                                                                color="primary"
                                                            />
                                                            <Typography
                                                                variant="body2"
                                                                fontFamily="monospace"
                                                            >
                                                                {fk.referencedSchema}.
                                                                {fk.referencedTable}(
                                                                {fk.referencedColumns.join(', ')})
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            {fk.onDelete}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            {fk.onUpdate}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                ) : loadingTableSchema ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : (
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
                            <TableChartIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                            <Typography variant="body1">
                                Select a table to view its schema
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
