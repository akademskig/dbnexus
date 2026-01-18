const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: path.join(__dirname, 'src'),
    testRegex: '.*\\.spec\\.ts$',
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
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: path.join(__dirname, 'coverage'),
    testEnvironment: 'node',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@dbnexus/metadata$': path.join(__dirname, '../../packages/metadata/src/index.ts'),
        '^@dbnexus/connectors$': path.join(__dirname, '../../packages/connectors/src/index.ts'),
        '^@dbnexus/shared$': path.join(__dirname, '../../packages/shared/src/index.ts'),
    },
};
