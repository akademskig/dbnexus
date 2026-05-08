/**
 * Repository for user preferences
 * Stores user-scoped key-value pairs with JSON values
 */

import type { MetadataDatabase } from '../database.js';

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export interface UserPreference {
    id: string;
    userId: string;
    key: string;
    value: unknown;
    updatedAt: string;
}

interface PreferenceRow {
    id: string;
    user_id: string;
    key: string;
    value: string;
    updated_at: string;
}

const DEFAULT_TAGS: Tag[] = [
    { id: 'production', name: 'production', color: '239, 68, 68' },
    { id: 'staging', name: 'staging', color: '245, 158, 11' },
    { id: 'development', name: 'development', color: '16, 185, 129' },
    { id: 'read-only', name: 'read-only', color: '139, 92, 246' },
];

export class UserPreferencesRepository {
    constructor(private db: MetadataDatabase) {}

    /**
     * Get a preference value for a specific user
     */
    get<T>(userId: string, key: string): T | null {
        const row = this.db
            .getDb()
            .prepare('SELECT value FROM user_preferences WHERE user_id = ? AND key = ?')
            .get(userId, key) as { value: string } | undefined;

        if (!row) {
            return this.getSystemDefault<T>(key);
        }

        try {
            return JSON.parse(row.value) as T;
        } catch {
            return row.value as unknown as T;
        }
    }

    /**
     * Set a preference value for a specific user
     */
    set<T>(userId: string, key: string, value: T): void {
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
        const id = crypto.randomUUID();

        this.db
            .getDb()
            .prepare(
                `
                INSERT INTO user_preferences (id, user_id, key, value, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'))
                ON CONFLICT(user_id, key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = datetime('now')
            `
            )
            .run(id, userId, key, jsonValue);
    }

    /**
     * Delete a preference for a specific user
     */
    delete(userId: string, key: string): boolean {
        const result = this.db
            .getDb()
            .prepare('DELETE FROM user_preferences WHERE user_id = ? AND key = ?')
            .run(userId, key);
        return result.changes > 0;
    }

    /**
     * Get all preferences for a specific user
     */
    getAllForUser(userId: string): Record<string, unknown> {
        const rows = this.db
            .getDb()
            .prepare('SELECT key, value FROM user_preferences WHERE user_id = ?')
            .all(userId) as PreferenceRow[];

        const preferences: Record<string, unknown> = {};

        const systemDefaults = this.getAllSystemDefaults();
        for (const [key, value] of Object.entries(systemDefaults)) {
            preferences[key] = value;
        }

        for (const row of rows) {
            try {
                preferences[row.key] = JSON.parse(row.value);
            } catch {
                preferences[row.key] = row.value;
            }
        }

        return preferences;
    }

    /**
     * Get a system default value (user_id = 'system')
     */
    getSystemDefault<T>(key: string): T | null {
        const row = this.db
            .getDb()
            .prepare('SELECT value FROM user_preferences WHERE user_id = ? AND key = ?')
            .get('system', key) as { value: string } | undefined;

        if (!row) return null;

        try {
            return JSON.parse(row.value) as T;
        } catch {
            return row.value as unknown as T;
        }
    }

    /**
     * Set a system default value
     */
    setSystemDefault<T>(key: string, value: T): void {
        this.set('system', key, value);
    }

    /**
     * Get all system defaults
     */
    getAllSystemDefaults(): Record<string, unknown> {
        const rows = this.db
            .getDb()
            .prepare('SELECT key, value FROM user_preferences WHERE user_id = ?')
            .all('system') as PreferenceRow[];

        const defaults: Record<string, unknown> = {};
        for (const row of rows) {
            try {
                defaults[row.key] = JSON.parse(row.value);
            } catch {
                defaults[row.key] = row.value;
            }
        }
        return defaults;
    }

    // ============ Tag-specific methods (system-wide) ============

    /**
     * Get all tags (system-wide)
     */
    getTags(): Tag[] {
        return this.getSystemDefault<Tag[]>('tags') || DEFAULT_TAGS;
    }

    /**
     * Set tags (system-wide)
     */
    setTags(tags: Tag[]): void {
        this.setSystemDefault('tags', tags);
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
