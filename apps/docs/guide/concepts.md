# Core Concepts

Typewryter is built around several key concepts that make it powerful yet simple to use.

## Dependencies Type Definition

The dependencies type is the heart of Typewryter. It describes all the dependencies your application needs:

```typescript
// app-dependencies.ts
export type AppDependencies = {
  // Interfaces - must be provided externally
  logger: ILogger;

  // Classes - factories will be generated automatically
  database: Database;
  userService: UserService;
  emailService: EmailService;

  // Functions - must be provided externally
  errorLogger: (error: Error) => void;
  requestIdGenerator: () => string;
};
```

The CLI analyzes this type and generates a container with factories for all class dependencies.

## Generated Service Definitions

The compiler generates service definitions from your dependencies type:

```typescript
// Generated automatically by CLI
const serviceDefinitions: ServiceDefinitions<Required<FactoryDeps>> = {
  database: ({ logger }) => {
    return new Database(logger, config.database.url, config.database.port);
  },
  userService: ({ logger, database, emailService }) => {
    return new UserService(logger, database, emailService);
  },
  emailService: ({ logger }) => {
    return new EmailService(logger, config.emailService.apiKey);
  },
  ...factories // User-provided external providers
};
```

## Configuration Interface

For class dependencies with primitive/enum/object constructor parameters, the compiler generates a configuration interface:

```typescript
// Class with config parameters
class Database {
  constructor(logger: ILogger, url: string, port: number) {}
}

// Generated configuration interface
export interface DepsConfig {
  database: {
    url: string;
    port: number;
  };
}

// Usage
const config: DepsConfig = {
  database: {
    url: 'postgresql://localhost/mydb',
    port: 5432
  }
};
```

## External Providers

Interfaces and function types cannot be instantiated automatically, so you provide them via the `factories` parameter:

```typescript
// Your dependencies type
export type AppDependencies = {
  logger: ILogger;  // Interface - must be provided
  errorLogger: (error: Error) => void;  // Function - must be provided
  database: Database;  // Class - auto-generated
};

// Usage
const container = createAppDependenciesContainer(
  config,
  {
    logger: () => new ConsoleLogger(),
    errorLogger: (error) => console.error(error),
  }
);
```

## Containers

Containers hold your services and provide dependency injection:

```typescript
import { createContainer } from '@typewryter/di';

// Create container with generated service definitions
const container = createContainer(serviceDefinitions);

// Get services with full type safety
const logger = container.get('logger');      // Typed as ILogger
const database = container.get('database');  // Typed as Database
```

## Type Safety

Typewryter provides complete compile-time type safety:

```typescript
// Dependencies type defines all providers
export type AppDependencies = {
  logger: ILogger;      // ✅ Must implement ILogger interface
  database: Database;   // ✅ Must be Database class
};

// Generated FactoryDeps ensures correct types
type FactoryDeps = {
  database?: Database;  // ✅ Optional (can be overridden)
  logger: ILogger;      // ✅ Required external provider
};

// Container creation is type-safe
const container = createAppDependenciesContainer(
  config,
  {
    logger: () => new ConsoleLogger(),  // ✅ Returns ILogger
    // database is auto-generated, can be overridden here
  }
);

// Container.get() is fully typed
const logger = container.get('logger');   // ✅ Typed as ILogger
const database = container.get('database'); // ✅ Typed as Database
```

## Provider Inference

The compiler automatically infers how to provide each dependency:

| Type | How Provided | Example |
|------|--------------|---------|
| Class | Auto-generated factory | `database: Database` → `new Database(...)` |
| Interface | External provider required | `logger: ILogger` → Must supply in `factories` |
| Function | External provider required | `errorLogger: (error: Error) => void` → Must supply in `factories` |
| Primitive | Configuration value | Constructor param `url: string` → `config.database.url` |
| Enum | Configuration value | Constructor param `region: Region` → `config.service.region` |
| Object | Configuration value | Constructor param `options: {...}` → `config.service.options` |

## Dependency Resolution

Constructor parameters are matched to providers by type:

```typescript
// Class definition
class UserService {
  constructor(
    private logger: ILogger,
    private db: Database,        // Parameter name is "db"
    private mailer: EmailService // Parameter name is "mailer"
  ) {}
}

// Dependencies type
export type AppDependencies = {
  logger: ILogger;
  database: Database;    // Provider name is "database" (different from "db")
  emailService: EmailService; // Provider name is "emailService" (different from "mailer")
  userService: UserService;
};

// Generated factory correctly maps by type, not name
userService: ({ logger, database, emailService }) => {
  return new UserService(logger, database, emailService);
}
```

This allows you to use any parameter names in your classes while maintaining flexibility in how you name your providers.
