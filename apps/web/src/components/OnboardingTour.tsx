import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    targetSelector?: string; // CSS selector for element to highlight
    requiresConnections?: boolean; // Whether this step needs connections to work
};

interface OnboardingTourProps {
    readonly forceOpen?: boolean;
    readonly onComplete?: () => void;
    readonly hasConnections?: boolean;
}

export function OnboardingTour({
    forceOpen,
    onComplete,
    hasConnections = false,
}: OnboardingTourProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();

    const [isActive, setIsActive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [hasNavigated, setHasNavigated] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const spotlightRef = useRef<HTMLDivElement>(null);

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
                targetSelector: '[data-tour="add-connection"]',
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
                targetSelector: '[data-tour="create-project"]',
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
                targetSelector: '[data-tour="run-query"]',
                requiresConnections: true,
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
                targetSelector: '[data-tour="connection-selector"]',
                requiresConnections: true,
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
                targetSelector: '[data-tour="compare-button"]',
                requiresConnections: true,
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
                targetSelector: '[data-tour="query-history"]',
                requiresConnections: true,
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

    // Filter steps based on whether connections exist
    const availableSteps = useMemo(() => {
        if (hasConnections) {
            return steps;
        }
        // When no connections, only show steps that don't require connections
        // This results in: welcome, projects, organize, dashboard
        return steps
            .filter((step) => !step.requiresConnections)
            .map((step, index, arr) => {
                // Modify the final step message when no connections
                if (index === arr.length - 1 && step.id === 'dashboard') {
                    return {
                        ...step,
                        title: 'Almost There! 🚀',
                        description:
                            'Add your first connection to unlock all features: Query Editor, Schema Diagram, Compare & Sync, and more!',
                        hint: '💡 Click "Add Connection" on the Projects page or use "Scan for Connections" to auto-discover databases',
                    };
                }
                return step;
            });
    }, [steps, hasConnections]);

    // Reset step index if it's out of bounds (e.g., connections were deleted)
    useEffect(() => {
        if (currentStepIndex >= availableSteps.length && availableSteps.length > 0) {
            setCurrentStepIndex(availableSteps.length - 1);
        }
    }, [availableSteps.length, currentStepIndex]);

    const safeStepIndex = Math.min(currentStepIndex, availableSteps.length - 1);
    const currentStep = availableSteps[safeStepIndex];
    const isLastStep = safeStepIndex === availableSteps.length - 1;
    const progress = ((safeStepIndex + 1) / availableSteps.length) * 100;

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
            if (savedStep) setCurrentStepIndex(Number.parseInt(savedStep, 10));
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

    // Track target element position for spotlight
    useEffect(() => {
        if (!isActive || isMinimized || !currentStep?.targetSelector) {
            setTargetRect(null);
            return;
        }

        const updateTargetPosition = () => {
            const target = document.querySelector(currentStep.targetSelector!);
            if (target) {
                setTargetRect(target.getBoundingClientRect());
            } else {
                setTargetRect(null);
            }
        };

        // Initial check with delay to allow page to render
        const timeoutId = setTimeout(updateTargetPosition, 500);

        // Update on scroll/resize
        globalThis.addEventListener('scroll', updateTargetPosition, true);
        globalThis.addEventListener('resize', updateTargetPosition);

        return () => {
            clearTimeout(timeoutId);
            globalThis.removeEventListener('scroll', updateTargetPosition, true);
            globalThis.removeEventListener('resize', updateTargetPosition);
        };
    }, [isActive, isMinimized, currentStep?.targetSelector, currentStepIndex]);

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
        // Clear spotlight immediately
        setTargetRect(null);

        if (isLastStep) {
            // Complete the tour
            localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
            localStorage.removeItem(ONBOARDING_STEP_KEY);
            localStorage.removeItem(ONBOARDING_MINIMIZED_KEY);
            setIsActive(false);
            onComplete?.();
        } else {
            setHasNavigated(true);
            const nextStep = availableSteps[currentStepIndex + 1];
            if (nextStep) {
                navigate(nextStep.route);
            }
            setCurrentStepIndex((prev) => prev + 1);
        }
    }, [isLastStep, currentStepIndex, availableSteps, navigate, onComplete]);

    const handleBack = useCallback(() => {
        // Clear spotlight immediately
        setTargetRect(null);

        if (currentStepIndex > 0) {
            setHasNavigated(true);
            const prevStep = availableSteps[currentStepIndex - 1];
            if (prevStep) {
                navigate(prevStep.route);
            }
            setCurrentStepIndex((prev) => prev - 1);
        }
    }, [currentStepIndex, availableSteps, navigate]);

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
        const targetStep = availableSteps[index];
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
                    badgeContent={`${safeStepIndex + 1}/${availableSteps.length}`}
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
                            bgcolor: theme.palette.primary.main,
                            animation: 'fab-pulse 2s ease-in-out infinite',
                            '&:hover': {
                                bgcolor: theme.palette.primary.dark,
                                animation: 'none',
                            },
                            '@keyframes fab-pulse': {
                                '0%, 100%': {
                                    boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                                },
                                '50%': {
                                    boxShadow: `0 0 0 12px ${alpha(theme.palette.primary.main, 0)}`,
                                },
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
        <>
            {/* Simple arrow pointing to target element */}
            {targetRect && !isMinimized && (
                <Box
                    ref={spotlightRef}
                    sx={{
                        position: 'fixed',
                        left: targetRect.left + targetRect.width / 2,
                        top: targetRect.top - 20,
                        transform: 'translateX(-50%)',
                        zIndex: 1299,
                        pointerEvents: 'none',
                        animation: 'bounce-arrow 0.8s ease-in-out infinite',
                        '@keyframes bounce-arrow': {
                            '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
                            '50%': { transform: 'translateX(-50%) translateY(-6px)' },
                        },
                    }}
                >
                    {/* Arrow pointing down */}
                    <Box
                        sx={{
                            width: 0,
                            height: 0,
                            borderLeft: '10px solid transparent',
                            borderRight: '10px solid transparent',
                            borderTop: `14px solid ${theme.palette.primary.main}`,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        }}
                    />
                </Box>
            )}

            {/* Highlight ring around target */}
            {targetRect && !isMinimized && (
                <Box
                    sx={{
                        position: 'fixed',
                        left: targetRect.left - 4,
                        top: targetRect.top - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        borderRadius: 2,
                        border: `2px solid ${theme.palette.primary.main}`,
                        boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.3)}, 0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                        zIndex: 1298,
                        pointerEvents: 'none',
                        animation: 'pulse-highlight 2s ease-in-out infinite',
                        '@keyframes pulse-highlight': {
                            '0%, 100%': {
                                boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.3)}, 0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                            },
                            '50%': {
                                boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.2)}, 0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`,
                            },
                        },
                    }}
                />
            )}

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
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
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
                                bgcolor: theme.palette.primary.main,
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
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 100%)`,
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
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                color: theme.palette.primary.main,
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
                        <IconButton
                            size="small"
                            onClick={handleSkip}
                            sx={{ color: 'text.secondary' }}
                        >
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
                                                color: 'primary.main',
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
                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
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
                        {availableSteps.map((step, index) => {
                            const isCompleted = index < safeStepIndex;
                            const isCurrent = index === safeStepIndex;
                            let indicatorWidth = 10;
                            let indicatorHeight = 10;
                            let indicatorRadius: number | string = 5;
                            let indicatorColor = alpha(theme.palette.text.primary, 0.2);
                            let hoverColor = alpha(theme.palette.text.primary, 0.35);

                            if (isCompleted) {
                                indicatorWidth = 20;
                                indicatorHeight = 20;
                                indicatorRadius = '50%';
                                indicatorColor = theme.palette.success.main;
                                hoverColor = theme.palette.success.dark;
                            } else if (isCurrent) {
                                indicatorWidth = 24;
                                indicatorColor = theme.palette.primary.main;
                                hoverColor = theme.palette.primary.main;
                            }

                            return (
                                <Box
                                    key={step.id}
                                    onClick={() => handleGoToStep(index)}
                                    sx={{
                                        width: indicatorWidth,
                                        height: indicatorHeight,
                                        borderRadius: indicatorRadius,
                                        bgcolor: indicatorColor,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        '&:hover': {
                                            transform: 'scale(1.15)',
                                            bgcolor: hoverColor,
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
                                    fontWeight: 600,
                                    px: 2.5,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: 'inherit',
                                        animation: 'pulse-ring 2s ease-out infinite',
                                        border: '2px solid',
                                        borderColor: 'inherit',
                                        opacity: 0,
                                    },
                                    '@keyframes pulse-ring': {
                                        '0%': {
                                            transform: 'scale(1)',
                                            opacity: 0.5,
                                        },
                                        '100%': {
                                            transform: 'scale(1.15)',
                                            opacity: 0,
                                        },
                                    },
                                }}
                            >
                                {isLastStep ? 'Finish' : 'Next'}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Fade>
        </>
    );
}

// Legacy dialog export for settings restart
export { ONBOARDING_STORAGE_KEY as ONBOARDING_COMPLETED_KEY };
