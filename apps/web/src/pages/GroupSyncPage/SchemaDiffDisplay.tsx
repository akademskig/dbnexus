import { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    alpha,
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
    ContentCopy as CopyIcon,
    Check as CheckIcon,
    Sync as SyncIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { DiffTypeBadge } from './StatusComponents';
import type { SchemaDiff, SchemaDiffItem } from '@dbnexus/shared';
import { StatusAlert } from '@/components/StatusAlert';

interface SchemaDiffDisplayProps {
    readonly diff: SchemaDiff;
    readonly migrationSql: string[];
    readonly onApplyMigration: (tables?: string[]) => void;
    readonly applying: boolean;
    readonly applyingTables?: string[];
}

export function SchemaDiffDisplay({
    diff,
    migrationSql,
    onApplyMigration,
    applying,
    applyingTables = [],
}: SchemaDiffDisplayProps) {
    const [copied, setCopied] = useState(false);
    const [copiedTable, setCopiedTable] = useState<string | null>(null);
    const [copiedStatement, setCopiedStatement] = useState<string | null>(null);
    const sqlText = migrationSql.join('\n\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyTable = (tableName: string, sql: string) => {
        navigator.clipboard.writeText(sql);
        setCopiedTable(tableName);
        setTimeout(() => setCopiedTable(null), 2000);
    };

    const handleCopyStatement = (statementKey: string, sql: string) => {
        navigator.clipboard.writeText(sql);
        setCopiedStatement(statementKey);
        setTimeout(() => setCopiedStatement(null), 2000);
    };

    const getTableSql = (_tableName: string, items: SchemaDiffItem[]) => {
        return items.flatMap((item) => item.migrationSql || []).join('\n');
    };

    // Group items by table
    const groupedItems = useMemo(() => {
        const groups: Record<string, SchemaDiffItem[]> = {};
        for (const item of diff.items) {
            const key = item.table || 'Other';
            groups[key] ??= [];
            groups[key]?.push(item);
        }
        return groups;
    }, [diff.items]);

    // Calculate totals
    const totalAdded =
        diff.summary.tablesAdded +
        diff.summary.columnsAdded +
        diff.summary.indexesAdded +
        diff.summary.fksAdded;
    const totalRemoved =
        diff.summary.tablesRemoved +
        diff.summary.columnsRemoved +
        diff.summary.indexesRemoved +
        diff.summary.fksRemoved;
    const totalModified =
        diff.summary.columnsModified + diff.summary.indexesModified + diff.summary.fksModified;

    if (diff.items.length === 0) {
        return (
            <StatusAlert severity="success">Schemas are in sync! No differences found.</StatusAlert>
        );
    }

    return (
        <Box>
            {/* Summary */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {totalAdded > 0 && (
                    <Chip
                        icon={<AddIcon sx={{ fontSize: 14 }} />}
                        label={`${totalAdded} added`}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: 11,
                            bgcolor: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            '& .MuiChip-icon': { color: '#22c55e' },
                        }}
                    />
                )}
                {totalRemoved > 0 && (
                    <Chip
                        icon={<RemoveIcon sx={{ fontSize: 14 }} />}
                        label={`${totalRemoved} removed`}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: 11,
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            '& .MuiChip-icon': { color: '#ef4444' },
                        }}
                    />
                )}
                {totalModified > 0 && (
                    <Chip
                        icon={<EditIcon sx={{ fontSize: 14 }} />}
                        label={`${totalModified} modified`}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: 11,
                            bgcolor: 'rgba(245, 158, 11, 0.1)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            '& .MuiChip-icon': { color: '#f59e0b' },
                        }}
                    />
                )}
            </Box>

            {/* Grouped diff items */}
            {Object.entries(groupedItems).map(([tableName, items]) => {
                const tableSql = getTableSql(tableName, items);
                const isApplyingTable = applyingTables.includes(tableName);
                const isCopiedTable = copiedTable === tableName;

                return (
                    <Accordion
                        key={tableName}
                        defaultExpanded
                        disableGutters
                        sx={{
                            mb: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            '&:before': { display: 'none' },
                            '&.Mui-expanded': { margin: 0, mb: 1 },
                            boxShadow: 'none',
                        }}
                    >
                        <AccordionSummary
                            expandIcon={
                                <ExpandIcon
                                    sx={{
                                        fontSize: 18,
                                        color: 'text.disabled',
                                        transition: 'transform 0.2s ease',
                                    }}
                                />
                            }
                            sx={{
                                px: 1.5,
                                minHeight: 36,
                                '&.Mui-expanded': { minHeight: 36 },
                                '& .MuiAccordionSummary-content': { my: 0.5, alignItems: 'center' },
                                '& .MuiAccordionSummary-content.Mui-expanded': { my: 0.5 },
                                '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
                                    transform: 'rotate(180deg)',
                                },
                            }}
                        >
                            <Typography fontSize={13} fontWeight={600} fontFamily="monospace">
                                {tableName}
                            </Typography>
                            <Box
                                sx={{
                                    ml: 'auto',
                                    mr: 1,
                                    display: 'flex',
                                    gap: 0.5,
                                    alignItems: 'center',
                                }}
                            >
                                {items.map((item) => (
                                    <DiffTypeBadge
                                        key={`${item.type}-${item.name}`}
                                        type={item.type}
                                    />
                                ))}
                                {tableSql && (
                                    <>
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyTable(tableName, tableSql);
                                            }}
                                            sx={{
                                                ml: 1,
                                                minWidth: 'auto',
                                                px: 0.75,
                                                py: 0.25,
                                                fontSize: 10,
                                            }}
                                        >
                                            {isCopiedTable ? (
                                                <CheckIcon sx={{ fontSize: 12 }} />
                                            ) : (
                                                <CopyIcon sx={{ fontSize: 12 }} />
                                            )}
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="warning"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onApplyMigration([tableName]);
                                            }}
                                            disabled={applying || isApplyingTable}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 1,
                                                py: 0.25,
                                                fontSize: 10,
                                            }}
                                        >
                                            {isApplyingTable ? (
                                                <CircularProgress size={10} />
                                            ) : (
                                                'Apply'
                                            )}
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails
                            sx={{
                                px: 1.5,
                                py: 1,
                                bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                            }}
                        >
                            {items.map((item) => {
                                const itemKey = `${item.type}-${item.name}-${item.table}`;
                                const itemSql = item.migrationSql?.join('\n') || '';
                                const isCopiedStatement = copiedStatement === itemKey;

                                return (
                                    <Box
                                        key={itemKey}
                                        sx={{
                                            p: 1,
                                            mb: 0.5,
                                            bgcolor: 'background.paper',
                                            borderRadius: 0.5,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            '&:last-child': { mb: 0 },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 0.5,
                                            }}
                                        >
                                            <DiffTypeBadge type={item.type} />
                                            <Typography
                                                variant="body2"
                                                fontSize={12}
                                                fontWeight={500}
                                            >
                                                {item.type.replaceAll('_', ' ')}:{' '}
                                                {item.name || item.table}
                                            </Typography>
                                            {itemSql && (
                                                <Button
                                                    size="small"
                                                    variant="text"
                                                    onClick={() =>
                                                        handleCopyStatement(itemKey, itemSql)
                                                    }
                                                    sx={{
                                                        ml: 'auto',
                                                        minWidth: 'auto',
                                                        px: 0.5,
                                                        py: 0,
                                                        fontSize: 10,
                                                        color: 'text.secondary',
                                                        '&:hover': { color: 'primary.main' },
                                                    }}
                                                >
                                                    {isCopiedStatement ? (
                                                        <CheckIcon sx={{ fontSize: 12 }} />
                                                    ) : (
                                                        <CopyIcon sx={{ fontSize: 12 }} />
                                                    )}
                                                </Button>
                                            )}
                                        </Box>
                                        {item.migrationSql && item.migrationSql.length > 0 && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                component="pre"
                                                sx={{
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: 'monospace',
                                                    fontSize: 11,
                                                    m: 0,
                                                    mt: 0.5,
                                                    p: 1,
                                                    bgcolor: (theme) =>
                                                        alpha(
                                                            theme.palette.background.default,
                                                            0.8
                                                        ),
                                                    borderRadius: 0.5,
                                                }}
                                            >
                                                {item.migrationSql.join('\n')}
                                            </Typography>
                                        )}
                                    </Box>
                                );
                            })}
                        </AccordionDetails>
                    </Accordion>
                );
            })}

            {/* Migration SQL */}
            {migrationSql.length > 0 && (
                <Box
                    sx={{
                        mt: 2,
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.03),
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                        }}
                    >
                        <Typography variant="subtitle2" fontSize={12} fontWeight={600}>
                            Migration SQL
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                variant="text"
                                startIcon={
                                    copied ? (
                                        <CheckIcon sx={{ fontSize: 14 }} />
                                    ) : (
                                        <CopyIcon sx={{ fontSize: 14 }} />
                                    )
                                }
                                onClick={handleCopy}
                                sx={{ fontSize: 11, minWidth: 'auto' }}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                startIcon={
                                    applying ? (
                                        <CircularProgress size={12} />
                                    ) : (
                                        <SyncIcon sx={{ fontSize: 14 }} />
                                    )
                                }
                                onClick={() => onApplyMigration()}
                                disabled={applying}
                                sx={{ fontSize: 11 }}
                            >
                                Apply All
                            </Button>
                        </Box>
                    </Box>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            bgcolor: 'background.default',
                            maxHeight: 200,
                            overflow: 'auto',
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography
                            component="pre"
                            sx={{
                                fontFamily: 'monospace',
                                fontSize: 11,
                                whiteSpace: 'pre-wrap',
                                m: 0,
                                color: 'text.secondary',
                            }}
                        >
                            {sqlText}
                        </Typography>
                    </Paper>
                </Box>
            )}
        </Box>
    );
}
