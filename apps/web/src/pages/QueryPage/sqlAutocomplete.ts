import type { Monaco } from '@monaco-editor/react';
import type { TableInfo } from '@dbnexus/shared';

export interface ColumnData {
    name: string;
    dataType: string;
    nullable?: boolean;
    tableName?: string;
    isPrimaryKey?: boolean;
}

export interface ForeignKeyData {
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetSchema?: string;
    targetColumn: string;
}

const JOIN_SNIPPETS = [
    { label: 'INNER JOIN', insert: 'INNER JOIN ', detail: 'Join matching rows from both tables' },
    { label: 'LEFT JOIN', insert: 'LEFT JOIN ', detail: 'Include all rows from left table' },
    { label: 'RIGHT JOIN', insert: 'RIGHT JOIN ', detail: 'Include all rows from right table' },
    { label: 'FULL OUTER JOIN', insert: 'FULL OUTER JOIN ', detail: 'Include all rows from both tables' },
    { label: 'CROSS JOIN', insert: 'CROSS JOIN ', detail: 'Cartesian product of both tables' },
];

const SQL_KEYWORDS = [
    'SELECT',
    'FROM',
    'WHERE',
    'AND',
    'OR',
    'NOT',
    'IN',
    'LIKE',
    'BETWEEN',
    'IS',
    'NULL',
    'TRUE',
    'FALSE',
    'AS',
    'ON',
    'JOIN',
    'LEFT',
    'RIGHT',
    'INNER',
    'OUTER',
    'FULL',
    'CROSS',
    'NATURAL',
    'USING',
    'ORDER',
    'BY',
    'ASC',
    'DESC',
    'NULLS',
    'FIRST',
    'LAST',
    'LIMIT',
    'OFFSET',
    'GROUP',
    'HAVING',
    'UNION',
    'ALL',
    'INTERSECT',
    'EXCEPT',
    'DISTINCT',
    'INSERT',
    'INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE',
    'CREATE',
    'TABLE',
    'INDEX',
    'VIEW',
    'DROP',
    'ALTER',
    'ADD',
    'COLUMN',
    'PRIMARY',
    'KEY',
    'FOREIGN',
    'REFERENCES',
    'UNIQUE',
    'CHECK',
    'DEFAULT',
    'CONSTRAINT',
    'CASCADE',
    'RESTRICT',
    'TRUNCATE',
    'EXISTS',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'CAST',
    'COALESCE',
    'NULLIF',
    'COUNT',
    'SUM',
    'AVG',
    'MIN',
    'MAX',
    'WITH',
    'RECURSIVE',
    'RETURNING',
    'CONFLICT',
    'DO',
    'NOTHING',
    'EXCLUDED',
];

const SQL_FUNCTIONS = [
    'COUNT',
    'SUM',
    'AVG',
    'MIN',
    'MAX',
    'COALESCE',
    'NULLIF',
    'CAST',
    'CONCAT',
    'LENGTH',
    'LOWER',
    'UPPER',
    'TRIM',
    'LTRIM',
    'RTRIM',
    'SUBSTRING',
    'REPLACE',
    'POSITION',
    'LEFT',
    'RIGHT',
    'LPAD',
    'RPAD',
    'NOW',
    'CURRENT_DATE',
    'CURRENT_TIME',
    'CURRENT_TIMESTAMP',
    'DATE',
    'EXTRACT',
    'DATE_PART',
    'DATE_TRUNC',
    'AGE',
    'INTERVAL',
    'ROUND',
    'FLOOR',
    'CEIL',
    'ABS',
    'MOD',
    'POWER',
    'SQRT',
    'ARRAY_AGG',
    'STRING_AGG',
    'JSON_AGG',
    'JSONB_AGG',
    'ROW_NUMBER',
    'RANK',
    'DENSE_RANK',
    'NTILE',
    'LAG',
    'LEAD',
    'FIRST_VALUE',
    'LAST_VALUE',
    'NTH_VALUE',
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
    insertTextRules?: number;
}

interface MonacoModel {
    getWordUntilPosition: (position: { lineNumber: number; column: number }) => {
        word: string;
        startColumn: number;
        endColumn: number;
    };
    getValueInRange: (range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
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
        const isDefaultSchema =
            !table.schema || table.schema === 'public' || table.schema === 'main';

        if (isDefaultSchema) {
            suggestions.push({
                label: table.name,
                kind: kindClass,
                insertText: table.name,
                range,
                detail: table.schema
                    ? `${table.schema} • ${table.type || 'table'}`
                    : table.type || 'table',
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

function buildJoinSnippetSuggestions(range: CompletionRange, kindSnippet: number): Suggestion[] {
    return JOIN_SNIPPETS.map((js) => ({
        label: js.label,
        kind: kindSnippet,
        insertText: js.insert,
        range,
        detail: js.detail,
        sortText: '0' + js.label,
    }));
}

function getTableReference(table: TableInfo): string {
    const isDefaultSchema = !table.schema || table.schema === 'public' || table.schema === 'main';
    return isDefaultSchema ? table.name : `"${table.schema}"."${table.name}"`;
}

function generateAlias(tableName: string, usedAliases: string[]): string {
    const firstChar = tableName.charAt(0).toLowerCase();
    if (!usedAliases.includes(firstChar)) {
        return firstChar;
    }
    
    const words = tableName.split('_');
    if (words.length > 1) {
        const initials = words.map(w => w.charAt(0).toLowerCase()).join('');
        if (!usedAliases.includes(initials)) {
            return initials;
        }
    }
    
    const twoChars = tableName.slice(0, 2).toLowerCase();
    if (!usedAliases.includes(twoChars)) {
        return twoChars;
    }
    
    for (let i = 1; i <= 9; i++) {
        const numbered = `${firstChar}${i}`;
        if (!usedAliases.includes(numbered)) {
            return numbered;
        }
    }
    
    return tableName.slice(0, 3).toLowerCase();
}

function buildJoinWithForeignKey(
    fk: ForeignKeyData,
    tables: TableInfo[],
    sourceRef: string,
    usedAliases: string[],
    range: CompletionRange,
    kindSnippet: number,
    insertTextRules: number
): Suggestion[] {
    const targetTable = tables.find(
        (t) => t.name.toLowerCase() === fk.targetTable.toLowerCase() &&
            (!fk.targetSchema || t.schema?.toLowerCase() === fk.targetSchema.toLowerCase())
    );
    
    if (!targetTable) return [];
    
    const targetRef = getTableReference(targetTable);
    const alias = generateAlias(fk.targetTable, usedAliases);
    
    const suggestions: Suggestion[] = [];
    
    for (const joinType of ['JOIN', 'LEFT JOIN', 'INNER JOIN']) {
        suggestions.push({
            label: `${joinType} ${fk.targetTable} (FK: ${fk.sourceColumn})`,
            kind: kindSnippet,
            insertText: `${joinType} ${targetRef} ${alias} ON ${alias}.${fk.targetColumn} = ${sourceRef}.${fk.sourceColumn}`,
            range,
            detail: `→ ${fk.targetTable}.${fk.targetColumn}`,
            sortText: '0' + joinType + fk.targetTable,
            insertTextRules,
        });
    }
    
    return suggestions;
}

function singularize(word: string): string {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('es') && (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes') || word.endsWith('ches') || word.endsWith('shes'))) {
        return word.slice(0, -2);
    }
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
}

interface SourceTableInfo {
    name: string;
    alias: string | null;
}

function buildJoinTableSuggestions(
    tables: TableInfo[],
    foreignKeys: ForeignKeyData[],
    sourceTable: SourceTableInfo | null,
    usedAliases: string[],
    range: CompletionRange,
    kindClass: number,
    kindSnippet: number,
    insertTextRules: number
): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const sourceRef = sourceTable?.alias || sourceTable?.name || 'source';

    if (sourceTable?.name) {
        const relevantFks = foreignKeys.filter(
            (fk) => fk.sourceTable.toLowerCase() === sourceTable.name.toLowerCase()
        );

        for (const fk of relevantFks) {
            suggestions.push(
                ...buildJoinWithForeignKey(fk, tables, sourceRef, usedAliases, range, kindSnippet, insertTextRules)
            );
        }
    }

    const sourceFkColumn = sourceTable?.name 
        ? `${singularize(sourceTable.name.toLowerCase())}_id`
        : 'source_id';

    for (const table of tables) {
        const tableRef = getTableReference(table);
        const alias = generateAlias(table.name, usedAliases);
        const isDefaultSchema = !table.schema || table.schema === 'public' || table.schema === 'main';
        const displayName = isDefaultSchema ? table.name : `${table.schema}.${table.name}`;

        suggestions.push({
            label: `${table.name} (with alias)`,
            kind: kindSnippet,
            insertText: `${tableRef} ${alias} ON ${alias}.\${1:${sourceFkColumn}} = ${sourceRef}.\${2:id}`,
            range,
            detail: `${displayName} → snippet`,
            sortText: '1' + table.name,
            insertTextRules,
        });

        suggestions.push({
            label: table.name,
            kind: kindClass,
            insertText: tableRef,
            range,
            detail: table.schema ? `${table.schema} • ${table.type || 'table'}` : table.type || 'table',
            sortText: '2' + table.name,
        });
    }

    return suggestions;
}

export function registerSqlCompletionProvider(
    monaco: Monaco,
    tables: TableInfo[],
    columns: ColumnData[],
    foreignKeys: ForeignKeyData[] = []
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

            const originalTextBeforeCursor = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });
            const textBeforeCursor = originalTextBeforeCursor.toUpperCase();

            const suggestions: Suggestion[] = [];
            const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;

            const afterJoin = /\b(JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|FULL\s+(?:OUTER\s+)?JOIN|CROSS\s+JOIN)\s+\w*$/i.test(textBeforeCursor);
            const afterFrom = /\b(FROM|INTO|UPDATE)\s+\w*$/i.test(textBeforeCursor);
            const afterSelect = /\b(SELECT|WHERE|AND|OR|ORDER\s+BY|GROUP\s+BY|SET|ON)\s+\w*$/i.test(
                textBeforeCursor
            );
            const afterDot = textBeforeCursor.endsWith('.');
            const wantsJoin = /\b(LEFT|RIGHT|INNER|FULL|CROSS|OUTER)\s*$/i.test(textBeforeCursor);

            const fromMatch = originalTextBeforeCursor.match(/\bFROM\s+(?:"[^"]+"\s*\.\s*)?"?(\w+)"?(?:\s+(?:AS\s+)?(\w+))?/i);
            const sourceTable: SourceTableInfo | null = fromMatch?.[1]
                ? { name: fromMatch[1], alias: fromMatch[2] || null }
                : null;

            const tableAliasPattern = /(?:FROM|JOIN)\s+(?:(?:"[^"]+"|[\w]+)\s*\.\s*)?(?:"([^"]+)"|(\w+))(?:\s+(?:AS\s+)?(\w+))?/gi;
            const usedAliases: string[] = [];
            const aliasToTable = new Map<string, string>();
            let tableAliasMatch;
            while ((tableAliasMatch = tableAliasPattern.exec(originalTextBeforeCursor)) !== null) {
                const tableName = tableAliasMatch[1] || tableAliasMatch[2];
                const alias = tableAliasMatch[3];
                if (alias && tableName) {
                    usedAliases.push(alias.toLowerCase());
                    aliasToTable.set(alias.toLowerCase(), tableName.toLowerCase());
                }
            }

            if (afterDot) {
                const match = originalTextBeforeCursor.match(/(\w+)\.$/);
                if (match?.[1]) {
                    const identifier = match[1].toLowerCase();
                    
                    const tableNameFromAlias = aliasToTable.get(identifier);
                    const actualTableName = tableNameFromAlias || identifier;
                    const isKnownAlias = aliasToTable.has(identifier);
                    
                    const matchedTable = tables.find(
                        (t) =>
                            t.name.toLowerCase() === actualTableName ||
                            t.schema?.toLowerCase() === actualTableName
                    );
                    const tableColumns = matchedTable
                        ? columns.filter(
                            (col) =>
                                col.tableName?.toLowerCase() === matchedTable.name.toLowerCase()
                        )
                        : [];

                    if (tableColumns.length > 0) {
                        suggestions.push(
                            ...buildColumnSuggestions(
                                tableColumns,
                                range,
                                CompletionItemKind.Field,
                                '0'
                            )
                        );
                    } else if (!isKnownAlias) {
                        suggestions.push(
                            ...buildColumnSuggestions(
                                columns,
                                range,
                                CompletionItemKind.Field,
                                '0'
                            )
                        );
                    }
                }
            } else if (wantsJoin) {
                suggestions.push(...buildJoinSnippetSuggestions(range, CompletionItemKind.Snippet));
            } else if (afterJoin) {
                suggestions.push(
                    ...buildJoinTableSuggestions(
                        tables,
                        foreignKeys,
                        sourceTable,
                        usedAliases,
                        range,
                        CompletionItemKind.Class,
                        CompletionItemKind.Snippet,
                        CompletionItemInsertTextRule.InsertAsSnippet
                    )
                );
            } else {
                if (afterFrom || !afterSelect) {
                    suggestions.push(
                        ...buildTableSuggestions(tables, range, CompletionItemKind.Class)
                    );
                }

                if (afterSelect || !afterFrom) {
                    suggestions.push(
                        ...buildColumnSuggestions(columns, range, CompletionItemKind.Field, '3')
                    );
                }

                suggestions.push(...buildKeywordSuggestions(range, CompletionItemKind.Keyword));
                suggestions.push(...buildFunctionSuggestions(range, CompletionItemKind.Function));
            }

            return { suggestions };
        },
    });
}
