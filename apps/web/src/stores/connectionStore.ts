import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConnectionState {
    // Currently selected connection and schema (shared across pages)
    selectedConnectionId: string;
    selectedSchema: string;

    // Actions
    setConnection: (connectionId: string) => void;
    setSchema: (schema: string) => void;
    setConnectionAndSchema: (connectionId: string, schema: string) => void;
    clear: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
    persist(
        (set) => ({
            selectedConnectionId: '',
            selectedSchema: '',

            setConnection: (connectionId) =>
                set({
                    selectedConnectionId: connectionId,
                    selectedSchema: '', // Reset schema when connection changes
                }),

            setSchema: (schema) =>
                set({
                    selectedSchema: schema,
                }),

            setConnectionAndSchema: (connectionId, schema) =>
                set({
                    selectedConnectionId: connectionId,
                    selectedSchema: schema,
                }),

            clear: () =>
                set({
                    selectedConnectionId: '',
                    selectedSchema: '',
                }),
        }),
        {
            name: 'dbnexus-connection-state',
        }
    )
);
