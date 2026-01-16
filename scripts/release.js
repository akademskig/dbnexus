#!/usr/bin/env node
/* eslint-disable no-console */
/* global console, process */

/**
 * Release helper:
 * - Bumps version (patch/minor/major or explicit semver)
 * - Updates root and apps/cli package.json
 * - Commits and tags by default
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const bumpArg = args.find((arg) => !arg.startsWith('--'));

const rootPackagePath = path.join(rootDir, 'package.json');
const cliPackagePath = path.join(rootDir, 'apps/cli/package.json');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
};

const isSemver = (value) => /^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(value);

const bumpVersion = (version, bump) => {
    const [major, minor, patchWithTag] = version.split('.');
    const [patch] = patchWithTag.split('-');
    const majorNum = Number(major);
    const minorNum = Number(minor);
    const patchNum = Number(patch);

    if ([majorNum, minorNum, patchNum].some((num) => Number.isNaN(num))) {
        throw new Error(`Invalid semver: ${version}`);
    }

    if (bump === 'major') return `${majorNum + 1}.0.0`;
    if (bump === 'minor') return `${majorNum}.${minorNum + 1}.0`;
    if (bump === 'patch') return `${majorNum}.${minorNum}.${patchNum + 1}`;

    throw new Error(`Unknown bump type: ${bump}`);
};

const usage = () => {
    console.log(`
Usage:
  node scripts/release.js <patch|minor|major|version> [--no-commit] [--no-tag]

Examples:
  node scripts/release.js patch
  node scripts/release.js minor
  node scripts/release.js 0.2.0
  node scripts/release.js patch --no-tag
`);
};

if (!bumpArg) {
    usage();
    process.exit(1);
}

const rootPackageJson = readJson(rootPackagePath);
const currentVersion = rootPackageJson.version;

const nextVersion = isSemver(bumpArg) ? bumpArg : bumpVersion(currentVersion, bumpArg);

// Guard: ensure clean working tree unless --no-commit
if (!flags.has('--no-commit')) {
    const status = execSync('git status --porcelain', { cwd: rootDir }).toString().trim();
    if (status) {
        console.error('Working tree is not clean. Commit or stash changes first.');
        process.exit(1);
    }
}

// Update versions
rootPackageJson.version = nextVersion;
writeJson(rootPackagePath, rootPackageJson);

const cliPackageJson = readJson(cliPackagePath);
cliPackageJson.version = nextVersion;
writeJson(cliPackagePath, cliPackageJson);

console.log(`Version bumped: ${currentVersion} -> ${nextVersion}`);

if (!flags.has('--no-commit')) {
    execSync('git add package.json apps/cli/package.json', { cwd: rootDir, stdio: 'inherit' });
    execSync(`git commit -m "chore(release): v${nextVersion}"`, {
        cwd: rootDir,
        stdio: 'inherit',
    });
}

if (!flags.has('--no-tag')) {
    execSync(`git tag v${nextVersion}`, { cwd: rootDir, stdio: 'inherit' });
}
