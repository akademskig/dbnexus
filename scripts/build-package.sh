#!/bin/bash

# Build script for creating the distributable npm package
# This script builds all components and packages them together

set -e

echo "🏗️  Building DB Nexus for distribution..."
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist-package
mkdir -p dist-package

# Build all packages
echo "📦 Building packages..."
pnpm -r build

# Create the package structure
echo "📁 Creating package structure..."
mkdir -p dist-package/dist/api
mkdir -p dist-package/dist/web
mkdir -p dist-package/dist/cli

# Copy API build
echo "  → Copying API..."
cp -r apps/api/dist/* dist-package/dist/api/
cp -r apps/api/node_modules dist-package/dist/api/ 2>/dev/null || true

# Copy Web build
echo "  → Copying Web UI..."
cp -r apps/web/dist/* dist-package/dist/web/

# Copy CLI build
echo "  → Copying CLI..."
cp -r apps/cli/dist/* dist-package/dist/cli/

# Copy package dependencies
echo "  → Copying dependencies..."
cp -r packages/connectors/dist dist-package/dist/connectors
cp -r packages/metadata/dist dist-package/dist/metadata
cp -r packages/shared/dist dist-package/dist/shared

# Copy package.json and other files
echo "  → Copying package files..."
cp apps/cli/package.json dist-package/
cp README.md dist-package/ 2>/dev/null || echo "# DB Nexus" > dist-package/README.md
cp LICENSE dist-package/ 2>/dev/null || echo "MIT" > dist-package/LICENSE

# Update package.json paths
echo "  → Updating package paths..."
cd dist-package
# The bin should point to the CLI entry point
sed -i.bak 's|"./dist/index.js"|"./dist/cli/index.js"|g' package.json
rm package.json.bak 2>/dev/null || true

echo ""
echo "✅ Build complete!"
echo ""
echo "Package created in: dist-package/"
echo ""
echo "To test locally:"
echo "  cd dist-package"
echo "  npm link"
echo "  dbnexus"
echo ""
echo "To publish:"
echo "  cd dist-package"
echo "  npm publish"
echo ""
