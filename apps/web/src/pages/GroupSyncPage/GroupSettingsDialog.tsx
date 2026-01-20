import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControlLabel,
    Checkbox,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import { projectsApi, schemaApi } from '../../lib/api';
import type { ConnectionConfig } from '@dbnexus/shared';

interface GroupSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    group: {
        id: string;
        projectId: string;
        name: string;
        sourceConnectionId?: string;
        syncSchema: boolean;
        syncData: boolean;
        syncTargetSchema?: string;
    };
    connections: ConnectionConfig[];
}

export function GroupSettingsDialog({
    open,
    onClose,
    group,
    connections,
}: GroupSettingsDialogProps) {
    const queryClient = useQueryClient();
    const [sourceConnectionId, setSourceConnectionId] = useState(group.sourceConnectionId || '');
    const [syncSchema, setSyncSchema] = useState(group.syncSchema);
    const [syncData, setSyncData] = useState(group.syncData);
    const [syncTargetSchema, setSyncTargetSchema] = useState(group.syncTargetSchema || '');
    const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);
    const [loadingSchemas, setLoadingSchemas] = useState(false);

    // Reset form state when dialog opens or group changes
    useEffect(() => {
        if (open) {
            setSourceConnectionId(group.sourceConnectionId || '');
            setSyncSchema(group.syncSchema);
            setSyncData(group.syncData);
            setSyncTargetSchema(group.syncTargetSchema || '');
        }
    }, [open, group.sourceConnectionId, group.syncSchema, group.syncData, group.syncTargetSchema]);

    // Load schemas when source connection changes
    useEffect(() => {
        if (sourceConnectionId) {
            setLoadingSchemas(true);
            schemaApi
                .getSchemas(sourceConnectionId)
                .then(setAvailableSchemas)
                .catch(() => setAvailableSchemas([]))
                .finally(() => setLoadingSchemas(false));
        } else {
            setAvailableSchemas([]);
        }
    }, [sourceConnectionId]);

    const updateMutation = useMutation({
        mutationFn: () =>
            projectsApi.updateGroup(group.projectId, group.id, {
                sourceConnectionId: sourceConnectionId || null,
                syncSchema,
                syncData,
                syncTargetSchema: syncTargetSchema || null,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', group.id] });
            queryClient.invalidateQueries({ queryKey: ['groupSyncStatus', group.id] });
            onClose();
        },
    });

    // Get the selected source connection's default schema
    // For MySQL/MariaDB, the database name is the schema
    const sourceConnection = connections.find((c) => c.id === sourceConnectionId);
    const getDefaultSchema = (conn: typeof sourceConnection) => {
        if (!conn) return 'public';
        if (conn.engine === 'mysql' || conn.engine === 'mariadb') {
            return conn.database;
        }
        return conn.defaultSchema || 'public';
    };
    const defaultSchema = getDefaultSchema(sourceConnection);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Instance Group Settings</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    <FormControl fullWidth>
                        <InputLabel>Source Connection (Reference)</InputLabel>
                        <Select
                            value={sourceConnectionId}
                            onChange={(e) => {
                                setSourceConnectionId(e.target.value);
                                setSyncTargetSchema(''); // Reset schema when connection changes
                            }}
                            label="Source Connection (Reference)"
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {connections.map((conn) => (
                                <MenuItem key={conn.id} value={conn.id}>
                                    {conn.name}
                                    {conn.defaultSchema && (
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{ ml: 1, color: 'text.secondary' }}
                                        >
                                            ({conn.defaultSchema})
                                        </Typography>
                                    )}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Schema selector */}
                    {sourceConnectionId && (
                        <FormControl fullWidth>
                            <InputLabel>Target Schema</InputLabel>
                            <Select
                                value={syncTargetSchema}
                                onChange={(e) => setSyncTargetSchema(e.target.value)}
                                label="Target Schema"
                                disabled={loadingSchemas}
                            >
                                <MenuItem value="">
                                    <em>Use connection default ({defaultSchema})</em>
                                </MenuItem>
                                {availableSchemas.map((schema) => (
                                    <MenuItem key={schema} value={schema}>
                                        {schema}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                Schema to use for sync operations (applies to all connections in
                                group)
                            </Typography>
                        </FormControl>
                    )}

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Sync Options
                        </Typography>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={syncSchema}
                                    onChange={(e) => setSyncSchema(e.target.checked)}
                                />
                            }
                            label="Enable schema sync checking"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={syncData}
                                    onChange={(e) => setSyncData(e.target.checked)}
                                />
                            }
                            label="Enable data sync checking"
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                >
                    Save Settings
                </Button>
            </DialogActions>
        </Dialog>
    );
}
