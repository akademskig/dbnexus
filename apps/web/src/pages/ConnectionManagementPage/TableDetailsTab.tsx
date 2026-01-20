import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Tabs,
    Tab,
    Divider,
    Switch,
    FormControlLabel,
    Autocomplete,
} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import { StatusAlert } from '../../components/StatusAlert';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import TableChartIcon from '@mui/icons-material/TableChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import ListAltIcon from '@mui/icons-material/ListAlt';
import WarningIcon from '@mui/icons-material/Warning';
import type { ConnectionConfig, ColumnInfo, IndexInfo, ForeignKeyInfo } from '@dbnexus/shared';
import { GlassCard } from '../../components/GlassCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { schemaApi, queriesApi } from '../../lib/api';
import { buildTableName, quoteIdentifier } from '../../lib/sql';
import { useToastStore } from '../../stores/toastStore';
import {
    AddColumnDialog,
    EditColumnDialog,
    type NewColumnState,
} from '../../components/AddColumnDialog';

interface TableDetailsTabProps {
    connectionId: string;
    connection: ConnectionConfig | undefined;
    schemas: string[];
    isLoading: boolean;
    initialSchema?: string | null;
    initialTable?: string | null;
    onSelectionChange?: (schema: string, table?: string) => void;
}

/**
 * Helper to parse column arrays that may come as PostgreSQL string format "{col1,col2}"
 */
function parseColumnArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string') {
        // Handle PostgreSQL array format: "{col1,col2}"
        if (value.startsWith('{') && value.endsWith('}')) {
            const inner = value.slice(1, -1);
            if (!inner) return [];
            return inner.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        }
        // Single column as string
        return value ? [value] : [];
    }
    return [];
}

// Common data types for different database engines
const DATA_TYPES = {
    postgres: [
        'integer',
        'bigint',
        'smallint',
        'serial',
        'bigserial',
        'numeric',
        'decimal',
        'real',
        'double precision',
        'varchar',
        'char',
        'text',
        'boolean',
        'date',
        'time',
        'timestamp',
        'timestamptz',
        'interval',
        'uuid',
        'json',
        'jsonb',
        'bytea',
        'array',
    ],
    mysql: [
        'int',
        'bigint',
        'smallint',
        'tinyint',
        'mediumint',
        'decimal',
        'float',
        'double',
        'varchar',
        'char',
        'text',
        'mediumtext',
        'longtext',
        'boolean',
        'tinyint(1)',
        'date',
        'time',
        'datetime',
        'timestamp',
        'json',
        'blob',
        'binary',
        'varbinary',
    ],
    sqlite: ['integer', 'real', 'text', 'blob', 'numeric'],
};

export function TableDetailsTab({
    connectionId,
    connection,
    schemas,
    isLoading,
    initialSchema,
    initialTable,
    onSelectionChange,
}: TableDetailsTabProps) {
    const queryClient = useQueryClient();
    const toast = useToastStore();

    // Selection state
    const [selectedSchema, setSelectedSchema] = useState<string>(() => {
        if (initialSchema && schemas.includes(initialSchema)) return initialSchema;
        if (schemas.includes('public')) return 'public';
        if (schemas.includes('main')) return 'main';
        return schemas[0] || '';
    });
    const [selectedTable, setSelectedTable] = useState<string>(initialTable || '');
    const [detailsTab, setDetailsTab] = useState(0); // 0: Columns, 1: Indexes, 2: Foreign Keys

    // Update selection when initial values change (from URL params)
    useEffect(() => {
        if (initialSchema && schemas.includes(initialSchema) && initialSchema !== selectedSchema) {
            setSelectedSchema(initialSchema);
        }
    }, [initialSchema, schemas, selectedSchema]);

    useEffect(() => {
        if (initialTable && initialTable !== selectedTable) {
            setSelectedTable(initialTable);
        }
    }, [initialTable, selectedTable]);

    // Dialog states
    const [addColumnOpen, setAddColumnOpen] = useState(false);
    const [editColumnOpen, setEditColumnOpen] = useState(false);
    const [deleteColumnOpen, setDeleteColumnOpen] = useState(false);
    const [addIndexOpen, setAddIndexOpen] = useState(false);
    const [editIndexOpen, setEditIndexOpen] = useState(false);
    const [deleteIndexOpen, setDeleteIndexOpen] = useState(false);
    const [addFkOpen, setAddFkOpen] = useState(false);
    const [deleteFkOpen, setDeleteFkOpen] = useState(false);

    // Form states
    const [columnToEdit, setColumnToEdit] = useState<ColumnInfo | null>(null);
    const [columnToDelete, setColumnToDelete] = useState<ColumnInfo | null>(null);
    const [indexToEdit, setIndexToEdit] = useState<IndexInfo | null>(null);
    const [indexToDelete, setIndexToDelete] = useState<IndexInfo | null>(null);
    const [fkToDelete, setFkToDelete] = useState<ForeignKeyInfo | null>(null);
    const [editIndexName, setEditIndexName] = useState('');

    // New column form
    const [newColumn, setNewColumn] = useState<NewColumnState>({
        name: '',
        dataType: '',
        nullable: true,
        isPrimaryKey: false,
        isForeignKey: false,
        foreignKeyTable: '',
        foreignKeyColumn: '',
        defaultValue: '',
    });

    // New index form
    const [newIndex, setNewIndex] = useState({
        name: '',
        columns: [] as string[],
        isUnique: false,
        isPrimary: false,
    });

    // New FK form
    const [newFk, setNewFk] = useState({
        name: '',
        columns: [] as string[],
        referencedSchema: '',
        referencedTable: '',
        referencedColumns: [] as string[],
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION',
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
    const { data: tables = [], isLoading: loadingTables } = useQuery({
        queryKey: ['tables', connectionId, selectedSchema],
        queryFn: () => schemaApi.getTables(connectionId, selectedSchema),
        enabled: !!connectionId && !!selectedSchema,
    });

    // Fetch table schema when a table is selected
    const {
        data: tableSchema,
        isLoading: loadingSchema,
        refetch: refetchSchema,
    } = useQuery({
        queryKey: ['tableSchema', connectionId, selectedSchema, selectedTable],
        queryFn: () => schemaApi.getTableSchema(connectionId, selectedSchema, selectedTable),
        enabled: !!connectionId && !!selectedSchema && !!selectedTable,
    });

    // Fetch referenced tables for FK form
    const { data: referencedTables = [] } = useQuery({
        queryKey: ['tables', connectionId, newFk.referencedSchema],
        queryFn: () => schemaApi.getTables(connectionId, newFk.referencedSchema),
        enabled: !!connectionId && !!newFk.referencedSchema && addFkOpen,
    });

    // Fetch referenced table schema for FK form
    const { data: referencedTableSchema } = useQuery({
        queryKey: ['tableSchema', connectionId, newFk.referencedSchema, newFk.referencedTable],
        queryFn: () =>
            schemaApi.getTableSchema(connectionId, newFk.referencedSchema, newFk.referencedTable),
        enabled: !!connectionId && !!newFk.referencedSchema && !!newFk.referencedTable && addFkOpen,
    });

    const { data: fkTableSchema } = useQuery({
        queryKey: ['tableSchema', connectionId, selectedSchema, newColumn.foreignKeyTable],
        queryFn: () =>
            schemaApi.getTableSchema(connectionId, selectedSchema, newColumn.foreignKeyTable),
        enabled:
            !!connectionId &&
            !!selectedSchema &&
            !!newColumn.foreignKeyTable &&
            (addColumnOpen || editColumnOpen),
    });

    const quoteIdentifierForEngine = useCallback(
        (name: string) => quoteIdentifier(name, connection?.engine),
        [connection?.engine]
    );

    const buildTableNameForEngine = useCallback(
        (schema: string, table: string) => buildTableName(schema, table, connection?.engine),
        [connection?.engine]
    );

    const getColumnsForTable = useCallback(
        (tableName: string) => {
            if (!fkTableSchema || tableName !== newColumn.foreignKeyTable) return [];
            return fkTableSchema.columns.map((col) => ({ name: col.name }));
        },
        [fkTableSchema, newColumn.foreignKeyTable]
    );

    // Execute SQL mutation
    const executeSql = useMutation({
        mutationFn: async ({ sql, confirmed = false }: { sql: string; confirmed?: boolean }) => {
            return queriesApi.execute(connectionId, sql, confirmed);
        },
        onSuccess: () => {
            refetchSchema();
            queryClient.invalidateQueries({ queryKey: ['tableSchema', connectionId] });
        },
    });

    // ============ Column Operations ============

    const handleAddColumn = async () => {
        if (!newColumn.name || !newColumn.dataType) return;
        if (newColumn.isForeignKey && (!newColumn.foreignKeyTable || !newColumn.foreignKeyColumn)) {
            toast.error('Select a reference table and column for the foreign key');
            return;
        }

        const fullTableName = buildTableNameForEngine(selectedSchema, selectedTable);
        const quotedColumn = quoteIdentifierForEngine(newColumn.name);

        let sql = `ALTER TABLE ${fullTableName} ADD COLUMN ${quotedColumn} ${newColumn.dataType}`;

        if (!newColumn.nullable) {
            sql += ' NOT NULL';
        }

        if (newColumn.defaultValue) {
            sql += ` DEFAULT ${newColumn.defaultValue}`;
        }

        if (newColumn.isPrimaryKey) {
            sql += ' PRIMARY KEY';
        }

        try {
            await executeSql.mutateAsync({ sql });
            if (newColumn.isForeignKey) {
                const fkName = `fk_${selectedTable}_${newColumn.name}`;
                const fullTargetTable = buildTableNameForEngine(
                    selectedSchema,
                    newColumn.foreignKeyTable
                );
                const fkSql = `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${quoteIdentifierForEngine(
                    fkName
                )} FOREIGN KEY (${quotedColumn}) REFERENCES ${fullTargetTable} (${quoteIdentifierForEngine(
                    newColumn.foreignKeyColumn
                )})`;
                await executeSql.mutateAsync({ sql: fkSql });
            }
            toast.success(`Column "${newColumn.name}" added`);
            setAddColumnOpen(false);
            setNewColumn({
                name: '',
                dataType: '',
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false,
                foreignKeyTable: '',
                foreignKeyColumn: '',
                defaultValue: '',
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to add column');
        }
    };

    const handleEditColumn = async () => {
        if (!columnToEdit) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, selectedTable);
        const quotedColumn = quoteIdentifierForEngine(columnToEdit.name);

        // Build ALTER statements based on what changed
        const statements: string[] = [];

        // For PostgreSQL, we can alter type, nullable, and default separately
        if (connection?.engine === 'postgres') {
            if (newColumn.dataType && newColumn.dataType !== columnToEdit.dataType) {
                statements.push(
                    `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} TYPE ${newColumn.dataType}`
                );
            }
            if (newColumn.nullable !== columnToEdit.nullable) {
                if (newColumn.nullable) {
                    statements.push(
                        `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} DROP NOT NULL`
                    );
                } else {
                    statements.push(
                        `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} SET NOT NULL`
                    );
                }
            }
            if (newColumn.defaultValue !== (columnToEdit.defaultValue || '')) {
                if (newColumn.defaultValue) {
                    statements.push(
                        `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} SET DEFAULT ${newColumn.defaultValue}`
                    );
                } else {
                    statements.push(
                        `ALTER TABLE ${fullTableName} ALTER COLUMN ${quotedColumn} DROP DEFAULT`
                    );
                }
            }
        } else {
            // MySQL/MariaDB uses MODIFY COLUMN
            let sql = `ALTER TABLE ${fullTableName} MODIFY COLUMN ${quotedColumn} ${newColumn.dataType || columnToEdit.dataType}`;
            if (!newColumn.nullable) {
                sql += ' NOT NULL';
            }
            if (newColumn.defaultValue) {
                sql += ` DEFAULT ${newColumn.defaultValue}`;
            }
            statements.push(sql);
        }

        if (newColumn.isForeignKey && (!newColumn.foreignKeyTable || !newColumn.foreignKeyColumn)) {
            toast.error('Select a reference table and column for the foreign key');
            return;
        }

        const existingFk = tableSchema?.foreignKeys.find((fk) => {
            const columns = parseColumnArray(fk.columns);
            return columns.length === 1 && columns[0] === columnToEdit.name;
        });
        const existingFkRefColumn = existingFk
            ? parseColumnArray(existingFk.referencedColumns)[0] || ''
            : '';
        const fkReferenceChanged =
            newColumn.isForeignKey &&
            existingFk &&
            (newColumn.foreignKeyTable !== existingFk.referencedTable ||
                newColumn.foreignKeyColumn !== existingFkRefColumn);
        const shouldDropFk = existingFk && (!newColumn.isForeignKey || fkReferenceChanged);
        const shouldAddFk = newColumn.isForeignKey && (!existingFk || fkReferenceChanged);

        if (newColumn.isPrimaryKey !== columnToEdit.isPrimaryKey) {
            if (newColumn.isPrimaryKey) {
                statements.push(`ALTER TABLE ${fullTableName} ADD PRIMARY KEY (${quotedColumn})`);
            } else if (connection?.engine === 'postgres') {
                const primaryIndex = tableSchema?.indexes.find((idx) => idx.isPrimary);
                if (!primaryIndex?.name) {
                    toast.error('Primary key constraint not found');
                    return;
                }
                statements.push(
                    `ALTER TABLE ${fullTableName} DROP CONSTRAINT ${quoteIdentifierForEngine(
                        primaryIndex.name
                    )}`
                );
            } else {
                statements.push(`ALTER TABLE ${fullTableName} DROP PRIMARY KEY`);
            }
        }

        if (shouldDropFk && existingFk) {
            const dropFkSql =
                connection?.engine === 'postgres'
                    ? `ALTER TABLE ${fullTableName} DROP CONSTRAINT ${quoteIdentifierForEngine(
                          existingFk.name
                      )}`
                    : `ALTER TABLE ${fullTableName} DROP FOREIGN KEY ${quoteIdentifierForEngine(
                          existingFk.name
                      )}`;
            statements.push(dropFkSql);
        }

        if (shouldAddFk) {
            const fkName = `fk_${selectedTable}_${columnToEdit.name}`;
            const fullTargetTable = buildTableNameForEngine(
                selectedSchema,
                newColumn.foreignKeyTable
            );
            const fkSql = `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${quoteIdentifierForEngine(
                fkName
            )} FOREIGN KEY (${quotedColumn}) REFERENCES ${fullTargetTable} (${quoteIdentifierForEngine(
                newColumn.foreignKeyColumn
            )})`;
            statements.push(fkSql);
        }

        try {
            for (const sql of statements) {
                await executeSql.mutateAsync({ sql });
            }
            toast.success(`Column "${columnToEdit.name}" updated`);
            setEditColumnOpen(false);
            setColumnToEdit(null);
            setNewColumn({
                name: '',
                dataType: '',
                nullable: true,
                isPrimaryKey: false,
                isForeignKey: false,
                foreignKeyTable: '',
                foreignKeyColumn: '',
                defaultValue: '',
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update column');
        }
    };

    const handleDeleteColumn = async () => {
        if (!columnToDelete) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, selectedTable);
        const quotedColumn = quoteIdentifierForEngine(columnToDelete.name);

        const sql = `ALTER TABLE ${fullTableName} DROP COLUMN ${quotedColumn}`;

        try {
            await executeSql.mutateAsync({ sql, confirmed: true });
            toast.success(`Column "${columnToDelete.name}" deleted`);
            setDeleteColumnOpen(false);
            setColumnToDelete(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete column');
        }
    };

    // ============ Index Operations ============

    const handleAddIndex = async () => {
        // Primary keys don't need a name, but regular indexes do
        if ((!newIndex.isPrimary && !newIndex.name) || newIndex.columns.length === 0) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, selectedTable);
        const quotedColumns = newIndex.columns.map((c) => quoteIdentifierForEngine(c)).join(', ');

        let sql: string;
        if (newIndex.isPrimary) {
            // Primary key constraint
            if (newIndex.name) {
                // Custom constraint name provided
                const quotedConstraintName = quoteIdentifierForEngine(newIndex.name);
                sql = `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${quotedConstraintName} PRIMARY KEY (${quotedColumns})`;
            } else {
                // Auto-generated name
                sql = `ALTER TABLE ${fullTableName} ADD PRIMARY KEY (${quotedColumns})`;
            }
        } else {
            // Regular or unique index
            const quotedIndexName = quoteIdentifierForEngine(newIndex.name);
            const uniqueKeyword = newIndex.isUnique ? 'UNIQUE ' : '';
            sql = `CREATE ${uniqueKeyword}INDEX ${quotedIndexName} ON ${fullTableName} (${quotedColumns})`;
        }

        try {
            await executeSql.mutateAsync({ sql });
            if (newIndex.isPrimary) {
                const constraintName = newIndex.name || 'PRIMARY KEY';
                toast.success(`Primary key "${constraintName}" created`);
            } else {
                toast.success(`Index "${newIndex.name}" created`);
            }
            setAddIndexOpen(false);
            setNewIndex({ name: '', columns: [], isUnique: false, isPrimary: false });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create constraint');
        }
    };

    const handleRenameIndex = async () => {
        if (!indexToEdit || !editIndexName.trim()) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, selectedTable);
        const quotedOldName = quoteIdentifierForEngine(indexToEdit.name);
        const quotedNewName = quoteIdentifierForEngine(editIndexName.trim());

        let sql: string;
        if (indexToEdit.isPrimary) {
            // Renaming primary key constraints
            if (connection?.engine === 'postgres') {
                sql = `ALTER TABLE ${fullTableName} RENAME CONSTRAINT ${quotedOldName} TO ${quotedNewName}`;
            } else if (connection?.engine === 'mysql' || connection?.engine === 'mariadb') {
                toast.error('MySQL/MariaDB does not support renaming primary keys');
                return;
            } else {
                // SQLite doesn't support renaming constraints
                toast.error('SQLite does not support renaming constraints');
                return;
            }
        } else {
            // Renaming regular indexes
            if (connection?.engine === 'postgres') {
                sql = `ALTER INDEX ${quoteIdentifierForEngine(selectedSchema)}.${quotedOldName} RENAME TO ${quotedNewName}`;
            } else if (connection?.engine === 'mysql' || connection?.engine === 'mariadb') {
                // MySQL doesn't have direct RENAME INDEX, need to recreate
                toast.error(
                    'MySQL/MariaDB does not support renaming indexes directly. Please drop and recreate the index.'
                );
                return;
            } else {
                // SQLite
                sql = `ALTER INDEX ${quotedOldName} RENAME TO ${quotedNewName}`;
            }
        }

        try {
            await executeSql.mutateAsync({ sql });
            const type = indexToEdit.isPrimary ? 'Primary key' : 'Index';
            toast.success(
                `${type} renamed from "${indexToEdit.name}" to "${editIndexName.trim()}"`
            );
            setEditIndexOpen(false);
            setIndexToEdit(null);
            setEditIndexName('');
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : `Failed to rename ${indexToEdit.isPrimary ? 'primary key' : 'index'}`
            );
        }
    };

    const handleDeleteIndex = async () => {
        if (!indexToDelete) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, selectedTable);
        const quotedIndexName = quoteIdentifierForEngine(indexToDelete.name);

        let sql: string;
        if (indexToDelete.isPrimary) {
            // Primary key constraint - use ALTER TABLE DROP CONSTRAINT
            if (connection?.engine === 'postgres') {
                sql = `ALTER TABLE ${fullTableName} DROP CONSTRAINT ${quotedIndexName}`;
            } else if (connection?.engine === 'mysql' || connection?.engine === 'mariadb') {
                sql = `ALTER TABLE ${fullTableName} DROP PRIMARY KEY`;
            } else {
                // SQLite doesn't support dropping primary keys
                toast.error('SQLite does not support dropping primary keys');
                return;
            }
        } else {
            // Regular index
            if (connection?.engine === 'postgres') {
                sql = `DROP INDEX ${quoteIdentifierForEngine(selectedSchema)}.${quotedIndexName}`;
            } else if (connection?.engine === 'mysql' || connection?.engine === 'mariadb') {
                sql = `DROP INDEX ${quotedIndexName} ON ${fullTableName}`;
            } else {
                sql = `DROP INDEX ${quotedIndexName}`;
            }
        }

        try {
            await executeSql.mutateAsync({ sql, confirmed: true });
            const type = indexToDelete.isPrimary ? 'Primary key' : 'Index';
            toast.success(`${type} "${indexToDelete.name}" deleted`);
            setDeleteIndexOpen(false);
            setIndexToDelete(null);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : `Failed to delete ${indexToDelete.isPrimary ? 'primary key' : 'index'}`
            );
        }
    };

    // ============ Foreign Key Operations ============

    const handleAddFk = async () => {
        if (
            !newFk.name ||
            newFk.columns.length === 0 ||
            !newFk.referencedTable ||
            newFk.referencedColumns.length === 0
        )
            return;

        const fullTableName = buildTableNameForEngine(selectedSchema, selectedTable);
        const quotedFkName = quoteIdentifierForEngine(newFk.name);
        const quotedColumns = newFk.columns.map((c) => quoteIdentifierForEngine(c)).join(', ');
        const quotedRefTable = buildTableNameForEngine(
            newFk.referencedSchema,
            newFk.referencedTable
        );
        const quotedRefColumns = newFk.referencedColumns
            .map((c) => quoteIdentifierForEngine(c))
            .join(', ');

        const sql = `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${quotedFkName} FOREIGN KEY (${quotedColumns}) REFERENCES ${quotedRefTable} (${quotedRefColumns}) ON DELETE ${newFk.onDelete} ON UPDATE ${newFk.onUpdate}`;

        try {
            await executeSql.mutateAsync({ sql });
            toast.success(`Foreign key "${newFk.name}" created`);
            setAddFkOpen(false);
            setNewFk({
                name: '',
                columns: [],
                referencedSchema: '',
                referencedTable: '',
                referencedColumns: [],
                onDelete: 'NO ACTION',
                onUpdate: 'NO ACTION',
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create foreign key');
        }
    };

    const handleDeleteFk = async () => {
        if (!fkToDelete) return;

        const fullTableName = buildTableNameForEngine(selectedSchema, selectedTable);
        const quotedFkName = quoteIdentifierForEngine(fkToDelete.name);

        let sql: string;
        if (connection?.engine === 'mysql' || connection?.engine === 'mariadb') {
            sql = `ALTER TABLE ${fullTableName} DROP FOREIGN KEY ${quotedFkName}`;
        } else {
            sql = `ALTER TABLE ${fullTableName} DROP CONSTRAINT ${quotedFkName}`;
        }

        try {
            await executeSql.mutateAsync({ sql, confirmed: true });
            toast.success(`Foreign key "${fkToDelete.name}" deleted`);
            setDeleteFkOpen(false);
            setFkToDelete(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete foreign key');
        }
    };

    // ============ Column Grid ============

    const columnColumns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Column Name',
            flex: 1,
            minWidth: 150,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {params.row.isPrimaryKey && (
                        <StyledTooltip title="Primary Key">
                            <KeyIcon fontSize="small" sx={{ color: 'warning.main' }} />
                        </StyledTooltip>
                    )}
                    <Typography fontFamily="monospace">{params.value}</Typography>
                </Box>
            ),
        },
        {
            field: 'dataType',
            headerName: 'Data Type',
            width: 150,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        bgcolor: 'rgba(99, 102, 241, 0.15)',
                        color: 'rgb(99, 102, 241)',
                    }}
                />
            ),
        },
        {
            field: 'nullable',
            headerName: 'Nullable',
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.value ? 'YES' : 'NO'}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: params.value
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color: params.value ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                    }}
                />
            ),
        },
        {
            field: 'defaultValue',
            headerName: 'Default',
            flex: 1,
            minWidth: 150,
            renderCell: (params) => (
                <Typography
                    fontFamily="monospace"
                    fontSize={12}
                    color="text.secondary"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                    {params.value || '-'}
                </Typography>
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 100,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <StyledTooltip title="Edit Column">
                        <IconButton
                            size="small"
                            onClick={() => {
                                const existingFk = tableSchema?.foreignKeys.find((fk) => {
                                    const columns = parseColumnArray(fk.columns);
                                    return columns.length === 1 && columns[0] === params.row.name;
                                });
                                const referencedColumn = existingFk
                                    ? parseColumnArray(existingFk.referencedColumns)[0] || ''
                                    : '';

                                setColumnToEdit(params.row);
                                setNewColumn({
                                    name: params.row.name,
                                    dataType: params.row.dataType,
                                    nullable: params.row.nullable,
                                    isPrimaryKey: params.row.isPrimaryKey ?? false,
                                    isForeignKey: Boolean(existingFk),
                                    foreignKeyTable: existingFk?.referencedTable || '',
                                    foreignKeyColumn: referencedColumn,
                                    defaultValue: params.row.defaultValue || '',
                                });
                                setEditColumnOpen(true);
                            }}
                            disabled={connection?.readOnly}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </StyledTooltip>
                    <StyledTooltip
                        title={
                            params.row.isPrimaryKey
                                ? 'Cannot delete primary key column'
                                : 'Delete Column'
                        }
                    >
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                    setColumnToDelete(params.row);
                                    setDeleteColumnOpen(true);
                                }}
                                disabled={connection?.readOnly || params.row.isPrimaryKey}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </StyledTooltip>
                </Box>
            ),
        },
    ];

    // ============ Index Grid ============

    const indexColumns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Index Name',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {params.row.isPrimary && (
                        <StyledTooltip title="Primary Key Index">
                            <KeyIcon fontSize="small" sx={{ color: 'warning.main' }} />
                        </StyledTooltip>
                    )}
                    <Typography fontFamily="monospace">{params.value}</Typography>
                </Box>
            ),
        },
        {
            field: 'columns',
            headerName: 'Columns',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => {
                const columns = parseColumnArray(params.value);
                return (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {columns.map((col: string) => (
                            <Chip
                                key={col}
                                label={col}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: 10,
                                    fontFamily: 'monospace',
                                }}
                            />
                        ))}
                    </Box>
                );
            },
        },
        {
            field: 'isUnique',
            headerName: 'Unique',
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.value ? 'YES' : 'NO'}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: params.value ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        color: params.value ? 'rgb(99, 102, 241)' : 'text.secondary',
                    }}
                />
            ),
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 100,
            renderCell: (params) => (
                <Typography fontSize={12} color="text.secondary">
                    {params.value}
                </Typography>
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <StyledTooltip title="Rename">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setIndexToEdit(params.row);
                                    setEditIndexName(params.row.name);
                                    setEditIndexOpen(true);
                                }}
                                disabled={connection?.readOnly}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </StyledTooltip>
                    <StyledTooltip
                        title={
                            params.row.isPrimary ? 'Delete Primary Key Constraint' : 'Delete Index'
                        }
                    >
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                    setIndexToDelete(params.row);
                                    setDeleteIndexOpen(true);
                                }}
                                disabled={connection?.readOnly}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </StyledTooltip>
                </Box>
            ),
        },
    ];

    // ============ Foreign Key Grid ============

    const fkColumns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Constraint Name',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon fontSize="small" sx={{ color: 'info.main' }} />
                    <Typography fontFamily="monospace">{params.value}</Typography>
                </Box>
            ),
        },
        {
            field: 'columns',
            headerName: 'Columns',
            width: 150,
            renderCell: (params) => {
                const columns = parseColumnArray(params.value);
                return (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {columns.map((col: string) => (
                            <Chip
                                key={col}
                                label={col}
                                size="small"
                                sx={{ height: 20, fontSize: 10, fontFamily: 'monospace' }}
                            />
                        ))}
                    </Box>
                );
            },
        },
        {
            field: 'referencedTable',
            headerName: 'References',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => {
                const refColumns = parseColumnArray(params.row.referencedColumns);
                return (
                    <Typography fontFamily="monospace" fontSize={12}>
                        {params.row.referencedSchema}.{params.value}({refColumns.join(', ')})
                    </Typography>
                );
            },
        },
        {
            field: 'onDelete',
            headerName: 'On Delete',
            width: 120,
            renderCell: (params) => (
                <Chip label={params.value} size="small" sx={{ height: 20, fontSize: 10 }} />
            ),
        },
        {
            field: 'onUpdate',
            headerName: 'On Update',
            width: 120,
            renderCell: (params) => (
                <Chip label={params.value} size="small" sx={{ height: 20, fontSize: 10 }} />
            ),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 80,
            sortable: false,
            renderCell: (params) => (
                <StyledTooltip title="Delete Foreign Key">
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                            setFkToDelete(params.row);
                            setDeleteFkOpen(true);
                        }}
                        disabled={connection?.readOnly}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </StyledTooltip>
            ),
        },
    ];

    // Get data types for current engine
    const dataTypes =
        DATA_TYPES[connection?.engine as keyof typeof DATA_TYPES] || DATA_TYPES.postgres;

    if (isLoading) {
        return (
            <GlassCard>
                <LoadingState message="Loading schemas..." size="large" />
            </GlassCard>
        );
    }

    let tableDetailsContent: JSX.Element | null = null;
    if (!selectedTable) {
        tableDetailsContent = (
            <GlassCard>
                <EmptyState
                    icon={<TableChartIcon />}
                    title="Select a table"
                    description="Choose a schema and table above to view and manage its structure."
                />
            </GlassCard>
        );
    } else if (loadingSchema) {
        tableDetailsContent = (
            <GlassCard>
                <LoadingState message="Loading table structure..." size="large" />
            </GlassCard>
        );
    } else if (tableSchema) {
        tableDetailsContent = (
            <GlassCard sx={{ p: 0 }}>
                {/* Details Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={detailsTab}
                        onChange={(_, v) => setDetailsTab(v)}
                        sx={{
                            px: 2,
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                minHeight: 48,
                            },
                        }}
                    >
                        <Tab
                            icon={<ListAltIcon fontSize="small" />}
                            iconPosition="start"
                            label={`Columns (${tableSchema.columns.length})`}
                        />
                        <Tab
                            icon={<KeyIcon fontSize="small" />}
                            iconPosition="start"
                            label={`Indexes (${tableSchema.indexes.length})`}
                        />
                        <Tab
                            icon={<LinkIcon fontSize="small" />}
                            iconPosition="start"
                            label={`Foreign Keys (${tableSchema.foreignKeys.length})`}
                        />
                    </Tabs>
                </Box>
                {detailsTab === 0 && (
                    <Box>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setAddColumnOpen(true)}
                                disabled={connection?.readOnly}
                            >
                                Add Column
                            </Button>
                        </Box>
                        <DataGrid
                            rows={tableSchema.columns.map((col, idx) => ({ id: idx, ...col }))}
                            columns={columnColumns}
                            autoHeight
                            disableRowSelectionOnClick
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 25 } },
                            }}
                            sx={{
                                border: 'none',
                                '& .MuiDataGrid-cell': {
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                },
                                '& .MuiDataGrid-columnHeaders': {
                                    bgcolor: 'background.default',
                                    borderColor: 'divider',
                                },
                            }}
                        />
                    </Box>
                )}
                {detailsTab === 1 && (
                    <Box>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setAddIndexOpen(true)}
                                disabled={connection?.readOnly}
                            >
                                Add Index
                            </Button>
                        </Box>
                        <DataGrid
                            rows={tableSchema.indexes.map((idx, i) => ({ id: i, ...idx }))}
                            columns={indexColumns}
                            autoHeight
                            disableRowSelectionOnClick
                            pageSizeOptions={[10, 25]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 10 } },
                            }}
                            sx={{
                                border: 'none',
                                '& .MuiDataGrid-cell': {
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                },
                                '& .MuiDataGrid-columnHeaders': {
                                    bgcolor: 'background.default',
                                    borderColor: 'divider',
                                },
                            }}
                        />
                    </Box>
                )}
                {detailsTab === 2 && (
                    <Box>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setAddFkOpen(true)}
                                disabled={connection?.readOnly}
                            >
                                Add Foreign Key
                            </Button>
                        </Box>
                        {tableSchema.foreignKeys.length === 0 ? (
                            <EmptyState
                                icon={<LinkIcon />}
                                title="No foreign keys"
                                description="Add a foreign key to define relationships between tables."
                            />
                        ) : (
                            <DataGrid
                                rows={tableSchema.foreignKeys.map((fk, i) => ({
                                    id: i,
                                    ...fk,
                                }))}
                                columns={fkColumns}
                                autoHeight
                                disableRowSelectionOnClick
                                pageSizeOptions={[10, 25]}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 10 } },
                                }}
                                sx={{
                                    border: 'none',
                                    '& .MuiDataGrid-cell': {
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                    },
                                    '& .MuiDataGrid-columnHeaders': {
                                        bgcolor: 'background.default',
                                        borderColor: 'divider',
                                    },
                                }}
                            />
                        )}
                    </Box>
                )}
            </GlassCard>
        );
    }

    return (
        <Box>
            {/* Table Selection */}
            <GlassCard sx={{ mb: 3, p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Schema</InputLabel>
                        <Select
                            value={selectedSchema}
                            onChange={(e) => {
                                const newSchema = e.target.value;
                                setSelectedSchema(newSchema);
                                setSelectedTable('');
                                onSelectionChange?.(newSchema);
                            }}
                            label="Schema"
                        >
                            {schemas.map((schema) => (
                                <MenuItem key={schema} value={schema}>
                                    {schema}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 250 }}>
                        <InputLabel>Table</InputLabel>
                        <Select
                            value={selectedTable}
                            onChange={(e) => {
                                const newTable = e.target.value;
                                setSelectedTable(newTable);
                                onSelectionChange?.(selectedSchema, newTable);
                            }}
                            label="Table"
                            disabled={loadingTables}
                            endAdornment={
                                loadingTables ? <CircularProgress size={20} sx={{ mr: 3 }} /> : null
                            }
                        >
                            {tables.map((table) => (
                                <MenuItem key={table.name} value={table.name}>
                                    {table.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {selectedTable && (
                        <Button
                            size="small"
                            startIcon={<RefreshIcon />}
                            onClick={() => refetchSchema()}
                            disabled={loadingSchema}
                        >
                            Refresh
                        </Button>
                    )}
                </Box>
            </GlassCard>

            {/* Table Details */}
            {tableDetailsContent}

            <AddColumnDialog
                open={addColumnOpen}
                tableName={selectedTable}
                dataTypes={dataTypes}
                tables={tables}
                getColumnsForTable={getColumnsForTable}
                isSubmitting={executeSql.isPending}
                newColumn={newColumn}
                setNewColumn={setNewColumn}
                onClose={() => setAddColumnOpen(false)}
                onSubmit={handleAddColumn}
            />

            <EditColumnDialog
                open={editColumnOpen}
                tableName={selectedTable}
                dataTypes={dataTypes}
                tables={tables}
                getColumnsForTable={getColumnsForTable}
                isSubmitting={executeSql.isPending}
                newColumn={newColumn}
                setNewColumn={setNewColumn}
                onClose={() => setEditColumnOpen(false)}
                onSubmit={handleEditColumn}
            />

            {/* ============ Delete Column Dialog ============ */}
            <Dialog
                open={deleteColumnOpen}
                onClose={() => setDeleteColumnOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}
                >
                    <WarningIcon />
                    Delete Column
                </DialogTitle>
                <DialogContent>
                    <StatusAlert severity="error" sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Warning:</strong> This will permanently delete the column{' '}
                            <strong>&quot;{columnToDelete?.name}&quot;</strong> and ALL data within
                            it.
                        </Typography>
                        <Typography variant="body2">This action cannot be undone.</Typography>
                    </StatusAlert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteColumnOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteColumn}
                        disabled={executeSql.isPending}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <DeleteIcon />
                        }
                    >
                        Delete Column
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ============ Add Index Dialog ============ */}
            <Dialog
                open={addIndexOpen}
                onClose={() => setAddIndexOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <KeyIcon color="primary" />
                    {newIndex.isPrimary ? 'Add Primary Key' : 'Add Index'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            autoFocus
                            fullWidth
                            label={newIndex.isPrimary ? 'Constraint Name (Optional)' : 'Index Name'}
                            value={newIndex.name}
                            onChange={(e) =>
                                setNewIndex((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder={newIndex.isPrimary ? 'pk_table_name' : 'idx_table_column'}
                            helperText={
                                newIndex.isPrimary
                                    ? 'Leave empty for auto-generated name'
                                    : 'Required for indexes'
                            }
                        />
                        <Autocomplete
                            multiple
                            options={tableSchema?.columns.map((c) => c.name) || []}
                            value={newIndex.columns}
                            onChange={(_, value) =>
                                setNewIndex((prev) => ({ ...prev, columns: value }))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Columns"
                                    placeholder="Select columns"
                                />
                            )}
                        />
                        <Box sx={{ display: 'flex', gap: 3 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newIndex.isPrimary}
                                        onChange={(e) =>
                                            setNewIndex((prev) => ({
                                                ...prev,
                                                isPrimary: e.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label="Primary Key"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newIndex.isUnique}
                                        disabled={newIndex.isPrimary}
                                        onChange={(e) =>
                                            setNewIndex((prev) => ({
                                                ...prev,
                                                isUnique: e.target.checked,
                                            }))
                                        }
                                    />
                                }
                                label="Unique Index"
                            />
                        </Box>
                        {newIndex.isPrimary && (
                            <Typography variant="caption" color="text.secondary">
                                Note: Primary keys are implicitly unique and cannot be null
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAddIndexOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddIndex}
                        disabled={
                            (!newIndex.isPrimary && !newIndex.name) ||
                            newIndex.columns.length === 0 ||
                            executeSql.isPending
                        }
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <AddIcon />
                        }
                    >
                        {newIndex.isPrimary ? 'Add Primary Key' : 'Create Index'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ============ Edit Index Dialog ============ */}
            <Dialog
                open={editIndexOpen}
                onClose={() => setEditIndexOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {indexToEdit?.isPrimary ? 'Rename Primary Key' : 'Rename Index'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="New Name"
                        value={editIndexName}
                        onChange={(e) => setEditIndexName(e.target.value)}
                        placeholder={indexToEdit?.isPrimary ? 'pk_table_name' : 'idx_table_column'}
                        sx={{ mt: 2 }}
                        helperText={`Current name: ${indexToEdit?.name}`}
                    />
                    {(connection?.engine === 'mysql' || connection?.engine === 'mariadb') && (
                        <StatusAlert severity="warning" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                MySQL/MariaDB does not support renaming{' '}
                                {indexToEdit?.isPrimary ? 'primary keys' : 'indexes'} directly.
                            </Typography>
                        </StatusAlert>
                    )}
                    {connection?.engine === 'sqlite' && indexToEdit?.isPrimary && (
                        <StatusAlert severity="warning" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                SQLite does not support renaming constraints.
                            </Typography>
                        </StatusAlert>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setEditIndexOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleRenameIndex}
                        disabled={
                            !editIndexName.trim() ||
                            editIndexName.trim() === indexToEdit?.name ||
                            executeSql.isPending ||
                            (connection?.engine === 'mysql' && !indexToEdit?.isPrimary) ||
                            (connection?.engine === 'mariadb' && !indexToEdit?.isPrimary) ||
                            (connection?.engine === 'sqlite' && indexToEdit?.isPrimary)
                        }
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <EditIcon />
                        }
                    >
                        Rename
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ============ Delete Index Dialog ============ */}
            <Dialog
                open={deleteIndexOpen}
                onClose={() => setDeleteIndexOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}
                >
                    <WarningIcon />
                    {indexToDelete?.isPrimary ? 'Delete Primary Key' : 'Delete Index'}
                </DialogTitle>
                <DialogContent>
                    <StatusAlert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            Are you sure you want to delete the{' '}
                            {indexToDelete?.isPrimary ? 'primary key' : 'index'}{' '}
                            <strong>&quot;{indexToDelete?.name}&quot;</strong>?
                        </Typography>
                        {indexToDelete?.isPrimary ? (
                            <Typography variant="body2">
                                <strong>Warning:</strong> This will remove the primary key
                                constraint. Foreign keys referencing this table may fail.
                            </Typography>
                        ) : (
                            <Typography variant="body2">
                                This may affect query performance.
                            </Typography>
                        )}
                    </StatusAlert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteIndexOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteIndex}
                        disabled={executeSql.isPending}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <DeleteIcon />
                        }
                    >
                        {indexToDelete?.isPrimary ? 'Delete Primary Key' : 'Delete Index'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ============ Add Foreign Key Dialog ============ */}
            <Dialog open={addFkOpen} onClose={() => setAddFkOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon color="primary" />
                    Add Foreign Key
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            autoFocus
                            fullWidth
                            label="Constraint Name"
                            value={newFk.name}
                            onChange={(e) =>
                                setNewFk((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="fk_table_column"
                        />

                        <Divider>Source Columns</Divider>

                        <Autocomplete
                            multiple
                            options={tableSchema?.columns.map((c) => c.name) || []}
                            value={newFk.columns}
                            onChange={(_, value) =>
                                setNewFk((prev) => ({ ...prev, columns: value }))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Columns"
                                    placeholder="Select columns"
                                />
                            )}
                        />

                        <Divider>Referenced Table</Divider>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl size="small" sx={{ flex: 1 }}>
                                <InputLabel>Schema</InputLabel>
                                <Select
                                    value={newFk.referencedSchema}
                                    onChange={(e) =>
                                        setNewFk((prev) => ({
                                            ...prev,
                                            referencedSchema: e.target.value,
                                            referencedTable: '',
                                            referencedColumns: [],
                                        }))
                                    }
                                    label="Schema"
                                >
                                    {schemas.map((schema) => (
                                        <MenuItem key={schema} value={schema}>
                                            {schema}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ flex: 1 }}>
                                <InputLabel>Table</InputLabel>
                                <Select
                                    value={newFk.referencedTable}
                                    onChange={(e) =>
                                        setNewFk((prev) => ({
                                            ...prev,
                                            referencedTable: e.target.value,
                                            referencedColumns: [],
                                        }))
                                    }
                                    label="Table"
                                    disabled={!newFk.referencedSchema}
                                >
                                    {referencedTables.map((table) => (
                                        <MenuItem key={table.name} value={table.name}>
                                            {table.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Autocomplete
                            multiple
                            options={referencedTableSchema?.columns.map((c) => c.name) || []}
                            value={newFk.referencedColumns}
                            onChange={(_, value) =>
                                setNewFk((prev) => ({ ...prev, referencedColumns: value }))
                            }
                            disabled={!newFk.referencedTable}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Referenced Columns"
                                    placeholder="Select columns"
                                />
                            )}
                        />

                        <Divider>Actions</Divider>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl size="small" sx={{ flex: 1 }}>
                                <InputLabel>On Delete</InputLabel>
                                <Select
                                    value={newFk.onDelete}
                                    onChange={(e) =>
                                        setNewFk((prev) => ({ ...prev, onDelete: e.target.value }))
                                    }
                                    label="On Delete"
                                >
                                    <MenuItem value="NO ACTION">NO ACTION</MenuItem>
                                    <MenuItem value="CASCADE">CASCADE</MenuItem>
                                    <MenuItem value="SET NULL">SET NULL</MenuItem>
                                    <MenuItem value="SET DEFAULT">SET DEFAULT</MenuItem>
                                    <MenuItem value="RESTRICT">RESTRICT</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ flex: 1 }}>
                                <InputLabel>On Update</InputLabel>
                                <Select
                                    value={newFk.onUpdate}
                                    onChange={(e) =>
                                        setNewFk((prev) => ({ ...prev, onUpdate: e.target.value }))
                                    }
                                    label="On Update"
                                >
                                    <MenuItem value="NO ACTION">NO ACTION</MenuItem>
                                    <MenuItem value="CASCADE">CASCADE</MenuItem>
                                    <MenuItem value="SET NULL">SET NULL</MenuItem>
                                    <MenuItem value="SET DEFAULT">SET DEFAULT</MenuItem>
                                    <MenuItem value="RESTRICT">RESTRICT</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAddFkOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddFk}
                        disabled={
                            !newFk.name ||
                            newFk.columns.length === 0 ||
                            !newFk.referencedTable ||
                            newFk.referencedColumns.length === 0 ||
                            newFk.columns.length !== newFk.referencedColumns.length ||
                            executeSql.isPending
                        }
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <AddIcon />
                        }
                    >
                        Create Foreign Key
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ============ Delete Foreign Key Dialog ============ */}
            <Dialog
                open={deleteFkOpen}
                onClose={() => setDeleteFkOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}
                >
                    <WarningIcon />
                    Delete Foreign Key
                </DialogTitle>
                <DialogContent>
                    <StatusAlert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            Are you sure you want to delete the foreign key constraint{' '}
                            <strong>&quot;{fkToDelete?.name}&quot;</strong>?
                        </Typography>
                        <Typography variant="body2">
                            This will remove the referential integrity constraint between tables.
                        </Typography>
                    </StatusAlert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteFkOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteFk}
                        disabled={executeSql.isPending}
                        startIcon={
                            executeSql.isPending ? <CircularProgress size={16} /> : <DeleteIcon />
                        }
                    >
                        Delete Foreign Key
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
