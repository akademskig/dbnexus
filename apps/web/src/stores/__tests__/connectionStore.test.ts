import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '../connectionStore';

describe('connectionStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useConnectionStore.setState({
            selectedConnectionId: '',
            selectedSchema: '',
        });
    });

    it('should initialize with empty values', () => {
        const state = useConnectionStore.getState();
        expect(state.selectedConnectionId).toBe('');
        expect(state.selectedSchema).toBe('');
    });

    it('should set connection and reset schema', () => {
        const { setConnection } = useConnectionStore.getState();

        // First set both
        useConnectionStore.setState({
            selectedConnectionId: 'conn-1',
            selectedSchema: 'public',
        });

        // Then change connection
        setConnection('conn-2');

        const state = useConnectionStore.getState();
        expect(state.selectedConnectionId).toBe('conn-2');
        expect(state.selectedSchema).toBe(''); // Schema should be reset
    });

    it('should set schema', () => {
        const { setSchema } = useConnectionStore.getState();
        setSchema('my_schema');

        const state = useConnectionStore.getState();
        expect(state.selectedSchema).toBe('my_schema');
    });

    it('should set connection and schema together', () => {
        const { setConnectionAndSchema } = useConnectionStore.getState();
        setConnectionAndSchema('conn-1', 'public');

        const state = useConnectionStore.getState();
        expect(state.selectedConnectionId).toBe('conn-1');
        expect(state.selectedSchema).toBe('public');
    });

    it('should clear all state', () => {
        const { setConnectionAndSchema, clear } = useConnectionStore.getState();
        setConnectionAndSchema('conn-1', 'public');

        clear();

        const state = useConnectionStore.getState();
        expect(state.selectedConnectionId).toBe('');
        expect(state.selectedSchema).toBe('');
    });

    it('should preserve connection when only schema changes', () => {
        const { setConnectionAndSchema, setSchema } = useConnectionStore.getState();
        setConnectionAndSchema('conn-1', 'public');
        setSchema('private');

        const state = useConnectionStore.getState();
        expect(state.selectedConnectionId).toBe('conn-1');
        expect(state.selectedSchema).toBe('private');
    });
});
