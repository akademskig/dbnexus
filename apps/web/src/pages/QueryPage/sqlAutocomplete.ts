import type { Monaco } from '@monaco-editor/react';
import type { TableInfo } from '@dbnexus/shared';

export interface ColumnData {
    name: string;
    dataType: string;
    nullable?: boolean;
    tableName?: string;
}

const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'IS', 'NULL', 'TRUE', 'FALSE', 'AS', 'ON', 'JOIN', 'LEFT', 'RIGHT',
    'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL', 'USING', 'ORDER', 'BY',
    'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST', 'LIMIT', 'OFFSET', 'GROUP',
    'HAVING', 'UNION', 'ALL', 'INTERSECT', 'EXCEPT', 'DISTINCT', 'INSERT',
    'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX',
    'VIEW', 'DROP', 'ALTER', 'ADD', 'COLUMN', 'PRIMARY', 'KEY', 'FOREIGN',
    'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT', 'CONSTRAINT', 'CASCADE',
    'RESTRICT', 'TRUNCATE', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'CAST', 'COALESCE', 'NULLIF', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    'WITH', 'RECURSIVE', 'RETURNING', 'CONFLICT', 'DO', 'NOTHING', 'EXCLUDED',
];

const SQL_FUNCTIONS = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST',
    'CONCAT', 'LENGTH', 'LOWER', 'UPPER', 'TRIM', 'LTRIM', 'RTRIM',
    'SUBSTRING', 'REPLACE', 'POSITION', 'LEFT', 'RIGHT', 'LPAD', 'RPAD',
    'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'DATE',
    'EXTRACT', 'DATE_PART', 'DATE_TRUNC', 'AGE', 'INTERVAL',
    'ROUND', 'FLOOR', 'CEIL', 'ABS', 'MOD', 'POWER', 'SQRT',
    'ARRAY_AGG', 'STRING_AGG', 'JSON_AGG', 'JSONB_AGG',
    'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD',
    'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE',
];

interface CompletionRange {
    startLineNumber: number;
    endLineNumber: number;
    startColumn: number;
    endColumn: number;
}

interface Suggestion {
    label: string;
    kind: number;
    insertText: string;
    range: CompletionRange;
    detail?: string;
    sortText?: string;
}

interface MonacoModel {
    getWordUntilPosition: (position: { lineNumber: number; column: number }) => { 
        word: string; 
        startColumn: number; 
        endColumn: number 
    };
    getValueInRange: (range: { 
        startLineNumber: number; 
        startColumn: number; 
        endLineNumber: number; 
        endColumn: number 
    }) => string;
}

interface MonacoPosition {
    lineNumber: number;
    column: number;
}

function buildColumnSuggestions(
    columns: ColumnData[],
    range: CompletionRange,
    kindField: number,
    sortPrefix: string
): Suggestion[] {
    return columns.map((col) => ({
        label: col.name,
        kind: kindField,
        insertText: col.name,
        range,
        detail: `${col.dataType}${col.nullable ? '' : ' NOT NULL'}`,
        sortText: sortPrefix + col.name,
    }));
}

function buildTableSuggestions(
    tables: TableInfo[],
    range: CompletionRange,
    kindClass: number
): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    tables.forEach((table) => {
        const isDefaultSchema = !table.schema || table.schema === 'public' || table.schema === 'main';
        
        if (isDefaultSchema) {
            suggestions.push({
                label: table.name,
                kind: kindClass,
                insertText: table.name,
                range,
                detail: table.schema ? `${table.schema} • ${table.type || 'table'}` : table.type || 'table',
                sortText: '1' + table.name,
            });
        } else {
            const quotedFullName = `"${table.schema}"."${table.name}"`;
            const displayName = `${table.schema}.${table.name}`;
            suggestions.push({
                label: displayName,
                kind: kindClass,
                insertText: quotedFullName,
                range,
                detail: table.type || 'table',
                sortText: '1' + displayName,
            });
            suggestions.push({
                label: table.name,
                kind: kindClass,
                insertText: quotedFullName,
                range,
                detail: `${table.schema} • ${table.type || 'table'}`,
                sortText: '2' + table.name,
            });
        }
    });
    
    return suggestions;
}

function buildKeywordSuggestions(range: CompletionRange, kindKeyword: number): Suggestion[] {
    return SQL_KEYWORDS.map((kw) => ({
        label: kw,
        kind: kindKeyword,
        insertText: kw,
        range,
        sortText: '5' + kw,
    }));
}

function buildFunctionSuggestions(range: CompletionRange, kindFunction: number): Suggestion[] {
    return SQL_FUNCTIONS.map((fn) => ({
        label: fn,
        kind: kindFunction,
        insertText: fn + '()',
        range,
        detail: 'function',
        sortText: '4' + fn,
    }));
}

export function registerSqlCompletionProvider(
    monaco: Monaco,
    tables: TableInfo[],
    columns: ColumnData[]
): { dispose: () => void } {
    return monaco.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: ['.', ' ', '('],
        provideCompletionItems: (model: MonacoModel, position: MonacoPosition) => {
            const word = model.getWordUntilPosition(position);
            const range: CompletionRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const textBeforeCursor = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            }).toUpperCase();

            const suggestions: Suggestion[] = [];
            const { CompletionItemKind } = monaco.languages;

            const afterFrom = /\b(FROM|JOIN|INTO|UPDATE)\s+\w*$/i.test(textBeforeCursor);
            const afterSelect = /\b(SELECT|WHERE|AND|OR|ORDER\s+BY|GROUP\s+BY|SET|ON)\s+\w*$/i.test(textBeforeCursor);
            const afterDot = textBeforeCursor.endsWith('.');

            if (afterDot) {
                const match = textBeforeCursor.match(/(\w+)\.$/);
                if (match) {
                    const tableName = match[1]?.toLowerCase();
                    const matchedTable = tables.find(
                        (t) => t.name.toLowerCase() === tableName || t.schema?.toLowerCase() === tableName
                    );
                    const tableColumns = matchedTable
                        ? columns.filter((col) => col.tableName?.toLowerCase() === matchedTable.name.toLowerCase())
                        : [];

                    const columnsToShow = tableColumns.length > 0 ? tableColumns : columns;
                    suggestions.push(...buildColumnSuggestions(columnsToShow, range, CompletionItemKind.Field, '0'));
                }
            } else {
                if (afterFrom || !afterSelect) {
                    suggestions.push(...buildTableSuggestions(tables, range, CompletionItemKind.Class));
                }

                if (afterSelect || !afterFrom) {
                    suggestions.push(...buildColumnSuggestions(columns, range, CompletionItemKind.Field, '3'));
                }

                suggestions.push(...buildKeywordSuggestions(range, CompletionItemKind.Keyword));
                suggestions.push(...buildFunctionSuggestions(range, CompletionItemKind.Function));
            }

            return { suggestions };
        },
    });
}
