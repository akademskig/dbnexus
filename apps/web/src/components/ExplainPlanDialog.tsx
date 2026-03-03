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
    Chip,
    alpha,
    useTheme,
} from '@mui/material';
import { useState } from 'react';
import { useToastStore } from '../stores/toastStore';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import TableRowsIcon from '@mui/icons-material/TableRows';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SortIcon from '@mui/icons-material/Sort';
import JoinInnerIcon from '@mui/icons-material/JoinInner';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { StatusAlert } from './StatusAlert';
import { StyledTooltip } from './StyledTooltip';

interface PlanNode {
    'Node Type': string;
    'Relation Name'?: string;
    'Index Name'?: string;
    'Plan Rows'?: number;
    'Plan Width'?: number;
    'Actual Rows'?: number;
    'Actual Loops'?: number;
    'Total Cost'?: number;
    'Startup Cost'?: number;
    'Actual Total Time'?: number;
    'Actual Startup Time'?: number;
    'Filter'?: string;
    'Index Cond'?: string;
    'Join Type'?: string;
    'Hash Cond'?: string;
    'Sort Key'?: string[];
    'Plans'?: PlanNode[];
    [key: string]: unknown;
}

function getNodeIcon(nodeType: string) {
    const type = nodeType.toLowerCase();
    if (type.includes('seq scan')) return <TableRowsIcon fontSize="small" />;
    if (type.includes('index')) return <SpeedIcon fontSize="small" />;
    if (type.includes('filter')) return <FilterAltIcon fontSize="small" />;
    if (type.includes('sort')) return <SortIcon fontSize="small" />;
    if (type.includes('join') || type.includes('nested loop') || type.includes('hash'))
        return <JoinInnerIcon fontSize="small" />;
    if (type.includes('aggregate') || type.includes('group')) return <StorageIcon fontSize="small" />;
    return <AccountTreeIcon fontSize="small" />;
}

interface ThemePalette {
    palette: {
        warning: { main: string; light: string };
        success: { main: string; light: string };
        info: { main: string };
        text: { secondary: string };
    };
}

function getNodeColor(nodeType: string, theme: ThemePalette) {
    const type = nodeType.toLowerCase();
    if (type.includes('seq scan')) return theme.palette.warning.main;
    if (type.includes('index scan') || type.includes('index only')) return theme.palette.success.main;
    if (type.includes('bitmap')) return theme.palette.info.main;
    if (type.includes('nested loop')) return theme.palette.warning.light;
    if (type.includes('hash join') || type.includes('merge join')) return theme.palette.success.light;
    return theme.palette.text.secondary;
}

function formatNumber(num: number | undefined): string {
    if (num === undefined) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
}

function formatTime(ms: number | undefined): string {
    if (ms === undefined) return '-';
    if (ms < 0.001) return '<0.001ms';
    if (ms < 1) return `${ms.toFixed(3)}ms`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

interface PlanTreeNodeProps {
    node: PlanNode;
    depth: number;
    maxCost: number;
    isLast: boolean;
    parentLines: boolean[];
}

function PlanTreeNode({ node, depth, maxCost, isLast, parentLines }: PlanTreeNodeProps) {
    const theme = useTheme();
    const nodeColor = getNodeColor(node['Node Type'], theme);
    const costPercent = maxCost > 0 ? ((node['Total Cost'] || 0) / maxCost) * 100 : 0;
    const isExpensive = costPercent > 50;
    const isSeqScan = node['Node Type'].toLowerCase().includes('seq scan');
    const hasActualData = node['Actual Rows'] !== undefined;

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    py: 0.75,
                    position: 'relative',
                }}
            >
                {/* Tree lines */}
                <Box sx={{ display: 'flex', flexShrink: 0 }}>
                    {parentLines.map((showLine, i) => (
                        <Box
                            key={i}
                            sx={{
                                width: 20,
                                position: 'relative',
                                '&::before': showLine
                                    ? {
                                          content: '""',
                                          position: 'absolute',
                                          left: 9,
                                          top: 0,
                                          bottom: 0,
                                          width: 1,
                                          bgcolor: 'divider',
                                      }
                                    : undefined,
                            }}
                        />
                    ))}
                    {depth > 0 && (
                        <Box
                            sx={{
                                width: 20,
                                position: 'relative',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: 9,
                                    top: 0,
                                    height: '50%',
                                    width: 1,
                                    bgcolor: 'divider',
                                },
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    left: 9,
                                    top: '50%',
                                    width: 10,
                                    height: 1,
                                    bgcolor: 'divider',
                                },
                            }}
                        />
                    )}
                </Box>

                {/* Node content */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: alpha(nodeColor, 0.08),
                        border: 1,
                        borderColor: alpha(nodeColor, 0.3),
                        ml: depth > 0 ? 0 : 0,
                    }}
                >
                    {/* Header row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ color: nodeColor, display: 'flex' }}>{getNodeIcon(node['Node Type'])}</Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {node['Node Type']}
                        </Typography>
                        {node['Relation Name'] && (
                            <Chip
                                label={node['Relation Name']}
                                size="small"
                                sx={{ height: 20, fontSize: 11 }}
                            />
                        )}
                        {node['Index Name'] && (
                            <Chip
                                label={node['Index Name']}
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ height: 20, fontSize: 11 }}
                            />
                        )}
                        {node['Join Type'] && (
                            <Chip
                                label={node['Join Type']}
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ height: 20, fontSize: 11 }}
                            />
                        )}
                        {isSeqScan && (node['Plan Rows'] || 0) > 10000 && (
                            <StyledTooltip title="Sequential scan on large table - consider adding an index">
                                <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            </StyledTooltip>
                        )}
                        {isExpensive && (
                            <StyledTooltip title={`High cost operation (${costPercent.toFixed(0)}% of total)`}>
                                <Chip
                                    label={`${costPercent.toFixed(0)}%`}
                                    size="small"
                                    color="warning"
                                    sx={{ height: 18, fontSize: 10 }}
                                />
                            </StyledTooltip>
                        )}
                    </Box>

                    {/* Stats row */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                            Rows:{' '}
                            <Typography component="span" variant="caption" sx={{ fontWeight: 500 }}>
                                {hasActualData
                                    ? `${formatNumber(node['Actual Rows'])} (est: ${formatNumber(node['Plan Rows'])})`
                                    : formatNumber(node['Plan Rows'])}
                            </Typography>
                        </Typography>
                        {hasActualData && (
                            <Typography variant="caption" color="text.secondary">
                                Time:{' '}
                                <Typography component="span" variant="caption" sx={{ fontWeight: 500 }}>
                                    {formatTime(node['Actual Total Time'])}
                                </Typography>
                            </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                            Cost:{' '}
                            <Typography component="span" variant="caption" sx={{ fontWeight: 500 }}>
                                {node['Total Cost']?.toFixed(2) || '-'}
                            </Typography>
                        </Typography>
                    </Box>

                    {/* Filter/condition info */}
                    {(node['Filter'] || node['Index Cond'] || node['Hash Cond']) && (
                        <Typography
                            variant="caption"
                            sx={{
                                fontFamily: 'monospace',
                                fontSize: 10,
                                color: 'text.secondary',
                                bgcolor: 'background.default',
                                px: 1,
                                py: 0.25,
                                borderRadius: 0.5,
                            }}
                        >
                            {node['Filter'] || node['Index Cond'] || node['Hash Cond']}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Child nodes */}
            {node['Plans']?.map((child, index) => (
                <PlanTreeNode
                    key={index}
                    node={child}
                    depth={depth + 1}
                    maxCost={maxCost}
                    isLast={index === (node['Plans']?.length || 0) - 1}
                    parentLines={[...parentLines, !isLast]}
                />
            ))}
        </Box>
    );
}

function PlanTreeView({ plan }: { plan: unknown }) {
    const planObj = plan as { Plan?: PlanNode };
    const rootNode = planObj?.Plan;

    if (!rootNode) {
        return (
            <Typography color="text.secondary" variant="body2">
                Unable to parse execution plan as tree
            </Typography>
        );
    }

    const getMaxCost = (node: PlanNode): number => {
        const childMax = node['Plans']?.reduce((max, child) => Math.max(max, getMaxCost(child)), 0) || 0;
        return Math.max(node['Total Cost'] || 0, childMax);
    };

    const maxCost = getMaxCost(rootNode);

    return (
        <Box sx={{ py: 1 }}>
            <PlanTreeNode node={rootNode} depth={0} maxCost={maxCost} isLast={true} parentLines={[]} />
        </Box>
    );
}

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
                    <StyledTooltip title="Copy execution plan">
                        <IconButton size="small" onClick={handleCopyPlan}>
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </StyledTooltip>
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
                                            <AccountTreeIcon fontSize="small" />
                                            Visual
                                        </Box>
                                    }
                                />
                                <Tab
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CodeIcon fontSize="small" />
                                            Raw
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
                            {/* Tab 0: Visual Tree */}
                            {activeTab === 0 && (
                                <Box
                                    sx={{
                                        maxHeight: 500,
                                        overflow: 'auto',
                                    }}
                                >
                                    <PlanTreeView plan={explainPlan.plan} />
                                </Box>
                            )}

                            {/* Tab 1: Raw JSON */}
                            {activeTab === 1 && (
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

                            {/* Tab 2: Insights & Suggestions */}
                            {activeTab === 2 && (
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
