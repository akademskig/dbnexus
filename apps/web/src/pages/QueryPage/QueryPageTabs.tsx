import { Box, Tabs, Tab, Badge, Typography, Button } from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import CodeIcon from '@mui/icons-material/Code';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import type { GridSortModel, GridFilterModel } from '@mui/x-data-grid';
import { DataTab } from './DataTab';
import { StructureTab, IndexesTab, ForeignKeysTab } from './SchemaTabs';
import type { TableInfo, TableSchema, QueryResult } from '@dbnexus/shared';

interface ForeignKeyClickInfo {
    referencedTable: string;
    referencedColumn: string;
    value: unknown;
}

interface QueryPageTabsProps {
    readonly activeTab: number;
    readonly onTabChange: (tab: number) => void;
    readonly result: QueryResult | null;
    readonly error: string | null;
    readonly loading: boolean;
    readonly confirmDangerous: { message: string; type: string } | null;
    readonly onConfirm: () => void;
    readonly onCancel: () => void;
    readonly totalRowCount: number | null;
    readonly paginationModel: { page: number; pageSize: number };
    readonly onPaginationChange: (model: { page: number; pageSize: number }) => void;
    readonly sortModel?: GridSortModel;
    readonly onSortChange?: (model: GridSortModel) => void;
    readonly filterModel?: GridFilterModel;
    readonly onFilterModelChange?: (model: GridFilterModel) => void;
    readonly showFilters?: boolean;
    readonly onShowFiltersChange?: (show: boolean) => void;
    readonly onSearch: (query: string) => void;
    readonly searchQuery: string;
    readonly tableSchema: TableSchema | undefined;
    readonly onUpdateRow: (
        oldRow: Record<string, unknown>,
        newRow: Record<string, unknown>
    ) => Promise<void>;
    readonly onDeleteRow: (row: Record<string, unknown>) => void;
    readonly onDeleteRows: (rows: Record<string, unknown>[]) => void;
    readonly onSyncRow: (rows: Record<string, unknown>[]) => void;
    readonly onForeignKeyClick: (info: ForeignKeyClickInfo) => void;
    readonly connectionHost: string | undefined;
    readonly connectionDatabase: string | undefined;
    readonly tableName: string | undefined;
    readonly selectedTable: TableInfo | null;
    readonly tableSchemaLoading: boolean;
    readonly splitViewOpen?: boolean;
    readonly onToggleSplitView?: () => void;
    readonly onRefresh?: () => void;
}

export function QueryPageTabs({
    activeTab,
    onTabChange,
    result,
    error,
    loading,
    confirmDangerous,
    onConfirm,
    onCancel,
    totalRowCount,
    paginationModel,
    onPaginationChange,
    sortModel,
    onSortChange,
    filterModel,
    onFilterModelChange,
    showFilters,
    onShowFiltersChange,
    onSearch,
    searchQuery,
    tableSchema,
    onUpdateRow,
    onDeleteRow,
    onDeleteRows,
    onSyncRow,
    onForeignKeyClick,
    connectionHost,
    connectionDatabase,
    tableName,
    selectedTable,
    tableSchemaLoading,
    splitViewOpen = false,
    onToggleSplitView,
    onRefresh,
}: QueryPageTabsProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            {/* Tabs */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => onTabChange(v)}
                    sx={{ minHeight: 48, flex: 1 }}
                >
                    <Tab
                        label={
                            <Badge badgeContent={result?.rowCount} color="primary" max={999}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        pr: 1,
                                    }}
                                >
                                    <ViewListIcon fontSize="small" />
                                    Data
                                </Box>
                            </Badge>
                        }
                        sx={{ minHeight: 48, textTransform: 'none' }}
                    />
                    <Tab
                        label={
                            <Badge badgeContent={tableSchema?.columns.length} color="primary">
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        pr: 1,
                                    }}
                                >
                                    <GridViewIcon fontSize="small" />
                                    Structure
                                </Box>
                            </Badge>
                        }
                        sx={{ minHeight: 48, textTransform: 'none' }}
                    />
                    <Tab
                        label={
                            <Badge badgeContent={tableSchema?.indexes.length} color="primary">
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        pr: 1,
                                    }}
                                >
                                    <KeyIcon fontSize="small" />
                                    Indexes
                                </Box>
                            </Badge>
                        }
                        sx={{ minHeight: 40, textTransform: 'none' }}
                    />
                    <Tab
                        label={
                            <Badge badgeContent={tableSchema?.foreignKeys.length} color="primary">
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        pr: 1,
                                    }}
                                >
                                    <LinkIcon fontSize="small" />
                                    Foreign Keys
                                </Box>
                            </Badge>
                        }
                        sx={{ minHeight: 40, textTransform: 'none' }}
                    />

                    {/* SQL Editor Toggle - Looks like tab but opens side panel */}
                    {onToggleSplitView && (
                        <Button
                            startIcon={
                                splitViewOpen ? (
                                    <CodeOffIcon fontSize="small" />
                                ) : (
                                    <CodeIcon fontSize="small" />
                                )
                            }
                            sx={{
                                minHeight: 40,
                                textTransform: 'none',
                                color: splitViewOpen ? 'primary.main' : 'text.secondary',
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSplitView();
                            }}
                        >
                            {' '}
                            SQL
                        </Button>
                    )}
                </Tabs>
            </Box>

            {/* Tab Content */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                }}
            >
                {activeTab === 0 && (
                    <DataTab
                        result={result}
                        error={error}
                        loading={loading}
                        confirmDangerous={confirmDangerous}
                        onConfirm={onConfirm}
                        onCancel={onCancel}
                        totalRowCount={totalRowCount}
                        paginationModel={paginationModel}
                        onPaginationChange={onPaginationChange}
                        sortModel={sortModel}
                        onSortChange={onSortChange}
                        filterModel={filterModel}
                        onFilterModelChange={onFilterModelChange}
                        showFilters={showFilters}
                        onShowFiltersChange={onShowFiltersChange}
                        onSearch={onSearch}
                        searchQuery={searchQuery}
                        tableSchema={tableSchema}
                        onUpdateRow={onUpdateRow}
                        onDeleteRow={onDeleteRow}
                        onDeleteRows={onDeleteRows}
                        onSyncRow={onSyncRow}
                        onForeignKeyClick={onForeignKeyClick}
                        connectionHost={connectionHost}
                        connectionDatabase={connectionDatabase}
                        tableName={tableName}
                        onRefresh={onRefresh}
                    />
                )}

                {activeTab === 1 &&
                    (selectedTable ? (
                        <StructureTab schema={tableSchema} loading={tableSchemaLoading} />
                    ) : (
                        <Box
                            sx={{
                                p: 4,
                                textAlign: 'center',
                                color: 'text.secondary',
                            }}
                        >
                            <TableChartIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                            <Typography variant="body2">
                                Select a table to view its structure
                            </Typography>
                        </Box>
                    ))}

                {activeTab === 2 &&
                    (selectedTable ? (
                        <IndexesTab schema={tableSchema} loading={tableSchemaLoading} />
                    ) : (
                        <Box
                            sx={{
                                p: 4,
                                textAlign: 'center',
                                color: 'text.secondary',
                            }}
                        >
                            <KeyIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                            <Typography variant="body2">
                                Select a table to view its indexes
                            </Typography>
                        </Box>
                    ))}

                {activeTab === 3 &&
                    (selectedTable ? (
                        <ForeignKeysTab schema={tableSchema} loading={tableSchemaLoading} />
                    ) : (
                        <Box
                            sx={{
                                p: 4,
                                textAlign: 'center',
                                color: 'text.secondary',
                            }}
                        >
                            <LinkIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                            <Typography variant="body2">
                                Select a table to view its foreign keys
                            </Typography>
                        </Box>
                    ))}
            </Box>
        </Box>
    );
}
