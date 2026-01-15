import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    category: 'query' | 'navigation' | 'general';
}

// Define all keyboard shortcuts
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
    // Query shortcuts
    {
        key: 'Enter',
        ctrl: true,
        description: 'Run query',
        category: 'query',
    },
    {
        key: 'Enter',
        ctrl: true,
        shift: true,
        description: 'Run query (force)',
        category: 'query',
    },
    {
        key: '/',
        ctrl: true,
        description: 'Toggle comment',
        category: 'query',
    },
    {
        key: 'f',
        ctrl: true,
        shift: true,
        description: 'Format SQL',
        category: 'query',
    },
    // Navigation shortcuts
    {
        key: '1',
        ctrl: true,
        description: 'Go to Dashboard',
        category: 'navigation',
    },
    {
        key: '2',
        ctrl: true,
        description: 'Go to Connections',
        category: 'navigation',
    },
    {
        key: '3',
        ctrl: true,
        description: 'Go to Query',
        category: 'navigation',
    },
    {
        key: '4',
        ctrl: true,
        description: 'Go to Visualizer',
        category: 'navigation',
    },
    {
        key: '5',
        ctrl: true,
        description: 'Go to Compare',
        category: 'navigation',
    },
    {
        key: '6',
        ctrl: true,
        description: 'Go to Logs',
        category: 'navigation',
    },
    {
        key: '7',
        ctrl: true,
        description: 'Go to Settings',
        category: 'navigation',
    },
    // General shortcuts
    {
        key: 'k',
        ctrl: true,
        description: 'Quick search (coming soon)',
        category: 'general',
    },
    {
        key: 'Escape',
        description: 'Close dialog / Cancel',
        category: 'general',
    },
];

// Format shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    const isMac =
        typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    if (shortcut.ctrl) {
        parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.shift) {
        parts.push(isMac ? '⇧' : 'Shift');
    }
    if (shortcut.alt) {
        parts.push(isMac ? '⌥' : 'Alt');
    }

    // Format key name
    let keyName = shortcut.key;
    if (keyName === 'Enter') keyName = '↵';
    else if (keyName === 'Escape') keyName = 'Esc';
    else if (keyName === '/') keyName = '/';
    else keyName = keyName.toUpperCase();

    parts.push(keyName);

    return parts.join(isMac ? '' : '+');
}

// Hook to register global keyboard shortcuts
export function useKeyboardShortcuts(
    shortcuts: Array<{
        key: string;
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
        handler: () => void;
        enabled?: boolean;
    }>
) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs (unless it's a special combo)
            const target = event.target as HTMLElement;
            const isInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            for (const shortcut of shortcuts) {
                if (shortcut.enabled === false) continue;

                const ctrlMatch = shortcut.ctrl
                    ? event.ctrlKey || event.metaKey
                    : !event.ctrlKey && !event.metaKey;
                const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.alt ? event.altKey : !event.altKey;
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

                if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                    // Allow Ctrl+Enter even in inputs (for running queries)
                    if (isInput && !(shortcut.ctrl && shortcut.key.toLowerCase() === 'enter')) {
                        continue;
                    }

                    event.preventDefault();
                    shortcut.handler();
                    return;
                }
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

// Hook for navigation shortcuts
export function useNavigationShortcuts(navigate: (path: string) => void) {
    useKeyboardShortcuts([
        { key: '1', ctrl: true, handler: () => navigate('/') },
        { key: '2', ctrl: true, handler: () => navigate('/query') },
        { key: '3', ctrl: true, handler: () => navigate('/query') },
        { key: '4', ctrl: true, handler: () => navigate('/visualizer') },
        { key: '5', ctrl: true, handler: () => navigate('/compare') },
        { key: '6', ctrl: true, handler: () => navigate('/logs') },
        { key: '7', ctrl: true, handler: () => navigate('/settings') },
    ]);
}
