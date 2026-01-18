import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { SchemaController } from './schema.controller.js';
import { SchemaService } from './schema.service.js';
import { SchemaDiffService } from './schema-diff.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { MetadataService } from '../metadata/metadata.service.js';
import type { TableInfo, TableSchema, SchemaDiff } from '@dbnexus/shared';

describe('SchemaController', () => {
    let controller: SchemaController;
    let schemaService: SchemaService;
    let schemaDiffService: SchemaDiffService;

    const mockTableInfo: TableInfo = {
        name: 'users',
        schema: 'public',
        type: 'table',
        rowCount: 100,
    };

    const mockTableSchema: TableSchema = {
        name: 'users',
        schema: 'public',
        columns: [
            {
                name: 'id',
                dataType: 'integer',
                nullable: false,
                isPrimaryKey: true,
                isUnique: false,
                defaultValue: null,
            },
            {
                name: 'name',
                dataType: 'varchar(255)',
                nullable: false,
                isPrimaryKey: false,
                isUnique: false,
                defaultValue: null,
            },
        ],
        primaryKey: ['id'],
        foreignKeys: [],
        indexes: [],
    };

    const mockSchemaDiff: SchemaDiff = {
        sourceConnectionId: 'source-conn',
        targetConnectionId: 'target-conn',
        sourceSchema: 'public',
        targetSchema: 'public',
        generatedAt: new Date().toISOString(),
        items: [],
        summary: {
            tablesAdded: 0,
            tablesRemoved: 0,
            columnsAdded: 0,
            columnsRemoved: 0,
            columnsModified: 0,
            indexesAdded: 0,
            indexesRemoved: 0,
            indexesModified: 0,
            fksAdded: 0,
            fksRemoved: 0,
            fksModified: 0,
        },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSchemaService: any = {
        getSchemas: jest.fn(),
        createSchema: jest.fn(),
        deleteSchema: jest.fn(),
        getTables: jest.fn(),
        getTableSchema: jest.fn(),
        getTableRowCount: jest.fn(),
        getServerVersion: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSchemaDiffService: any = {
        compareSchemas: jest.fn(),
        getMigrationSql: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockConnectionsService: any = {
        getConnector: jest.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockMetadataService: any = {
        migrationHistoryRepository: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SchemaController],
            providers: [
                { provide: SchemaService, useValue: mockSchemaService },
                { provide: SchemaDiffService, useValue: mockSchemaDiffService },
                { provide: ConnectionsService, useValue: mockConnectionsService },
                { provide: MetadataService, useValue: mockMetadataService },
            ],
        }).compile();

        controller = module.get<SchemaController>(SchemaController);
        schemaService = module.get<SchemaService>(SchemaService);
        schemaDiffService = module.get<SchemaDiffService>(SchemaDiffService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getSchemas', () => {
        it('should return list of schemas', async () => {
            const schemas = ['public', 'internal', 'audit'];
            mockSchemaService.getSchemas.mockResolvedValue(schemas);

            const result = await controller.getSchemas('conn-123');

            expect(result).toEqual(schemas);
            expect(schemaService.getSchemas).toHaveBeenCalledWith('conn-123');
        });
    });

    describe('createSchema', () => {
        it('should create a new schema', async () => {
            mockSchemaService.createSchema.mockResolvedValue(undefined);

            const result = await controller.createSchema('conn-123', { name: 'new_schema' });

            expect(result).toEqual({ success: true, name: 'new_schema' });
            expect(schemaService.createSchema).toHaveBeenCalledWith('conn-123', 'new_schema');
        });
    });

    describe('deleteSchema', () => {
        it('should delete a schema', async () => {
            mockSchemaService.deleteSchema.mockResolvedValue(undefined);

            const result = await controller.deleteSchema('conn-123', 'old_schema');

            expect(result).toEqual({ success: true });
            expect(schemaService.deleteSchema).toHaveBeenCalledWith('conn-123', 'old_schema');
        });
    });

    describe('getTables', () => {
        it('should return list of tables', async () => {
            const tables = [mockTableInfo];
            mockSchemaService.getTables.mockResolvedValue(tables);

            const result = await controller.getTables('conn-123');

            expect(result).toEqual(tables);
            expect(schemaService.getTables).toHaveBeenCalledWith('conn-123', undefined);
        });

        it('should filter by schema', async () => {
            mockSchemaService.getTables.mockResolvedValue([mockTableInfo]);

            await controller.getTables('conn-123', 'public');

            expect(schemaService.getTables).toHaveBeenCalledWith('conn-123', 'public');
        });
    });

    describe('getTableSchema', () => {
        it('should return table schema details', async () => {
            mockSchemaService.getTableSchema.mockResolvedValue(mockTableSchema);

            const result = await controller.getTableSchema('conn-123', 'public', 'users');

            expect(result).toEqual(mockTableSchema);
            expect(schemaService.getTableSchema).toHaveBeenCalledWith(
                'conn-123',
                'public',
                'users'
            );
        });
    });

    describe('getTableRowCount', () => {
        it('should return row count', async () => {
            mockSchemaService.getTableRowCount.mockResolvedValue(100);

            const result = await controller.getTableRowCount('conn-123', 'public', 'users');

            expect(result).toEqual({ count: 100 });
        });
    });

    describe('getServerVersion', () => {
        it('should return server version', async () => {
            mockSchemaService.getServerVersion.mockResolvedValue('PostgreSQL 15.0');

            const result = await controller.getServerVersion('conn-123');

            expect(result).toEqual({ version: 'PostgreSQL 15.0' });
        });
    });

    describe('compareSchemas', () => {
        it('should compare two schemas', async () => {
            mockSchemaDiffService.compareSchemas.mockResolvedValue(mockSchemaDiff);

            const result = await controller.compareSchemas('source-conn', 'target-conn');

            expect(result).toEqual(mockSchemaDiff);
            expect(schemaDiffService.compareSchemas).toHaveBeenCalledWith(
                'source-conn',
                'target-conn',
                'public',
                'public'
            );
        });

        it('should use custom schema names', async () => {
            mockSchemaDiffService.compareSchemas.mockResolvedValue(mockSchemaDiff);

            await controller.compareSchemas(
                'source-conn',
                'target-conn',
                'source_schema',
                'target_schema'
            );

            expect(schemaDiffService.compareSchemas).toHaveBeenCalledWith(
                'source-conn',
                'target-conn',
                'source_schema',
                'target_schema'
            );
        });
    });

    describe('getMigrationSql', () => {
        it('should return migration SQL statements', async () => {
            const sqlStatements = [
                'CREATE TABLE new_table (id INTEGER PRIMARY KEY);',
                'ALTER TABLE users ADD COLUMN email VARCHAR(255);',
            ];
            mockSchemaDiffService.compareSchemas.mockResolvedValue(mockSchemaDiff);
            mockSchemaDiffService.getMigrationSql.mockReturnValue(sqlStatements);

            const result = await controller.getMigrationSql('source-conn', 'target-conn');

            expect(result).toEqual({ sql: sqlStatements });
        });

        it('should return empty array for identical schemas', async () => {
            mockSchemaDiffService.compareSchemas.mockResolvedValue(mockSchemaDiff);
            mockSchemaDiffService.getMigrationSql.mockReturnValue([]);

            const result = await controller.getMigrationSql('source-conn', 'target-conn');

            expect(result).toEqual({ sql: [] });
        });
    });

    describe('Migration History', () => {
        const mockMigrationEntry = {
            id: 'migration-123',
            sourceConnectionId: 'source-conn',
            targetConnectionId: 'target-conn',
            sourceSchema: 'public',
            targetSchema: 'public',
            sqlStatements: ['CREATE TABLE test (id INT);'],
            success: true,
            appliedAt: new Date().toISOString(),
        };

        describe('getMigrationHistory', () => {
            it('should return migration history', async () => {
                mockMetadataService.migrationHistoryRepository.findAll.mockReturnValue([
                    mockMigrationEntry,
                ]);

                const result = await controller.getMigrationHistory();

                expect(result).toEqual([mockMigrationEntry]);
            });

            it('should filter by targetConnectionId', async () => {
                mockMetadataService.migrationHistoryRepository.findAll.mockReturnValue([
                    mockMigrationEntry,
                ]);

                await controller.getMigrationHistory('target-conn');

                expect(
                    mockMetadataService.migrationHistoryRepository.findAll
                ).toHaveBeenCalledWith({
                    targetConnectionId: 'target-conn',
                    limit: undefined,
                });
            });

            it('should limit results', async () => {
                mockMetadataService.migrationHistoryRepository.findAll.mockReturnValue([]);

                await controller.getMigrationHistory(undefined, '10');

                expect(
                    mockMetadataService.migrationHistoryRepository.findAll
                ).toHaveBeenCalledWith({
                    targetConnectionId: undefined,
                    limit: 10,
                });
            });
        });

        describe('getMigration', () => {
            it('should return a migration by id', async () => {
                mockMetadataService.migrationHistoryRepository.findById.mockReturnValue(
                    mockMigrationEntry
                );

                const result = await controller.getMigration('migration-123');

                expect(result).toEqual(mockMigrationEntry);
            });

            it('should return null for non-existent migration', async () => {
                mockMetadataService.migrationHistoryRepository.findById.mockReturnValue(null);

                const result = await controller.getMigration('non-existent');

                expect(result).toBeNull();
            });
        });

        describe('deleteMigration', () => {
            it('should delete a migration', async () => {
                mockMetadataService.migrationHistoryRepository.delete.mockReturnValue(true);

                const result = await controller.deleteMigration('migration-123');

                expect(result).toEqual({ success: true });
            });

            it('should return false when migration not found', async () => {
                mockMetadataService.migrationHistoryRepository.delete.mockReturnValue(false);

                const result = await controller.deleteMigration('non-existent');

                expect(result).toEqual({ success: false });
            });
        });
    });
});
