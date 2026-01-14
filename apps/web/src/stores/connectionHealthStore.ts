import { create } from 'zustand';
import { connectionsApi } from '../lib/api';

interface ConnectionHealth {
    isOnline: boolean;
    lastChecked: number;
    error?: string;
}

interface ConnectionHealthState {
    // Map of connectionId -> health status
    healthStatus: Record<string, ConnectionHealth>;

    // Loading state for batch checks
    isChecking: boolean;

    // Actions
    checkConnection: (connectionId: string) => Promise<boolean>;
    checkAllConnections: (connectionIds: string[]) => Promise<void>;
    getHealth: (connectionId: string) => ConnectionHealth | undefined;
    isOnline: (connectionId: string) => boolean;
    clearHealth: (connectionId: string) => void;
    clearAll: () => void;
}

// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000;

export const useConnectionHealthStore = create<ConnectionHealthState>((set, get) => ({
    healthStatus: {},
    isChecking: false,

    checkConnection: async (connectionId: string) => {
        const current = get().healthStatus[connectionId];

        // Return cached result if still valid
        if (current && Date.now() - current.lastChecked < CACHE_DURATION) {
            return current.isOnline;
        }

        try {
            const result = await connectionsApi.test(connectionId);
            const isOnline = result.success;

            set((state) => ({
                healthStatus: {
                    ...state.healthStatus,
                    [connectionId]: {
                        isOnline,
                        lastChecked: Date.now(),
                        error: isOnline ? undefined : result.message,
                    },
                },
            }));

            return isOnline;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';

            set((state) => ({
                healthStatus: {
                    ...state.healthStatus,
                    [connectionId]: {
                        isOnline: false,
                        lastChecked: Date.now(),
                        error: errorMessage,
                    },
                },
            }));

            return false;
        }
    },

    checkAllConnections: async (connectionIds: string[]) => {
        set({ isChecking: true });

        // Check all connections in parallel
        await Promise.allSettled(connectionIds.map((id) => get().checkConnection(id)));

        set({ isChecking: false });
    },

    getHealth: (connectionId: string) => {
        return get().healthStatus[connectionId];
    },

    isOnline: (connectionId: string) => {
        const health = get().healthStatus[connectionId];
        // If not checked yet, assume online (will be checked on selection)
        if (!health) return true;
        return health.isOnline;
    },

    clearHealth: (connectionId: string) => {
        set((state) => {
            const { [connectionId]: _, ...rest } = state.healthStatus;
            return { healthStatus: rest };
        });
    },

    clearAll: () => {
        set({ healthStatus: {} });
    },
}));
