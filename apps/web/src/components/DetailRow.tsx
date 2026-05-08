import { Box, Typography } from '@mui/material';

interface DetailRowProps {
    label: string;
    value: string;
}

export function DetailRow({ label, value }: DetailRowProps) {
    return (
        <Box>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: 10,
                    fontWeight: 500,
                    mb: 0.25,
                }}
            >
                {label}
            </Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: 13 }}>
                {value}
            </Typography>
        </Box>
    );
}
