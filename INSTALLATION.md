# Installation & Distribution Guide

## For End Users

### Global Installation (Recommended)

Install DB Nexus globally using npm:

```bash
npm install -g dbnexus
```

Or using npx (no installation required):

```bash
npx dbnexus
```

### Usage

Once installed, start DB Nexus with:

```bash
dbnexus
```

This will:

1. Start the DB Nexus server on port 3001 (default)
2. Automatically open your browser to `http://localhost:3001`
3. Store metadata in `~/.dbnexus/metadata.db`

#### Options

```bash
# Custom port
dbnexus --port 8080

# Custom data directory
dbnexus --data-dir /path/to/data

# Don't open browser automatically
dbnexus --no-open

# Show help
dbnexus --help
```

#### Alternative Commands

```bash
# Explicit start command
dbnexus start

# Legacy ui command (still supported)
dbnexus ui
```

### Data Storage

By default, DB Nexus stores its metadata database in:

- **Linux/Mac**: `~/.dbnexus/metadata.db`
- **Windows**: `%USERPROFILE%\.dbnexus\metadata.db`

You can customize this with:

- `--data-dir` flag: `dbnexus --data-dir /custom/path`
- `DBNEXUS_DATA_DIR` environment variable: `DBNEXUS_DATA_DIR=/custom/path dbnexus`

### Uninstallation

```bash
npm uninstall -g dbnexus
```

To remove all data:

```bash
rm -rf ~/.dbnexus
```

---

## For Developers & Publishers

### Building the Package

1. **Build all components:**

```bash
pnpm install
pnpm build
```

2. **Create the distributable package:**

```bash
pnpm build:package
```

This creates a `dist-package/` directory with everything needed for npm distribution.

### Testing Locally

Before publishing, test the package locally:

```bash
cd dist-package
npm install
npm link
```

Then in another terminal:

```bash
dbnexus --help
dbnexus --no-open  # Start without opening browser
```

To unlink:

```bash
npm unlink -g dbnexus
```

### Publishing to npm

1. **Login to npm:**

```bash
npm login
```

2. **Publish:**

```bash
cd dist-package
npm publish
```

For scoped packages:

```bash
npm publish --access public
```

### Package Structure

The distributed package includes:

```
dist-package/
├── dist/
│   ├── api/          # NestJS API server
│   ├── web/          # React frontend (built)
│   ├── cli/          # CLI entry point
│   ├── connectors/   # Database connectors
│   ├── metadata/     # Metadata management
│   └── shared/       # Shared types
├── package.json
├── README.md
└── LICENSE
```

### Version Management

Update version in:

- `apps/cli/package.json`
- `package.json` (root)

Then rebuild:

```bash
pnpm build:package
```

### CI/CD Publishing

Example GitHub Actions workflow:

```yaml
name: Publish to npm

on:
    release:
        types: [created]

jobs:
    publish:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: pnpm/action-setup@v2
              with:
                  version: 9
            - uses: actions/setup-node@v3
              with:
                  node-version: '18'
                  registry-url: 'https://registry.npmjs.org'
            - run: pnpm install
            - run: pnpm build:package
            - run: cd dist-package && npm publish
              env:
                  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Pre-release Testing

Test with different scenarios:

```bash
# Test global installation
npm link

# Test with npx
npx .

# Test custom port
dbnexus --port 8080

# Test custom data directory
dbnexus --data-dir /tmp/dbnexus-test

# Test in different directories
cd /tmp && dbnexus
```

### Troubleshooting

**Issue: Module not found errors**

Ensure all dependencies are properly bundled:

- Check `dist-package/dist/` contains all necessary files
- Verify `package.json` includes all runtime dependencies

**Issue: API server not starting**

Check that:

- `dist/api/main.js` exists
- Web UI build exists in `dist/web/`
- Environment variables are set correctly

**Issue: Browser doesn't open**

The `open` package might not work on all systems. Users can:

- Manually open `http://localhost:3001`
- Use `--no-open` flag to suppress the error

### Distribution Checklist

Before publishing:

- [ ] Update version numbers
- [ ] Run `pnpm build:package`
- [ ] Test with `npm link`
- [ ] Test `npx` execution
- [ ] Verify data directory creation
- [ ] Test on different OS (Linux, Mac, Windows)
- [ ] Update CHANGELOG.md
- [ ] Create GitHub release
- [ ] Publish to npm
- [ ] Verify installation: `npm install -g dbnexus`
- [ ] Test installed version: `dbnexus --version`

### Package Size Optimization

Current package includes full dependencies. To optimize:

1. **Use webpack/esbuild** to bundle the API server
2. **Minimize node_modules** by using `--production` flag
3. **Compress static assets** (web UI)
4. **Use .npmignore** to exclude unnecessary files

Example `.npmignore`:

```
*.ts
*.map
*.test.js
*.spec.js
tsconfig.json
.github/
docs/
examples/
```
