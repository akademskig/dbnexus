import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Skeleton,
    Chip,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import TableChartIcon from '@mui/icons-material/TableChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
import type { ConnectionConfig, TableInfo } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { schemaApi } from '../../lib/api';

interface TablesTabProps {
    connectionId: string;
    connection: ConnectionConfig | undefined;
    schemas: string[];
    isLoading: boolean;
}

export function TablesTab({ connectionId, connection: _connection, schemas, isLoading }: TablesTabProps) {
    const navigate = useNavigate();
    const [selectedSchema, setSelectedSchema] = useState<string>(() => {
        // Default to 'public' for postgres, first schema otherwise
        if (schemas.includes('public')) return 'public';
        if (schemas.includes('main')) return 'main';
        return schemas[0] || '';
    });

    // Update selected schema when schemas load
    useMemo(() => {
        if (schemas.length > 0 && !selectedSchema) {
            if (schemas.includes('public')) setSelectedSchema('public');
            else if (schemas.includes('main')) setSelectedSchema('main');
            else if (schemas[0]) setSelectedSchema(schemas[0]);
        }
    }, [schemas, selectedSchema]);

    // Fetch tables for selected schema
    const {
        data: tables = [],
        isLoading: loadingTables,
        refetch: refetchTables,
    } = useQuery({
        queryKey: ['tables', connectionId, selectedSchema],
        queryFn: () => schemaApi.getTables(connectionId, selectedSchema),
        enabled: !!connectionId && !!selectedSchema,
    });

    const handleOpenInQuery = (table: TableInfo) => {
        navigate(`/query/${connectionId}?schema=${table.schema}&table=${table.name}`);
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Table Name',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableChartIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.7 }} />
                    <Typography fontFamily="monospace">{params.value}</Typography>
                </Box>
            ),
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: 11,
                        bgcolor: params.value === 'table' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: params.value === 'table' ? 'rgb(34, 197, 94)' : 'rgb(99, 102, 241)',
                    }}
                />
            ),
        },
        {
            field: 'rowCount',
            headerName: 'Rows',
            width: 120,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => (
                <Typography fontFamily="monospace" color="text.secondary">
                    {params.value >= 0 ? params.value.toLocaleString() : '-'}
                </Typography>
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
                    onClick={() => handleOpenInQuery(params.row)}
                    sx={{ textTransform: 'none' }}
                >
                    Query
                </Button>
            ),
        },
    ];

    const rows = tables.map((table) => ({
        id: `${table.schema}.${table.name}`,
        ...table,
    }));

    if (isLoading) {
        return (
            <GlassCard>
                <Skeleton height={300} />
            </GlassCard>
        );
    }

    return (
        <Box>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Schema</InputLabel>
                        <Select
                            value={selectedSchema}
                            onChange={(e) => setSelectedSchema(e.target.value)}
                            label="Schema"
                        >
                            {schemas.map((schema) => (
                                <MenuItem key={schema} value={schema}>
                                    {schema}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary">
                        {tables.length} table{tables.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => refetchTables()}
                >
                    Refresh
                </Button>
            </Box>

            {/* Tables Grid */}
            {tables.length === 0 ? (
                <GlassCard>
                    <EmptyState
                        icon={<ViewListIcon />}
                        title="No tables found"
                        description={`Schema "${selectedSchema}" has no tables yet.`}
                        action={{
                            label: 'Open Query Editor',
                            onClick: () => navigate(`/query/${connectionId}?schema=${selectedSchema}`),
                        }}
                    />
                </GlassCard>
            ) : (
                <GlassCard sx={{ p: 0 }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        loading={loadingTables}
                        autoHeight
                        disableRowSelectionOnClick
                        pageSizeOptions={[10, 25, 50, 100]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                            sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
                        }}
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell': {
                                borderColor: 'divider',
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                bgcolor: 'background.default',
                                borderColor: 'divider',
                            },
                        }}
                    />
                </GlassCard>
            )}
        </Box>
    );
}
