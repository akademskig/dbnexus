import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Typography,
    useTheme,
    alpha,
    Fade,
    Fab,
    Badge,
    Zoom,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import StorageIcon from '@mui/icons-material/Storage';
import FolderIcon from '@mui/icons-material/Folder';
import TerminalIcon from '@mui/icons-material/Terminal';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SchoolIcon from '@mui/icons-material/School';
import MinimizeIcon from '@mui/icons-material/Remove';

export const ONBOARDING_STORAGE_KEY = 'dbnexus:onboarding:completed';
const ONBOARDING_STEP_KEY = 'dbnexus:onboarding:step';
const ONBOARDING_MINIMIZED_KEY = 'dbnexus:onboarding:minimized';

type TourStep = {
    id: string;
    title: string;
    description: string;
    features?: string[];
    hint?: string;
    icon: React.ReactNode;
    route: string;
    color: string;
};

interface OnboardingTourProps {
    readonly forceOpen?: boolean;
    readonly onComplete?: () => void;
}

export function OnboardingTour({ forceOpen, onComplete }: OnboardingTourProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();

    const [isActive, setIsActive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [hasNavigated, setHasNavigated] = useState(false);

    const steps: TourStep[] = useMemo(
        () => [
            {
                id: 'welcome',
                title: 'Welcome to DB Nexus! 👋',
                description: 'Your all-in-one database management tool',
                features: [
                    'Query data with syntax highlighting',
                    'Visualize schemas interactively',
                    'Compare environments side-by-side',
                    'Sync databases effortlessly',
                ],
                hint: '✨ Supports PostgreSQL, MySQL, MariaDB, and SQLite',
                icon: <RocketLaunchIcon />,
                route: '/dashboard',
                color: theme.palette.primary.main,
            },
            {
                id: 'projects',
                title: 'Step 1: Add a Connection',
                description:
                    'Start by adding your first database connection. Click "Add Connection" or use the scan feature to auto-discover databases.',
                hint: '💡 Try the "Scan for Connections" button to find running databases',
                icon: <StorageIcon />,
                route: '/projects',
                color: theme.palette.primary.main,
            },
            {
                id: 'organize',
                title: 'Step 2: Organize Connections',
                description:
                    'Group related connections into Projects (e.g., "E-commerce App") and Sync Groups (e.g., dev/staging/prod) to keep things organized.',
                hint: '💡 Sync Groups let you compare and sync schemas across environments',
                icon: <FolderIcon />,
                route: '/projects',
                color: theme.palette.secondary.main,
            },
            {
                id: 'query',
                title: 'Step 3: Query Your Data',
                description:
                    'Select a connection and table from the sidebar, or write custom SQL. Click on foreign key values to follow relationships.',
                hint: '💡 Use Ctrl+Enter to execute queries quickly',
                icon: <TerminalIcon />,
                route: '/query',
                color: theme.palette.success.main,
            },
            {
                id: 'schema-diagram',
                title: 'Step 4: Explore the Schema',
                description:
                    'Visualize your database structure. Drag tables to organize them, and click on columns to see relationships.',
                hint: '💡 Right-click tables for quick actions like drop or add column',
                icon: <AccountTreeIcon />,
                route: '/schema-diagram',
                color: theme.palette.warning.main,
            },
            {
                id: 'compare',
                title: 'Step 5: Compare Databases',
                description:
                    'Select two connections to compare their schemas or data. Great for syncing dev/staging/prod environments.',
                hint: '💡 Use this to generate migration scripts between environments',
                icon: <CompareArrowsIcon />,
                route: '/compare',
                color: theme.palette.info.main,
            },
            {
                id: 'logs',
                title: 'Step 6: View Logs',
                description:
                    'Track your query history, see migration logs, and review all database activity in one place.',
                hint: '💡 Re-run past queries directly from the history tab',
                icon: <HistoryIcon />,
                route: '/logs',
                color: theme.palette.error.main,
            },
            {
                id: 'dashboard',
                title: 'All Done! 🎉',
                description:
                    "You're all set! The dashboard shows your connections at a glance. Use the scan button anytime to find new databases.",
                hint: '🎉 Tutorial complete! Explore freely or restart from Settings.',
                icon: <RocketLaunchIcon />,
                route: '/dashboard',
                color: theme.palette.secondary.main,
            },
        ],
        [theme]
    );

    const currentStep = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;
    const progress = ((currentStepIndex + 1) / steps.length) * 100;

    // Initialize from localStorage
    useEffect(() => {
        const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY);
        const savedMinimized = localStorage.getItem(ONBOARDING_MINIMIZED_KEY);

        if (forceOpen) {
            setIsActive(true);
            setCurrentStepIndex(0);
            setIsMinimized(false);
            localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        } else if (!completed) {
            setIsActive(true);
            if (savedStep) setCurrentStepIndex(parseInt(savedStep, 10));
            if (savedMinimized === 'true') setIsMinimized(true);
        }
    }, [forceOpen]);

    // Save step to localStorage
    useEffect(() => {
        if (isActive) {
            localStorage.setItem(ONBOARDING_STEP_KEY, String(currentStepIndex));
            localStorage.setItem(ONBOARDING_MINIMIZED_KEY, String(isMinimized));
        }
    }, [currentStepIndex, isMinimized, isActive]);

    // Navigate to current step's route when step changes
    useEffect(() => {
        if (isActive && !isMinimized && currentStep && hasNavigated) {
            if (location.pathname !== currentStep.route) {
                navigate(currentStep.route);
            }
        }
    }, [
        currentStepIndex,
        isActive,
        isMinimized,
        currentStep,
        navigate,
        location.pathname,
        hasNavigated,
    ]);

    const handleNext = useCallback(() => {
        if (isLastStep) {
            // Complete the tour
            localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
            localStorage.removeItem(ONBOARDING_STEP_KEY);
            localStorage.removeItem(ONBOARDING_MINIMIZED_KEY);
            setIsActive(false);
            onComplete?.();
        } else {
            setHasNavigated(true);
            const nextStep = steps[currentStepIndex + 1];
            if (nextStep) {
                navigate(nextStep.route);
            }
            setCurrentStepIndex((prev) => prev + 1);
        }
    }, [isLastStep, currentStepIndex, steps, navigate, onComplete]);

    const handleBack = useCallback(() => {
        if (currentStepIndex > 0) {
            setHasNavigated(true);
            const prevStep = steps[currentStepIndex - 1];
            if (prevStep) {
                navigate(prevStep.route);
            }
            setCurrentStepIndex((prev) => prev - 1);
        }
    }, [currentStepIndex, steps, navigate]);

    const handleMinimize = () => {
        setIsMinimized(true);
    };

    const handleExpand = () => {
        setIsMinimized(false);
        // Navigate to current step's page
        if (currentStep && location.pathname !== currentStep.route) {
            setHasNavigated(true);
            navigate(currentStep.route);
        }
    };

    const handleSkip = () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
        localStorage.removeItem(ONBOARDING_STEP_KEY);
        localStorage.removeItem(ONBOARDING_MINIMIZED_KEY);
        setIsActive(false);
        onComplete?.();
    };

    const handleGoToStep = (index: number) => {
        setHasNavigated(true);
        const targetStep = steps[index];
        if (targetStep) {
            navigate(targetStep.route);
        }
        setCurrentStepIndex(index);
    };

    if (!isActive) return null;

    // Minimized FAB
    if (isMinimized) {
        return (
            <Zoom in>
                <Badge
                    badgeContent={`${currentStepIndex + 1}/${steps.length}`}
                    color="primary"
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1300,
                        '& .MuiBadge-badge': {
                            fontSize: 10,
                            height: 20,
                            minWidth: 36,
                        },
                    }}
                >
                    <Fab
                        color="primary"
                        onClick={handleExpand}
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${currentStep?.color})`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${currentStep?.color})`,
                            },
                        }}
                    >
                        <SchoolIcon />
                    </Fab>
                </Badge>
            </Zoom>
        );
    }

    // Expanded tour panel
    return (
        <Fade in>
            <Paper
                elevation={8}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    width: 440,
                    maxWidth: 'calc(100vw - 48px)',
                    zIndex: 1300,
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${alpha(currentStep?.color || theme.palette.primary.main, 0.3)}`,
                }}
            >
                {/* Progress bar */}
                <Box
                    sx={{
                        height: 4,
                        bgcolor: alpha(theme.palette.text.primary, 0.1),
                    }}
                >
                    <Box
                        sx={{
                            height: '100%',
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${currentStep?.color})`,
                            transition: 'width 0.3s ease',
                        }}
                    />
                </Box>

                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        background: `linear-gradient(135deg, ${alpha(currentStep?.color || theme.palette.primary.main, 0.15)} 0%, transparent 100%)`,
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    }}
                >
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(currentStep?.color || theme.palette.primary.main, 0.2),
                            color: currentStep?.color,
                        }}
                    >
                        {currentStep?.icon}
                    </Box>
                    <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ flex: 1, fontSize: '1.1rem' }}
                    >
                        {currentStep?.title}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={handleMinimize}
                        sx={{ color: 'text.secondary' }}
                    >
                        <MinimizeIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleSkip} sx={{ color: 'text.secondary' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Content */}
                <Box sx={{ px: 2, py: 2 }}>
                    <Typography
                        variant="body1"
                        sx={{
                            mb: 1.5,
                            whiteSpace: 'pre-line',
                            fontWeight: 500,
                            color: 'text.primary',
                            lineHeight: 1.6,
                        }}
                    >
                        {currentStep?.description}
                    </Typography>

                    {currentStep?.features && (
                        <Box sx={{ mb: 1.5 }}>
                            {currentStep.features.map((feature) => (
                                <Box
                                    key={feature}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        py: 0.5,
                                    }}
                                >
                                    <CheckCircleIcon
                                        sx={{
                                            fontSize: 18,
                                            color: currentStep?.color || 'primary.main',
                                        }}
                                    />
                                    <Typography
                                        variant="body1"
                                        sx={{ fontWeight: 600, color: 'text.primary' }}
                                    >
                                        {feature}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {currentStep?.hint && (
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: alpha(
                                    currentStep?.color || theme.palette.primary.main,
                                    0.12
                                ),
                                border: `1px solid ${alpha(currentStep?.color || theme.palette.primary.main, 0.25)}`,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{ color: 'text.primary', fontWeight: 500 }}
                            >
                                {currentStep.hint}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Step indicators */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 0.5,
                        pb: 1.5,
                    }}
                >
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;

                        return (
                            <Box
                                key={step.id}
                                onClick={() => handleGoToStep(index)}
                                sx={{
                                    width: isCompleted ? 20 : isCurrent ? 24 : 10,
                                    height: isCompleted ? 20 : 10,
                                    borderRadius: isCompleted ? '50%' : 5,
                                    bgcolor: isCompleted
                                        ? theme.palette.success.main
                                        : isCurrent
                                          ? currentStep?.color
                                          : alpha(theme.palette.text.primary, 0.2),
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    '&:hover': {
                                        transform: 'scale(1.15)',
                                        bgcolor: isCompleted
                                            ? theme.palette.success.dark
                                            : isCurrent
                                              ? currentStep?.color
                                              : alpha(theme.palette.text.primary, 0.35),
                                    },
                                }}
                            >
                                {isCompleted && (
                                    <CheckCircleIcon sx={{ fontSize: 20, color: 'white' }} />
                                )}
                            </Box>
                        );
                    })}
                </Box>

                {/* Actions */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        px: 2,
                        pb: 2,
                        justifyContent: 'space-between',
                    }}
                >
                    <Button
                        size="small"
                        onClick={handleBack}
                        disabled={currentStepIndex === 0}
                        startIcon={<ArrowBackIcon />}
                        sx={{
                            visibility: currentStepIndex === 0 ? 'hidden' : 'visible',
                            textTransform: 'none',
                        }}
                    >
                        Back
                    </Button>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            size="small"
                            onClick={handleSkip}
                            sx={{ textTransform: 'none', color: 'text.secondary' }}
                        >
                            Skip Tour
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleNext}
                            endIcon={isLastStep ? <RocketLaunchIcon /> : <ArrowForwardIcon />}
                            sx={{
                                textTransform: 'none',
                                bgcolor: currentStep?.color,
                                '&:hover': {
                                    bgcolor: currentStep?.color,
                                    filter: 'brightness(0.9)',
                                },
                            }}
                        >
                            {isLastStep ? 'Finish' : 'Next'}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Fade>
    );
}

// Legacy dialog export for settings restart
export { ONBOARDING_STORAGE_KEY as ONBOARDING_COMPLETED_KEY };
