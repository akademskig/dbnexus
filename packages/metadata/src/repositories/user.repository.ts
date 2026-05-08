import type Database from 'better-sqlite3';

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string | null;
    role: 'admin' | 'editor' | 'viewer';
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserInput {
    email: string;
    passwordHash: string;
    name?: string;
    role?: 'admin' | 'editor' | 'viewer';
}

export interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: string;
    createdAt: string;
}

export interface ApiKey {
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
}

export interface UserPermission {
    id: string;
    userId: string;
    connectionId: string;
    permission: 'read' | 'write' | 'admin';
    createdAt: string;
}

export class UserRepository {
    constructor(private db: Database.Database) {}

    create(input: CreateUserInput): User {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        this.db
            .prepare(
                `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                id,
                input.email,
                input.passwordHash,
                input.name || null,
                input.role || 'viewer',
                now,
                now
            );

        return this.findById(id)!;
    }

    findById(id: string): User | null {
        const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
            | Record<string, unknown>
            | undefined;
        return row ? this.mapRow(row) : null;
    }

    findByEmail(email: string): User | null {
        const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
            | Record<string, unknown>
            | undefined;
        return row ? this.mapRow(row) : null;
    }

    findAll(): User[] {
        const rows = this.db
            .prepare('SELECT * FROM users ORDER BY created_at DESC')
            .all() as Record<string, unknown>[];
        return rows.map((row) => this.mapRow(row));
    }

    count(): number {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as {
            count: number;
        };
        return result.count;
    }

    update(
        id: string,
        updates: Partial<Pick<User, 'name' | 'role' | 'passwordHash'>>
    ): User | null {
        const fields: string[] = [];
        const values: unknown[] = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.role !== undefined) {
            fields.push('role = ?');
            values.push(updates.role);
        }
        if (updates.passwordHash !== undefined) {
            fields.push('password_hash = ?');
            values.push(updates.passwordHash);
        }

        if (fields.length === 0) return this.findById(id);

        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

        return this.findById(id);
    }

    delete(id: string): boolean {
        const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return result.changes > 0;
    }

    // Refresh token methods
    createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): RefreshToken {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        this.db
            .prepare(
                `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
                 VALUES (?, ?, ?, ?, ?)`
            )
            .run(id, userId, tokenHash, expiresAt.toISOString(), now);

        return {
            id,
            userId,
            tokenHash,
            expiresAt: expiresAt.toISOString(),
            createdAt: now,
        };
    }

    findRefreshToken(tokenHash: string): RefreshToken | null {
        const row = this.db
            .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
            .get(tokenHash) as Record<string, unknown> | undefined;

        if (!row) return null;

        return {
            id: row['id'] as string,
            userId: row['user_id'] as string,
            tokenHash: row['token_hash'] as string,
            expiresAt: row['expires_at'] as string,
            createdAt: row['created_at'] as string,
        };
    }

    deleteRefreshToken(tokenHash: string): boolean {
        const result = this.db
            .prepare('DELETE FROM refresh_tokens WHERE token_hash = ?')
            .run(tokenHash);
        return result.changes > 0;
    }

    deleteUserRefreshTokens(userId: string): void {
        this.db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
    }

    cleanupExpiredRefreshTokens(): number {
        const result = this.db
            .prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')")
            .run();
        return result.changes;
    }

    // API Key methods
    createApiKey(userId: string, name: string, keyHash: string, expiresAt?: Date): ApiKey {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        this.db
            .prepare(
                `INSERT INTO api_keys (id, user_id, name, key_hash, expires_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(id, userId, name, keyHash, expiresAt?.toISOString() || null, now);

        return {
            id,
            userId,
            name,
            keyHash,
            lastUsedAt: null,
            expiresAt: expiresAt?.toISOString() || null,
            createdAt: now,
        };
    }

    findApiKeyByHash(keyHash: string): ApiKey | null {
        const row = this.db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(keyHash) as
            | Record<string, unknown>
            | undefined;

        if (!row) return null;

        return this.mapApiKeyRow(row);
    }

    findApiKeysByUser(userId: string): ApiKey[] {
        const rows = this.db
            .prepare('SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC')
            .all(userId) as Record<string, unknown>[];

        return rows.map((row) => this.mapApiKeyRow(row));
    }

    updateApiKeyLastUsed(id: string): void {
        this.db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(id);
    }

    deleteApiKey(id: string, userId: string): boolean {
        const result = this.db
            .prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?')
            .run(id, userId);
        return result.changes > 0;
    }

    // User permissions methods
    setPermission(
        userId: string,
        connectionId: string,
        permission: 'read' | 'write' | 'admin'
    ): UserPermission {
        const existing = this.db
            .prepare('SELECT id FROM user_permissions WHERE user_id = ? AND connection_id = ?')
            .get(userId, connectionId) as { id: string } | undefined;

        if (existing) {
            this.db
                .prepare('UPDATE user_permissions SET permission = ? WHERE id = ?')
                .run(permission, existing.id);
            return this.getPermission(userId, connectionId)!;
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        this.db
            .prepare(
                `INSERT INTO user_permissions (id, user_id, connection_id, permission, created_at)
                 VALUES (?, ?, ?, ?, ?)`
            )
            .run(id, userId, connectionId, permission, now);

        return { id, userId, connectionId, permission, createdAt: now };
    }

    getPermission(userId: string, connectionId: string): UserPermission | null {
        const row = this.db
            .prepare('SELECT * FROM user_permissions WHERE user_id = ? AND connection_id = ?')
            .get(userId, connectionId) as Record<string, unknown> | undefined;

        if (!row) return null;

        return {
            id: row['id'] as string,
            userId: row['user_id'] as string,
            connectionId: row['connection_id'] as string,
            permission: row['permission'] as 'read' | 'write' | 'admin',
            createdAt: row['created_at'] as string,
        };
    }

    getUserPermissions(userId: string): UserPermission[] {
        const rows = this.db
            .prepare('SELECT * FROM user_permissions WHERE user_id = ?')
            .all(userId) as Record<string, unknown>[];

        return rows.map((row) => ({
            id: row['id'] as string,
            userId: row['user_id'] as string,
            connectionId: row['connection_id'] as string,
            permission: row['permission'] as 'read' | 'write' | 'admin',
            createdAt: row['created_at'] as string,
        }));
    }

    deletePermission(userId: string, connectionId: string): boolean {
        const result = this.db
            .prepare('DELETE FROM user_permissions WHERE user_id = ? AND connection_id = ?')
            .run(userId, connectionId);
        return result.changes > 0;
    }

    private mapRow(row: Record<string, unknown>): User {
        return {
            id: row['id'] as string,
            email: row['email'] as string,
            passwordHash: row['password_hash'] as string,
            name: row['name'] as string | null,
            role: row['role'] as 'admin' | 'editor' | 'viewer',
            createdAt: row['created_at'] as string,
            updatedAt: row['updated_at'] as string,
        };
    }

    private mapApiKeyRow(row: Record<string, unknown>): ApiKey {
        return {
            id: row['id'] as string,
            userId: row['user_id'] as string,
            name: row['name'] as string,
            keyHash: row['key_hash'] as string,
            lastUsedAt: row['last_used_at'] as string | null,
            expiresAt: row['expires_at'] as string | null,
            createdAt: row['created_at'] as string,
        };
    }
}
