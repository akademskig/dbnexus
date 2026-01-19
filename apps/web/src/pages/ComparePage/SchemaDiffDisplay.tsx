import { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Chip,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
    Sync as SyncIcon,
    ContentCopy as CopyIcon,
    Check as CheckIcon,
} from '@mui/icons-material';
import type { SchemaDiff, SchemaDiffItem } from '@dbnexus/shared';
import { DiffTypeBadge } from './DiffTypeBadge';
import { OperationResultItem, StatusAlert } from '@/components/StatusAlert';

interface SchemaDiffDisplayProps {
    diff: SchemaDiff;
    migrationSql: string[];
    onApplyMigration: () => void;
    applying: boolean;
}

export function SchemaDiffDisplay({
    diff,
    migrationSql,
    onApplyMigration,
    applying,
}: SchemaDiffDisplayProps) {
    const [copied, setCopied] = useState(false);

    const sqlText = migrationSql.join('\n\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Group diff items by table
    const groupedItems = useMemo(() => {
        const groups: Record<string, SchemaDiffItem[]> = {};
        for (const item of diff.items) {
            const tableName = item.table || 'General';
            groups[tableName] ??= [];
            groups[tableName]!.push(item);
        }
        return groups;
    }, [diff.items]);

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
            <StatusAlert severity="success">
                Schemas are identical - no differences found.
            </StatusAlert>
        );
    }

    return (
        <Box>
            {/* Summary chips */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                    label={`${totalAdded} added`}
                    size="small"
                    sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
                />
                <Chip
                    label={`${totalRemoved} removed`}
                    size="small"
                    sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                />
                <Chip
                    label={`${totalModified} modified`}
                    size="small"
                    sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}
                />
            </Box>

            {/* Grouped diff items */}
            {Object.entries(groupedItems).map(([tableName, items]) => (
                <Accordion key={tableName} defaultExpanded sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                        <Typography fontWeight={500}>{tableName}</Typography>
                        <Box sx={{ ml: 2, display: 'flex', gap: 0.5 }}>
                            {items.map((item, idx) => (
                                <DiffTypeBadge key={idx} type={item.type} />
                            ))}
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        {items.map((item, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    p: 1.5,
                                    mb: 1,
                                    bgcolor: 'background.default',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <DiffTypeBadge type={item.type} />
                                    <Typography variant="body2" fontWeight={500}>
                                        {item.type.replace(/_/g, ' ')}: {item.name || item.table}
                                    </Typography>
                                </Box>
                                {item.migrationSql && item.migrationSql.length > 0 && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        component="pre"
                                        sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                                    >
                                        {item.migrationSql.join('\n')}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                    </AccordionDetails>
                </Accordion>
            ))}

            {/* Migration SQL */}
            {migrationSql.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                        }}
                    >
                        <Typography variant="subtitle2">Migration SQL</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                startIcon={copied ? <CheckIcon /> : <CopyIcon />}
                                onClick={handleCopy}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                startIcon={applying ? <CircularProgress size={16} /> : <SyncIcon />}
                                onClick={onApplyMigration}
                                disabled={applying}
                            >
                                Apply Migration
                            </Button>
                        </Box>
                    </Box>
                    <Paper
                        sx={{
                            p: 2,
                            bgcolor: 'background.default',
                            maxHeight: 300,
                            overflow: 'auto',
                        }}
                    >
                        <Typography
                            component="pre"
                            sx={{
                                fontFamily: 'monospace',
                                fontSize: 12,
                                whiteSpace: 'pre-wrap',
                                m: 0,
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
