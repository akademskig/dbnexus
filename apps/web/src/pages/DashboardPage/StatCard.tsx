import { Box, Typography, CircularProgress } from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../components/GlassCard';

interface StatCardProps {
    label: string;
    value: string;
    change?: string;
    changeType?: 'up' | 'down' | 'neutral';
    loading?: boolean;
    icon?: React.ReactNode;
    color?: string;
}

export function StatCard({
    label,
    value,
    change,
    changeType,
    loading = false,
    icon,
    color,
}: StatCardProps) {
    return (
        <GlassCard>
            <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontSize: 11,
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 1 }}>
                        {loading ? (
                            <CircularProgress size={24} sx={{ color: 'text.disabled' }} />
                        ) : (
                            <>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    {value}
                                </Typography>
                                {change && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {changeType === 'up' && (
                                            <TrendingUpIcon
                                                sx={{ fontSize: 14, color: 'success.main' }}
                                            />
                                        )}
                                        {changeType === 'down' && (
                                            <TrendingDownIcon
                                                sx={{ fontSize: 14, color: 'error.main' }}
                                            />
                                        )}
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color:
                                                    changeType === 'up'
                                                        ? 'success.main'
                                                        : changeType === 'down'
                                                            ? 'error.main'
                                                            : 'text.secondary',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {change}
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
                {icon && color && (
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 1,
                            bgcolor: `${color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: color,
                        }}
                    >
                        {icon}
                    </Box>
                )}
            </Box>
        </GlassCard>
    );
}
