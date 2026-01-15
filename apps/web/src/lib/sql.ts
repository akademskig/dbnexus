import type { DatabaseEngine } from '@dbnexus/shared';

export const quoteIdentifier = (name: string, engine?: DatabaseEngine) => {
    if (engine === 'mysql' || engine === 'mariadb') {
        return `\`${name}\``;
    }
    return `"${name}"`;
};

export const buildTableName = (schema: string, table: string, engine?: DatabaseEngine) => {
    if (engine === 'sqlite') {
        return quoteIdentifier(table, engine);
    }
    return `${quoteIdentifier(schema, engine)}.${quoteIdentifier(table, engine)}`;
};

export const buildDropTableSql = (
    schema: string,
    table: string,
    engine?: DatabaseEngine,
    useCascade = true
) => {
    const fullTableName = buildTableName(schema, table, engine);
    if (engine === 'sqlite') {
        return `DROP TABLE ${fullTableName}`;
    }
    return useCascade ? `DROP TABLE ${fullTableName} CASCADE` : `DROP TABLE ${fullTableName}`;
};
