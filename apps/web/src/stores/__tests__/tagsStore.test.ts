import { describe, it, expect, beforeEach } from 'vitest';
import { useTagsStore, TAG_COLORS } from '../tagsStore';

describe('tagsStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useTagsStore.setState({ tags: [] });
    });

    it('should initialize with empty tags after reset', () => {
        const state = useTagsStore.getState();
        expect(state.tags).toEqual([]);
    });

    it('should add a new tag', () => {
        const { addTag } = useTagsStore.getState();
        addTag({ name: 'Production', color: '239, 68, 68' });

        const state = useTagsStore.getState();
        expect(state.tags).toHaveLength(1);
        expect(state.tags[0].name).toBe('Production');
        expect(state.tags[0].color).toBe('239, 68, 68');
        expect(state.tags[0].id).toBeDefined();
    });

    it('should update an existing tag', () => {
        const { addTag, updateTag } = useTagsStore.getState();
        addTag({ name: 'Test', color: '100, 100, 100' });

        const tagId = useTagsStore.getState().tags[0].id;
        updateTag(tagId, { name: 'Updated', color: '200, 200, 200' });

        const state = useTagsStore.getState();
        expect(state.tags[0].name).toBe('Updated');
        expect(state.tags[0].color).toBe('200, 200, 200');
    });

    it('should delete a tag', () => {
        const { addTag, deleteTag } = useTagsStore.getState();
        addTag({ name: 'ToDelete', color: '100, 100, 100' });

        const tagId = useTagsStore.getState().tags[0].id;
        expect(useTagsStore.getState().tags).toHaveLength(1);

        deleteTag(tagId);
        expect(useTagsStore.getState().tags).toHaveLength(0);
    });

    it('should handle multiple tags', () => {
        const { addTag } = useTagsStore.getState();
        addTag({ name: 'Tag1', color: '100, 0, 0' });
        addTag({ name: 'Tag2', color: '0, 100, 0' });
        addTag({ name: 'Tag3', color: '0, 0, 100' });

        const state = useTagsStore.getState();
        expect(state.tags).toHaveLength(3);
    });

    it('should reset tags to default', () => {
        const { addTag, resetTags } = useTagsStore.getState();
        addTag({ name: 'Custom', color: '50, 50, 50' });

        resetTags();

        const state = useTagsStore.getState();
        // Default tags include production, staging, development, read-only
        expect(state.tags).toHaveLength(4);
        expect(state.tags.some((t) => t.name === 'production')).toBe(true);
    });

    it('should only update specified fields', () => {
        const { addTag, updateTag } = useTagsStore.getState();
        addTag({ name: 'Original', color: '100, 100, 100' });

        const tagId = useTagsStore.getState().tags[0].id;
        updateTag(tagId, { name: 'NewName' }); // Only update name

        const state = useTagsStore.getState();
        expect(state.tags[0].name).toBe('NewName');
        expect(state.tags[0].color).toBe('100, 100, 100'); // Color unchanged
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
