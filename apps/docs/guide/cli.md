# CLI Tools

Conduit provides a comprehensive command-line interface for managing your dependency injection containers and optimizing them for production.

## Installation

Install the Conduit CLI globally for the best experience:

```bash
npm install -g typewryter
```

Or run commands directly with npx:

```bash
npx typewryter --help
```

## Commands Overview

| Command   | Description                                           |
| --------- | ----------------------------------------------------- |
| `compile` | Generate tree-shaken containers for specific services |
| `list`    | Show all available services in your definitions       |
| `analyze` | Analyze dependency trees and service usage            |
| `init`    | Initialize a new Conduit project with configuration   |

## compile

Generate optimized containers that include only the services you need.

### Usage

```bash
typewryter compile [service-name] [options]
```

### Options

- `--config, -c` - Path to configuration file (default: `typewryter.config.js`)
- `--mode, -m` - Output mode: `container` or `factories` (default: `container`)
- `--output, -o` - Output directory (overrides config)
- `--dry-run` - Show what would be generated without writing files

### Examples

```bash
# Compile a specific service
typewryter compile userService

# Compile with factories output
typewryter compile userService --mode factories

# Use custom config file
typewryter compile userService --config ./configs/production.js

# Preview without generating files
typewryter compile userService --dry-run
```

### Output Modes

#### Container Mode (default)

Generates a complete container with all dependencies:

```typescript
export function createUserService(params: ExternalParams) {
  const container = createContainer(serviceDefinitions);
  return container.get('userService');
}
```

#### Factories Mode

Generates individual factory functions for each service:

```typescript
export function createDatabase(params: ExternalParams) {
  return new PostgresDatabase(params.database.connectionString);
}

export function createUserService(params: ExternalParams) {
  return new UserService(createDatabase(params), createLogger(params));
}
```

## list

Display all services defined in your service definitions file.

### Usage

```bash
typewryter list [options]
```

### Options

- `--config, -c` - Path to configuration file
- `--format, -f` - Output format: `table`, `json`, or `tree` (default: `table`)
- `--dependencies, -d` - Show dependency information

### Examples

```bash
# List all services in table format
typewryter list

# Show as dependency tree
typewryter list --format tree

# Include dependency details
typewryter list --dependencies

# Output as JSON for scripting
typewryter list --format json
```

### Sample Output

```
┌─────────────────┬───────────┬──────────────────────────┐
│ Service         │ Scope     │ Dependencies             │
├─────────────────┼───────────┼──────────────────────────┤
│ logger          │ singleton │ -                        │
│ database        │ singleton │ -                        │
│ userRepository  │ scoped    │ database, logger         │
│ emailService    │ singleton │ -                        │
│ userService     │ scoped    │ userRepository, emailService, logger │
└─────────────────┴───────────┴──────────────────────────┘
```

## analyze

Perform deep analysis of your service definitions, dependencies, and compilation impact.

### Usage

```bash
typewryter analyze [service-name] [options]
```

### Options

- `--config, -c` - Path to configuration file
- `--metrics, -m` - Show compilation metrics (bundle sizes, reduction %)
- `--tree, -t` - Show dependency tree visualization
- `--external, -e` - Show external parameter analysis
- `--all, -a` - Analyze all services (when no service specified)

### Examples

```bash
# Analyze specific service
typewryter analyze userService

# Show dependency tree
typewryter analyze userService --tree

# Show compilation metrics
typewryter analyze userService --metrics

# Analyze all services
typewryter analyze --all
```

### Sample Output

```
🎯 Analyzing userService:

📊 Services included: 5
   ✓ database (singleton)
   ✓ logger (singleton)
   ✓ userRepository (scoped) → depends on: database, logger
   ✓ emailService (singleton)
   ✓ userService (scoped) → depends on: userRepository, emailService, logger

🔧 External parameters: 2 groups
   database: { connectionString: string }
   emailService: { apiKey: string, fromAddress: string }

📈 Bundle Analysis:
   Original size: ~15.2KB (all 9 services)
   Compiled size: ~1.8KB (5 services only)
   Reduction: 88.2% smaller

🏗️ Dependency Tree:
   1. database (no dependencies)
   2. logger (no dependencies)
   3. userRepository (depends on: database, logger)
   4. emailService (no dependencies)
   5. userService (depends on: userRepository, emailService, logger)
```

## init

Initialize a new Conduit project with proper configuration and example files.

### Usage

```bash
typewryter init [project-name] [options]
```

### Options

- `--template, -t` - Project template: `basic`, `web-app`, or `serverless` (default: `basic`)
- `--typescript` - Use TypeScript (default: true)
- `--package-manager` - Package manager: `npm`, `yarn`, or `pnpm` (default: `npm`)

### Examples

```bash
# Create basic project
typewryter init my-project

# Create web application template
typewryter init my-web-app --template web-app

# Use yarn as package manager
typewryter init my-project --package-manager yarn
```

### Generated Structure

```
my-project/
├── src/
│   ├── services/
│   │   ├── logger.ts
│   │   └── database.ts
│   ├── services.ts
│   └── index.ts
├── typewryter.config.js
├── package.json
└── tsconfig.json
```

## Configuration File

Create a `typewryter.config.js` file to configure the CLI:

```javascript
module.exports = {
  // Path to your service definitions file
  servicesFile: './src/services.ts',

  // Output directory for generated files
  outputDir: './src/generated',

  // Entry points to compile
  entryPoints: {
    userService: { mode: 'container' },
    emailService: { mode: 'factories' },
  },

  // Auto-discover imports (recommended)
  autoDiscoverImports: true,

  // Import mappings (if auto-discovery fails)
  imports: {
    Logger: './services/logger',
    Database: './services/database',
  },
};
```

## Integration with Build Tools

### npm scripts

```json
{
  "scripts": {
    "build": "typewryter compile userService && tsc",
    "analyze": "typewryter analyze --all",
    "prestart": "typewryter compile userService"
  }
}
```

### With Turborepo

```json
{
  "tasks": {
    "compile": {
      "dependsOn": ["^build"],
      "outputs": ["generated/**"]
    }
  }
}
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Generate optimized containers
  run: |
    npm install -g typewryter
    typewryter compile userService --mode container
    typewryter analyze userService --metrics
```
