/**
 * Repository for user settings/preferences
 * Stores key-value pairs with JSON values
 */

import type { MetadataDatabase } from '../database.js';

export interface Tag {
    id: string;
    name: string;
    color: string;
}

// Default tags
const DEFAULT_TAGS: Tag[] = [
    { id: 'production', name: 'production', color: '239, 68, 68' },
    { id: 'staging', name: 'staging', color: '245, 158, 11' },
    { id: 'development', name: 'development', color: '16, 185, 129' },
    { id: 'read-only', name: 'read-only', color: '139, 92, 246' },
];

interface SettingRow {
    key: string;
    value: string;
    updated_at: string;
}

export class SettingsRepository {
    constructor(private db: MetadataDatabase) {}

    /**
     * Get a setting value by key
     */
    get<T>(key: string): T | null {
        const row = this.db.getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
            | { value: string }
            | undefined;

        if (!row) return null;

        try {
            return JSON.parse(row.value) as T;
        } catch {
            return row.value as unknown as T;
        }
    }

    /**
     * Set a setting value
     */
    set<T>(key: string, value: T): void {
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

        this.db
            .getDb()
            .prepare(
                `
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = datetime('now')
        `
            )
            .run(key, jsonValue);
    }

    /**
     * Delete a setting
     */
    delete(key: string): boolean {
        const result = this.db.getDb().prepare('DELETE FROM settings WHERE key = ?').run(key);
        return result.changes > 0;
    }

    /**
     * Get all settings
     */
    getAll(): Record<string, unknown> {
        const rows = this.db
            .getDb()
            .prepare('SELECT key, value FROM settings')
            .all() as SettingRow[];

        const settings: Record<string, unknown> = {};
        for (const row of rows) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }
        return settings;
    }

    // ============ Tag-specific methods ============

    /**
     * Get all tags
     */
    getTags(): Tag[] {
        return this.get<Tag[]>('tags') || DEFAULT_TAGS;
    }

    /**
     * Set tags
     */
    setTags(tags: Tag[]): void {
        this.set('tags', tags);
    }

    /**
     * Add a new tag
     */
    addTag(tag: Omit<Tag, 'id'>): Tag {
        const tags = this.getTags();
        const newTag: Tag = {
            ...tag,
            id: crypto.randomUUID(),
        };
        tags.push(newTag);
        this.setTags(tags);
        return newTag;
    }

    /**
     * Update a tag
     */
    updateTag(id: string, updates: Partial<Omit<Tag, 'id'>>): Tag | null {
        const tags = this.getTags();
        const index = tags.findIndex((t) => t.id === id);
        if (index === -1) return null;

        const existingTag = tags[index];
        if (!existingTag) return null;

        const updatedTag: Tag = {
            id: existingTag.id,
            name: updates.name ?? existingTag.name,
            color: updates.color ?? existingTag.color,
        };
        tags[index] = updatedTag;
        this.setTags(tags);
        return updatedTag;
    }

    /**
     * Delete a tag
     */
    deleteTag(id: string): boolean {
        const tags = this.getTags();
        const filtered = tags.filter((t) => t.id !== id);
        if (filtered.length === tags.length) return false;

        this.setTags(filtered);
        return true;
    }

    /**
     * Reset tags to defaults
     */
    resetTags(): Tag[] {
        this.setTags(DEFAULT_TAGS);
        return DEFAULT_TAGS;
    }
}
