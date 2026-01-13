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
- ✅ Query history tracking
- ✅ Docker and Electron packaging

---

## 📦 Distribution & Packaging

### Completed
- [x] Docker multi-stage build
- [x] Docker Compose for production
- [x] Electron desktop app structure
- [x] Health check endpoints
- [x] Static file serving in production

### Next Steps
- [ ] **App Icons** - Create and add icons for all platforms
  - `apps/desktop/resources/icon.png` (512x512 for Linux)
  - `apps/desktop/resources/icon.icns` (macOS)
  - `apps/desktop/resources/icon.ico` (Windows)
- [ ] **Code Signing** - Sign builds for macOS and Windows distribution
  - macOS: Apple Developer certificate
  - Windows: EV code signing certificate
- [ ] **Auto-Updates** - Implement electron-updater for automatic updates
  - GitHub Releases integration
  - Update notifications in app
- [ ] **npm Package** - Publish as global CLI tool
  - `npm install -g dbnexus`
  - `npx dbnexus` for one-time use
- [ ] **Homebrew Formula** - For macOS users
- [ ] **Snap/Flatpak** - For Linux distribution stores

---

## 🚀 Feature Roadmap

### v0.2.0 - Enhanced Query Experience
- [ ] Query autocomplete with table/column suggestions
- [ ] Query formatting/beautification
- [ ] Multiple query tabs
- [ ] Query snippets/templates
- [ ] Export results to CSV/JSON/Excel
- [ ] Query execution plan visualization

### v0.3.0 - Advanced Schema Management
- [ ] Visual schema designer (drag & drop)
- [ ] Migration history tracking
- [ ] Rollback support for migrations
- [ ] Schema versioning
- [ ] Generate TypeScript/Prisma types from schema

### v0.4.0 - Data Management
- [ ] Bulk data import (CSV, JSON, SQL)
- [ ] Data export with filters
- [ ] Data masking for sensitive columns
- [ ] Row-level sync with preview
- [ ] Scheduled sync jobs

### v0.5.0 - Collaboration Features
- [ ] Shared connections (team mode)
- [ ] Query sharing and bookmarks
- [ ] Audit logging
- [ ] Role-based access control
- [ ] Comments on queries/schemas

### v1.0.0 - Production Ready
- [ ] Comprehensive test coverage
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation website
- [ ] Plugin/extension system

---

## 🗄️ Database Support

### Currently Supported
- [x] PostgreSQL (full support)
- [x] MySQL (full support)
- [x] MariaDB (full support)
- [x] SQLite (full support)

### Planned
- [ ] Microsoft SQL Server
- [ ] Oracle Database
- [ ] MongoDB (document view)
- [ ] Redis (key-value view)
- [ ] CockroachDB
- [ ] TimescaleDB
- [ ] ClickHouse

---

## 🎨 UI/UX Improvements

- [ ] Keyboard shortcuts guide
- [ ] Customizable keyboard bindings
- [ ] Multiple color themes (light mode)
- [ ] Resizable panels
- [ ] Table relationship diagram
- [ ] Dark/light mode toggle
- [ ] Compact view mode
- [ ] Mobile-responsive design

---

## 🔧 Technical Debt

- [ ] Add comprehensive unit tests
- [ ] Add E2E tests with Playwright
- [ ] Improve error handling and messages
- [ ] Add request rate limiting
- [ ] Implement connection pooling
- [ ] Add telemetry (opt-in)
- [ ] Performance profiling and optimization

---

## 🌐 Landing Page & Marketing

- [ ] Create public landing page
- [ ] Feature showcase with screenshots
- [ ] Video tutorials
- [ ] Blog with tips and updates
- [ ] Discord/Slack community
- [ ] GitHub Discussions

---

## 💡 Ideas & Considerations

These are ideas that need more exploration:

- **AI Integration** - Natural language to SQL
- **Cloud Sync** - Sync connections/settings across devices
- **Backup Scheduling** - Automated database backups
- **Performance Monitoring** - Query performance tracking over time
- **Data Diff** - Visual diff between table snapshots
- **ERD Generation** - Auto-generate entity relationship diagrams
- **API Mode** - REST/GraphQL API for programmatic access

---

## 🤝 Contributing

We welcome contributions! If you'd like to work on any of these features:

1. Check if there's an existing issue
2. Open a new issue to discuss the feature
3. Fork the repository
4. Create a feature branch
5. Submit a pull request

---

## 📅 Release Schedule

We aim for monthly releases with the following cadence:

- **Patch releases** (0.x.1, 0.x.2): Bug fixes, as needed
- **Minor releases** (0.2, 0.3): New features, monthly
- **Major release** (1.0): When feature-complete and stable

---

*Last updated: January 2026*
