// Valid database engines
export const DATABASE_ENGINES = ['postgres', 'mysql', 'mariadb', 'sqlite'] as const;

// Valid connection types
export const CONNECTION_TYPES = ['local', 'docker', 'remote'] as const;

// Alphanumeric + underscore pattern for identifiers (database names, usernames)
export const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export const IDENTIFIER_MESSAGE =
    'Must start with a letter or underscore, and contain only letters, numbers, and underscores';
