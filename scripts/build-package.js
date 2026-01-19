#!/usr/bin/env node
/* eslint-disable no-console */
/* global console */

/**
 * Build script for creating the distributable npm package
 * Uses esbuild to bundle CLI and API with all dependencies
 */

import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const rootPackagePath = path.join(rootDir, 'package.json');
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
const packageVersion = rootPackageJson.version;

console.log('🏗️  Building DB Nexus for distribution...\n');

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
const distPackage = path.join(rootDir, 'dist-package');
if (fs.existsSync(distPackage)) {
    fs.rmSync(distPackage, { recursive: true });
}
fs.mkdirSync(distPackage, { recursive: true });
fs.mkdirSync(path.join(distPackage, 'dist'), { recursive: true });

// Build all packages first
console.log('📦 Building packages...');
execSync('pnpm -r build', { cwd: rootDir, stdio: 'inherit' });

// Bundle CLI
console.log('\n📦 Bundling CLI...');
const cliPackageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'apps/cli/package.json'), 'utf-8')
);
await esbuild.build({
    entryPoints: [path.join(rootDir, 'apps/cli/dist/index.js')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: path.join(distPackage, 'dist/cli.js'),
    banner: {
        js: '#!/usr/bin/env node\nimport { createRequire } from "module";\nconst require = createRequire(import.meta.url);',
    },
    external: [
        // Keep native modules external
        'better-sqlite3',
        'pg-native',
        // These will be installed as dependencies
    ],
    define: {
        'process.env.NODE_ENV': '"production"',
        __CLI_VERSION__: JSON.stringify(cliPackageJson.version),
    },
    minify: false,
    sourcemap: false,
});

// Bundle API
console.log('📦 Bundling API...');
await esbuild.build({
    entryPoints: [path.join(rootDir, 'apps/api/dist/main.js')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: path.join(distPackage, 'dist/api.js'),
    banner: {
        js: 'import { createRequire } from "module";\nconst require = createRequire(import.meta.url);',
    },
    external: [
        // Native modules that can't be bundled
        'better-sqlite3',
        'pg-native',
        // NestJS optional dependencies
        '@nestjs/microservices',
        '@nestjs/websockets',
        '@nestjs/websockets/socket-module',
        '@nestjs/platform-fastify',
        '@fastify/static',
        '@fastify/view',
        'class-transformer',
        'class-transformer/storage',
        'class-validator',
        'cache-manager',
        // These cause issues with bundling
        'fsevents',
    ],
    define: {
        'process.env.NODE_ENV': '"production"',
    },
    minify: false,
    sourcemap: false,
    // Handle dynamic requires in NestJS
    logOverride: {
        'commonjs-variable-in-esm': 'silent',
    },
});

// Copy Web UI build
console.log('📦 Copying Web UI...');
const webSrc = path.join(rootDir, 'apps/web/dist');
const webDest = path.join(distPackage, 'dist/web');
fs.cpSync(webSrc, webDest, { recursive: true });

// The CLI bundle (cli.js) is the main entry point
// It handles all commands including starting the UI
console.log('📝 CLI bundle will be used as entry point...');

// Create package.json
console.log('📝 Creating package.json...');
const packageJson = {
    name: 'dbnexus',
    version: packageVersion,
    description: 'Database management tool with web UI',
    keywords: [
        'database',
        'postgres',
        'mysql',
        'mariadb',
        'sqlite',
        'database-management',
        'schema-migration',
        'data-sync',
        'database-tool',
        'cli',
    ],
    homepage: 'https://akademskig.github.io/dbnexus',
    repository: {
        type: 'git',
        url: 'https://github.com/akademskig/dbnexus.git',
    },
    bugs: {
        url: 'https://github.com/akademskig/dbnexus/issues',
    },
    author: 'DB Nexus Team',
    license: 'AGPL-3.0-or-later',
    type: 'module',
    bin: {
        dbnexus: './dist/cli.js',
    },
    files: ['dist', 'README.md', 'LICENSE'],
    engines: {
        node: '>=18.0.0',
    },
    dependencies: {
        // Native modules that couldn't be bundled
        'better-sqlite3': '^11.7.0',
        // Browser opener
        open: '^10.1.0',
    },
};

fs.writeFileSync(path.join(distPackage, 'package.json'), JSON.stringify(packageJson, null, 2));

// Copy README and LICENSE
console.log('📝 Copying documentation...');
const readmeSrc = path.join(rootDir, 'apps/cli/README.md');
const readmeDest = path.join(distPackage, 'README.md');
if (fs.existsSync(readmeSrc)) {
    fs.copyFileSync(readmeSrc, readmeDest);
} else {
    fs.writeFileSync(readmeDest, '# DB Nexus\n\nDatabase management tool with web UI.\n');
}

const licenseSrc = path.join(rootDir, 'LICENSE');
const licenseDest = path.join(distPackage, 'LICENSE');
if (fs.existsSync(licenseSrc)) {
    fs.copyFileSync(licenseSrc, licenseDest);
} else {
    fs.writeFileSync(licenseDest, 'AGPL-3.0-or-later License\n');
}

// Make the CLI executable
fs.chmodSync(path.join(distPackage, 'dist/cli.js'), '755');

console.log('\n✅ Build complete!');
console.log('\nPackage created in: dist-package/');
console.log('\nTo test locally:');
console.log('  cd dist-package');
console.log('  npm install');
console.log('  npm link');
console.log('  dbnexus');
console.log('\nTo publish:');
console.log('  cd dist-package');
console.log('  npm publish');
console.log('');
