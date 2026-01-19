import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    TableRow,
    TableCell,
    IconButton,
    Collapse,
    Tabs,
    Tab,
    CircularProgress,
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    Storage as DatabaseIcon,
    Refresh as RefreshIcon,
    Schema as SchemaIcon,
    TableChart as DataIcon,
} from '@mui/icons-material';
import { schemaApi, syncApi } from '../../lib/api';
import { StatusIcon, StatusChip } from './StatusComponents';
import { SchemaDiffDisplay } from './SchemaDiffDisplay';
import { DataDiffDisplay } from '../../components/DataDiffDisplay';
import type { InstanceGroupTargetStatus } from '@dbnexus/shared';
import { useToastStore } from '../../stores/toastStore';
import { StatusAlert } from '@/components/StatusAlert';

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
    const [currentTarget, setCurrentTarget] = useState<InstanceGroupTargetStatus>(target);
    const queryClient = useQueryClient();
    const toast = useToastStore();

    // Sync currentTarget with the target prop when it changes
    useEffect(() => {
        setCurrentTarget(target);
    }, [target]);

    // Use diff data from the current target state
    const schemaDiff = currentTarget.schemaDiff;
    const migrationSql = currentTarget.migrationSql || [];
    const dataDiff = currentTarget.dataDiff || [];

    // Mutation to recheck a single target
    const recheckMutation = useMutation({
        mutationFn: async () => {
            const result = await syncApi.checkSingleTargetStatus(group.id, target.connectionId);
            if (!result) {
                throw new Error('Failed to check target status');
            }
            return result;
        },
        onSuccess: (data) => {
            setCurrentTarget(data);
            // Also invalidate the group status to keep it in sync
            queryClient.invalidateQueries({ queryKey: ['groupSyncStatus', group.id] });
            toast.success('Status updated');
        },
        onError: (error) => {
            console.error('Failed to recheck status:', error);
            toast.error('Failed to recheck status');
        },
    });

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
            // Recheck after applying migration
            recheckMutation.mutate();
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
        // Recheck after data sync
        recheckMutation.mutate();
    };

    const handleRecheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        recheckMutation.mutate();
        // Expand if not already
        if (!expanded) setExpanded(true);
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
                        <StatusIcon status={currentTarget.schemaStatus} />
                        <StatusChip status={currentTarget.schemaStatus} />
                        {currentTarget.schemaDiffCount !== undefined &&
                            currentTarget.schemaDiffCount > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    ({currentTarget.schemaDiffCount} differences)
                                </Typography>
                            )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIcon status={currentTarget.dataStatus} />
                        <StatusChip status={currentTarget.dataStatus} />
                        {currentTarget.dataDiffSummary && (
                            <Typography variant="caption" color="text.secondary">
                                {currentTarget.dataDiffSummary}
                            </Typography>
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={
                                recheckMutation.isPending ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <RefreshIcon />
                                )
                            }
                            onClick={handleRecheck}
                            disabled={recheckMutation.isPending}
                        >
                            {recheckMutation.isPending ? 'Checking...' : 'Recheck'}
                        </Button>
                    </Box>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={5} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
                    <Collapse in={expanded}>
                        <Box sx={{ py: 1 }}>
                            {currentTarget.error && (
                                <StatusAlert severity="error" sx={{ mb: 1 }}>
                                    {currentTarget.error}
                                </StatusAlert>
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
                                    label={`Schema ${currentTarget.schemaDiffCount ? `(${currentTarget.schemaDiffCount})` : ''}`}
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
                                    ) : currentTarget.schemaStatus === 'in_sync' ? (
                                        <StatusAlert severity="success">
                                            Schema is in sync
                                        </StatusAlert>
                                    ) : (
                                        <StatusAlert severity="info">
                                            Click &quot;Recheck&quot; to load schema diff
                                        </StatusAlert>
                                    )}
                                </Box>
                            )}

                            {/* Data Tab with shared DataDiffDisplay */}
                            {activeTab === 1 && group.syncData && (
                                <Box sx={{ pt: 1 }}>
                                    {dataDiff.length > 0 ? (
                                        <DataDiffDisplay
                                            sourceConnectionId={sourceConnectionId}
                                            targetConnectionId={currentTarget.connectionId}
                                            sourceSchema={sourceSchema}
                                            targetSchema={targetSchema}
                                            dataDiff={dataDiff}
                                            onSyncComplete={handleDataSyncComplete}
                                        />
                                    ) : currentTarget.dataStatus === 'in_sync' ? (
                                        <StatusAlert severity="success" sx={{ mt: 1 }}>
                                            All tables are in sync
                                        </StatusAlert>
                                    ) : (
                                        <StatusAlert severity="info" sx={{ mt: 1 }}>
                                            Click &quot;Recheck&quot; to load data diff
                                        </StatusAlert>
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
