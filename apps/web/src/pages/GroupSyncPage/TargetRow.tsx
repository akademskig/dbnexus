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
    alpha,
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
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
    const [applyingTables, setApplyingTables] = useState<string[]>([]);
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

    const handleApplyMigration = async (tables?: string[]) => {
        const isTableMigration = tables && tables.length > 0;
        if (isTableMigration) {
            setApplyingTables((prev) => [...prev, ...tables]);
        } else {
            setApplying(true);
        }

        try {
            const description = isTableMigration
                ? `Applied for table(s): ${tables.join(', ')}`
                : 'Applied from Instance Group Sync';
            const result = await schemaApi.applyMigration(
                sourceConnectionId,
                target.connectionId,
                sourceSchema,
                targetSchema,
                description,
                tables
            );
            // Check if migration actually succeeded
            if (!result.success) {
                console.error('Migration failed:', result.error);
                toast.error(`Migration failed: ${result.error || 'Unknown error'}`);
                return;
            }
            // Recheck after applying migration
            recheckMutation.mutate();
            toast.success(
                isTableMigration
                    ? `Migration applied for ${tables.join(', ')}`
                    : 'Migration applied successfully'
            );
            // Only collapse after full migration, not table-specific
            if (!isTableMigration) {
                setExpanded(false);
            }
        } catch (error) {
            console.error('Failed to apply migration:', error);
            toast.error('Failed to apply migration');
        } finally {
            if (isTableMigration) {
                setApplyingTables((prev) => prev.filter((t) => !tables.includes(t)));
            } else {
                setApplying(false);
            }
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
                sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    ...(expanded && {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    }),
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <TableCell sx={{ pl: 1, py: 1 }}>
                    <IconButton size="small" sx={{ p: 0.5 }}>
                        <ExpandIcon
                            sx={{
                                fontSize: 18,
                                color: 'text.disabled',
                                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                            }}
                        />
                    </IconButton>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DatabaseIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                        <Typography fontSize={13} fontWeight={500}>
                            {target.connectionName}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <StatusIcon status={currentTarget.schemaStatus} />
                        <StatusChip status={currentTarget.schemaStatus} />
                        {currentTarget.schemaDiffCount !== undefined &&
                            currentTarget.schemaDiffCount > 0 && (
                                <Typography variant="caption" color="text.disabled" fontSize={11}>
                                    ({currentTarget.schemaDiffCount})
                                </Typography>
                            )}
                    </Box>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <StatusIcon status={currentTarget.dataStatus} />
                        <StatusChip status={currentTarget.dataStatus} />
                        {currentTarget.dataDiffSummary && (
                            <Typography variant="caption" color="text.disabled" fontSize={11}>
                                {currentTarget.dataDiffSummary}
                            </Typography>
                        )}
                    </Box>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                    <Button
                        size="small"
                        variant="text"
                        startIcon={
                            recheckMutation.isPending ? (
                                <CircularProgress size={14} />
                            ) : (
                                <RefreshIcon sx={{ fontSize: 16 }} />
                            )
                        }
                        onClick={handleRecheck}
                        disabled={recheckMutation.isPending}
                        sx={{ fontSize: 12, minWidth: 'auto' }}
                    >
                        {recheckMutation.isPending ? 'Checking' : 'Recheck'}
                    </Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell
                    colSpan={5}
                    sx={{
                        py: 0,
                        borderBottom: expanded ? undefined : 'none',
                        bgcolor: expanded
                            ? (theme) => alpha(theme.palette.background.default, 0.5)
                            : 'transparent',
                    }}
                >
                    <Collapse in={expanded}>
                        <Box sx={{ py: 2, px: 1 }}>
                            {currentTarget.error && (
                                <StatusAlert severity="error" sx={{ mb: 2 }}>
                                    {currentTarget.error}
                                </StatusAlert>
                            )}

                            {/* Tabs for Schema and Data */}
                            <Tabs
                                value={activeTab}
                                onChange={(_, v) => setActiveTab(v)}
                                sx={{
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    minHeight: 40,
                                    '& .MuiTab-root': { minHeight: 40, py: 0 },
                                }}
                            >
                                <Tab
                                    icon={<SchemaIcon sx={{ fontSize: 16 }} />}
                                    iconPosition="start"
                                    label={`Schema ${currentTarget.schemaDiffCount ? `(${currentTarget.schemaDiffCount})` : ''}`}
                                    sx={{ fontSize: 12 }}
                                    disabled={!group.syncSchema}
                                />
                                <Tab
                                    icon={<DataIcon sx={{ fontSize: 16 }} />}
                                    iconPosition="start"
                                    label={`Data ${dataDiff.length > 0 ? `(${dataDiff.filter((d) => d.sourceCount !== d.targetCount || d.missingInTarget > 0).length} tables)` : ''}`}
                                    sx={{ fontSize: 12 }}
                                    disabled={!group.syncData}
                                />
                            </Tabs>

                            {/* Schema Tab */}
                            {activeTab === 0 && group.syncSchema && (
                                <Box sx={{ pt: 2 }}>
                                    {schemaDiff ? (
                                        <SchemaDiffDisplay
                                            diff={schemaDiff}
                                            migrationSql={migrationSql}
                                            onApplyMigration={handleApplyMigration}
                                            applying={applying}
                                            applyingTables={applyingTables}
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
                                <Box sx={{ pt: 2 }}>
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
                                        <StatusAlert severity="success">
                                            All tables are in sync
                                        </StatusAlert>
                                    ) : (
                                        <StatusAlert severity="info">
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
