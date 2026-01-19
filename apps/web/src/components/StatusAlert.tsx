import { Box, Chip, Typography, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import { ReactNode } from 'react';

type Severity = 'success' | 'error' | 'warning' | 'info';

const severityConfig = {
    success: {
        bgcolor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 0.3)',
        Icon: CheckCircleIcon,
        iconColor: 'success.main',
    },
    error: {
        bgcolor: 'rgba(220, 38, 38, 0.1)',
        borderColor: 'rgba(220, 38, 38, 0.3)',
        Icon: ErrorIcon,
        iconColor: 'error.main',
    },
    warning: {
        bgcolor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        Icon: WarningIcon,
        iconColor: 'warning.main',
    },
    info: {
        bgcolor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        Icon: InfoIcon,
        iconColor: 'info.main',
    },
};

// ============================================================================
// StatusAlert - Simple alert with message
// ============================================================================
interface StatusAlertProps {
    readonly severity: Severity;
    readonly children: ReactNode;
    readonly onClose?: () => void;
    readonly showIcon?: boolean;
    readonly sx?: object;
}

export function StatusAlert({
    severity,
    children,
    onClose,
    showIcon = true,
    sx,
}: StatusAlertProps) {
    const config = severityConfig[severity];
    const { Icon } = config;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                bgcolor: config.bgcolor,
                borderRadius: 1,
                border: 1,
                borderColor: config.borderColor,
                ...sx,
            }}
        >
            {showIcon && <Icon sx={{ color: config.iconColor }} />}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                {typeof children === 'string' ? (
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {children}
                    </Typography>
                ) : (
                    children
                )}
            </Box>
            {onClose && (
                <IconButton size="small" onClick={onClose} sx={{ mt: -0.5, mr: -0.5 }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            )}
        </Box>
    );
}

// ============================================================================
// OperationResultData - For operation feedback
// ============================================================================
export interface OperationResultData {
    id?: string;
    success: boolean;
    message: string;
    duration?: number;
    timestamp?: Date;
    details?: string;
    severity?: Severity;
}

interface OperationResultItemProps {
    readonly result: OperationResultData;
    readonly showTimestamp?: boolean;
}

export function OperationResultItem({ result, showTimestamp = false }: OperationResultItemProps) {
    const severity = result.severity ?? (result.success ? 'success' : 'error');
    const config = severityConfig[severity];
    const { Icon } = config;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                bgcolor: config.bgcolor,
                borderRadius: 1,
                border: 1,
                borderColor: config.borderColor,
            }}
        >
            <Icon sx={{ color: config.iconColor }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {result.message}
                </Typography>
                {result.details && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                    >
                        {result.details}
                    </Typography>
                )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                {showTimestamp && result.timestamp && (
                    <Typography variant="caption" color="text.secondary">
                        {result.timestamp.toLocaleTimeString()}
                    </Typography>
                )}
                {result.duration !== undefined && (
                    <Chip
                        label={`${(result.duration / 1000).toFixed(2)}s`}
                        size="small"
                        sx={{ height: 22, fontSize: 11 }}
                    />
                )}
            </Box>
        </Box>
    );
}

interface OperationResultsListProps {
    readonly results: OperationResultData[];
    readonly title?: string;
    readonly maxResults?: number;
    readonly showTimestamp?: boolean;
    readonly emptyMessage?: string;
}

export function OperationResultsList({
    results,
    title = 'Recent Operations',
    maxResults = 10,
    showTimestamp = false,
    emptyMessage,
}: OperationResultsListProps) {
    const displayResults = results.slice(0, maxResults);

    if (displayResults.length === 0 && !emptyMessage) {
        return null;
    }

    return (
        <Box>
            {title && (
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    {title}
                </Typography>
            )}
            {displayResults.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {displayResults.map((result, index) => (
                        <OperationResultItem
                            key={result.id ?? index}
                            result={result}
                            showTimestamp={showTimestamp}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}
