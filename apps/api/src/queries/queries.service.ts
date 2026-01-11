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
}
