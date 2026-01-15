# Publishing Guide

This guide explains how to publish DB Nexus to npm.

## Prerequisites

1. **npm account** - Create one at https://www.npmjs.com/signup
2. **npm login** - Run `npm login` and enter your credentials
3. **Build the project** - Ensure everything builds successfully

## Publishing Steps

### 1. Update Version

Update the version in both:
- `apps/cli/package.json`
- `package.json` (root)

```bash
# Example: Update to 0.2.0
```

### 2. Build Everything

```bash
pnpm install
pnpm build
```

### 3. Create the Distribution Package

```bash
pnpm build:package
```

This creates a `dist-package/` directory with the bundled application.

### 4. Test Locally (Important!)

Before publishing, test the package locally:

```bash
cd dist-package
npm link
```

Then test in another terminal:

```bash
dbnexus --version
dbnexus --help
dbnexus --port 8080
```

Verify:
- ✅ Server starts correctly
- ✅ Browser opens automatically
- ✅ Web UI loads
- ✅ Can create connections
- ✅ Data directory is created in `~/.dbnexus/`

When done testing:

```bash
npm unlink -g dbnexus
```

### 5. Publish to npm

```bash
cd dist-package
npm publish
```

For first-time publishing or scoped packages:

```bash
npm publish --access public
```

### 6. Verify Publication

```bash
# Install from npm
npm install -g dbnexus

# Test
dbnexus --version
dbnexus
```

### 7. Create GitHub Release

1. Go to https://github.com/dbnexus/dbnexus/releases
2. Click "Draft a new release"
3. Create a new tag (e.g., `v0.2.0`)
4. Title: "DB Nexus v0.2.0"
5. Add release notes (see template below)
6. Publish release

## Release Notes Template

```markdown
## 🚀 What's New

- Feature 1
- Feature 2
- Bug fix 1

## 📦 Installation

```bash
npm install -g dbnexus
```

Or use npx:

```bash
npx dbnexus
```

## 🔧 Changes

- Full changelog...

## 📚 Documentation

- [Installation Guide](https://github.com/dbnexus/dbnexus/blob/main/INSTALLATION.md)
- [Full Documentation](https://docs.dbnexus.dev)
```

## Troubleshooting

### "You do not have permission to publish"

Make sure you're logged in:

```bash
npm whoami
npm login
```

### "Package name already taken"

If `dbnexus` is taken, use a scoped package:

1. Update `apps/cli/package.json`:
   ```json
   {
     "name": "@your-org/dbnexus"
   }
   ```

2. Publish with:
   ```bash
   npm publish --access public
   ```

### "Version already published"

You can't republish the same version. Update the version number and try again.

### Build errors

Make sure all dependencies are installed:

```bash
pnpm install
pnpm build
```

## Automated Publishing (CI/CD)

### GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build package
        run: pnpm build:package
      
      - name: Publish to npm
        run: cd dist-package && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup npm Token

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Generate a new "Automation" token
3. Add it to GitHub Secrets as `NPM_TOKEN`

## Version Strategy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes, backwards compatible

## Pre-release Versions

For beta/alpha releases:

```json
{
  "version": "0.2.0-beta.1"
}
```

Publish with:

```bash
npm publish --tag beta
```

Users install with:

```bash
npm install -g dbnexus@beta
```

## Post-Publishing Checklist

- [ ] Verify package on npm: https://www.npmjs.com/package/dbnexus
- [ ] Test installation: `npm install -g dbnexus`
- [ ] Update documentation
- [ ] Announce on social media / Discord / etc.
- [ ] Update CHANGELOG.md
- [ ] Close related GitHub issues

## Support

If you encounter issues during publishing:

- 📧 Email: admin@dbnexus.dev
- 🐛 Issues: https://github.com/dbnexus/dbnexus/issues
