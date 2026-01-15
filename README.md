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

## 🚀 Quick Start

### Installation

Install DB Nexus globally using npm:

```bash
npm install -g dbnexus
```

Or run directly with npx (no installation required):

```bash
npx dbnexus
```

### Usage

Start DB Nexus:

```bash
dbnexus
```

This will:

- Start the server on `http://localhost:3001`
- Automatically open your browser
- Store metadata in `~/.dbnexus/metadata.db`

#### Options

```bash
dbnexus --port 8080           # Custom port
dbnexus --data-dir /path      # Custom data directory
dbnexus --no-open             # Don't open browser
dbnexus --help                # Show all options
```

### Supported Databases

- PostgreSQL
- MySQL
- MariaDB
- SQLite

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL/MySQL/MariaDB (for target databases)

### Installation

```bash
# Clone the repository
git clone https://github.com/dbnexus/dbnexus.git
cd dbnexus

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Running in Development

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

## 📦 Distribution

### Docker

Build and run DB Nexus as a Docker container:

```bash
# Build the Docker image
pnpm docker:build

# Run with Docker
pnpm docker:run

# Or use Docker Compose for production
pnpm docker:compose
```

The application will be available at `http://localhost:3001`.

### Desktop Application (Electron)

Build standalone desktop applications for Windows, macOS, and Linux:

```bash
# Build for all platforms
pnpm desktop:build

# Build for specific platforms
pnpm desktop:build:win    # Windows (.exe, portable)
pnpm desktop:build:mac    # macOS (.dmg, .zip)
pnpm desktop:build:linux  # Linux (.AppImage, .deb, .rpm)
```

Built applications will be in `apps/desktop/out/`.

### Manual Installation

For manual deployment:

```bash
# Build all packages
pnpm build

# Start in production mode
NODE_ENV=production node apps/api/dist/main.js
```

## 🐳 Docker Compose (Development)

For testing with multiple database instances:

```bash
# Start test databases (PostgreSQL, MySQL, MariaDB)
docker-compose up -d

# Stop test databases
docker-compose down
```

## 📖 Documentation

For detailed architecture and design decisions, see [DESIGN.md](./DESIGN.md).

## 📄 License

MIT
