import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTagsStore, TAG_COLORS } from '../tagsStore';

// Mock the API
vi.mock('../../lib/api', () => ({
    settingsApi: {
        getTags: vi.fn(),
        createTag: vi.fn(),
        updateTag: vi.fn(),
        deleteTag: vi.fn(),
        resetTags: vi.fn(),
    },
}));

import { settingsApi } from '../../lib/api';

const mockSettingsApi = settingsApi as {
    getTags: ReturnType<typeof vi.fn>;
    createTag: ReturnType<typeof vi.fn>;
    updateTag: ReturnType<typeof vi.fn>;
    deleteTag: ReturnType<typeof vi.fn>;
    resetTags: ReturnType<typeof vi.fn>;
};

describe('tagsStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useTagsStore.setState({ tags: [], isLoading: false, error: null });
        vi.clearAllMocks();
    });

    it('should initialize with empty tags after reset', () => {
        const state = useTagsStore.getState();
        expect(state.tags).toEqual([]);
    });

    it('should fetch tags from API', async () => {
        const mockTags = [
            { id: '1', name: 'production', color: '239, 68, 68' },
            { id: '2', name: 'staging', color: '245, 158, 11' },
        ];
        mockSettingsApi.getTags.mockResolvedValue(mockTags);

        await useTagsStore.getState().fetchTags();

        const state = useTagsStore.getState();
        expect(state.tags).toEqual(mockTags);
        expect(state.isLoading).toBe(false);
    });

    it('should add a new tag via API', async () => {
        const newTag = { id: 'new-id', name: 'Production', color: '239, 68, 68' };
        mockSettingsApi.createTag.mockResolvedValue(newTag);

        await useTagsStore.getState().addTag({ name: 'Production', color: '239, 68, 68' });

        const state = useTagsStore.getState();
        expect(state.tags).toHaveLength(1);
        expect(state.tags[0]).toEqual(newTag);
        expect(mockSettingsApi.createTag).toHaveBeenCalledWith({
            name: 'Production',
            color: '239, 68, 68',
        });
    });

    it('should update an existing tag via API', async () => {
        // Set initial state
        useTagsStore.setState({
            tags: [{ id: 'tag-1', name: 'Test', color: '100, 100, 100' }],
        });

        const updatedTag = { id: 'tag-1', name: 'Updated', color: '200, 200, 200' };
        mockSettingsApi.updateTag.mockResolvedValue(updatedTag);

        await useTagsStore
            .getState()
            .updateTag('tag-1', { name: 'Updated', color: '200, 200, 200' });

        const state = useTagsStore.getState();
        expect(state.tags[0].name).toBe('Updated');
        expect(state.tags[0].color).toBe('200, 200, 200');
    });

    it('should delete a tag via API', async () => {
        // Set initial state
        useTagsStore.setState({
            tags: [{ id: 'tag-1', name: 'ToDelete', color: '100, 100, 100' }],
        });

        mockSettingsApi.deleteTag.mockResolvedValue({ success: true });

        await useTagsStore.getState().deleteTag('tag-1');

        const state = useTagsStore.getState();
        expect(state.tags).toHaveLength(0);
    });

    it('should reset tags to defaults via API', async () => {
        const defaultTags = [
            { id: 'production', name: 'production', color: '239, 68, 68' },
            { id: 'staging', name: 'staging', color: '245, 158, 11' },
            { id: 'development', name: 'development', color: '16, 185, 129' },
            { id: 'read-only', name: 'read-only', color: '139, 92, 246' },
        ];
        mockSettingsApi.resetTags.mockResolvedValue(defaultTags);

        await useTagsStore.getState().resetTags();

        const state = useTagsStore.getState();
        expect(state.tags).toHaveLength(4);
        expect(state.tags.some((t) => t.name === 'production')).toBe(true);
    });

    it('should handle fetch error', async () => {
        mockSettingsApi.getTags.mockRejectedValue(new Error('Network error'));

        await useTagsStore.getState().fetchTags();

        const state = useTagsStore.getState();
        expect(state.error).toBe('Network error');
        expect(state.isLoading).toBe(false);
    });
});

describe('TAG_COLORS', () => {
    it('should have predefined colors', () => {
        expect(TAG_COLORS.red).toBe('239, 68, 68');
        expect(TAG_COLORS.green).toBe('16, 185, 129');
        expect(TAG_COLORS.blue).toBe('14, 165, 233');
    });

    it('should have all expected color keys', () => {
        const expectedColors = [
            'red',
            'orange',
            'amber',
            'yellow',
            'lime',
            'green',
            'teal',
            'cyan',
            'blue',
            'indigo',
            'purple',
            'pink',
            'gray',
        ];
        expectedColors.forEach((color) => {
            expect(TAG_COLORS).toHaveProperty(color);
        });
    });
});
