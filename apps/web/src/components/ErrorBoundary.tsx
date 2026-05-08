import { Component, ReactNode } from 'react';
import { Box, Typography, Button, Paper, alpha } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';

const GITHUB_ISSUES_URL = 'https://github.com/akademskig/dbnexus/issues/new';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReload = () => {
        globalThis.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        bgcolor: 'background.default',
                        p: 3,
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            p: 6,
                            maxWidth: 480,
                            textAlign: 'center',
                            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
                            backdropFilter: 'blur(8px)',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                        }}
                    >
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                            }}
                        >
                            <ErrorOutlineIcon
                                sx={{
                                    fontSize: 40,
                                    color: 'error.main',
                                }}
                            />
                        </Box>

                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            Something Went Wrong
                        </Typography>

                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ mb: 2, lineHeight: 1.6 }}
                        >
                            An unexpected error occurred. Please try reloading the page.
                        </Typography>

                        {this.state.error && (
                            <Typography
                                variant="caption"
                                component="pre"
                                sx={{
                                    mb: 4,
                                    p: 2,
                                    bgcolor: 'action.hover',
                                    borderRadius: 1,
                                    overflow: 'auto',
                                    maxHeight: 100,
                                    textAlign: 'left',
                                    fontFamily: 'monospace',
                                    color: 'error.main',
                                }}
                            >
                                {this.state.error.message}
                            </Typography>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={<BugReportIcon />}
                                href={`${GITHUB_ISSUES_URL}?title=${encodeURIComponent('Bug: ' + (this.state.error?.message || 'Application error'))}&body=${encodeURIComponent('## Description\n\nPlease describe what you were doing when this error occurred.\n\n## Error\n\n```\n' + (this.state.error?.message || 'Unknown error') + '\n```')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                component="a"
                            >
                                Report Issue
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<RefreshIcon />}
                                onClick={this.handleReload}
                            >
                                Reload Page
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}
