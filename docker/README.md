# Docker Development Databases

This directory contains Docker Compose configuration and initialization scripts for testing DB Nexus with various databases.

## Quick Start

```bash
# Start all databases
docker compose up -d

# Start specific databases
docker compose up -d postgres-primary postgres-secondary

# Stop all databases
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v
```

## Available Databases

| Service            | Engine        | Port | Username | Password | Database |
| ------------------ | ------------- | ---- | -------- | -------- | -------- |
| postgres-primary   | PostgreSQL 16 | 5432 | admin    | admin123 | testdb   |
| postgres-secondary | PostgreSQL 16 | 5433 | admin    | admin123 | testdb   |
| postgres-14        | PostgreSQL 14 | 5434 | admin    | admin123 | testdb   |
| mysql              | MySQL 8.0     | 3306 | admin    | admin123 | testdb   |
| mariadb            | MariaDB 11    | 3307 | admin    | admin123 | testdb   |

## Schema Diff Testing

The `postgres-primary` and `postgres-secondary` databases have intentionally different schemas for testing the Schema Diff feature:

### Differences

**Tables:**

- `analytics.events` - exists only in primary
- `app.audit_logs` - exists only in secondary

**Columns (app.users):**

- `avatar_url` - exists only in primary
- `is_verified` - exists only in primary

**Columns (app.products):**

- `name` - VARCHAR(255) in primary, VARCHAR(200) in secondary
- `price` - DECIMAL(10,2) in primary, DECIMAL(8,2) in secondary
- `currency` - exists only in primary
- `stock_quantity` - exists only in primary
- `metadata` - exists only in primary
- `updated_at` - exists only in primary

**Columns (app.orders):**

- `currency` - exists only in primary
- `shipping_address` - exists only in primary
- `billing_address` - exists only in primary
- `notes` - exists only in primary
- `updated_at` - exists only in primary

**Columns (analytics.page_views):**

- `session_id` - exists only in primary
- `user_agent` - exists only in primary
- `ip_address` - exists only in primary

**Indexes:**

- `idx_users_created_at` - exists only in primary
- `idx_products_active` - exists only in primary (partial index)
- `idx_orders_status` - exists only in primary
- `idx_orders_created_at` - exists only in primary
- All analytics indexes - exist only in primary
- `idx_audit_logs_table` - exists only in secondary

## Connection Strings

### PostgreSQL Primary

```
postgresql://admin:admin123@localhost:5432/testdb
```

### PostgreSQL Secondary

```
postgresql://admin:admin123@localhost:5433/testdb
```

### MySQL

```
mysql://admin:admin123@localhost:3306/testdb
```

### MariaDB

```
mysql://admin:admin123@localhost:3307/testdb
```

## Schemas

### PostgreSQL

Both PostgreSQL instances have two schemas:

- `app` - Main application tables (users, products, orders, etc.)
- `analytics` - Analytics and tracking tables

### MySQL/MariaDB

MySQL uses a single database (`testdb`) with all tables in the default schema.

## Resetting Data

To reset a database to its initial state:

```bash
# Reset all databases
docker compose down -v
docker compose up -d

# Reset specific database
docker compose rm -sf postgres-primary
docker volume rm db-manager_postgres-primary-data
docker compose up -d postgres-primary
```
