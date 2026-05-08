import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ServerState {
    // Currently selected server for filtering
    selectedServerId: string;

    // Actions
    setServer: (serverId: string) => void;
    clear: () => void;
}

export const useServerStore = create<ServerState>()(
    persist(
        (set) => ({
            selectedServerId: '',

            setServer: (serverId) =>
                set({
                    selectedServerId: serverId,
                }),

            clear: () =>
                set({
                    selectedServerId: '',
                }),
        }),
        {
            name: 'dbnexus-server-state',
        }
    )
);
