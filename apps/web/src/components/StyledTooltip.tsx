import { Tooltip, TooltipProps, styled } from '@mui/material';

export const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
    '& .MuiTooltip-tooltip': {
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        fontSize: 13,
        fontWeight: 500,
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    '& .MuiTooltip-arrow': {
        color: theme.palette.background.paper,
        '&::before': {
            border: `1px solid ${theme.palette.divider}`,
        },
    },
}));
