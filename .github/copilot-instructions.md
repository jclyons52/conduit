# TypeScript Dependency Injection Framework Monorepo - Copilot Instructions

This is a monorepo workspace for "conduit" - a TypeScript dependency injection framework with revolutionary serverless optimization through tree-shaking compilation.

## Workspace Structure

### Core Package (`/packages/conduit/`)

- `/src` - Main framework source code
  - `/container/` - Core DI container implementation
  - `/compiler/` - Tree-shaking compilation system
  - `/types/` - TypeScript type definitions
  - `/errors/` - Error handling
  - `cli.ts` - Command-line interface
- `/lib` - Compiled output (auto-generated, gitignored)
- `/tests` - Jest unit tests
- `package.json` - Core package dependencies

### Example Package (`/packages/example/`)

- `/src` - Example application demonstrating conduit usage
  - `/services/` - Modular service implementations
  - `services.ts` - Main service definitions
- `/generated` - Compiled containers (should be gitignored)
- `conduit.config.js` - Compilation configuration
- `test-workspace.ts` - Integration test

## Development Guidelines

- **TypeScript strict mode**: All code must use strict TypeScript
- **Factory-based DI**: No decorators, pure factory functions
- **Monorepo workspace**: Use npm workspaces for package management
- **Tree-shaking focus**: Optimize for serverless/edge deployment
- **CLI-first**: Provide excellent developer experience via CLI tools
- **Type safety**: Leverage TypeScript for compile-time validation

## Key Systems Implemented

### Core DI Framework

- Service container with lifecycle management (singleton, transient, scoped)
- Factory-based providers with no decorators or metadata
- Proxy-based destructuring support for clean dependency access
- Compile-time type safety with ServiceDefinitions<T>
- Zero runtime dependencies

### Compilation System

- Dependency analysis and topological sorting
- Tree-shaking to include only required services
- External parameter extraction for configuration
- Import discovery and generation
- Two output modes: 'container' (optimized containers) and 'factories' (individual functions)

### CLI Tooling

- `compile` - Generate tree-shaken containers/factories
- `list` - Show all available services
- `analyze` - Dependency analysis and tree visualization
- `init` - Project scaffolding

## Current Status & Next Steps

### Completed ✅

- Monorepo workspace structure
- Core DI framework functionality
- Complete compilation system with tree-shaking
- CLI tools with all major commands
- Working example project
- Auto-discovery of imports and services

### TODO 🚧

- Clean up generated files from git tracking
- Add proper .gitignore patterns for lib/ and generated/ directories
- Fix remaining TypeScript compilation issues
- Update workspace dependencies
- Clean up old example files
- Complete documentation updates

## Build Commands

```bash
# Root workspace
npm install                    # Install all dependencies
npm run build:conduit         # Build conduit package
npm run build:example         # Build example

# Conduit package
cd packages/conduit
npm run build                 # Compile TypeScript
npm test                      # Run tests

# Example package
cd packages/example
npm run build                 # Compile containers
npm run test                  # Test compilation
```
