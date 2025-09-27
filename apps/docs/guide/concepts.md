# Core Concepts

Conduit is built around several key concepts that make it powerful yet simple to use.

## Service Definitions

Service definitions are the heart of Conduit. They describe how to create your services using factory functions:

```typescript
import { ServiceDefinitions, singleton, scoped, transient } from 'conduit-di';

const services: ServiceDefinitions<{
  config: Config;
  logger: Logger;
  database: Database;
}> = {
  config: singleton(() => new AppConfig()),
  logger: singleton(() => new ConsoleLogger('[APP]')),
  database: scoped(
    container => new PostgresDatabase(container.get('config').databaseUrl)
  ),
};
```

## Lifecycle Scopes

Conduit supports three service lifetimes:

### Singleton

Created once per container and reused for all requests:

```typescript
logger: singleton(() => new ConsoleLogger('[APP]'));
```

### Scoped

Created once per scope (usually per request/operation):

```typescript
database: scoped(container => new PostgresDatabase(connectionString));
```

### Transient

Created fresh every time it's requested:

```typescript
requestId: transient(() => crypto.randomUUID());
```

## Factory Functions

Factory functions are pure TypeScript functions that create your services. They can:

- **Take no dependencies**: `() => new Service()`
- **Depend on other services**: `container => new Service(container.get('dependency'))`
- **Use external parameters**: Parameters are extracted during compilation

```typescript
// Simple factory
logger: singleton(() => new ConsoleLogger('[APP]'));

// With dependencies
userService: scoped(
  container =>
    new UserService(container.get('database'), container.get('logger'))
);

// With external parameters (extracted during compilation)
database: singleton(() => new PostgresDatabase('postgresql://localhost/mydb'));
```

## Containers

Containers hold your services and manage their lifecycles:

```typescript
import { createContainer } from 'conduit-di';

const container = createContainer(services);

// Get services
const logger = container.get('logger');
const database = container.get('database');

// Create scoped containers
const scopedContainer = container.createScope();
```

## Tree-shaking Compilation

The compile-time analysis identifies:

1. **Entry points** - Services you want to compile
2. **Dependency trees** - All services needed by entry points
3. **External parameters** - Values extracted from factories
4. **Unused services** - Services to exclude from the bundle

```bash
# Before compilation: All services (15KB)
logger, database, userService, emailService, notificationService...

# After compilation: Only what you need (1.6KB)
npx conduit compile userService
# Result: userService + database + logger only
```

## Type Safety

Conduit provides complete compile-time type safety:

```typescript
// ServiceDefinitions ensures all services are properly typed
const services: ServiceDefinitions<{
  logger: Logger; // ✅ Must implement Logger interface
  database: Database; // ✅ Must implement Database interface
}> = {
  logger: singleton(() => new ConsoleLogger('[APP]')), // ✅ Returns Logger
  database: scoped(container => new PostgresDatabase()), // ✅ Returns Database
};

// Container.get() is fully typed
const logger: Logger = container.get('logger'); // ✅ Typed as Logger
const unknown = container.get('unknownService'); // ❌ TypeScript error
```

## External Parameters

Parameters used in factories are automatically extracted and structured:

```typescript
// Your service definition
database: singleton(() => new PostgresDatabase('postgresql://localhost/mydb')),
emailService: singleton(() => new SMTPService('api-key', 'no-reply@example.com'))

// Generated interface
export interface ExternalParams {
  database: {
    connectionString: string;
  };
  emailService: {
    apiKey: string;
    fromAddress: string;
  };
}

// Usage in generated code
export function createUserService(params: ExternalParams) {
  const services = {
    database: singleton(() => new PostgresDatabase(params.database.connectionString)),
    emailService: singleton(() => new SMTPService(params.emailService.apiKey, params.emailService.fromAddress))
  }
  // ...
}
```

This hierarchical structure makes it easy to configure your services in production while maintaining type safety.
