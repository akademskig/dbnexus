/**
 * User preferences types
 */

export interface FavoriteTable {
    connectionId: string;
    schema: string;
    tableName: string;
}

export interface QueryTab {
    id: string;
    name: string;
    sql: string;
    connectionId?: string;
}

export interface UserPreferences {
    theme?: 'light' | 'dark' | 'system';
    favorites?: FavoriteTable[];
    queryTabs?: QueryTab[];
    recentDatabases?: string[]; // Array of connection IDs
    sidebarCollapsed?: boolean;
}

export type PreferenceKey = keyof UserPreferences;
