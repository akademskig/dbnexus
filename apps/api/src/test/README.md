# API Integration Tests

This directory contains integration tests that run against real PostgreSQL and MySQL databases via Docker.

## Prerequisites

1. **Docker** must be installed and running
2. Start the test databases:

```bash
# From project root
docker compose up -d
```

This starts:

- **PostgreSQL Ecommerce** (port 5450) - Full e-commerce schema with sample data
- **PostgreSQL Staging** (port 5451) - Similar schema with differences for testing schema diff
- **MySQL Blog** (port 3350) - Blog schema for MySQL testing

## Running Tests

```bash
# From apps/api directory
pnpm test:integration

# Or from project root
pnpm --filter @dbnexus/api test:integration
```

## Test Files

| File                              | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| `setup.ts`                        | Test utilities, DB configs, app creation          |
| `connections.integration.spec.ts` | Connection CRUD, test, connect/disconnect         |
| `queries.integration.spec.ts`     | Query execution, data modification                |
| `schema.integration.spec.ts`      | Schema extraction (tables, columns, indexes, FKs) |
| `schema-diff.integration.spec.ts` | Schema comparison between databases               |
| `sync.integration.spec.ts`        | Data diff and sync operations                     |

## Test Database Schemas

### PostgreSQL Ecommerce (Production)

- `categories`, `products`, `customers`, `addresses`
- `orders`, `order_items`, `reviews`
- Includes sample data and foreign key relationships

### PostgreSQL Staging

Same as production but with:

- **Extra columns**: `products.sale_price`, `products.is_featured`, `products.weight_kg`
- **Extra columns**: `orders.billing_address_id`, `orders.payment_status`, etc.
- **Extra tables**: `coupons`, `wishlists`

These differences are used to test schema diff functionality.

## Skipping Tests

Tests automatically skip if the required Docker container is not running:

```
⚠️  Skipping: PostgreSQL container not available
```

To run all tests, ensure Docker containers are up:

```bash
docker compose ps  # Check status
docker compose up -d  # Start if needed
```

## Writing New Tests

1. Import test utilities from `./setup.js`
2. Use `checkDockerContainers()` to detect available DBs
3. Skip tests gracefully when containers aren't running
4. Clean up created data in `afterAll` or `afterEach`

Example:

```typescript
import { createTestApp, TEST_CONNECTIONS, checkDockerContainers } from './setup.js';

describe('My Integration Tests', () => {
    let app: INestApplication;
    let dockerAvailable: { postgres: boolean; staging: boolean; mysql: boolean };

    beforeAll(async () => {
        dockerAvailable = await checkDockerContainers();
        app = await createTestApp();
    }, 30000);

    it('should do something', async () => {
        if (!dockerAvailable.postgres) {
            console.log('⚠️  Skipping: PostgreSQL not available');
            return;
        }
        // Test code here
    });
});
```

## Troubleshooting

### Tests timing out

Increase timeout in `jest.integration.config.cjs` or individual tests:

```typescript
it('should do something', async () => {
    // ...
}, 60000); // 60 second timeout
```

### Database connection refused

Check Docker containers are running and healthy:

```bash
docker compose ps
docker compose logs postgres-ecommerce
```

### Data conflicts between tests

Each test should clean up its own data. Use unique table names or `TRUNCATE` in `afterEach`.
