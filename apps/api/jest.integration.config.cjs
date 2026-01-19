const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: path.join(__dirname, 'src'),
    // Only run integration tests
    testRegex: '.*\\.integration\\.spec\\.ts$',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: path.join(__dirname, 'tsconfig.json'),
            },
        ],
    },
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],
    collectCoverageFrom: ['**/*.(t|j)s', '!**/test/**'],
    coverageDirectory: path.join(__dirname, 'coverage'),
    testEnvironment: 'node',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@dbnexus/metadata$': path.join(__dirname, '../../packages/metadata/src/index.ts'),
        '^@dbnexus/connectors$': path.join(__dirname, '../../packages/connectors/src/index.ts'),
        '^@dbnexus/shared$': path.join(__dirname, '../../packages/shared/src/index.ts'),
    },
    // Longer timeout for integration tests (30 seconds)
    testTimeout: 30000,
    // Run tests sequentially to avoid DB conflicts
    maxWorkers: 1,
    // Show verbose output
    verbose: true,
};
