import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { QueriesController } from './queries.controller.js';
import { QueriesService } from './queries.service.js';
import type { QueryResult, SavedQuery, QueryHistoryEntry } from '@dbnexus/shared';

describe('QueriesController', () => {
    let controller: QueriesController;
    let service: QueriesService;

    const mockQueryResult: QueryResult = {
        rows: [{ id: 1, name: 'Test' }],
        columns: [
            { name: 'id', dataType: 'integer' },
            { name: 'name', dataType: 'varchar' },
        ],
        rowCount: 1,
        executionTimeMs: 15,
        truncated: false,
    };

    const mockSavedQuery: SavedQuery = {
        id: 'query-123',
        name: 'Test Query',
        sql: 'SELECT * FROM users',
        connectionId: 'conn-123',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockHistoryEntry: QueryHistoryEntry = {
        id: 'history-123',
        connectionId: 'conn-123',
        sql: 'SELECT * FROM users',
        executedAt: new Date(),
        executionTimeMs: 15,
        rowCount: 10,
        success: true,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockQueriesService: any = {
        execute: jest.fn(),
        validate: jest.fn(),
        getSavedQueries: jest.fn(),
        getSavedQuery: jest.fn(),
        createSavedQuery: jest.fn(),
        updateSavedQuery: jest.fn(),
        deleteSavedQuery: jest.fn(),
        getHistory: jest.fn(),
        clearHistory: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [QueriesController],
            providers: [
                {
                    provide: QueriesService,
                    useValue: mockQueriesService,
                },
            ],
        }).compile();

        controller = module.get<QueriesController>(QueriesController);
        service = module.get<QueriesService>(QueriesService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('execute', () => {
        it('should execute a query and return results', async () => {
            mockQueriesService.execute.mockResolvedValue(mockQueryResult);

            const result = await controller.execute({
                connectionId: 'conn-123',
                sql: 'SELECT * FROM users',
            });

            expect(result).toEqual(mockQueryResult);
            expect(service.execute).toHaveBeenCalledWith({
                connectionId: 'conn-123',
                sql: 'SELECT * FROM users',
            });
        });

        it('should handle query with confirmed parameter', async () => {
            mockQueriesService.execute.mockResolvedValue(mockQueryResult);

            await controller.execute({
                connectionId: 'conn-123',
                sql: 'DROP TABLE users',
                confirmed: true,
            });

            expect(service.execute).toHaveBeenCalledWith({
                connectionId: 'conn-123',
                sql: 'DROP TABLE users',
                confirmed: true,
            });
        });
    });

    describe('validate', () => {
        it('should validate a query', () => {
            const validationResult = {
                isValid: true,
                queryType: 'SELECT' as const,
            };
            mockQueriesService.validate.mockReturnValue(validationResult);

            const result = controller.validate({
                connectionId: 'conn-123',
                sql: 'SELECT * FROM users',
            });

            expect(result).toEqual(validationResult);
            expect(service.validate).toHaveBeenCalledWith('conn-123', 'SELECT * FROM users');
        });

        it('should return invalid for dangerous queries', () => {
            const validationResult = {
                isValid: false,
                queryType: 'DROP' as const,
                requiresConfirmation: true,
                message: 'DROP statement requires confirmation',
            };
            mockQueriesService.validate.mockReturnValue(validationResult);

            const result = controller.validate({
                connectionId: 'conn-123',
                sql: 'DROP TABLE users',
            });

            expect(result.isValid).toBe(false);
            expect(result.requiresConfirmation).toBe(true);
        });
    });

    describe('Saved Queries', () => {
        describe('getSavedQueries', () => {
            it('should return all saved queries', () => {
                const queries = [mockSavedQuery];
                mockQueriesService.getSavedQueries.mockReturnValue(queries);

                const result = controller.getSavedQueries();

                expect(result).toEqual(queries);
            });
        });

        describe('getSavedQuery', () => {
            it('should return a saved query by id', () => {
                mockQueriesService.getSavedQuery.mockReturnValue(mockSavedQuery);

                const result = controller.getSavedQuery('query-123');

                expect(result).toEqual(mockSavedQuery);
                expect(service.getSavedQuery).toHaveBeenCalledWith('query-123');
            });

            it('should return null for non-existent query', () => {
                mockQueriesService.getSavedQuery.mockReturnValue(null);

                const result = controller.getSavedQuery('non-existent');

                expect(result).toBeNull();
            });
        });

        describe('createSavedQuery', () => {
            it('should create a new saved query', () => {
                mockQueriesService.createSavedQuery.mockReturnValue(mockSavedQuery);

                const result = controller.createSavedQuery({
                    name: 'Test Query',
                    sql: 'SELECT * FROM users',
                    connectionId: 'conn-123',
                });

                expect(result).toEqual(mockSavedQuery);
            });
        });

        describe('updateSavedQuery', () => {
            it('should update a saved query', () => {
                const updatedQuery = { ...mockSavedQuery, name: 'Updated Query' };
                mockQueriesService.updateSavedQuery.mockReturnValue(updatedQuery);

                const result = controller.updateSavedQuery('query-123', {
                    name: 'Updated Query',
                });

                expect(result).toEqual(updatedQuery);
            });
        });

        describe('deleteSavedQuery', () => {
            it('should delete a saved query', () => {
                mockQueriesService.deleteSavedQuery.mockReturnValue(true);

                const result = controller.deleteSavedQuery('query-123');

                expect(result).toEqual({ success: true });
            });

            it('should return false when query not found', () => {
                mockQueriesService.deleteSavedQuery.mockReturnValue(false);

                const result = controller.deleteSavedQuery('non-existent');

                expect(result).toEqual({ success: false });
            });
        });
    });

    describe('Query History', () => {
        describe('getHistory', () => {
            it('should return query history', () => {
                const history = [mockHistoryEntry];
                mockQueriesService.getHistory.mockReturnValue(history);

                const result = controller.getHistory();

                expect(result).toEqual(history);
            });

            it('should filter history by connectionId', () => {
                mockQueriesService.getHistory.mockReturnValue([mockHistoryEntry]);

                controller.getHistory('conn-123');

                expect(service.getHistory).toHaveBeenCalledWith('conn-123', undefined);
            });

            it('should limit history results', () => {
                mockQueriesService.getHistory.mockReturnValue([mockHistoryEntry]);

                controller.getHistory(undefined, '10');

                expect(service.getHistory).toHaveBeenCalledWith(undefined, 10);
            });
        });

        describe('clearHistory', () => {
            it('should clear all history', () => {
                mockQueriesService.clearHistory.mockReturnValue(5);

                const result = controller.clearHistory();

                expect(result).toEqual({ cleared: 5 });
            });

            it('should clear history for specific connection', () => {
                mockQueriesService.clearHistory.mockReturnValue(3);

                const result = controller.clearHistory('conn-123');

                expect(result).toEqual({ cleared: 3 });
                expect(service.clearHistory).toHaveBeenCalledWith('conn-123');
            });
        });
    });
});
