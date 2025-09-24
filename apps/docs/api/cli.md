# CLI API Reference

Complete reference for all Conduit CLI commands and their options.

## Global Options

Options available for all commands:

- `--help, -h` - Show help information
- `--version, -v` - Show version number
- `--config, -c <path>` - Path to configuration file (default: `conduit.config.js`)
- `--verbose` - Enable verbose output
- `--quiet, -q` - Suppress non-essential output

## compile

Generate tree-shaken containers for specific services.

### Syntax

```bash
conduit compile <service> [options]
conduit compile <service1> <service2> ... [options]
```

### Arguments

- `<service>` - Name of the service(s) to compile

### Options

- `--mode, -m <mode>` - Output mode: `container` | `factories` (default: `container`)
- `--output, -o <dir>` - Output directory (overrides config)
- `--dry-run` - Show what would be generated without writing files
- `--watch, -w` - Watch for changes and recompile automatically
- `--format, -f <format>` - Code formatting: `prettier` | `none` (default: `prettier`)

### Examples

```bash
# Compile single service
conduit compile userService

# Compile multiple services
conduit compile userService orderService emailService

# Use factories mode
conduit compile userService --mode factories

# Watch for changes
conduit compile userService --watch

# Custom output directory
conduit compile userService --output ./dist/generated

# Dry run to preview
conduit compile userService --dry-run
```

### Exit Codes

- `0` - Success
- `1` - Compilation failed
- `2` - Configuration error
- `3` - Service not found

## list

Display all services defined in your service definitions.

### Syntax

```bash
conduit list [options]
```

### Options

- `--format, -f <format>` - Output format: `table` | `json` | `tree` (default: `table`)
- `--dependencies, -d` - Include dependency information
- `--scope, -s <scope>` - Filter by scope: `singleton` | `scoped` | `transient`
- `--sort <field>` - Sort by: `name` | `scope` | `dependencies` (default: `name`)

### Examples

```bash
# List all services in table format
conduit list

# Show as dependency tree
conduit list --format tree

# Include dependencies
conduit list --dependencies

# Filter by scope
conduit list --scope singleton

# Output as JSON
conduit list --format json

# Sort by dependency count
conduit list --sort dependencies
```

### Sample Output

#### Table Format

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

#### Tree Format

```
Services Dependency Tree:
├── logger (singleton)
├── database (singleton)
├── emailService (singleton)
├── userRepository (scoped)
│   ├── database
│   └── logger
└── userService (scoped)
    ├── userRepository
    │   ├── database
    │   └── logger
    ├── emailService
    └── logger
```

## analyze

Analyze dependency trees, compilation metrics, and service usage.

### Syntax

```bash
conduit analyze [service] [options]
```

### Arguments

- `[service]` - Service to analyze (omit to analyze all services)

### Options

- `--metrics, -m` - Show compilation metrics and bundle size analysis
- `--tree, -t` - Show dependency tree visualization
- `--external, -e` - Show external parameter analysis
- `--depth, -d <number>` - Maximum depth for tree visualization (default: unlimited)
- `--format, -f <format>` - Output format: `text` | `json` (default: `text`)
- `--output, -o <file>` - Write analysis to file

### Examples

```bash
# Analyze specific service
conduit analyze userService

# Show dependency tree
conduit analyze userService --tree

# Show compilation metrics
conduit analyze userService --metrics

# Analyze all services
conduit analyze --all

# Show external parameters
conduit analyze userService --external

# Limit tree depth
conduit analyze userService --tree --depth 2

# Output as JSON
conduit analyze userService --format json

# Save analysis to file
conduit analyze userService --output analysis.json
```

### Sample Output

```
🎯 Analyzing userService:

📊 Service Analysis:
   ✓ userService (scoped) - Entry point
   ✓ userRepository (scoped) → depends on: database, logger
   ✓ database (singleton) → no dependencies
   ✓ logger (singleton) → no dependencies
   ✓ emailService (singleton) → no dependencies

🔧 External Parameters:
   database:
     └── connectionString: string
   emailService:
     └── apiKey: string
     └── fromAddress: string

📈 Compilation Metrics:
   Total services defined: 9
   Services included: 5 (55.6%)
   Bundle size reduction: ~44.4%
   External parameters: 2 groups, 3 total

🏗️ Dependency Tree:
   userService
   ├── userRepository
   │   ├── database
   │   └── logger
   ├── emailService
   └── logger
```

## init

Initialize a new Conduit project with proper configuration and structure.

### Syntax

```bash
conduit init [project-name] [options]
```

### Arguments

- `[project-name]` - Name of the project directory (default: current directory)

### Options

- `--template, -t <template>` - Project template: `basic` | `web-app` | `serverless` (default: `basic`)
- `--typescript, --ts` - Use TypeScript (default: `true`)
- `--javascript, --js` - Use JavaScript instead of TypeScript
- `--package-manager, -p <pm>` - Package manager: `npm` | `yarn` | `pnpm` (default: `npm`)
- `--install, -i` - Install dependencies after initialization (default: `true`)
- `--git` - Initialize git repository (default: `true`)

### Examples

```bash
# Create basic project
conduit init my-project

# Use web application template
conduit init my-web-app --template web-app

# Use yarn package manager
conduit init my-project --package-manager yarn

# Skip dependency installation
conduit init my-project --no-install

# Create in current directory
conduit init .

# Use JavaScript instead of TypeScript
conduit init my-project --javascript
```

### Templates

#### basic

Simple project with basic service definitions:

- Logger service
- Configuration service
- Example business service

#### web-app

Web application setup with:

- Express.js integration
- Request scoping middleware
- Database services
- Authentication services

#### serverless

Serverless/Lambda optimized:

- Minimal dependencies
- Cold start optimization
- Environment-based configuration
- Tree-shaking friendly structure

### Generated Structure

```
my-project/
├── src/
│   ├── services/
│   │   ├── logger.ts
│   │   ├── database.ts
│   │   └── user-service.ts
│   ├── services.ts
│   └── index.ts
├── tests/
│   └── services.test.ts
├── conduit.config.js
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Configuration Commands

### config

Manage Conduit configuration files.

#### Syntax

```bash
conduit config <command> [options]
```

#### Commands

- `conduit config init` - Create default configuration file
- `conduit config validate` - Validate current configuration
- `conduit config show` - Display current configuration

#### Examples

```bash
# Create default config
conduit config init

# Validate configuration
conduit config validate

# Show current config
conduit config show
```

## Environment Variables

Conduit CLI respects these environment variables:

- `CONDUIT_CONFIG` - Path to configuration file
- `CONDUIT_OUTPUT` - Default output directory
- `CONDUIT_LOG_LEVEL` - Log level: `error` | `warn` | `info` | `debug`
- `NODE_ENV` - Affects default configuration values

### Examples

```bash
# Use custom config file
CONDUIT_CONFIG=./configs/prod.js conduit compile userService

# Set output directory
CONDUIT_OUTPUT=./dist conduit compile userService

# Enable debug logging
CONDUIT_LOG_LEVEL=debug conduit analyze userService
```

## Exit Codes

Standard exit codes returned by CLI commands:

| Code | Meaning                                                               |
| ---- | --------------------------------------------------------------------- |
| 0    | Success                                                               |
| 1    | General error (compilation failed, service not found, etc.)           |
| 2    | Configuration error (invalid config file, missing required options)   |
| 3    | File system error (permission denied, file not found)                 |
| 4    | Validation error (invalid service definitions, circular dependencies) |
| 130  | Process interrupted (Ctrl+C)                                          |

## Debugging

### Verbose Output

```bash
conduit compile userService --verbose
```

### Debug Mode

```bash
CONDUIT_LOG_LEVEL=debug conduit compile userService
```

### Configuration Troubleshooting

```bash
# Validate configuration
conduit config validate

# Show resolved configuration
conduit config show

# Test with explicit config
conduit compile userService --config ./debug.config.js
```
