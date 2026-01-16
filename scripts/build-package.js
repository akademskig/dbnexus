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

// Create the entry point that spawns the API
console.log('📝 Creating entry point...');
const entryPoint = `#!/usr/bin/env node

import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse arguments
const args = process.argv.slice(2);
let port = '3001';
let dataDir = null;
let noOpen = false;
let showHelp = false;
let showVersion = false;

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' || arg === '-p') {
        port = args[++i] || '3001';
    } else if (arg === '--data-dir') {
        dataDir = args[++i];
    } else if (arg === '--no-open') {
        noOpen = true;
    } else if (arg === '--help' || arg === '-h') {
        showHelp = true;
    } else if (arg === '--version' || arg === '-v') {
        showVersion = true;
    }
}

if (showVersion) {
    console.log('${packageVersion}');
    process.exit(0);
}

if (showHelp) {
    console.log(\`
  DB Nexus - Database Management Tool

  Usage: dbnexus [options]

  Options:
    -p, --port <port>     Port to run on (default: 3001)
    --data-dir <path>     Custom data directory
    --no-open             Don't open browser automatically
    -v, --version         Show version
    -h, --help            Show help

  Examples:
    dbnexus                    Start on default port
    dbnexus --port 8080        Start on custom port
    dbnexus --data-dir ~/data  Use custom data directory
\`);
    process.exit(0);
}

console.log('\\n  🚀 DB Nexus\\n');

// Set data directory
if (dataDir) {
    process.env.DBNEXUS_DATA_DIR = path.resolve(dataDir);
    console.log('  Data Directory: ' + process.env.DBNEXUS_DATA_DIR);
} else {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    const defaultDataDir = path.join(homeDir, '.dbnexus');
    console.log('  Data Directory: ' + defaultDataDir);
}

console.log('  Port: ' + port);
console.log('');

// Set environment
process.env.PORT = port;
process.env.NODE_ENV = 'production';

// Find and run the API
const apiPath = path.join(__dirname, 'api.js');

if (!fs.existsSync(apiPath)) {
    console.error('Error: API bundle not found at ' + apiPath);
    process.exit(1);
}

console.log('  Starting server...');

// Import and run the API directly
import(apiPath).then(async () => {
    console.log('  ✓ Server running at http://localhost:' + port);
    console.log('');
    
    if (!noOpen) {
        // Open browser
        const open = await import('open');
        await open.default('http://localhost:' + port);
    }
    
    console.log('  Press Ctrl+C to stop\\n');
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\\n  Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});
`;

fs.writeFileSync(path.join(distPackage, 'dist/index.js'), entryPoint);

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
    homepage: 'https://github.com/akademskig/dbnexus',
    repository: {
        type: 'git',
        url: 'https://github.com/akademskig/dbnexus.git',
    },
    bugs: {
        url: 'https://github.com/akademskig/dbnexus/issues',
    },
    author: 'DB Nexus Team',
    license: 'MIT',
    type: 'module',
    bin: {
        dbnexus: './dist/index.js',
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
    fs.writeFileSync(licenseDest, 'MIT License\n');
}

// Make the entry point executable
fs.chmodSync(path.join(distPackage, 'dist/index.js'), '755');

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
