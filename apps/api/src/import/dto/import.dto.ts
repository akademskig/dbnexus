import { IsString, IsOptional, IsArray, IsObject, IsEnum } from 'class-validator';

export class PreviewImportDto {
    @IsString()
    @IsOptional()
    format?: 'csv' | 'json';

    @IsString()
    @IsOptional()
    delimiter?: string;

    @IsOptional()
    hasHeader?: boolean;
}

export class ExecuteImportDto {
    @IsString()
    connectionId!: string;

    @IsString()
    schema!: string;

    @IsString()
    table!: string;

    @IsObject()
    columnMapping!: Record<string, string>;

    @IsArray()
    rows!: Record<string, unknown>[];

    @IsEnum(['insert', 'upsert'])
    @IsOptional()
    mode?: 'insert' | 'upsert';
}

export interface ImportPreviewResult {
    columns: string[];
    rows: Record<string, unknown>[];
    totalRows: number;
    format: 'csv' | 'json';
}

export interface ImportExecuteResult {
    inserted: number;
    updated: number;
    errors: string[];
}
