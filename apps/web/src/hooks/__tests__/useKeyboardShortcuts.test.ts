import { describe, it, expect } from 'vitest';
import { formatShortcut, KEYBOARD_SHORTCUTS } from '../useKeyboardShortcuts';

describe('formatShortcut', () => {
    it('should format Ctrl+Enter shortcut', () => {
        const shortcut = {
            key: 'Enter',
            ctrl: true,
            description: 'Test',
            category: 'query' as const,
        };
        const formatted = formatShortcut(shortcut);
        // On non-Mac, should be Ctrl+↵
        expect(formatted).toContain('Ctrl');
        expect(formatted).toContain('↵');
    });

    it('should format Ctrl+Shift+F shortcut', () => {
        const shortcut = {
            key: 'f',
            ctrl: true,
            shift: true,
            description: 'Test',
            category: 'query' as const,
        };
        const formatted = formatShortcut(shortcut);
        expect(formatted).toContain('Ctrl');
        expect(formatted).toContain('Shift');
        expect(formatted).toContain('F');
    });

    it('should format simple key shortcut', () => {
        const shortcut = { key: 'Escape', description: 'Test', category: 'general' as const };
        const formatted = formatShortcut(shortcut);
        expect(formatted).toBe('Esc');
    });

    it('should format number key shortcut', () => {
        const shortcut = {
            key: '1',
            ctrl: true,
            description: 'Test',
            category: 'navigation' as const,
        };
        const formatted = formatShortcut(shortcut);
        expect(formatted).toContain('1');
    });
});

describe('KEYBOARD_SHORTCUTS', () => {
    it('should have query shortcuts', () => {
        const queryShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'query');
        expect(queryShortcuts.length).toBeGreaterThan(0);
    });

    it('should have navigation shortcuts', () => {
        const navShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'navigation');
        expect(navShortcuts.length).toBeGreaterThan(0);
    });

    it('should have general shortcuts', () => {
        const generalShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'general');
        expect(generalShortcuts.length).toBeGreaterThan(0);
    });

    it('should have Ctrl+Enter for running query', () => {
        const runQuery = KEYBOARD_SHORTCUTS.find((s) => s.key === 'Enter' && s.ctrl && !s.shift);
        expect(runQuery).toBeDefined();
        expect(runQuery?.description).toContain('Run');
    });

    it('should have navigation shortcuts for all main pages', () => {
        const navShortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.category === 'navigation');
        const descriptions = navShortcuts.map((s) => s.description.toLowerCase());

        expect(descriptions.some((d) => d.includes('dashboard'))).toBe(true);
        expect(descriptions.some((d) => d.includes('projects'))).toBe(true);
        expect(descriptions.some((d) => d.includes('query'))).toBe(true);
        expect(descriptions.some((d) => d.includes('settings'))).toBe(true);
    });
});
