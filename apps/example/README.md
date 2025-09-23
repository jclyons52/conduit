# Conduit Workspace Example

This is a complete example showing how to use Conduit's dependency injection compiler in a real-world project with multiple services, automatic import discovery, and CLI tooling.

## 📁 Project Structure

```
workspace/
├── src/
│   ├── services.ts              # Main service definitions
│   └── services/                # Individual service files
│       ├── logger.ts            # Logging services
│       ├── database.ts          # Database services  
│       ├── email.ts             # Email services
│       ├── user-repository.ts   # Data access layer
│       ├── user-service.ts      # Business logic
│       └── notification-service.ts # High-level services
├── conduit.config.ts            # Compilation configuration
├── generated/                   # Generated containers (output)
└── package.json                # NPM scripts
```

## 🔧 Configuration

The `conduit.config.ts` file configures the compilation process:

```typescript
import { ConduitConfig } from 'conduit';

const config: ConduitConfig = {
  servicesFile: './src/services.ts',
  outputDir: './generated',
  autoDiscoverImports: true,      // 🔍 Automatically find class imports
  mode: 'container',
  
  entryPoints: [
    {
      entryPoint: 'userService',
      outputFile: 'user-service-container.ts',
      mode: 'container',
    },
    {
      entryPoint: 'userService', 
      outputFile: 'user-service-factories.ts',
      mode: 'factories',
    },
    // ... more entry points
  ],
};
```

## 🚀 Usage

### CLI Commands

```bash
# List all available services
conduit list

# Analyze dependencies for a service
conduit analyze userService

# Preview what would be generated (dry run)
conduit compile --dry-run

# Generate tree-shaken containers
conduit compile
```

### NPM Scripts

```bash
npm run build        # Compile all entry points
npm run build:dry    # Dry run compilation
npm run list         # List services
npm run analyze:user # Analyze userService
```

## 📊 Tree-Shaking Results

The compiler analyzes your dependency graph and only includes required services:

- **userService**: 5/9 services (44% reduction)
- **notificationService**: 6/9 services (33% reduction)  
- **emailService**: 1/9 services (89% reduction!)

## 🔍 Auto-Discovery

The compiler automatically discovers imports from your service files:

```typescript
// From src/services/logger.ts
export class ConsoleLogger { ... }
export class FileLogger { ... }

// From src/services/database.ts  
export class PostgresDatabase { ... }
export class RedisCache { ... }

// Automatically mapped to:
// ConsoleLogger -> ./services/logger
// FileLogger -> ./services/logger
// PostgresDatabase -> ./services/database
// RedisCache -> ./services/database
```

## 📦 Generated Output

### Container Mode
Generates a complete tree-shaken container:

```typescript
export function createUserService(params: ExternalParams) {
  const serviceDefinitions: ServiceDefinitions<{...}> = {
    database: scoped(() => new PostgresDatabase(params.database_url)),
    logger: scoped(() => new ConsoleLogger("[APP]")),
    userRepository: scoped(container => 
      new DatabaseUserRepository(
        container.get('database'),
        container.get('logger')
      )
    ),
    // ... only required services
  };

  const container = createContainer(serviceDefinitions);
  return container.get('userService');
}
```

### Factory Mode
Generates individual factory functions:

```typescript
export const databaseFactory = (params: ExternalParams) => 
  () => new PostgresDatabase(params.database_url);

export const loggerFactory = () => new ConsoleLogger("[APP]");

export const userRepositoryFactory = container =>
  new DatabaseUserRepository(
    container.get('database'),
    container.get('logger')
  );
```

## 🎯 Serverless Benefits

1. **Minimal Bundles**: Only required services included
2. **Fast Cold Starts**: Smaller bundles = faster initialization  
3. **Environment Config**: External parameters for different deployments
4. **Type Safety**: Full compile-time validation
5. **Zero Runtime**: Pure generated code, no reflection

## 🧪 Testing

```bash
# Test the compilation system
npx tsx test-workspace.ts

# Run the demo
./demo.sh
```

## 🏗️ Real-World Usage

This example demonstrates a complete microservices architecture:

- **Infrastructure Layer**: Database, Cache, Logging
- **Data Access Layer**: Repositories  
- **Business Logic Layer**: Services
- **Integration Layer**: Email, Notifications

Each layer can be compiled separately for different serverless functions, resulting in optimal bundle sizes and performance.