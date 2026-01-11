import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tag {
    id: string;
    name: string;
    color: string; // RGB string like "239, 68, 68"
}

// Default tags
const DEFAULT_TAGS: Tag[] = [
    { id: 'production', name: 'production', color: '239, 68, 68' }, // red
    { id: 'staging', name: 'staging', color: '245, 158, 11' }, // amber
    { id: 'development', name: 'development', color: '16, 185, 129' }, // green
    { id: 'read-only', name: 'read-only', color: '139, 92, 246' }, // purple
];

interface TagsStore {
    tags: Tag[];
    addTag: (tag: Omit<Tag, 'id'>) => void;
    updateTag: (id: string, updates: Partial<Omit<Tag, 'id'>>) => void;
    deleteTag: (id: string) => void;
    resetTags: () => void;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export const useTagsStore = create<TagsStore>()(
    persist(
        (set) => ({
            tags: DEFAULT_TAGS,
            addTag: (tag) =>
                set((state) => ({
                    tags: [...state.tags, { ...tag, id: generateId() }],
                })),
            updateTag: (id, updates) =>
                set((state) => ({
                    tags: state.tags.map((tag) => (tag.id === id ? { ...tag, ...updates } : tag)),
                })),
            deleteTag: (id) =>
                set((state) => ({
                    tags: state.tags.filter((tag) => tag.id !== id),
                })),
            resetTags: () => set({ tags: DEFAULT_TAGS }),
        }),
        {
            name: 'dbnexus-tags',
        }
    )
);

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
