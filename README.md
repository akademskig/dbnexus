# DB Nexus

A **local-first, Prisma-like CLI tool** that launches a web-based database management UI — with powerful extras like **multiple connections**, **schema & data sync**, and **production safety guardrails**.

Think:

- Prisma Studio UX
-   - multiple databases
-   - schema & data diff/sync
-   - safer production workflows
-   - fully local, self-hosted by default

---

## Why this tool exists

Most database tools fall into one of two categories:

- **CLI-only** (great for automation, poor for exploration)
- **Heavy GUI apps or SaaS** (hard to automate, risky for prod, or not self-hosted)

This project aims to combine the best of both:

- A **CLI** you run locally
- That starts a **local web UI**
- Backed by a **safe, auditable, extensible engine**
- With a clear path from **local → self-hosted → SaaS**

---

## Core concepts

### Local-first

- Runs entirely on your machine
- No cloud dependency
- No Docker required
- All state stored locally

### Workspace-based (Prisma-like)

Running the tool in a directory creates a workspace:

```

dbnexus.config.json
.dbnexus/
metadata.db
logs/
secrets/

```

Each workspace has:

- its own connections
- saved queries
- sync jobs
- history and snapshots

### Separation of concerns

The tool manages:

- **its own metadata** (SQLite)
- **your databases** (Postgres first)
- **sync jobs** (schema, data, config)

Your application data is never copied into the tool.

---

## Features

### Database connections

- Multiple Postgres connections (more engines later)
- Connection tagging (`prod`, `stage`, `dev`)
- Read-only mode for production connections
- Secure credential handling (keychain / encrypted)

### Web UI (started via CLI)

- Connection selector
- Schema explorer (tables, columns, indexes)
- SQL editor with syntax highlighting
- Results grid with pagination
- Query history
- Saved queries & folders

### Safety guardrails

- Block `UPDATE` without `WHERE`
- Block `DELETE` without `WHERE`
- Warn on `DROP`, `TRUNCATE`
- Default read-only mode for `prod` connections
- Explicit confirmation to unlock writes

### Schema sync

- Capture schema snapshots
- Diff schema between two connections
- Generate migration SQL
- Preview before apply
- Apply migrations with full audit trail

### Data sync (table-level)

- Sync data between databases
- Requires primary key (or user-defined key)
- Preview row-level changes
- Conflict strategies:
    - source wins
    - target wins
    - newest `updated_at` wins
- Batched, safe execution

### Tool config sync

Sync the tool’s own configuration between machines or teammates:

- connections (without secrets by default)
- saved queries
- folders
- sync job definitions

Export / import as a portable bundle:

```bash
dbnexus export > workspace.bundle
dbnexus import workspace.bundle
```

### CLI access

Everything is accessible from the CLI:

- start UI
- add/remove connections
- run queries
- run sync jobs
- export/import workspace

---

## CLI commands (overview)

```bash
dbnexus init                 # initialize a workspace
dbnexus ui                   # start local web UI
dbnexus connect add          # add a database connection
dbnexus connect list
dbnexus connect remove

dbnexus query --conn db --sql "select 1"
dbnexus query --conn db --file ./query.sql

dbnexus sync schema --source db1 --target db2
dbnexus sync schema --apply ...

dbnexus sync data --source db1 --target db2 --table public.users

dbnexus export
dbnexus import <bundle>
```

---

## Architecture overview

The tool is split into three logical planes:

### 1. Tool metadata plane (local)

- SQLite database (`.dbnexus/metadata.db`)
- Stores:
    - connections (non-secret fields)
    - saved queries
    - schema snapshots
    - sync jobs & run history
    - audit logs

SQLite is used because it is:

- zero-config
- transactional
- safe for concurrent access
- easy to migrate as the tool evolves

### 2. Data plane (your databases)

- Live connections to target databases
- Postgres first
- No data copied or cached unless explicitly syncing

### 3. Sync & jobs plane

- Background jobs for:
    - schema capture
    - diff generation
    - migrations
    - data sync

- In-process job runner for MVP
- Upgrade path to BullMQ + Redis

---

## Tech stack

### CLI

- Node.js
- Commander.js (or similar)
- Starts and manages the local API/UI lifecycle

### Backend API

- **NestJS**
- REST APIs (WebSockets optional later)
- Modular architecture:
    - Connections
    - Queries
    - Schema introspection
    - Sync engine
    - Jobs
    - Audit logs

### Frontend

- React
- Vite (or Next.js static export)
- Monaco editor for SQL
- Data grid for results

### Databases

- Postgres (target DB, v1)
- SQLite (tool metadata)

### Security

- OS keychain for secrets (preferred)
- Encrypted secret fallback
- No plaintext passwords in config files

---

## Folder structure (suggested)

```
apps/
  cli/        # CLI entrypoint
  api/        # NestJS server
  web/        # React UI
packages/
  connectors/ # DB adapters (postgres first)
  sync/       # schema & data sync logic
  metadata/   # sqlite schema & migrations
  shared/     # shared types & utilities
```

---

## Getting started (development)

### Requirements

- Node.js (LTS)
- Postgres (local or remote)
- pnpm (recommended)

### Install

```bash
pnpm install
```

### Run API

```bash
pnpm --filter api start:dev
```

### Run Web UI

```bash
pnpm --filter web dev
```

### Run CLI

```bash
pnpm --filter cli dev -- ui
```

In production, `dbnexus ui` starts both API and UI automatically.

---

## Roadmap

### Short-term

- Solid Postgres support
- Schema diff & migration generation
- Safer prod workflows

### Mid-term

- Data sync improvements
- More database engines
- Better export/import workflows

### Long-term

- Self-hosted server mode
- Multi-user auth & RBAC
- SaaS offering
- Cloud secret managers
- CDC-based sync

---

## Non-goals (for now)

- Full replication engine
- Real-time collaborative editing
- Replacing migrations frameworks entirely

---

## License
