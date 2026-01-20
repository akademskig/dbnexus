import { Injectable, BadRequestException } from '@nestjs/common';
import { MetadataService } from '../metadata/metadata.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { QueryValidator } from '@dbnexus/connectors';
import type {
    QueryResult,
    QueryValidationResult,
    SavedQuery,
    QueryHistoryEntry,
} from '@dbnexus/shared';

export interface ExecuteQueryInput {
    connectionId: string;
    sql: string;
    confirmed?: boolean;
}

@Injectable()
export class QueriesService {
    private readonly validator = new QueryValidator();

    constructor(
        private readonly metadataService: MetadataService,
        private readonly connectionsService: ConnectionsService
    ) {}

    /**
     * Validate a query without executing
     */
    validate(connectionId: string, sql: string): QueryValidationResult {
        const connection = this.connectionsService.findById(connectionId);
        return this.validator.validate(sql, connection.readOnly);
    }

    /**
     * Execute a query
     */
    async execute(input: ExecuteQueryInput): Promise<QueryResult> {
        const { connectionId, sql, confirmed } = input;
        const connection = this.connectionsService.findById(connectionId);

        // Validate the query
        const validation = this.validator.validate(sql, connection.readOnly);

        if (!validation.isValid) {
            throw new BadRequestException(validation.message);
        }

        if (validation.requiresConfirmation && !confirmed) {
            throw new BadRequestException({
                message: validation.message,
                requiresConfirmation: true,
                dangerousType: validation.dangerousType,
            });
        }

        // Get connector and execute
        const connector = await this.connectionsService.getConnector(connectionId);
        const startTime = Date.now();

        try {
            const result = await connector.query(sql);

            // Log to history
            this.metadataService.queryRepository.addHistoryEntry({
                connectionId,
                sql,
                executionTimeMs: result.executionTimeMs,
                rowCount: result.rowCount,
                success: true,
            });

            return result;
        } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Log failed query to history
            this.metadataService.queryRepository.addHistoryEntry({
                connectionId,
                sql,
                executionTimeMs,
                rowCount: 0,
                success: false,
                error: errorMessage,
            });

            throw new BadRequestException(errorMessage);
        }
    }

    /**
     * Execute maintenance operation with detailed output
     */
    async executeMaintenance(
        connectionId: string,
        operation: string,
        schema?: string
    ): Promise<{ success: boolean; message: string; details?: string[]; duration: number }> {
        const connection = this.connectionsService.findById(connectionId);
        const connector = await this.connectionsService.getConnector(connectionId);
        const startTime = Date.now();

        try {
            let command = this.getMaintenanceCommand(operation, connection.engine, schema);

            // Add VERBOSE for PostgreSQL to get detailed output
            if (connection.engine === 'postgres') {
                command = this.addVerboseFlag(operation, command);
            }

            const result = await connector.query(command);
            const duration = Date.now() - startTime;

            // Extract details from result
            const details = this.extractMaintenanceDetails(result, connection.engine);

            // Log to audit
            this.metadataService.queryRepository.addHistoryEntry({
                connectionId,
                sql: command,
                executionTimeMs: duration,
                rowCount: 0,
                success: true,
            });

            return {
                success: true,
                message: `${operation.toUpperCase()} completed successfully`,
                details,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Log failed operation
            this.metadataService.queryRepository.addHistoryEntry({
                connectionId,
                sql: operation,
                executionTimeMs: duration,
                rowCount: 0,
                success: false,
                error: errorMessage,
            });

            throw new BadRequestException(errorMessage);
        }
    }

    /**
     * Get maintenance command SQL
     */
    private getMaintenanceCommand(operation: string, engine: string, schema?: string): string {
        const op = operation.toLowerCase();

        switch (op) {
            case 'vacuum':
                return 'VACUUM';
            case 'vacuum_full':
                return 'VACUUM (FULL)';
            case 'analyze':
                // In PostgreSQL, ANALYZE without target analyzes all tables
                // To analyze a specific schema, you'd need to analyze each table
                return 'ANALYZE';
            case 'vacuum_analyze':
                return 'VACUUM (ANALYZE)';
            case 'reindex':
                // REINDEX DATABASE needs the actual database name
                return engine === 'postgres' ? 'REINDEX DATABASE CURRENT_DATABASE' : 'REINDEX';
            case 'optimize':
                if (!schema) {
                    throw new BadRequestException('OPTIMIZE TABLE requires a table name');
                }
                return `OPTIMIZE TABLE ${schema}`;
            case 'check':
                if (!schema) {
                    throw new BadRequestException('CHECK TABLE requires a table name');
                }
                return `CHECK TABLE ${schema}`;
            case 'repair':
                if (!schema) {
                    throw new BadRequestException('REPAIR TABLE requires a table name');
                }
                return `REPAIR TABLE ${schema}`;
            default:
                throw new BadRequestException(`Unknown maintenance operation: ${operation}`);
        }
    }

    /**
     * Add VERBOSE flag to PostgreSQL commands
     */
    private addVerboseFlag(operation: string, command: string): string {
        const op = operation.toLowerCase();

        if (op === 'vacuum') {
            return command.replace('VACUUM', 'VACUUM (VERBOSE)');
        }

        if (op === 'vacuum_full') {
            return command.replace('VACUUM (FULL)', 'VACUUM (FULL, VERBOSE)');
        }

        if (op === 'vacuum_analyze') {
            return command.replace('VACUUM (ANALYZE)', 'VACUUM (ANALYZE, VERBOSE)');
        }

        if (op === 'analyze') {
            return command.replace('ANALYZE', 'ANALYZE (VERBOSE)');
        }

        if (op === 'reindex') {
            // PostgreSQL 12+ supports VERBOSE for REINDEX
            return `${command} (VERBOSE)`.replace('(VERBOSE) (VERBOSE)', '(VERBOSE)');
        }

        return command;
    }

    /**
     * Extract detailed information from maintenance operation results
     */
    private extractMaintenanceDetails(result: QueryResult, engine: string): string[] {
        const details: string[] = [];

        // PostgreSQL returns NOTICE messages
        if (engine === 'postgres') {
            // Check for notices in the result (PostgreSQL sends INFO/NOTICE messages)
            // These are typically in result.messages or need to be captured from connection
            // For now, parse any rows returned
            if (result.rows && result.rows.length > 0) {
                result.rows.forEach((row) => {
                    const rowStr = JSON.stringify(row);
                    if (rowStr.length > 2) {
                        // Not empty {}
                        details.push(rowStr);
                    }
                });
            }
        }

        // MySQL OPTIMIZE/CHECK/REPAIR return result rows
        if (engine === 'mysql' && result.rows && result.rows.length > 0) {
            result.rows.forEach((row) => {
                const table = row['Table'] as string;
                const op = row['Op'] as string;
                const msgType = row['Msg_type'] as string;
                const msgText = row['Msg_text'] as string;

                if (table && op && msgType && msgText) {
                    details.push(`${table} (${op}): ${msgType} - ${msgText}`);
                } else {
                    details.push(JSON.stringify(row));
                }
            });
        }

        // Add summary based on operation
        if (details.length === 0) {
            details.push(`Operation completed successfully (no detailed output available)`);
        }

        return details;
    }

    /**
     * Get query execution plan
     */
    async explain(
        connectionId: string,
        sql: string,
        analyze = false
    ): Promise<{
        plan: unknown;
        planText: string;
        insights: { type: string; message: string }[];
        suggestions: string[];
    }> {
        const connection = this.connectionsService.findById(connectionId);
        const connector = await this.connectionsService.getConnector(connectionId);

        try {
            const { explainSql, parsePlan } = this.getExplainStrategy(
                connection.engine,
                sql,
                analyze
            );
            const result = await connector.query(explainSql);
            const { plan, planText } = parsePlan(result);

            // Analyze the plan and generate insights
            const insights = this.analyzePlan(plan, connection.engine, analyze);
            const suggestions = this.generateSuggestions(plan, connection.engine);

            return { plan, planText, insights, suggestions };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Failed to explain query: ${errorMessage}`);
        }
    }

    /**
     * Get database-specific EXPLAIN strategy
     */
    private getExplainStrategy(
        engine: string,
        sql: string,
        analyze: boolean
    ): {
        explainSql: string;
        parsePlan: (result: QueryResult) => { plan: unknown; planText: string };
    } {
        switch (engine) {
            case 'postgres':
                return this.getPostgresExplainStrategy(sql, analyze);
            case 'mysql':
                return this.getMysqlExplainStrategy(sql, analyze);
            case 'sqlite':
                return this.getSqliteExplainStrategy(sql);
            default:
                throw new BadRequestException(`EXPLAIN not supported for ${engine}`);
        }
    }

    /**
     * PostgreSQL EXPLAIN strategy
     */
    private getPostgresExplainStrategy(
        sql: string,
        analyze: boolean
    ): {
        explainSql: string;
        parsePlan: (result: QueryResult) => { plan: unknown; planText: string };
    } {
        const explainSql = analyze
            ? `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${sql}`
            : `EXPLAIN (FORMAT JSON) ${sql}`;

        const parsePlan = (result: QueryResult) => {
            const planJson = result.rows[0]?.['QUERY PLAN'];
            const plan = Array.isArray(planJson) ? planJson[0] : planJson;
            return {
                plan,
                planText: JSON.stringify(plan, null, 2),
            };
        };

        return { explainSql, parsePlan };
    }

    /**
     * MySQL EXPLAIN strategy
     */
    private getMysqlExplainStrategy(
        sql: string,
        analyze: boolean
    ): {
        explainSql: string;
        parsePlan: (result: QueryResult) => { plan: unknown; planText: string };
    } {
        if (analyze) {
            return {
                explainSql: `EXPLAIN ANALYZE ${sql}`,
                parsePlan: (result) => {
                    const planText = result.rows[0]?.['EXPLAIN'] || '';
                    return {
                        plan: { text: planText },
                        planText: planText as string,
                    };
                },
            };
        }

        return {
            explainSql: `EXPLAIN FORMAT=JSON ${sql}`,
            parsePlan: (result) => {
                const explainData = result.rows[0]?.['EXPLAIN'];
                const planJson =
                    typeof explainData === 'string' ? JSON.parse(explainData) : explainData;
                return {
                    plan: planJson,
                    planText: JSON.stringify(planJson, null, 2),
                };
            },
        };
    }

    /**
     * SQLite EXPLAIN strategy
     */
    private getSqliteExplainStrategy(sql: string): {
        explainSql: string;
        parsePlan: (result: QueryResult) => { plan: unknown; planText: string };
    } {
        return {
            explainSql: `EXPLAIN QUERY PLAN ${sql}`,
            parsePlan: (result) => {
                const planText = result.rows
                    .map(
                        (row) => `${row['id']} ${row['parent']} ${row['notused']} ${row['detail']}`
                    )
                    .join('\n');
                return {
                    plan: result.rows,
                    planText,
                };
            },
        };
    }

    // ============ Saved Queries ============

    getSavedQueries(): SavedQuery[] {
        return this.metadataService.queryRepository.findAllSavedQueries();
    }

    getSavedQuery(id: string): SavedQuery | null {
        return this.metadataService.queryRepository.findSavedQueryById(id);
    }

    createSavedQuery(input: {
        name: string;
        sql: string;
        connectionId?: string;
        folderId?: string;
    }): SavedQuery {
        return this.metadataService.queryRepository.createSavedQuery(input);
    }

    updateSavedQuery(
        id: string,
        input: { name?: string; sql?: string; connectionId?: string; folderId?: string }
    ): SavedQuery | null {
        return this.metadataService.queryRepository.updateSavedQuery(id, input);
    }

    deleteSavedQuery(id: string): boolean {
        return this.metadataService.queryRepository.deleteSavedQuery(id);
    }

    // ============ Query History ============

    getHistory(connectionId?: string, limit: number = 100): QueryHistoryEntry[] {
        return this.metadataService.queryRepository.findRecentHistory(limit, connectionId);
    }

    clearHistory(connectionId?: string): number {
        return this.metadataService.queryRepository.clearHistory(connectionId);
    }

    // ============ Plan Analysis ============

    /**
     * Analyze query plan and generate human-friendly insights
     */
    private analyzePlan(
        plan: unknown,
        engine: string,
        analyze: boolean
    ): { type: string; message: string }[] {
        const insights: { type: string; message: string }[] = [];

        if (engine !== 'postgres' || !plan || typeof plan !== 'object') {
            return insights;
        }

        const planObj = plan as Record<string, unknown>;
        const mainPlan = planObj['Plan'] as Record<string, unknown>;

        if (!mainPlan) return insights;

        // Execution time insight
        if (analyze && planObj['Execution Time']) {
            const execTime = planObj['Execution Time'] as number;
            if (execTime < 1) {
                insights.push({
                    type: 'success',
                    message: `Very fast query! Executed in ${execTime.toFixed(3)}ms`,
                });
            } else if (execTime < 100) {
                insights.push({
                    type: 'info',
                    message: `Query executed in ${execTime.toFixed(2)}ms`,
                });
            } else if (execTime < 1000) {
                insights.push({
                    type: 'warning',
                    message: `Moderately slow query: ${execTime.toFixed(0)}ms`,
                });
            } else {
                insights.push({
                    type: 'error',
                    message: `Slow query! Took ${(execTime / 1000).toFixed(2)} seconds`,
                });
            }
        }

        // Check for sequential scans
        const seqScans = this.findSequentialScans(mainPlan);
        if (seqScans.length > 0) {
            for (const scan of seqScans) {
                const rows = scan['Plan Rows'] as number;
                if (rows > 10000) {
                    insights.push({
                        type: 'warning',
                        message: `Sequential scan on "${scan['Relation Name']}" (${rows.toLocaleString()} rows). Consider adding an index if filtering.`,
                    });
                } else if (rows > 1000) {
                    insights.push({
                        type: 'info',
                        message: `Sequential scan on "${scan['Relation Name']}" (${rows.toLocaleString()} rows). This is acceptable for small tables.`,
                    });
                }
            }
        }

        // Check for index usage
        const indexScans = this.findNodesByType(mainPlan, 'Index Scan');
        if (indexScans.length > 0) {
            insights.push({
                type: 'success',
                message: `Using ${indexScans.length} index scan(s) - efficient data access`,
            });
        }

        // Check for sorts
        const sorts = this.findNodesByType(mainPlan, 'Sort');
        if (sorts.length > 0) {
            insights.push({
                type: 'info',
                message: `Sorting ${sorts.length} result set(s). Add an index on ORDER BY columns to avoid sorting.`,
            });
        }

        // I/O analysis
        if (analyze && planObj['Planning']) {
            const sharedHit = (mainPlan['Shared Hit Blocks'] as number) || 0;
            const sharedRead = (mainPlan['Shared Read Blocks'] as number) || 0;

            if (sharedRead > 0) {
                insights.push({
                    type: 'warning',
                    message: `Query read ${sharedRead} block(s) from disk. Repeated queries will be faster (cached).`,
                });
            } else if (sharedHit > 0) {
                insights.push({
                    type: 'success',
                    message: `All data read from cache (${sharedHit} blocks). No disk I/O needed!`,
                });
            }
        }

        return insights;
    }

    /**
     * Generate optimization suggestions based on plan analysis
     */
    private generateSuggestions(plan: unknown, engine: string): string[] {
        const suggestions: string[] = [];

        if (engine !== 'postgres' || !plan || typeof plan !== 'object') {
            return suggestions;
        }

        const planObj = plan as Record<string, unknown>;
        const mainPlan = planObj['Plan'] as Record<string, unknown>;

        if (!mainPlan) return suggestions;

        // Suggest indexes for sequential scans
        const seqScans = this.findSequentialScans(mainPlan);
        for (const scan of seqScans) {
            const rows = scan['Plan Rows'] as number;
            const tableName = scan['Relation Name'] as string;

            if (rows > 10000) {
                suggestions.push(
                    `Consider adding an index on "${tableName}" for WHERE clause columns`
                );
            }
        }

        // Suggest composite indexes for sorts
        const sorts = this.findNodesByType(mainPlan, 'Sort');
        if (sorts.length > 0) {
            suggestions.push(
                'Add indexes on columns used in ORDER BY to eliminate sorting overhead'
            );
        }

        // Suggest LIMIT if missing and many rows
        const totalRows = mainPlan['Plan Rows'] as number;
        if (totalRows > 100000 && mainPlan['Node Type'] !== 'Limit') {
            suggestions.push(
                "Consider adding a LIMIT clause if you don't need all rows (reduces memory usage)"
            );
        }

        // Check for nested loops with high row counts
        const nestedLoops = this.findNodesByType(mainPlan, 'Nested Loop');
        if (nestedLoops.length > 0) {
            for (const loop of nestedLoops) {
                const rows = loop['Plan Rows'] as number;
                if (rows > 10000) {
                    suggestions.push(
                        'Large nested loop detected. Consider using a Hash Join or adding indexes on join columns'
                    );
                    break;
                }
            }
        }

        // General suggestions
        if (suggestions.length === 0) {
            suggestions.push('Query plan looks good! No obvious optimization opportunities.');
        }

        return suggestions;
    }

    /**
     * Find all sequential scan nodes in the plan
     */
    private findSequentialScans(node: Record<string, unknown>): Record<string, unknown>[] {
        return this.findNodesByType(node, 'Seq Scan');
    }

    /**
     * Recursively find all nodes of a specific type
     */
    private findNodesByType(
        node: Record<string, unknown>,
        nodeType: string
    ): Record<string, unknown>[] {
        const results: Record<string, unknown>[] = [];

        if (node['Node Type'] === nodeType) {
            results.push(node);
        }

        // Check nested plans
        if (Array.isArray(node['Plans'])) {
            for (const childPlan of node['Plans']) {
                results.push(
                    ...this.findNodesByType(childPlan as Record<string, unknown>, nodeType)
                );
            }
        }

        return results;
    }
}
