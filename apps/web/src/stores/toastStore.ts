import { create } from 'zustand';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    severity: ToastSeverity;
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (message: string, severity?: ToastSeverity, duration?: number) => void;
    removeToast: (id: string) => void;
    // Convenience methods
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],

    addToast: (message, severity = 'info', duration = 4000) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            toasts: [...state.toasts, { id, message, severity, duration }],
        }));
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },

    success: (message, duration) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            toasts: [
                ...state.toasts,
                { id, message, severity: 'success', duration: duration ?? 4000 },
            ],
        }));
    },

    error: (message, duration) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            toasts: [
                ...state.toasts,
                { id, message, severity: 'error', duration: duration ?? 6000 },
            ],
        }));
    },

    warning: (message, duration) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            toasts: [
                ...state.toasts,
                { id, message, severity: 'warning', duration: duration ?? 5000 },
            ],
        }));
    },

    info: (message, duration) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            toasts: [
                ...state.toasts,
                { id, message, severity: 'info', duration: duration ?? 4000 },
            ],
        }));
    },
}));
