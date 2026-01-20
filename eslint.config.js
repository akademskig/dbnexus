import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
    // Global ignores
    {
        ignores: [
            '**/dist/**',
            '**/build/**',
            '**/node_modules/**',
            '**/*.min.js',
            '**/coverage/**',
            '**/*.cjs', // Ignore CommonJS config files (Jest, etc.)
        ],
    },

    // Base ESLint recommended rules
    eslint.configs.recommended,

    // TypeScript rules for all TS files
    ...tseslint.configs.recommended,

    // React configuration for web app
    {
        files: ['apps/web/**/*.{ts,tsx}'],
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off', // Not needed with React 17+
            'react/prop-types': 'off', // Using TypeScript for prop validation
        },
    },

    // Node.js configuration for backend, CLI, and packages
    {
        files: ['apps/api/**/*.ts', 'apps/cli/**/*.ts', 'packages/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // Custom rules for all files
    {
        rules: {
            // TypeScript specific
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',

            // General
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
        },
    },

    // CLI - allow console.log for user output (must come after general rules)
    {
        files: ['apps/cli/**/*.ts'],
        rules: {
            'no-console': 'off',
        },
    },

    // Prettier must be last to override other formatting rules
    eslintConfigPrettier
);
