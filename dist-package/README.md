# DB Nexus

> Database management tool with web UI - like Prisma Studio for any database

[![npm version](https://img.shields.io/npm/v/dbnexus.svg)](https://www.npmjs.com/package/dbnexus)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- 🖥️ **Modern Web UI** - Beautiful interface for database management
- 🔌 **Multiple Databases** - PostgreSQL, MySQL, MariaDB, SQLite
- 🔄 **Schema Sync** - Compare and migrate schemas between databases
- 📊 **Data Sync** - Synchronize table data with conflict resolution
- 🎨 **Schema Diagram** - Visual database schema editor
- 📜 **Query History** - Track and replay queries
- 🔒 **Secure** - Encrypted credentials with AES-256-GCM
- 🛡️ **Safety First** - Production guardrails for dangerous queries

## Installation

### Global Installation

```bash
npm install -g dbnexus
```

### Using npx

```bash
npx dbnexus
```

## Usage

Start DB Nexus:

```bash
dbnexus
```

This will start the server and open your browser to `http://localhost:3001`.

### Options

```bash
dbnexus --port 8080           # Run on custom port
dbnexus --data-dir /path      # Use custom data directory
dbnexus --no-open             # Don't open browser automatically
dbnexus --help                # Show help
```

### Commands

```bash
dbnexus                       # Start DB Nexus (default)
dbnexus start                 # Explicit start command
dbnexus --version             # Show version
```

## Data Storage

DB Nexus stores its metadata database in:

- **Linux/Mac**: `~/.dbnexus/metadata.db`
- **Windows**: `%USERPROFILE%\.dbnexus\metadata.db`

You can customize this location:

```bash
# Using flag
dbnexus --data-dir /custom/path

# Using environment variable
DBNEXUS_DATA_DIR=/custom/path dbnexus
```

## Features Overview

### Connection Management

- Add and manage multiple database connections
- Organize connections into projects and groups
- Test connection health
- Encrypted credential storage

### Query Editor

- Execute SQL queries with syntax highlighting
- View results in a data grid
- Edit data inline
- Query history and saved queries

### Schema Management

- Browse tables, columns, indexes, and foreign keys
- Compare schemas between databases
- Generate migration SQL
- Apply schema changes

### Data Synchronization

- Compare data between tables
- Sync data with conflict resolution
- Bulk data operations
- Dump and restore databases

### Schema Diagram

- Visual database schema editor
- Drag-and-drop table relationships
- Create and modify tables visually
- Export diagrams

## Requirements

- Node.js 18 or higher
- One of: PostgreSQL, MySQL, MariaDB, or SQLite

## Supported Databases

- **PostgreSQL** 9.6+
- **MySQL** 5.7+
- **MariaDB** 10.2+
- **SQLite** 3.0+

## Configuration

### Environment Variables

- `DBNEXUS_DATA_DIR` - Custom data directory
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Uninstallation

```bash
# Remove the package
npm uninstall -g dbnexus

# Remove all data
rm -rf ~/.dbnexus
```

## Documentation

- [Full Documentation](https://docs.dbnexus.dev)
- [GitHub Repository](https://github.com/akademskig/dbnexus)
- [Issue Tracker](https://github.com/akademskig/dbnexus/issues)

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/akademskig/dbnexus/blob/main/CONTRIBUTING.md).

## License

MIT © DB Nexus Team

## Support

- 📧 Email: <admin@dbnexus.dev>
- 🐛 Issues: [GitHub Issues](https://github.com/akademskig/dbnexus/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/akademskig/dbnexus/discussions)

---

**Like Prisma Studio, but for any database** - Manage PostgreSQL, MySQL, MariaDB, and SQLite databases with a beautiful web interface.
