# Conduit Monorepo Structure

## Overview

This monorepo uses modern tooling to organize packages and applications:

- **Packages (`packages/`)**: Reusable libraries and frameworks
- **Apps (`apps/`)**: Deployable applications and sites
- **Turborepo**: Build system with intelligent caching
- **npm workspaces**: Dependency management

## Structure

```
conduit/
├── packages/                 # Reusable packages
│   └── conduit/             # Core DI framework
│       ├── src/             # Source code
│       ├── lib/             # Build output
│       ├── tests/           # Unit tests
│       └── package.json
│
├── apps/                    # Applications
│   ├── example/             # Demo application
│   │   ├── src/
│   │   ├── generated/       # Compiled containers
│   │   └── package.json
│   │
│   └── docs/                # Documentation site
│       ├── .vitepress/      # VitePress config
│       ├── guide/           # Documentation content
│       └── package.json
│
├── turbo.json               # Turborepo configuration
├── package.json             # Workspace root
└── .gitignore              # Git ignore patterns
```

## Commands

### Build Commands

```bash
# Build all packages and apps
npm run build

# Build specific package/app
npm run build:conduit
npm run build:example
npm run build:docs
```

### Development Commands

```bash
# Run tests
npm test

# Start documentation site
npm run dev:docs

# Clean all outputs
npm run clean
```

### Turborepo Features

- **Caching**: Build and test results are cached
- **Parallelization**: Tasks run concurrently when possible
- **Dependencies**: Packages build before dependent apps
- **Incremental**: Only rebuild what changed

## Package Types

### `packages/conduit` (Library)

- Core dependency injection framework
- TypeScript compilation to `lib/`
- Jest unit tests
- Published to npm

### `apps/example` (Application)

- Demo application showing Conduit usage
- Compiles services using Conduit CLI
- Generates optimized containers

### `apps/docs` (Website)

- VitePress documentation site
- Markdown content with code examples
- Builds to static site for deployment

## Development Workflow

1. Make changes to `packages/conduit`
2. Tests run automatically with Turborepo
3. `apps/example` rebuilds using new conduit version
4. Documentation can reference new features
5. All outputs are cached for fast iteration
