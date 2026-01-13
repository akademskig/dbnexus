# DB Nexus Roadmap

This document outlines planned features, improvements, and future directions for DB Nexus.

## 🎯 Current Status: v0.1.0 (Alpha)

Core functionality is working:

- ✅ Multi-database connections (PostgreSQL, MySQL, MariaDB, SQLite)
- ✅ Query editor with syntax highlighting
- ✅ Schema browser and table data viewer
- ✅ Schema comparison and sync between databases
- ✅ Data sync with conflict resolution
- ✅ Instance groups for organizing related databases
- ✅ Connection tagging and project organization
- ✅ Query history and migration logs
- ✅ Docker and Electron packaging
- ✅ Theme-aware branding (teal/indigo)

---

## 🚀 Pre-Release Essentials (v1.0)

These features are required before the first public release:

### Core Functionality

- [x] **Export query results** - CSV/JSON export buttons on data grid ✅
- [ ] **Saved queries** - Save, organize, and quickly access favorite queries
- [x] **Keyboard shortcuts** - Essential shortcuts for power users ✅
  - `Ctrl+Enter` - Run query
  - `Ctrl+/` - Toggle comment
  - `Ctrl+1-6` - Navigate between pages
- [ ] **Query templates** - Pre-built queries for common operations
  - Show table sizes
  - List indexes
  - Active connections
  - Slow queries
- [x] **Toast notifications** - Feedback for sync completion, errors, copy actions ✅

### User Experience

- [ ] **Onboarding tour** - First-time user walkthrough highlighting key features
- [x] **Empty states** - Helpful illustrations and guidance when no data exists ✅
- [ ] **Dark/light toggle in header** - Quick access theme switcher
- [x] **Keyboard shortcuts guide** - Settings page tab showing all shortcuts ✅

### Polish & Stability

- [ ] **Error handling** - Improve error messages with actionable guidance
- [x] **Loading states** - Consistent loading indicators across all pages ✅
- [x] **Confirmation dialogs** - Confirm destructive actions (delete, drop, sync) ✅
- [ ] **Form validation** - Better validation feedback on all forms

### Distribution

- [x] **App icons** - Create icons for all platforms (Windows, macOS, Linux) ✅
- [ ] **Code signing** - Sign builds for trusted distribution
- [ ] **Auto-updates** - Implement electron-updater for seamless updates
- [ ] **Landing page** - Public website with features and download links

---

## 📦 Post-Release Updates

Features to ship in subsequent versions after v1.0:

### v1.1 - Enhanced Query Experience

- [ ] **Multi-tab queries** - Multiple query tabs per connection
- [ ] **Query autocomplete** - Table/column suggestions as you type
- [ ] **Query formatting** - Auto-format/beautify SQL
- [ ] **Query explain/analyze** - Show execution plans with visual breakdown
- [ ] **Query snippets** - Reusable code snippets with variables

### v1.2 - Advanced Data Management

- [ ] **Data import** - Import CSV/JSON/SQL into tables
- [ ] **Table data diff** - Compare actual row data between instances (not just counts)
- [ ] **Data masking** - Hide sensitive columns in preview
- [ ] **Bulk operations** - Multi-row edit/delete with preview

### v1.3 - Schema Visualization

- [x] **ER diagram** - Visual entity relationship diagram showing foreign keys ✅ (moved to v1.0!)
- [ ] **Schema designer** - Drag & drop table/column creation
- [ ] **Rollback migrations** - Generate reverse migration SQL
- [ ] **Schema versioning** - Track schema changes over time

### v1.4 - Automation & Scheduling

- [ ] **Scheduled sync** - Auto-sync instance groups on a schedule
- [ ] **Connection health monitoring** - Dashboard widget with status/latency history
- [ ] **Backup scheduling** - Automated database backups
- [ ] **Webhook notifications** - Notify external services on events

### v1.5 - Collaboration

- [ ] **Shared connections** - Team mode with shared connection configs
- [ ] **Query sharing** - Share queries with team members
- [ ] **Audit logging** - Track who did what and when
- [ ] **Role-based access** - Admin/viewer/editor roles

### Future Considerations

- [ ] **AI Integration** - Natural language to SQL
- [ ] **Cloud sync** - Sync settings across devices
- [ ] **Plugin system** - Extensible architecture for custom features
- [ ] **API mode** - REST/GraphQL API for programmatic access
- [ ] **Performance monitoring** - Query performance tracking over time

---

## 🗄️ Database Support

### Currently Supported

- [x] PostgreSQL (full support)
- [x] MySQL (full support)
- [x] MariaDB (full support)
- [x] SQLite (full support)

### Planned (Post-Release)

- [ ] Microsoft SQL Server
- [ ] Oracle Database
- [ ] MongoDB (document view)
- [ ] Redis (key-value view)
- [ ] CockroachDB
- [ ] TimescaleDB
- [ ] ClickHouse

---

## 🔧 Technical Debt

### Pre-Release

- [ ] Improve error handling and messages
- [ ] Add request rate limiting
- [ ] Implement connection pooling

### Post-Release

- [ ] Add comprehensive unit tests
- [ ] Add E2E tests with Playwright
- [ ] Add telemetry (opt-in)
- [ ] Performance profiling and optimization

---

## 🌐 Marketing & Community

### Pre-Release

- [ ] Create public landing page
- [ ] Feature showcase with screenshots
- [ ] README with clear installation instructions

### Post-Release

- [ ] Video tutorials
- [ ] Blog with tips and updates
- [ ] Discord/Slack community
- [ ] GitHub Discussions

---

## 📅 Release Timeline

| Version | Focus | Target |
|---------|-------|--------|
| v0.9 | Feature freeze, bug fixes | - |
| v1.0 | First public release | - |
| v1.1 | Query enhancements | +1 month |
| v1.2 | Data management | +2 months |
| v1.3 | Schema visualization | +3 months |
| v1.4 | Automation | +4 months |
| v1.5 | Collaboration | +5 months |

---

## 🤝 Contributing

We welcome contributions! If you'd like to work on any of these features:

1. Check if there's an existing issue
2. Open a new issue to discuss the feature
3. Fork the repository
4. Create a feature branch
5. Submit a pull request

---

*Last updated: January 2026*
