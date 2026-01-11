# DB Nexus

A **local-first database management tool** with a modern web UI, CLI, and production safety guardrails.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- 🖥️ **Modern Web UI** - Beautiful, dark-themed interface with glassmorphism design
- 🔌 **Multiple Connections** - Manage and switch between multiple database connections
- 🔒 **Encrypted Credentials** - Passwords stored securely with AES-256-GCM encryption
- 🛡️ **Safety Guardrails** - Blocks dangerous queries (UPDATE/DELETE without WHERE) on production databases
- 📊 **Schema Browser** - Explore tables, columns, indexes, and relationships
- ⚡ **Query Editor** - Execute SQL with syntax highlighting and results table
- 🔄 **Schema Sync** - Compare and sync database schemas between connections
- 📦 **Data Sync** - Sync table data between databases with conflict resolution
- 🏷️ **Connection Tags** - Organize connections with customizable tags (dev, staging, prod)
- 🎨 **Customizable Theme** - Configure card styles, colors, and opacity in Settings
- 📜 **Query History** - Track and replay previous queries

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL (for target databases)

### Installation

```bash
# Clone the repository
git clone https://github.com/akademskig/dbnexus.git
cd dbnexus

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Running the Application

```bash
# Start development servers (API + Web UI)
pnpm dev
```

- **Web UI**: <http://localhost:5173>
- **API**: <http://localhost:3001>

## 💻 CLI Usage

```bash
# Initialize a workspace
dbnexus init

# Add a database connection
dbnexus connect add

# List connections
dbnexus connect list

# Test a connection
dbnexus connect test <name>

# Start the web UI
dbnexus ui

# Run a query
dbnexus query --conn <name> --sql "SELECT * FROM users"
dbnexus query --conn <name> --file ./query.sql
```

## 🔧 Scripts

| Command       | Description                     |
| ------------- | ------------------------------- |
| `pnpm dev`    | Start development servers       |
| `pnpm build`  | Build all packages              |
| `pnpm lint`   | Run ESLint                      |
| `pnpm format` | Format code with Prettier       |
| `pnpm check`  | Run lint + format check + build |

## 📖 Documentation

For detailed architecture and design decisions, see [DESIGN.md](./DESIGN.md).

## 📄 License

MIT
