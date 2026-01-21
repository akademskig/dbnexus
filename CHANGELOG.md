# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Floating SQL Editor**: Detachable editor dialog to write queries while viewing results
  - Pop out from SQL tab to separate window
  - Fullscreen mode support
  - Execute, Explain, Save, and Copy actions
  - Keyboard shortcuts (Ctrl/Cmd+Enter to execute)
- **Query Templates**: Pre-built SQL templates panel with 25+ categorized snippets (SELECT, JOIN, Aggregate, INSERT, UPDATE, DELETE, DDL, Window Functions)
  - Context-aware templates auto-replace placeholders with selected table and column names
  - Smart column detection by type (text, number, date)
  - Database-specific identifier quoting (PostgreSQL, MySQL, SQLite)
- **Screenshots**: Added visual showcase to README with 8 screenshots

## [0.1.13] - 2026-01-21

### Added

- **Explain Plan Dialog** - Separate component with tabs for execution plan and insights
- **Query type classification** - Categorize queries (READ, WRITE, DDL, MAINTENANCE) with color-coded chips
- **Maintenance operations** - Detailed results for VACUUM, ANALYZE, REINDEX, OPTIMIZE with scope targeting
- **Audit Logs** - New tab tracking connection lifecycle, project/group management, and schema changes
- **Primary key management** - Add, edit, and remove primary keys from table management UI
- **Index editing** - Full edit functionality for indexes including rename
- **Group source tracking** - Migrations and sync runs show if from instance groups or manual
- **Connection filtering** - Filter activities by connection in Activity, Migrations, and Sync tabs
- Single-row data sync now logged in sync_run_logs

### Changed

- Renamed tables: `query_history` → `query_logs`, `migration_history` → `migration_logs`, `sync_runs` → `sync_run_logs`
- Schema diff now generates SQL for primary key and unique constraint changes
- Logs tabs show instance group name for automated operations
- Source column uses styled Chip badges (purple for groups, gray for manual)
- Navigation panel width reduced for more workspace

### Fixed

- Schema selection resetting on Query Page
- Primary key constraint names in generated SQL
- Delete operations now properly confirmed
- Table management operations correctly logged

## [0.1.12] - 2026-01-19

### Added

- **Data Sync Logs tab** in Logs page - dedicated view for sync operations
- Sync run tracking with full details (source/target connections, schema, table)
- SQL statement logging for sync operations (shows actual executed SQL with values)
- Auto-refresh of sync logs when operations complete

### Changed

- Removed unused `sync_configs` table (sync config is on database groups)
- Sync runs now tracked in Activity log alongside queries and migrations

## [0.1.11] - 2026-01-19

### Added

- StatusAlert component for consistent alert styling across the app
- Dynamic CLI version from package.json (no more hardcoded versions)

### Changed

- License changed from MIT to AGPL-3.0
- Replaced MUI Alert with custom StatusAlert component in major files
- Docs site configured for GitHub Pages deployment (base path, asset paths)

### Fixed

- CLI bundle duplicate `createRequire` error
- Docs logo and screenshot paths on GitHub Pages
- CLI `--port` option now correctly passed to server

## [0.1.10] - 2026-01-18

### Added

- Connection details tooltip in navigation sidebar (shows host, port, database, status)
- Reusable OperationResult component for consistent operation feedback UI
- CLI and API test suites

### Changed

- Unified operation results styling across Maintenance, Sync, and Compare pages

## [0.1.9] - 2026-01-18

### Added

- Local CLI development script (`pnpm cli`)
- Full CLI commands in published package (connect, scan, query, export, schema)

### Changed

- Published package now uses CLI as entry point instead of API-only wrapper

## [0.1.8] - 2026-01-18

### Added

- Accent color selector in Settings (with dynamic logo color)
- Dynamic app version display in Settings About section
- Shared Add/Edit Column dialog with Primary Key and Foreign Key options
- Settings page now shows icons on tabs (matching Connection Management style)

### Changed

- Standardized tooltips across the app with StyledTooltip
- Standardized dialog actions padding across all dialogs
- Settings tabs restyled to match Connection Management page

### Fixed

- Tag chips now render with rounded corners consistently

## [0.1.7] - 2026-01-16

### Added

- Drag and drop connections between projects and groups on Projects page
  - Visual feedback with dashed border on drag over
  - Drop zones on projects, groups, and ungrouped section

### Fixed

- Drag highlight not clearing when dropping on nested elements

## [0.1.6] - 2026-01-16

### Added

- Interactive onboarding tour for new users
  - Step-by-step walkthrough of main features
  - Minimizable floating panel
  - Progress tracking with localStorage persistence
  - Spotlight indicators for target elements
- Auto-select first connection and default schema when adding connections
- Auto-select first table on Query page when none is selected
- Redirect from connection-required pages when no connections exist
- Route change triggers connections refresh for fresh data

### Changed

- Onboarding tour uses primary color consistently (removed colorful gradients)
- Navigation items disable when no connections are available

### Fixed

- Duplicate delete confirmation dialogs in Query page

## [0.1.5] - 2026-01-16

### Added

- Automated release tooling with version bump scripts
- GitHub Actions workflow for npm publishing
- Clickable foreign key values in query results (navigates to referenced row)
- Catch-all route redirecting unknown paths to dashboard

### Changed

- Improved README with organized feature sections

### Fixed

- Infinite loop in schema diagram when no connection selected
- Connection switching on query page causing revert
- Schema diagram refresh after edits in connection manager

## [0.1.4] - 2026-01-15

### Added

- Connection scanning feature to auto-discover databases
  - Port scanning for common database ports
  - Docker container inspection
  - Environment file parsing (.env)
  - Docker Compose file parsing
  - SQLite file discovery
- Connection type classification (local, Docker, remote)
- Edit column functionality in Schema Diagram
- Centralized SQL utilities for consistent identifier quoting

### Changed

- Dashboard scan button matches Projects page style
- Scanned connections show as disabled if already added

### Fixed

- Dangerous operation confirmation for DROP TABLE and other DDL
- Preserve `requiresConfirmation` in API error responses
- Deduplicate scanned connections by host/port
- Type predicate for proper type narrowing in scan results
- Optional chaining for cleaner null checks

## [0.1.3] - 2026-01-14

### Added

- Schema Diagram visualization with React Flow
- Table management (create, drop, alter)
- Column management (add, edit, delete)
- Foreign key visualization
- Compare & Sync functionality for database environments
- Instance groups for organizing related connections
- Projects for grouping connections by application

### Fixed

- Various bug fixes and stability improvements

## [0.1.0] - 2026-01-10

### Added

- Initial release
- Query Editor with syntax highlighting and auto-completion
- Multi-database support (PostgreSQL, MySQL, MariaDB, SQLite)
- Connection management with secure credential storage
- Table browsing and data exploration
- Inline cell editing
- Query history and saved queries
- Dark/Light theme support
- Keyboard shortcuts for common actions

[Unreleased]: https://github.com/yourusername/db-manager/compare/v0.1.13...HEAD
[0.1.13]: https://github.com/yourusername/db-manager/compare/v0.1.12...v0.1.13
[0.1.12]: https://github.com/yourusername/db-manager/compare/v0.1.11...v0.1.12
[0.1.11]: https://github.com/yourusername/db-manager/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/yourusername/db-manager/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/yourusername/db-manager/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/yourusername/db-manager/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/yourusername/db-manager/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/yourusername/db-manager/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/yourusername/db-manager/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/yourusername/db-manager/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/yourusername/db-manager/compare/v0.1.0...v0.1.3
[0.1.0]: https://github.com/yourusername/db-manager/releases/tag/v0.1.0
