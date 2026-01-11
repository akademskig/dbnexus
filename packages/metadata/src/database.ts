/**
 * SQLite database manager for DB Nexus metadata
 */

import Database from 'better-sqlite3';
import { MIGRATIONS, SCHEMA_VERSION } from './schema.js';

export class MetadataDatabase {
    private db: Database.Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
    }

    /**
     * Initialize the database schema
     */
    initialize(): void {
        const currentVersion = this.getSchemaVersion();

        if (currentVersion === 0) {
            // Fresh database, run all migrations
            this.db.exec(MIGRATIONS[0]!);
        } else if (currentVersion < SCHEMA_VERSION) {
            // Run pending migrations
            for (let i = currentVersion; i < SCHEMA_VERSION; i++) {
                const migration = MIGRATIONS[i];
                if (migration) {
                    this.db.exec(migration);
                }
            }
            this.db.prepare('UPDATE schema_version SET version = ?').run(SCHEMA_VERSION);
        }
    }

    /**
     * Get the current schema version
     */
    private getSchemaVersion(): number {
        try {
            const result = this.db.prepare('SELECT version FROM schema_version').get() as
                | { version: number }
                | undefined;
            return result?.version ?? 0;
        } catch {
            return 0;
        }
    }

    /**
     * Get the underlying database instance for direct queries
     */
    getDb(): Database.Database {
        return this.db;
    }

    /**
     * Close the database connection
     */
    close(): void {
        this.db.close();
    }

    /**
     * Generate a unique ID
     */
    static generateId(): string {
        return crypto.randomUUID();
    }
}
