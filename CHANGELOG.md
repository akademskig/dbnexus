# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/yourusername/db-manager/compare/v0.1.8...HEAD
[0.1.8]: https://github.com/yourusername/db-manager/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/yourusername/db-manager/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/yourusername/db-manager/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/yourusername/db-manager/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/yourusername/db-manager/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/yourusername/db-manager/compare/v0.1.0...v0.1.3
[0.1.0]: https://github.com/yourusername/db-manager/releases/tag/v0.1.0
