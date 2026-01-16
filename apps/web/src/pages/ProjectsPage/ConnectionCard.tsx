import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Chip,
    Alert,
    CircularProgress,
    Collapse,
    Tooltip,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { connectionsApi } from '../../lib/api';
import type { ConnectionConfig } from '@dbnexus/shared';
import { useTagsStore } from '../../stores/tagsStore';
import { useConnectionHealthStore } from '../../stores/connectionHealthStore';
import { DetailRow } from './DetailRow';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface ConnectionCardProps {
    connection: ConnectionConfig;
    compact?: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onQuery: () => void;
    draggable?: boolean;
}

export function ConnectionCard({
    connection,
    compact = false,
    onEdit,
    onDelete,
    onQuery,
    draggable = true,
}: ConnectionCardProps) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
        null
    );
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const { tags: availableTags } = useTagsStore();
    const { healthStatus, checkConnection } = useConnectionHealthStore();

    // Check health on mount
    useEffect(() => {
        if (!healthStatus[connection.id]) {
            checkConnection(connection.id);
        }
    }, [connection.id, healthStatus, checkConnection]);

    const connectionHealth = healthStatus[connection.id];
    const isOffline = connectionHealth ? !connectionHealth.isOnline : false;
    const isOnline = connectionHealth?.isOnline ?? false;

    const handleTest = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setTesting(true);
        setTestResult(null);
        try {
            const result = await connectionsApi.test(connection.id);
            setTestResult(result);
            // Update the health store with the test result
            checkConnection(connection.id);
        } catch (error) {
            setTestResult({
                success: false,
                message: error instanceof Error ? error.message : 'Test failed',
            });
            // Force re-check
            checkConnection(connection.id);
        } finally {
            setTesting(false);
        }
    };

    const getTagStyle = (tagName: string) => {
        const tag = availableTags.find((t) => t.name === tagName);
        if (tag) {
            return {
                bgcolor: `rgba(${tag.color}, 0.15)`,
                color: `rgb(${tag.color})`,
                borderColor: `rgba(${tag.color}, 0.3)`,
            };
        }
        return {};
    };

    const connectionSummary =
        connection.engine === 'sqlite'
            ? connection.database
            : `${connection.host}:${connection.port}`;

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
                connectionId: connection.id,
                connectionName: connection.name,
                currentProjectId: connection.projectId || null,
                currentGroupId: connection.groupId || null,
            })
        );
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <Box
            draggable={draggable}
            onDragStart={handleDragStart}
            sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                transition: 'border-color 0.15s, opacity 0.15s, transform 0.15s',
                cursor: draggable ? 'grab' : 'default',
                '&:hover': { borderColor: 'primary.main' },
                '&:active': draggable ? { cursor: 'grabbing' } : {},
                '&[draggable="true"]:active': {
                    opacity: 0.6,
                    transform: 'scale(0.98)',
                },
            }}
        >
            {/* Header */}
            <Box
                onClick={() => setExpanded(!expanded)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: compact ? 1.5 : 2,
                    px: compact ? 2 : 2.5,
                    py: compact ? 1.25 : 1.75,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <StorageIcon
                    sx={{ fontSize: compact ? 18 : 20, color: 'primary.main', flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography
                            variant={compact ? 'body2' : 'body1'}
                            fontWeight={600}
                            sx={{ lineHeight: 1.3 }}
                        >
                            {connection.name}
                        </Typography>
                        <Chip
                            label={connection.engine.toUpperCase()}
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor:
                                    connection.engine === 'postgres'
                                        ? 'rgba(51, 103, 145, 0.2)'
                                        : 'rgba(0, 122, 204, 0.2)',
                                color: connection.engine === 'postgres' ? '#6BA3D6' : '#47A3F3',
                            }}
                        />
                        {connection.connectionType && connection.connectionType !== 'local' && (
                            <Chip
                                label={connection.connectionType === 'docker' ? 'Docker' : 'Remote'}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: 9,
                                    fontWeight: 600,
                                    bgcolor:
                                        connection.connectionType === 'docker'
                                            ? 'rgba(0, 150, 214, 0.15)'
                                            : 'rgba(255, 152, 0, 0.15)',
                                    color:
                                        connection.connectionType === 'docker'
                                            ? 'rgb(0, 150, 214)'
                                            : 'rgb(255, 152, 0)',
                                }}
                            />
                        )}
                        {connection.readOnly && (
                            <Chip
                                label="READ-ONLY"
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: 9,
                                    fontWeight: 600,
                                    bgcolor: 'rgba(139, 92, 246, 0.15)',
                                    color: 'rgb(139, 92, 246)',
                                }}
                            />
                        )}
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            mt: 0.25,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            fontFamily="monospace"
                            sx={{ fontSize: 11 }}
                        >
                            {connectionSummary}
                        </Typography>
                        {connection.database && connection.engine !== 'sqlite' && (
                            <>
                                <Typography variant="caption" color="text.disabled">
                                    •
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    fontFamily="monospace"
                                    sx={{ fontSize: 11 }}
                                >
                                    {connection.database}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Box>

                {/* Tags */}
                {connection.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flexShrink: 0 }}>
                        {connection.tags.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{
                                    ...getTagStyle(tag),
                                    height: 20,
                                    fontSize: 10,
                                    fontWeight: 500,
                                    border: '1px solid',
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Connection Status Indicator */}
                <Tooltip
                    title={
                        connectionHealth?.error ||
                        `Connection is ${connectionHealth?.isOnline ? 'online' : connectionHealth ? 'offline' : 'unknown'}`
                    }
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {isOnline ? (
                            <CheckCircleIcon fontSize="small" color="success" />
                        ) : isOffline ? (
                            <ErrorIcon fontSize="small" color="error" />
                        ) : (
                            <HelpOutlineIcon fontSize="small" color="disabled" />
                        )}
                    </Box>
                </Tooltip>

                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    sx={{ color: 'text.secondary' }}
                >
                    {expanded ? (
                        <ExpandLessIcon fontSize="small" />
                    ) : (
                        <ExpandMoreIcon fontSize="small" />
                    )}
                </IconButton>

                <Tooltip title={isOffline ? 'Connection is offline' : ''}>
                    <span>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuery();
                            }}
                            disabled={isOffline}
                            sx={{ flexShrink: 0 }}
                        >
                            Query
                        </Button>
                    </span>
                </Tooltip>
            </Box>

            {/* Expanded content */}
            <Collapse in={expanded}>
                <Box
                    sx={{
                        px: compact ? 2 : 2.5,
                        py: 2,
                        bgcolor: 'background.default',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 2,
                            mb: 2.5,
                        }}
                    >
                        {connection.engine === 'sqlite' ? (
                            <DetailRow label="File" value={connection.database} />
                        ) : (
                            <>
                                <DetailRow
                                    label="Host"
                                    value={`${connection.host}:${connection.port}`}
                                />
                                <DetailRow label="Database" value={connection.database} />
                                <DetailRow label="User" value={connection.username} />
                                {connection.defaultSchema && (
                                    <DetailRow
                                        label="Default Schema"
                                        value={connection.defaultSchema}
                                    />
                                )}
                                {connection.ssl && <DetailRow label="SSL" value="Enabled" />}
                            </>
                        )}
                    </Box>

                    {testResult && (
                        <Alert
                            severity={testResult.success ? 'success' : 'error'}
                            onClose={() => setTestResult(null)}
                            sx={{ mb: 2 }}
                        >
                            {testResult.message}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={testing ? <CircularProgress size={14} /> : <ScienceIcon />}
                            onClick={handleTest}
                            disabled={testing}
                        >
                            Test
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={onEdit}
                        >
                            Edit
                        </Button>
                        <Tooltip title={isOffline ? 'Connection is offline' : ''}>
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<SettingsIcon />}
                                    onClick={() => navigate(`/connections/${connection.id}`)}
                                    disabled={isOffline}
                                >
                                    Manage
                                </Button>
                            </span>
                        </Tooltip>
                        <Box sx={{ flex: 1 }} />
                        <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setDeleteConfirmOpen(true)}
                        >
                            Delete
                        </Button>
                    </Box>
                </Box>
            </Collapse>

            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Delete Connection"
                message={`Are you sure you want to delete "${connection.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                confirmColor="error"
                onConfirm={() => {
                    setDeleteConfirmOpen(false);
                    onDelete();
                }}
                onCancel={() => setDeleteConfirmOpen(false)}
            />
        </Box>
    );
}
