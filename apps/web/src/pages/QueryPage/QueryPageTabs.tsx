import { Box, Tabs, Tab, Badge, Typography } from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import CodeIcon from '@mui/icons-material/Code';
import TableChartIcon from '@mui/icons-material/TableChart';
import { DataTab } from './DataTab';
import { StructureTab, IndexesTab, ForeignKeysTab, SqlTab } from './SchemaTabs';
import type { TableInfo, TableSchema, QueryResult } from '@dbnexus/shared';

interface ForeignKeyClickInfo {
    referencedTable: string;
    referencedColumn: string;
    value: unknown;
}

interface QueryPageTabsProps {
    activeTab: number;
    onTabChange: (tab: number) => void;
    result: QueryResult | null;
    error: string | null;
    loading: boolean;
    confirmDangerous: { message: string; type: string } | null;
    onConfirm: () => void;
    onCancel: () => void;
    totalRowCount: number | null;
    paginationModel: { page: number; pageSize: number };
    onPaginationChange: (model: { page: number; pageSize: number }) => void;
    onSearch: (query: string) => void;
    searchQuery: string;
    tableSchema: TableSchema | undefined;
    onUpdateRow: (
        oldRow: Record<string, unknown>,
        newRow: Record<string, unknown>
    ) => Promise<void>;
    onDeleteRow: (row: Record<string, unknown>) => void;
    onDeleteRows: (rows: Record<string, unknown>[]) => void;
    onSyncRow: (rows: Record<string, unknown>[]) => void;
    onForeignKeyClick: (info: ForeignKeyClickInfo) => void;
    connectionHost: string | undefined;
    connectionDatabase: string | undefined;
    tableName: string | undefined;
    selectedTable: TableInfo | null;
    tableSchemaLoading: boolean;
    sql: string;
    onSqlChange: (sql: string) => void;
    onExecute: () => void;
    onSave: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onPopOut: () => void;
    hideSqlTab?: boolean;
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
    sql,
    onSqlChange,
    onExecute,
    onSave,
    onKeyDown,
    onPopOut,
    hideSqlTab = false,
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
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(_, v) => onTabChange(v)} sx={{ minHeight: 48 }}>
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
                    {!hideSqlTab && (
                        <Tab
                            label={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                    }}
                                >
                                    <CodeIcon fontSize="small" />
                                    SQL
                                </Box>
                            }
                            sx={{ minHeight: 40, textTransform: 'none' }}
                        />
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

                {!hideSqlTab && activeTab === 4 && (
                    <SqlTab
                        sql={sql}
                        onSqlChange={onSqlChange}
                        onExecute={onExecute}
                        onSave={onSave}
                        onKeyDown={onKeyDown}
                        onPopOut={onPopOut}
                        loading={loading}
                    />
                )}
            </Box>
        </Box>
    );
}
