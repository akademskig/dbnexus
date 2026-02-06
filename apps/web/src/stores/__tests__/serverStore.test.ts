import { describe, it, expect, beforeEach } from 'vitest';
import { useServerStore } from '../serverStore';

describe('serverStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useServerStore.setState({
            selectedServerId: '',
        });
    });

    it('should initialize with empty server id', () => {
        const state = useServerStore.getState();
        expect(state.selectedServerId).toBe('');
    });

    it('should set selected server', () => {
        const { setServer } = useServerStore.getState();
        setServer('server-123');

        const state = useServerStore.getState();
        expect(state.selectedServerId).toBe('server-123');
    });

    it('should update selected server when changed', () => {
        const { setServer } = useServerStore.getState();

        // Set initial server
        setServer('server-1');
        expect(useServerStore.getState().selectedServerId).toBe('server-1');

        // Change to different server
        setServer('server-2');
        expect(useServerStore.getState().selectedServerId).toBe('server-2');
    });

    it('should clear server selection', () => {
        const { setServer, clear } = useServerStore.getState();

        // Set a server
        setServer('server-123');
        expect(useServerStore.getState().selectedServerId).toBe('server-123');

        // Clear selection
        clear();
        expect(useServerStore.getState().selectedServerId).toBe('');
    });

    it('should allow setting empty server id', () => {
        const { setServer } = useServerStore.getState();

        // Set a server first
        setServer('server-123');

        // Then set empty
        setServer('');
        expect(useServerStore.getState().selectedServerId).toBe('');
    });
});
