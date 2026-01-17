import {
    Box,
    Typography,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
    CircularProgress,
    Button,

} from '@mui/material';
import { StyledTooltip } from '../../components/StyledTooltip';
import Editor from '@monaco-editor/react';
import KeyIcon from '@mui/icons-material/Key';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import type { TableSchema } from '@dbnexus/shared';

interface SchemaTabProps {
    readonly schema?: TableSchema;
    readonly loading: boolean;
}

export function StructureTab({ schema, loading }: SchemaTabProps) {
    if (loading) return <LinearProgress />;
    if (!schema) return null;

    return (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Column
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Type
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Nullable
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Default
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Key
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {schema.columns.map((col) => (
                            <TableRow key={col.name} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {col.isPrimaryKey && (
                                            <KeyIcon
                                                fontSize="small"
                                                sx={{ color: 'warning.main' }}
                                            />
                                        )}
                                        <Typography
                                            variant="body2"
                                            fontWeight={col.isPrimaryKey ? 600 : 400}
                                        >
                                            {col.name}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={col.dataType}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontFamily: 'monospace', fontSize: 11 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={col.nullable ? 'NULL' : 'NOT NULL'}
                                        size="small"
                                        color={col.nullable ? 'default' : 'primary'}
                                        sx={{ fontSize: 10 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    {col.defaultValue ? (
                                        <Typography
                                            variant="body2"
                                            fontFamily="monospace"
                                            color="text.secondary"
                                        >
                                            {col.defaultValue}
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="text.disabled">
                                            —
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {col.isPrimaryKey && (
                                            <Chip
                                                label="PK"
                                                size="small"
                                                color="warning"
                                                sx={{ fontSize: 10 }}
                                            />
                                        )}
                                        {col.isUnique && (
                                            <Chip
                                                label="UQ"
                                                size="small"
                                                color="info"
                                                sx={{ fontSize: 10 }}
                                            />
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export function IndexesTab({ schema, loading }: SchemaTabProps) {
    if (loading) return <LinearProgress />;
    if (!schema) return null;

    if (schema.indexes.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <KeyIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography>No indexes defined</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Name
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Columns
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Type
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Properties
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {schema.indexes.map((idx, index) => {
                            const columns = Array.isArray(idx.columns) ? idx.columns : [];
                            return (
                                <TableRow key={idx.name || index} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {idx.name || `idx_${index}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {columns.map((col) => (
                                                <Chip
                                                    key={col}
                                                    label={col}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontFamily: 'monospace', fontSize: 11 }}
                                                />
                                            ))}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {idx.type || 'btree'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {idx.isPrimary && (
                                                <Chip
                                                    label="PRIMARY"
                                                    size="small"
                                                    color="warning"
                                                    sx={{ fontSize: 10 }}
                                                />
                                            )}
                                            {idx.isUnique && (
                                                <Chip
                                                    label="UNIQUE"
                                                    size="small"
                                                    color="info"
                                                    sx={{ fontSize: 10 }}
                                                />
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export function ForeignKeysTab({ schema, loading }: SchemaTabProps) {
    if (loading) return <LinearProgress />;
    if (!schema) return null;

    if (schema.foreignKeys.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <LinkIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography>No foreign keys defined</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TableContainer>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Name
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                Columns
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                References
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                On Delete
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                                On Update
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {schema.foreignKeys.map((fk, index) => {
                            const columns = Array.isArray(fk.columns) ? fk.columns : [];
                            const referencedColumns = Array.isArray(fk.referencedColumns)
                                ? fk.referencedColumns
                                : [];

                            return (
                                <TableRow key={fk.name || index} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {fk.name || `fk_${index}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {columns.map((col) => (
                                                <Chip
                                                    key={col}
                                                    label={col}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontFamily: 'monospace', fontSize: 11 }}
                                                />
                                            ))}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontFamily="monospace">
                                            {fk.referencedSchema}.{fk.referencedTable}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            ({referencedColumns.join(', ')})
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={fk.onDelete || 'NO ACTION'}
                                            size="small"
                                            color={fk.onDelete === 'CASCADE' ? 'error' : 'default'}
                                            sx={{ fontSize: 10 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={fk.onUpdate || 'NO ACTION'}
                                            size="small"
                                            color={
                                                fk.onUpdate === 'CASCADE' ? 'warning' : 'default'
                                            }
                                            sx={{ fontSize: 10 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

interface SqlTabProps {
    readonly sql: string;
    readonly onSqlChange: (sql: string) => void;
    readonly onExecute: () => void;
    readonly onSave?: () => void;
    readonly onKeyDown: (e: React.KeyboardEvent) => void;
    readonly loading: boolean;
}

export function SqlTab({ sql, onSqlChange, onExecute, onSave, onKeyDown, loading }: SqlTabProps) {
    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1 }} onKeyDown={onKeyDown}>
                <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={sql}
                    onChange={(value) => onSqlChange(value ?? '')}
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
            <Box
                sx={{
                    p: 1.5,
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'background.paper',
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    Press ⌘+Enter to execute • ⌘+S to save
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {onSave && (
                        <StyledTooltip title="Save Query (⌘+S)">
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<BookmarkBorderIcon />}
                                onClick={onSave}
                                disabled={!sql.trim()}
                            >
                                Save
                            </Button>
                        </StyledTooltip>
                    )}
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={
                            loading ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <PlayArrowIcon />
                            )
                        }
                        onClick={onExecute}
                        disabled={!sql.trim() || loading}
                    >
                        Run Query
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
