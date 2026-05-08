import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useRecentDatabasesStore } from '../../stores/recentDatabasesStore';
import { useConnectionHealthStore } from '../../stores/connectionHealthStore';
import { GlassCard } from '../../components/GlassCard';

export function QuickAccessSection() {
    const navigate = useNavigate();
    const { recentDatabases } = useRecentDatabasesStore();
    const { isOnline } = useConnectionHealthStore();

    const recentThree = recentDatabases.slice(0, 3);

    if (recentThree.length === 0) {
        return null;
    }

    return (
        <GlassCard noPadding sx={{ mb: 3 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <AccessTimeIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Recent
                </Typography>
            </Box>
            <Box>
                {recentThree.map((db, index) => {
                    const online = isOnline(db.connectionId);

                    return (
                        <Box
                            key={db.connectionId}
                            onClick={() => online && navigate(`/query/${db.connectionId}`)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 2,
                                py: 1.25,
                                cursor: online ? 'pointer' : 'default',
                                opacity: online ? 1 : 0.5,
                                borderTop: index > 0 ? '1px solid' : 'none',
                                borderColor: 'divider',
                                '&:hover': online
                                    ? {
                                          bgcolor: 'action.hover',
                                      }
                                    : {},
                            }}
                        >
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: online ? 'success.main' : 'error.main',
                                    flexShrink: 0,
                                }}
                            />
                            <StorageIcon
                                sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    flex: 1,
                                    fontWeight: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {db.name}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.disabled',
                                    textTransform: 'uppercase',
                                    fontSize: 10,
                                    flexShrink: 0,
                                }}
                            >
                                {db.engine}
                            </Typography>
                            {online && (
                                <PlayArrowIcon
                                    sx={{
                                        fontSize: 16,
                                        color: 'text.disabled',
                                        opacity: 0,
                                        transition: 'opacity 0.15s',
                                        '.MuiBox-root:hover &': {
                                            opacity: 1,
                                        },
                                    }}
                                />
                            )}
                        </Box>
                    );
                })}
            </Box>
        </GlassCard>
    );
}
