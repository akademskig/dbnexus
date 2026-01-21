/**
 * Pre-built SQL query templates organized by category
 */

import type { TableSchema } from '@dbnexus/shared';

export interface QueryTemplate {
    id: string;
    name: string;
    description: string;
    category: 'select' | 'join' | 'aggregate' | 'insert' | 'update' | 'delete' | 'ddl' | 'window';
    sql: string;
    tags?: string[];
}

/**
 * Generate context-aware SQL from template using selected table and schema
 */
export function generateContextAwareSQL(
    template: QueryTemplate,
    tableName?: string,
    schema?: TableSchema,
    engine?: string
): string {
    if (!tableName || !schema) {
        return template.sql;
    }

    const columns = schema.columns || [];

    // Helper to quote identifiers based on engine
    const quote = (identifier: string): string => {
        if (engine === 'mysql' || engine === 'mariadb') {
            return `\`${identifier}\``;
        }
        return `"${identifier}"`;
    };

    // Find specific column types
    const textColumn =
        columns.find(
            (c) =>
                c.dataType.toLowerCase().includes('varchar') ||
                c.dataType.toLowerCase().includes('text') ||
                c.dataType.toLowerCase().includes('char')
        )?.name || 'name';

    const numberColumn =
        columns.find(
            (c) =>
                c.dataType.toLowerCase().includes('int') ||
                c.dataType.toLowerCase().includes('numeric') ||
                c.dataType.toLowerCase().includes('decimal') ||
                c.dataType.toLowerCase().includes('float') ||
                c.dataType.toLowerCase().includes('double')
        )?.name || 'id';

    const dateColumn =
        columns.find(
            (c) =>
                c.dataType.toLowerCase().includes('timestamp') ||
                c.dataType.toLowerCase().includes('date') ||
                c.dataType.toLowerCase().includes('time')
        )?.name || 'created_at';

    const primaryKey = columns.find((c) => c.isPrimaryKey)?.name || 'id';

    // Get first few non-PK columns for examples
    const dataColumns = columns
        .filter((c) => !c.isPrimaryKey)
        .slice(0, 3)
        .map((c) => c.name);

    // Build full table name with schema if available
    const fullTableName = schema.schema
        ? `${quote(schema.schema)}.${quote(tableName)}`
        : quote(tableName);

    let sql = template.sql;

    // Replace placeholders based on template category
    switch (template.category) {
        case 'select':
            sql = sql.replaceAll('table_name', fullTableName);
            sql = sql.replaceAll('column_name', textColumn);
            sql = sql.replaceAll('column1', columns[0]?.name || 'column1');
            sql = sql.replaceAll('column2', columns[1]?.name || 'column2');
            sql = sql.replaceAll('column3', columns[2]?.name || 'column3');
            break;

        case 'aggregate':
            sql = sql.replaceAll('table_name', fullTableName);
            sql = sql.replaceAll('column_name', textColumn);
            sql = sql.replaceAll('category', textColumn);
            sql = sql.replaceAll('price', numberColumn);
            sql = sql.replaceAll('user_id', primaryKey);
            sql = sql.replaceAll('total_amount', numberColumn);
            break;

        case 'insert':
            sql = sql.replaceAll('table_name', fullTableName);
            if (dataColumns.length >= 3) {
                sql = sql.replaceAll('column1', dataColumns[0]!);
                sql = sql.replaceAll('column2', dataColumns[1]!);
                sql = sql.replaceAll('column3', dataColumns[2]!);
            }
            break;

        case 'update':
            sql = sql.replaceAll('table_name', fullTableName);
            sql = sql.replaceAll('column1', dataColumns[0] || 'column1');
            sql = sql.replaceAll('column2', dataColumns[1] || 'column2');
            sql = sql.replaceAll('id', primaryKey);
            sql = sql.replaceAll('updated_at', dateColumn);
            break;

        case 'delete':
            sql = sql.replaceAll('table_name', fullTableName);
            sql = sql.replaceAll('condition', textColumn);
            sql = sql.replaceAll('created_at', dateColumn);
            break;

        case 'window':
            sql = sql.replaceAll('table_name', fullTableName);
            sql = sql.replaceAll('category', textColumn);
            sql = sql.replaceAll('created_at', dateColumn);
            sql = sql.replaceAll('score', numberColumn);
            sql = sql.replaceAll('amount', numberColumn);
            sql = sql.replaceAll('date', dateColumn);
            break;
    }

    return sql;
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
    // SELECT queries
    {
        id: 'select-all',
        name: 'Select All',
        description: 'Select all columns from a table',
        category: 'select',
        sql: 'SELECT * FROM table_name\nLIMIT 100;',
        tags: ['basic', 'read'],
    },
    {
        id: 'select-columns',
        name: 'Select Specific Columns',
        description: 'Select specific columns with WHERE clause',
        category: 'select',
        sql: 'SELECT column1, column2, column3\nFROM table_name\nWHERE condition = value\nORDER BY column1 DESC\nLIMIT 100;',
        tags: ['basic', 'read', 'filter'],
    },
    {
        id: 'select-distinct',
        name: 'Select Distinct',
        description: 'Get unique values from a column',
        category: 'select',
        sql: 'SELECT DISTINCT column_name\nFROM table_name\nORDER BY column_name;',
        tags: ['unique', 'read'],
    },
    {
        id: 'select-pagination',
        name: 'Pagination',
        description: 'Paginate results with OFFSET and LIMIT',
        category: 'select',
        sql: 'SELECT *\nFROM table_name\nORDER BY id\nLIMIT 20 OFFSET 0;  -- Page 1\n-- OFFSET 20;  -- Page 2\n-- OFFSET 40;  -- Page 3',
        tags: ['pagination', 'read'],
    },

    // JOIN queries
    {
        id: 'inner-join',
        name: 'Inner Join',
        description: 'Join two tables on a common column',
        category: 'join',
        sql: "SELECT t1.*, t2.column_name\nFROM table1 t1\nINNER JOIN table2 t2 ON t1.id = t2.table1_id\nWHERE t1.status = 'active'\nLIMIT 100;",
        tags: ['join', 'read'],
    },
    {
        id: 'left-join',
        name: 'Left Join',
        description: 'Left join to include all rows from left table',
        category: 'join',
        sql: "SELECT t1.*, t2.column_name\nFROM table1 t1\nLEFT JOIN table2 t2 ON t1.id = t2.table1_id\nWHERE t1.created_at > '2024-01-01'\nLIMIT 100;",
        tags: ['join', 'read'],
    },
    {
        id: 'multiple-joins',
        name: 'Multiple Joins',
        description: 'Join three or more tables',
        category: 'join',
        sql: "SELECT \n  u.name as user_name,\n  o.order_date,\n  p.product_name,\n  oi.quantity\nFROM users u\nINNER JOIN orders o ON u.id = o.user_id\nINNER JOIN order_items oi ON o.id = oi.order_id\nINNER JOIN products p ON oi.product_id = p.id\nWHERE o.status = 'completed'\nLIMIT 100;",
        tags: ['join', 'read', 'complex'],
    },

    // AGGREGATE queries
    {
        id: 'count-group',
        name: 'Count with Group By',
        description: 'Count rows grouped by a column',
        category: 'aggregate',
        sql: 'SELECT \n  column_name,\n  COUNT(*) as count\nFROM table_name\nGROUP BY column_name\nORDER BY count DESC;',
        tags: ['aggregate', 'count', 'group'],
    },
    {
        id: 'sum-avg',
        name: 'Sum and Average',
        description: 'Calculate sum and average with grouping',
        category: 'aggregate',
        sql: 'SELECT \n  category,\n  COUNT(*) as total_items,\n  SUM(price) as total_price,\n  AVG(price) as avg_price,\n  MIN(price) as min_price,\n  MAX(price) as max_price\nFROM products\nGROUP BY category\nHAVING COUNT(*) > 5\nORDER BY total_price DESC;',
        tags: ['aggregate', 'sum', 'average', 'group'],
    },
    {
        id: 'having-clause',
        name: 'Group By with Having',
        description: 'Filter grouped results with HAVING',
        category: 'aggregate',
        sql: 'SELECT \n  user_id,\n  COUNT(*) as order_count,\n  SUM(total_amount) as total_spent\nFROM orders\nGROUP BY user_id\nHAVING COUNT(*) >= 3\nORDER BY total_spent DESC;',
        tags: ['aggregate', 'group', 'filter'],
    },

    // INSERT queries
    {
        id: 'insert-single',
        name: 'Insert Single Row',
        description: 'Insert a single row into a table',
        category: 'insert',
        sql: "INSERT INTO table_name (column1, column2, column3)\nVALUES ('value1', 'value2', value3);",
        tags: ['insert', 'write'],
    },
    {
        id: 'insert-multiple',
        name: 'Insert Multiple Rows',
        description: 'Insert multiple rows at once',
        category: 'insert',
        sql: "INSERT INTO table_name (column1, column2, column3)\nVALUES \n  ('value1', 'value2', value3),\n  ('value4', 'value5', value6),\n  ('value7', 'value8', value9);",
        tags: ['insert', 'write', 'bulk'],
    },
    {
        id: 'insert-select',
        name: 'Insert from Select',
        description: 'Insert data from another table',
        category: 'insert',
        sql: 'INSERT INTO target_table (column1, column2, column3)\nSELECT column1, column2, column3\nFROM source_table\nWHERE condition = value;',
        tags: ['insert', 'write', 'copy'],
    },

    // UPDATE queries
    {
        id: 'update-simple',
        name: 'Update Rows',
        description: 'Update rows matching a condition',
        category: 'update',
        sql: "UPDATE table_name\nSET \n  column1 = 'new_value',\n  column2 = value2,\n  updated_at = CURRENT_TIMESTAMP\nWHERE id = 123;",
        tags: ['update', 'write'],
    },
    {
        id: 'update-from-join',
        name: 'Update with Join',
        description: 'Update using data from another table',
        category: 'update',
        sql: "-- PostgreSQL\nUPDATE table1 t1\nSET column1 = t2.value\nFROM table2 t2\nWHERE t1.id = t2.table1_id\n  AND t2.status = 'active';\n\n-- MySQL\n-- UPDATE table1 t1\n-- INNER JOIN table2 t2 ON t1.id = t2.table1_id\n-- SET t1.column1 = t2.value\n-- WHERE t2.status = 'active';",
        tags: ['update', 'write', 'join'],
    },

    // DELETE queries
    {
        id: 'delete-simple',
        name: 'Delete Rows',
        description: 'Delete rows matching a condition',
        category: 'delete',
        sql: "DELETE FROM table_name\nWHERE condition = value\n  AND created_at < '2024-01-01';",
        tags: ['delete', 'write'],
    },
    {
        id: 'delete-join',
        name: 'Delete with Join',
        description: 'Delete using data from another table',
        category: 'delete',
        sql: "-- PostgreSQL\nDELETE FROM table1 t1\nUSING table2 t2\nWHERE t1.id = t2.table1_id\n  AND t2.status = 'inactive';\n\n-- MySQL\n-- DELETE t1 FROM table1 t1\n-- INNER JOIN table2 t2 ON t1.id = t2.table1_id\n-- WHERE t2.status = 'inactive';",
        tags: ['delete', 'write', 'join'],
    },

    // DDL queries
    {
        id: 'create-table',
        name: 'Create Table',
        description: 'Create a new table with common columns',
        category: 'ddl',
        sql: "CREATE TABLE table_name (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL,\n  description TEXT,\n  status VARCHAR(50) DEFAULT 'active',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);",
        tags: ['ddl', 'create', 'table'],
    },
    {
        id: 'create-index',
        name: 'Create Index',
        description: 'Create an index for better query performance',
        category: 'ddl',
        sql: 'CREATE INDEX idx_table_column ON table_name(column_name);\n\n-- Composite index\n-- CREATE INDEX idx_table_multi ON table_name(column1, column2);\n\n-- Unique index\n-- CREATE UNIQUE INDEX idx_table_unique ON table_name(email);',
        tags: ['ddl', 'index', 'performance'],
    },
    {
        id: 'alter-table',
        name: 'Alter Table',
        description: 'Add, modify, or drop columns',
        category: 'ddl',
        sql: '-- Add column\nALTER TABLE table_name ADD COLUMN new_column VARCHAR(100);\n\n-- Modify column\n-- ALTER TABLE table_name ALTER COLUMN column_name TYPE TEXT;\n\n-- Drop column\n-- ALTER TABLE table_name DROP COLUMN column_name;',
        tags: ['ddl', 'alter', 'table'],
    },

    // WINDOW functions
    {
        id: 'row-number',
        name: 'Row Number',
        description: 'Assign row numbers within partitions',
        category: 'window',
        sql: 'SELECT \n  *,\n  ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) as row_num\nFROM table_name\nORDER BY category, row_num;',
        tags: ['window', 'ranking'],
    },
    {
        id: 'rank-dense-rank',
        name: 'Rank and Dense Rank',
        description: 'Rank rows with ties handling',
        category: 'window',
        sql: 'SELECT \n  name,\n  score,\n  RANK() OVER (ORDER BY score DESC) as rank,\n  DENSE_RANK() OVER (ORDER BY score DESC) as dense_rank\nFROM students\nORDER BY score DESC;',
        tags: ['window', 'ranking'],
    },
    {
        id: 'running-total',
        name: 'Running Total',
        description: 'Calculate cumulative sum',
        category: 'window',
        sql: 'SELECT \n  date,\n  amount,\n  SUM(amount) OVER (ORDER BY date) as running_total,\n  AVG(amount) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as moving_avg_7d\nFROM transactions\nORDER BY date;',
        tags: ['window', 'aggregate', 'cumulative'],
    },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: QueryTemplate['category']): QueryTemplate[] {
    return QUERY_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get all categories
 */
export function getTemplateCategories(): Array<{ id: QueryTemplate['category']; label: string }> {
    return [
        { id: 'select', label: 'SELECT' },
        { id: 'join', label: 'JOIN' },
        { id: 'aggregate', label: 'Aggregate' },
        { id: 'insert', label: 'INSERT' },
        { id: 'update', label: 'UPDATE' },
        { id: 'delete', label: 'DELETE' },
        { id: 'ddl', label: 'DDL' },
        { id: 'window', label: 'Window Functions' },
    ];
}
