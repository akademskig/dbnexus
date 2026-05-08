import { Box, Typography } from '@mui/material';
import { StatusAlert } from './StatusAlert';

interface BackupToolCompatibilityNotesProps {
    readonly notes?: readonly string[];
}

/**
 * Explains native CLI backup constraints (e.g. pg_dump vs server major version).
 */
export function BackupToolCompatibilityNotes({ notes }: BackupToolCompatibilityNotesProps) {
    if (!notes?.length) {
        return null;
    }

    return (
        <StatusAlert severity="info" sx={{ mt: 0, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Client vs server versions
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 0 }}>
                {notes.map((note, index) => (
                    <Typography key={index} component="li" variant="body2" sx={{ mb: 0.5 }}>
                        {note}
                    </Typography>
                ))}
            </Box>
        </StatusAlert>
    );
}
