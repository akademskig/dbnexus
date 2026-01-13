import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './toastStore';

describe('toastStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useToastStore.setState({ toasts: [] });
    });

    it('should initialize with empty toasts', () => {
        const state = useToastStore.getState();
        expect(state.toasts).toEqual([]);
    });

    it('should add a toast with addToast', () => {
        const { addToast } = useToastStore.getState();
        addToast('Test message', 'error', 3000);

        const state = useToastStore.getState();
        expect(state.toasts).toHaveLength(1);
        expect(state.toasts[0].message).toBe('Test message');
        expect(state.toasts[0].severity).toBe('error');
        expect(state.toasts[0].duration).toBe(3000);
    });

    it('should add success toast', () => {
        const { success } = useToastStore.getState();
        success('Success!');

        const state = useToastStore.getState();
        expect(state.toasts).toHaveLength(1);
        expect(state.toasts[0].message).toBe('Success!');
        expect(state.toasts[0].severity).toBe('success');
        expect(state.toasts[0].duration).toBe(4000);
    });

    it('should add error toast with longer duration', () => {
        const { error } = useToastStore.getState();
        error('Error occurred');

        const state = useToastStore.getState();
        expect(state.toasts).toHaveLength(1);
        expect(state.toasts[0].message).toBe('Error occurred');
        expect(state.toasts[0].severity).toBe('error');
        expect(state.toasts[0].duration).toBe(6000);
    });

    it('should add warning toast', () => {
        const { warning } = useToastStore.getState();
        warning('Warning!');

        const state = useToastStore.getState();
        expect(state.toasts).toHaveLength(1);
        expect(state.toasts[0].severity).toBe('warning');
        expect(state.toasts[0].duration).toBe(5000);
    });

    it('should add info toast', () => {
        const { info } = useToastStore.getState();
        info('Info message');

        const state = useToastStore.getState();
        expect(state.toasts).toHaveLength(1);
        expect(state.toasts[0].severity).toBe('info');
    });

    it('should remove toast by id', () => {
        const { success, removeToast } = useToastStore.getState();
        success('Test');
        
        const toastId = useToastStore.getState().toasts[0].id;
        expect(useToastStore.getState().toasts).toHaveLength(1);

        removeToast(toastId);
        expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('should handle multiple toasts', () => {
        const { success, error, warning } = useToastStore.getState();
        success('Success');
        error('Error');
        warning('Warning');

        const state = useToastStore.getState();
        expect(state.toasts).toHaveLength(3);
    });
});
