import { create } from 'zustand';
import { settingsApi, type Tag } from '../lib/api';

// Re-export Tag type for convenience
export type { Tag };

// Default tags (used as fallback before API loads)
const DEFAULT_TAGS: Tag[] = [
    { id: 'production', name: 'production', color: '239, 68, 68' }, // red
    { id: 'staging', name: 'staging', color: '245, 158, 11' }, // amber
    { id: 'development', name: 'development', color: '16, 185, 129' }, // green
    { id: 'read-only', name: 'read-only', color: '139, 92, 246' }, // purple
];

interface TagsStore {
    tags: Tag[];
    isLoading: boolean;
    error: string | null;
    fetchTags: () => Promise<void>;
    addTag: (tag: Omit<Tag, 'id'>) => Promise<void>;
    updateTag: (id: string, updates: Partial<Omit<Tag, 'id'>>) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
    resetTags: () => Promise<void>;
}

export const useTagsStore = create<TagsStore>((set) => ({
    tags: DEFAULT_TAGS,
    isLoading: false,
    error: null,

    fetchTags: async () => {
        set({ isLoading: true, error: null });
        try {
            const tags = await settingsApi.getTags();
            set({ tags, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    addTag: async (tag) => {
        try {
            const newTag = await settingsApi.createTag(tag);
            set((state) => ({ tags: [...state.tags, newTag] }));
        } catch (error) {
            console.error('Failed to add tag:', error);
            throw error;
        }
    },

    updateTag: async (id, updates) => {
        try {
            const updatedTag = await settingsApi.updateTag(id, updates);
            if (updatedTag) {
                set((state) => ({
                    tags: state.tags.map((tag) => (tag.id === id ? updatedTag : tag)),
                }));
            }
        } catch (error) {
            console.error('Failed to update tag:', error);
            throw error;
        }
    },

    deleteTag: async (id) => {
        try {
            await settingsApi.deleteTag(id);
            set((state) => ({
                tags: state.tags.filter((tag) => tag.id !== id),
            }));
        } catch (error) {
            console.error('Failed to delete tag:', error);
            throw error;
        }
    },

    resetTags: async () => {
        try {
            const tags = await settingsApi.resetTags();
            set({ tags });
        } catch (error) {
            console.error('Failed to reset tags:', error);
            throw error;
        }
    },
}));

// Preset tag colors
export const TAG_COLORS = {
    red: '239, 68, 68',
    orange: '249, 115, 22',
    amber: '245, 158, 11',
    yellow: '234, 179, 8',
    lime: '132, 204, 22',
    green: '16, 185, 129',
    teal: '20, 184, 166',
    cyan: '6, 182, 212',
    blue: '14, 165, 233',
    indigo: '99, 102, 241',
    purple: '139, 92, 246',
    pink: '236, 72, 153',
    gray: '107, 114, 128',
};
