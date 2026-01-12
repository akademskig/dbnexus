/**
 * SQLite schema for DB Nexus metadata
 */

export const SCHEMA_VERSION = 7;

export const MIGRATIONS: string[] = [
    // Version 1: Initial schema
    `
  -- Connections table with encrypted password
  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    engine TEXT NOT NULL DEFAULT 'postgres',
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    database TEXT NOT NULL,
    username TEXT NOT NULL,
    encrypted_password TEXT,
    ssl INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    read_only INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Saved queries
  CREATE TABLE IF NOT EXISTS saved_queries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sql TEXT NOT NULL,
    connection_id TEXT,
    folder_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL,
    FOREIGN KEY (folder_id) REFERENCES query_folders(id) ON DELETE SET NULL
  );

  -- Query folders
  CREATE TABLE IF NOT EXISTS query_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES query_folders(id) ON DELETE CASCADE
  );

  -- Query history
  CREATE TABLE IF NOT EXISTS query_history (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    sql TEXT NOT NULL,
    executed_at TEXT NOT NULL DEFAULT (datetime('now')),
    execution_time_ms INTEGER NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 1,
    error TEXT,
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
  );

  -- Schema snapshots
  CREATE TABLE IF NOT EXISTS schema_snapshots (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    captured_at TEXT NOT NULL DEFAULT (datetime('now')),
    schema_json TEXT NOT NULL,
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
  );

  -- Data sync configurations
  CREATE TABLE IF NOT EXISTS sync_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_connection_id TEXT NOT NULL,
    target_connection_id TEXT NOT NULL,
    source_table TEXT NOT NULL,
    target_table TEXT NOT NULL,
    primary_key_columns TEXT NOT NULL,
    conflict_strategy TEXT NOT NULL DEFAULT 'source_wins',
    timestamp_column TEXT,
    batch_size INTEGER NOT NULL DEFAULT 1000,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_connection_id) REFERENCES connections(id) ON DELETE CASCADE,
    FOREIGN KEY (target_connection_id) REFERENCES connections(id) ON DELETE CASCADE
  );

  -- Sync run history
  CREATE TABLE IF NOT EXISTS sync_runs (
    id TEXT PRIMARY KEY,
    sync_config_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    inserts INTEGER NOT NULL DEFAULT 0,
    updates INTEGER NOT NULL DEFAULT 0,
    deletes INTEGER NOT NULL DEFAULT 0,
    errors_json TEXT,
    FOREIGN KEY (sync_config_id) REFERENCES sync_configs(id) ON DELETE CASCADE
  );

  -- Audit log
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    connection_id TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Schema version tracking
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );

  INSERT INTO schema_version (version) VALUES (2);

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_query_history_connection ON query_history(connection_id);
  CREATE INDEX IF NOT EXISTS idx_query_history_executed_at ON query_history(executed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_schema_snapshots_connection ON schema_snapshots(connection_id);
  CREATE INDEX IF NOT EXISTS idx_sync_runs_config ON sync_runs(sync_config_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
  `,

    // Version 2: Add encrypted_password column (for existing databases)
    `
  ALTER TABLE connections ADD COLUMN encrypted_password TEXT;
  UPDATE schema_version SET version = 2;
  `,

    // Version 3: Add migration_history table for tracking applied migrations
    `
  DROP TABLE IF EXISTS schema_diffs;

  CREATE TABLE IF NOT EXISTS migration_history (
    id TEXT PRIMARY KEY,
    source_connection_id TEXT NOT NULL,
    target_connection_id TEXT NOT NULL,
    source_schema TEXT NOT NULL,
    target_schema TEXT NOT NULL,
    description TEXT,
    sql_statements TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    success INTEGER NOT NULL DEFAULT 1,
    error TEXT,
    FOREIGN KEY (source_connection_id) REFERENCES connections(id) ON DELETE CASCADE,
    FOREIGN KEY (target_connection_id) REFERENCES connections(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_migration_history_applied_at ON migration_history(applied_at DESC);
  CREATE INDEX IF NOT EXISTS idx_migration_history_target ON migration_history(target_connection_id);

  UPDATE schema_version SET version = 3;
  `,

    // Version 4: Add projects and database_groups for organizing connections
    `
  -- Projects (top-level grouping)
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Database groups (instances of the same DB within a project)
  CREATE TABLE IF NOT EXISTS database_groups (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, name)
  );

  -- Add project and group references to connections
  ALTER TABLE connections ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
  ALTER TABLE connections ADD COLUMN group_id TEXT REFERENCES database_groups(id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS idx_connections_project ON connections(project_id);
  CREATE INDEX IF NOT EXISTS idx_connections_group ON connections(group_id);
  CREATE INDEX IF NOT EXISTS idx_database_groups_project ON database_groups(project_id);

  UPDATE schema_version SET version = 4;
  `,

    // Version 5: Add sync settings to instance groups
    `
  -- Add source connection and sync settings to database_groups
  ALTER TABLE database_groups ADD COLUMN source_connection_id TEXT REFERENCES connections(id) ON DELETE SET NULL;
  ALTER TABLE database_groups ADD COLUMN sync_schema INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE database_groups ADD COLUMN sync_data INTEGER NOT NULL DEFAULT 0;

  UPDATE schema_version SET version = 5;
  `,

    // Version 6: Add default_schema to connections
    `
  ALTER TABLE connections ADD COLUMN default_schema TEXT;

  UPDATE schema_version SET version = 6;
  `,

    // Version 7: Add sync_target_schema to database_groups
    `
  ALTER TABLE database_groups ADD COLUMN sync_target_schema TEXT;

  UPDATE schema_version SET version = 7;
  `,
];
