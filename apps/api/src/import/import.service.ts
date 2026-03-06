import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { ConnectionsService } from '../connections/connections.service.js';
import type {
    ImportPreviewResult,
    ImportExecuteResult,
    ExecuteImportDto,
} from './dto/import.dto.js';
import type { DatabaseEngine } from '@dbnexus/shared';

function quoteIdentifier(name: string, engine: DatabaseEngine): string {
    if (engine === 'mysql') {
        return `\`${name}\``;
    }
    return `"${name}"`;
}

function quoteTableRef(schema: string, table: string, engine: DatabaseEngine): string {
    if (engine === 'sqlite') {
        return quoteIdentifier(table, engine);
    }
    return `${quoteIdentifier(schema, engine)}.${quoteIdentifier(table, engine)}`;
}

function getPlaceholder(index: number, engine: DatabaseEngine): string {
    if (engine === 'mysql') {
        return '?';
    }
    return `$${index}`;
}

function isJsonColumn(dataType: string): boolean {
    const typeLower = dataType.toLowerCase();
    return typeLower === 'json' || typeLower === 'jsonb';
}

function serializeValueForInsert(value: unknown, dataType: string): unknown {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (isJsonColumn(dataType) && typeof value === 'object') {
        return JSON.stringify(value);
    }

    return value;
}

@Injectable()
export class ImportService {
    private readonly logger = new Logger(ImportService.name);

    constructor(private readonly connectionsService: ConnectionsService) {}

    parseFile(
        buffer: Buffer,
        filename: string,
        options: { format?: 'csv' | 'json'; delimiter?: string; hasHeader?: boolean }
    ): ImportPreviewResult {
        const format = options.format || this.detectFormat(filename);

        if (format === 'json') {
            return this.parseJson(buffer);
        }
        return this.parseCsv(buffer, options.delimiter, options.hasHeader);
    }

    private detectFormat(filename: string): 'csv' | 'json' {
        const ext = filename.toLowerCase().split('.').pop();
        if (ext === 'json') {
            return 'json';
        }
        return 'csv';
    }

    private parseJson(buffer: Buffer): ImportPreviewResult {
        const content = buffer.toString('utf-8');
        let data: unknown;

        try {
            data = JSON.parse(content);
        } catch {
            throw new Error('Invalid JSON format');
        }

        let rows: Record<string, unknown>[];

        if (Array.isArray(data)) {
            rows = data as Record<string, unknown>[];
        } else if (typeof data === 'object' && data !== null) {
            rows = [data as Record<string, unknown>];
        } else {
            throw new Error('JSON must be an array of objects or a single object');
        }

        if (rows.length === 0) {
            return { columns: [], rows: [], totalRows: 0, format: 'json' };
        }

        const columns = this.extractColumns(rows);

        return {
            columns,
            rows: rows.slice(0, 100),
            totalRows: rows.length,
            format: 'json',
        };
    }

    private parseCsv(buffer: Buffer, delimiter?: string, hasHeader = true): ImportPreviewResult {
        const content = buffer.toString('utf-8');

        const records = parse(content, {
            columns: hasHeader,
            skip_empty_lines: true,
            delimiter: delimiter || ',',
            trim: true,
            relax_quotes: true,
            relax_column_count: true,
        }) as Record<string, unknown>[];

        if (records.length === 0) {
            return { columns: [], rows: [], totalRows: 0, format: 'csv' };
        }

        const columns = this.extractColumns(records);

        return {
            columns,
            rows: records.slice(0, 100),
            totalRows: records.length,
            format: 'csv',
        };
    }

    private extractColumns(rows: Record<string, unknown>[]): string[] {
        const columnSet = new Set<string>();
        for (const row of rows.slice(0, 10)) {
            for (const key of Object.keys(row)) {
                columnSet.add(key);
            }
        }
        return Array.from(columnSet);
    }

    async executeImport(dto: ExecuteImportDto): Promise<ImportExecuteResult> {
        const { connectionId, schema, table, columnMapping, rows } = dto;

        const result: ImportExecuteResult = {
            inserted: 0,
            updated: 0,
            errors: [],
        };

        if (rows.length === 0) {
            return result;
        }

        const connector = await this.connectionsService.getConnector(connectionId);
        const connection = this.connectionsService.findById(connectionId);

        if (!connection) {
            throw new Error('Connection not found');
        }

        const engine = connection.engine;
        const tableSchema = await connector.getTableSchema(schema, table);

        if (!tableSchema) {
            throw new Error(`Table ${schema}.${table} not found`);
        }

        const columnTypeMap = new Map<string, string>();
        for (const col of tableSchema.columns) {
            columnTypeMap.set(col.name, col.dataType);
        }

        const targetColumns = Object.values(columnMapping);
        const sourceColumns = Object.keys(columnMapping);

        const quotedColumns = targetColumns.map((col) => quoteIdentifier(col, engine)).join(', ');
        const tableRef = quoteTableRef(schema, table, engine);

        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            for (const row of batch) {
                try {
                    const values: unknown[] = [];
                    for (const sourceCol of sourceColumns) {
                        const targetCol = columnMapping[sourceCol] as string;
                        const dataType = columnTypeMap.get(targetCol) ?? 'text';
                        const rawValue = row[sourceCol];
                        values.push(serializeValueForInsert(rawValue, dataType));
                    }

                    const placeholders = targetColumns
                        .map((_, idx) => getPlaceholder(idx + 1, engine))
                        .join(', ');

                    const sql = `INSERT INTO ${tableRef} (${quotedColumns}) VALUES (${placeholders})`;

                    await connector.execute(sql, values);
                    result.inserted++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    result.errors.push(`Row ${i + batch.indexOf(row) + 1}: ${errorMessage}`);

                    if (result.errors.length >= 10) {
                        result.errors.push('...and more errors (stopped after 10)');
                        return result;
                    }
                }
            }
        }

        this.logger.log(
            `Import completed: ${result.inserted} inserted, ${result.errors.length} errors`
        );

        return result;
    }
}
