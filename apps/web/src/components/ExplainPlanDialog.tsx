import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
} from '@mui/material';
import { useState } from 'react';
import { useToastStore } from '../stores/toastStore';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SearchIcon from '@mui/icons-material/Search';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { StatusAlert } from './StatusAlert';

interface ExplainPlanDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onExplainAnalyze: () => void;
    readonly explainPlan: {
        plan: unknown;
        planText: string;
        insights: { type: string; message: string }[];
        suggestions: string[];
    } | null;
    readonly loading?: boolean;
}

export function ExplainPlanDialog({
    open,
    onClose,
    onExplainAnalyze,
    explainPlan,
    loading = false,
}: ExplainPlanDialogProps) {
    const [activeTab, setActiveTab] = useState(0);
    const toast = useToastStore();

    const getSeverity = (type: string) => {
        if (type === 'success') return 'success';
        if (type === 'warning') return 'warning';
        if (type === 'error') return 'error';
        return 'info';
    };

    const handleCopyPlan = () => {
        if (explainPlan) {
            navigator.clipboard.writeText(explainPlan.planText);
            toast.success('Execution plan copied to clipboard');
        }
    };

    // Extract execution time from plan if available
    const getExecutionTime = () => {
        if (!explainPlan?.plan) return null;
        const plan = explainPlan.plan as Record<string, unknown>;
        return plan['Execution Time'] as number | undefined;
    };

    const executionTime = getExecutionTime();
    const hasAnalyzeData = executionTime !== undefined;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountTreeIcon />
                        <Box>
                            <Typography variant="h6" component="span">
                                Query Execution Plan
                            </Typography>
                            {executionTime !== undefined && executionTime !== null && (
                                <Typography
                                    variant="caption"
                                    component="span"
                                    sx={{ ml: 1, color: 'text.secondary' }}
                                >
                                    (
                                    {executionTime < 1
                                        ? `${executionTime.toFixed(3)}ms`
                                        : `${executionTime.toFixed(2)}ms`}
                                    )
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    <Tooltip title="Copy execution plan">
                        <IconButton size="small" onClick={handleCopyPlan}>
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                {explainPlan && (
                    <Box>
                        {/* Tabs */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                                <Tab
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SearchIcon fontSize="small" />
                                            Execution Plan
                                        </Box>
                                    }
                                />
                                <Tab
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <AnalyticsIcon fontSize="small" />
                                            Insights
                                        </Box>
                                    }
                                />
                            </Tabs>
                        </Box>

                        {/* Tab Content */}
                        <Box sx={{ p: 2 }}>
                            {/* Tab 0: Insights & Suggestions */}
                            {activeTab === 1 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {/* EXPLAIN ANALYZE Hint */}
                                    {!hasAnalyzeData && (
                                        <StatusAlert severity="info">
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 500, mb: 0.5 }}
                                                >
                                                    Get more detailed insights
                                                </Typography>
                                                <Typography variant="caption">
                                                    Run EXPLAIN ANALYZE to see actual execution
                                                    times, row counts, and I/O statistics
                                                </Typography>
                                            </Box>
                                        </StatusAlert>
                                    )}

                                    {/* Insights */}
                                    {explainPlan.insights.length > 0 ? (
                                        <Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    mb: 1,
                                                }}
                                            >
                                                <AnalyticsIcon fontSize="small" color="primary" />
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    What&apos;s Happening
                                                </Typography>
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 1,
                                                }}
                                            >
                                                {explainPlan.insights.map((insight) => (
                                                    <StatusAlert
                                                        key={insight.message}
                                                        severity={getSeverity(insight.type)}
                                                        sx={{ py: 0.5 }}
                                                    >
                                                        {insight.message}
                                                    </StatusAlert>
                                                ))}
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box
                                            sx={{
                                                textAlign: 'center',
                                                py: 2,
                                                color: 'text.secondary',
                                            }}
                                        >
                                            <Typography variant="body2">
                                                No insights available for this query plan
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Optimization Suggestions */}
                                    {explainPlan.suggestions.length > 0 ? (
                                        <Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    mb: 1,
                                                }}
                                            >
                                                <LightbulbIcon fontSize="small" color="primary" />
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    Optimization Tips
                                                </Typography>
                                            </Box>
                                            <List dense>
                                                {explainPlan.suggestions.map((suggestion) => (
                                                    <ListItem key={suggestion} sx={{ px: 0 }}>
                                                        <ListItemIcon sx={{ minWidth: 24 }}>
                                                            <FiberManualRecordIcon
                                                                sx={{
                                                                    fontSize: 8,
                                                                    color: 'text.secondary',
                                                                }}
                                                            />
                                                        </ListItemIcon>
                                                        <ListItemText primary={suggestion} />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    ) : (
                                        <Box
                                            sx={{
                                                textAlign: 'center',
                                                py: 2,
                                                color: 'text.secondary',
                                            }}
                                        >
                                            <Typography variant="body2">
                                                No optimization suggestions at this time
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* Tab 1: Execution Plan */}
                            {activeTab === 0 && (
                                <Box>
                                    <Box
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: 11,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            maxHeight: 500,
                                            overflow: 'auto',
                                            bgcolor: 'background.default',
                                            p: 2,
                                            borderRadius: 1,
                                            border: 1,
                                            borderColor: 'divider',
                                        }}
                                    >
                                        {explainPlan.planText}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onExplainAnalyze} disabled={loading}>
                    EXPLAIN ANALYZE
                </Button>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
