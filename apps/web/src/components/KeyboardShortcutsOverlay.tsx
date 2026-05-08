import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    IconButton,
    alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsOverlayProps {
    open: boolean;
    onClose: () => void;
}

function KeyBadge({ children }: { children: React.ReactNode }) {
    return (
        <Box
            component="kbd"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 24,
                height: 24,
                px: 0.75,
                bgcolor: (theme) => alpha(theme.palette.background.default, 0.8),
                border: '1px solid',
                borderColor: 'divider',
                borderBottomWidth: 2,
                borderRadius: 0.5,
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 600,
                color: 'text.primary',
            }}
        >
            {children}
        </Box>
    );
}

function ShortcutRow({
    shortcut,
}: {
    shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; description: string };
}) {
    const isMac =
        typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const parts: string[] = [];
    if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
    if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
    if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');

    let keyName = shortcut.key;
    if (keyName === 'Enter') keyName = '↵';
    else if (keyName === 'Escape') keyName = 'Esc';
    else if (keyName === 'Space') keyName = '␣';
    else keyName = keyName.toUpperCase();
    parts.push(keyName);

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 0.75,
                px: 1,
                borderRadius: 0.5,
                '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                },
            }}
        >
            <Typography variant="body2" color="text.secondary" fontSize={12}>
                {shortcut.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                {parts.map((part, i) => (
                    <KeyBadge key={i}>{part}</KeyBadge>
                ))}
            </Box>
        </Box>
    );
}

export function KeyboardShortcutsOverlay({ open, onClose }: KeyboardShortcutsOverlayProps) {
    const generalShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'general');
    const navigationShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'navigation');
    const queryShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'query');
    const dataShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'data');

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    pb: 1,
                }}
            >
                <KeyboardIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" sx={{ flex: 1 }}>
                    Keyboard Shortcuts
                </Typography>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 3,
                    }}
                >
                    {/* Left Column */}
                    <Box>
                        {/* General */}
                        <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                        >
                            General
                        </Typography>
                        <Box
                            sx={{
                                mb: 3,
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            {generalShortcuts.map((shortcut) => (
                                <ShortcutRow key={shortcut.description} shortcut={shortcut} />
                            ))}
                        </Box>

                        {/* Navigation */}
                        <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                        >
                            Navigation
                        </Typography>
                        <Box
                            sx={{
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            {navigationShortcuts.map((shortcut) => (
                                <ShortcutRow key={shortcut.description} shortcut={shortcut} />
                            ))}
                        </Box>
                    </Box>

                    {/* Right Column */}
                    <Box>
                        {/* Query Editor */}
                        <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                        >
                            Query Editor
                        </Typography>
                        <Box
                            sx={{
                                mb: 3,
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            {queryShortcuts.map((shortcut) => (
                                <ShortcutRow key={shortcut.description} shortcut={shortcut} />
                            ))}
                        </Box>

                        {/* Data Grid */}
                        <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                        >
                            Data Grid
                        </Typography>
                        <Box
                            sx={{
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            {dataShortcuts.map((shortcut) => (
                                <ShortcutRow key={shortcut.description} shortcut={shortcut} />
                            ))}
                        </Box>
                    </Box>
                </Box>

                <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ display: 'block', mt: 2, textAlign: 'center' }}
                >
                    Press <KeyBadge>?</KeyBadge> anytime to show this overlay
                </Typography>
            </DialogContent>
        </Dialog>
    );
}

// Hook to manage the overlay state
export function useKeyboardShortcutsOverlay() {
    const [open, setOpen] = useState(false);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger in inputs
        const target = event.target as HTMLElement;
        const isInput =
            target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        if (!isInput && event.key === '?') {
            event.preventDefault();
            setOpen(true);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { open, setOpen, onClose: () => setOpen(false) };
}
