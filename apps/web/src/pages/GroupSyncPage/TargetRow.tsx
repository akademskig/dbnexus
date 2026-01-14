import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    Alert,
    TableRow,
    TableCell,
    IconButton,
    Collapse,
    Tabs,
    Tab,
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    Storage as DatabaseIcon,
    Refresh as RefreshIcon,
    Schema as SchemaIcon,
    TableChart as DataIcon,
} from '@mui/icons-material';
import { schemaApi } from '../../lib/api';
import { StatusIcon, StatusChip } from './StatusComponents';
import { SchemaDiffDisplay } from './SchemaDiffDisplay';
import { DataDiffDisplay } from '../../components/DataDiffDisplay';
import type { InstanceGroupTargetStatus } from '@dbnexus/shared';
import { useToastStore } from '../../stores/toastStore';

interface TargetRowProps {
    target: InstanceGroupTargetStatus;
    group: { id: string; projectId: string; syncSchema: boolean; syncData: boolean };
    sourceConnectionId: string;
    sourceSchema: string;
    targetSchema: string;
}

export function TargetRow({
    target,
    group,
    sourceConnectionId,
    sourceSchema,
    targetSchema,
}: TargetRowProps) {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0); // 0 = Schema, 1 = Data
    const [applying, setApplying] = useState(false);
    const queryClient = useQueryClient();
    const toast = useToastStore();

    // Use diff data from the status response (no separate API call needed!)
    const schemaDiff = target.schemaDiff;
    const migrationSql = target.migrationSql || [];
    const dataDiff = target.dataDiff || [];

    const handleApplyMigration = async () => {
        setApplying(true);
        try {
            await schemaApi.applyMigration(
                sourceConnectionId,
                target.connectionId,
                sourceSchema,
                targetSchema,
                'Applied from Instance Group Sync'
            );
            queryClient.invalidateQueries({ queryKey: ['groupSyncStatus'] });
            toast.success('Migration applied successfully');
            // Collapse after successful migration
            setExpanded(false);
        } catch (error) {
            console.error('Failed to apply migration:', error);
            toast.error('Failed to apply migration');
        } finally {
            setApplying(false);
        }
    };

    const handleDataSyncComplete = () => {
        queryClient.invalidateQueries({ queryKey: ['groupSyncStatus'] });
    };

    return (
        <>
            <TableRow
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => setExpanded(!expanded)}
            >
                <TableCell>
                    <IconButton size="small">
                        {expanded ? <CollapseIcon /> : <ExpandIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DatabaseIcon sx={{ color: 'primary.main' }} />
                        <Typography fontWeight={500}>{target.connectionName}</Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIcon status={target.schemaStatus} />
                        <StatusChip status={target.schemaStatus} />
                        {target.schemaDiffCount !== undefined && target.schemaDiffCount > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                ({target.schemaDiffCount} differences)
                            </Typography>
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIcon status={target.dataStatus} />
                        <StatusChip status={target.dataStatus} />
                        {target.dataDiffSummary && (
                            <Typography variant="caption" color="text.secondary">
                                {target.dataDiffSummary}
                            </Typography>
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={(e) => {
                                e.stopPropagation();
                                // Invalidate the status cache to force refetch (includes diff data)
                                queryClient.invalidateQueries({
                                    queryKey: ['groupSyncStatus'],
                                });
                                // Expand if not already
                                if (!expanded) setExpanded(true);
                            }}
                        >
                            Recheck
                        </Button>
                    </Box>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={5} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
                    <Collapse in={expanded}>
                        <Box sx={{ py: 1 }}>
                            {target.error && (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                    {target.error}
                                </Alert>
                            )}

                            {/* Tabs for Schema and Data */}
                            <Tabs
                                value={activeTab}
                                onChange={(_, v) => setActiveTab(v)}
                                sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
                            >
                                <Tab
                                    icon={<SchemaIcon fontSize="small" />}
                                    iconPosition="start"
                                    label={`Schema ${target.schemaDiffCount ? `(${target.schemaDiffCount})` : ''}`}
                                    sx={{ minHeight: 48 }}
                                    disabled={!group.syncSchema}
                                />
                                <Tab
                                    icon={<DataIcon fontSize="small" />}
                                    iconPosition="start"
                                    label={`Data ${dataDiff.length > 0 ? `(${dataDiff.filter((d) => d.sourceCount !== d.targetCount || d.missingInTarget > 0).length} tables)` : ''}`}
                                    sx={{ minHeight: 48 }}
                                    disabled={!group.syncData}
                                />
                            </Tabs>

                            {/* Schema Tab */}
                            {activeTab === 0 && group.syncSchema && (
                                <Box sx={{ pt: 1 }}>
                                    {schemaDiff ? (
                                        <SchemaDiffDisplay
                                            diff={schemaDiff}
                                            migrationSql={migrationSql}
                                            onApplyMigration={handleApplyMigration}
                                            applying={applying}
                                        />
                                    ) : target.schemaStatus === 'in_sync' ? (
                                        <Alert severity="success">Schema is in sync</Alert>
                                    ) : (
                                        <Alert severity="info">
                                            Click "Recheck" to load schema diff
                                        </Alert>
                                    )}
                                </Box>
                            )}

                            {/* Data Tab with shared DataDiffDisplay */}
                            {activeTab === 1 && group.syncData && (
                                <Box sx={{ py: 1 }}>
                                    {dataDiff.length > 0 ? (
                                        <DataDiffDisplay
                                            sourceConnectionId={sourceConnectionId}
                                            targetConnectionId={target.connectionId}
                                            sourceSchema={sourceSchema}
                                            targetSchema={targetSchema}
                                            dataDiff={dataDiff}
                                            onSyncComplete={handleDataSyncComplete}
                                            compact
                                        />
                                    ) : target.dataStatus === 'in_sync' ? (
                                        <Alert severity="success" sx={{ mt: 1 }}>
                                            All tables are in sync
                                        </Alert>
                                    ) : (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            Click "Recheck" to load data diff
                                        </Alert>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}
