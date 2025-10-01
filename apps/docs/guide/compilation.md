# Type-Driven Container Generation

Typewryter's CLI analyzes your TypeScript dependency type definitions and automatically generates dependency injection containers with complete type safety.

## How It Works

The compilation process has three phases:

### 1. Load Phase

The compiler uses [ts-morph](https://ts-morph.com/) to load your TypeScript project and extract the dependencies type:

```typescript
// app-dependencies.ts
export type AppDependencies = {
  logger: ILogger;           // Interface - external provider
  database: Database;        // Class - factory will be generated
  userService: UserService;  // Class - factory will be generated
};
```

### 2. Analysis Phase

The compiler analyzes each dependency using **Provider Inference Rules**:

#### Class Types → Generated Factory Providers
```typescript
database: Database;
// Generated factory:
// database: () => new Database(logger, config.database.url, ...)
```

#### Interface Types → Required External Providers
```typescript
logger: ILogger;
// Must be provided by user in the factories parameter
```

#### Function Types → Required External Providers
```typescript
errorLogger: (error: Error) => void;
// Must be provided by user in the factories parameter
```

#### Primitive/Enum/Object Types → Configuration Values
```typescript
// From class constructor:
class Database {
  constructor(logger: ILogger, url: string, port: number) {}
}
// Generates:
interface DepsConfig {
  database: {
    url: string;
    port: number;
  };
}
```

### 3. Generation Phase

The compiler generates TypeScript code using ts-morph's code generation API:

```typescript
// Generated container.ts
export interface DepsConfig {
  database: {
    url: string;
    port: number;
  };
}

type FactoryDeps = {
  database?: Database;
  logger: ILogger;  // Required external provider
};

export function createAppDependenciesContainer(
  config: DepsConfig,
  factories: ServiceDefinitions<FactoryDeps>
) {
  const serviceDefinitions: ServiceDefinitions<Required<FactoryDeps>> = {
    database: ({ logger }) => {
      return new Database(logger, config.database.url, config.database.port);
    },
    ...factories
  };
  return createContainer(serviceDefinitions);
}
```

## Provider Inference Rules

The compiler follows explicit rules documented in `packages/cli/src/compiler/inference/provider-rules.ts`:

### Rule 1: Classes → Factory Providers
- Classes become factory functions in the container
- Constructor parameters are analyzed to determine dependencies
- Config values (primitives, enums, objects) are accessed via config object
- Other dependencies are injected from the container

### Rule 2: Interfaces → External Providers
- Interfaces must be provided by the user
- They cannot be instantiated, so no factory is generated
- User must supply these in the `factories` parameter

### Rule 3: Function Types → External Providers
- Function types (named or inline) must be provided by the user
- No factory can be generated for a function type
- User must supply these in the `factories` parameter

### Rule 4: Primitives → Config Values
- Primitives become required fields in the DepsConfig interface
- They are accessed via config object when needed by classes

### Rule 5: Enums → Config Values
- Enums are treated like primitives
- They become required fields in the DepsConfig interface

### Rule 6: Objects → Config Values
- Plain object types become config fields
- They are nested in the config structure

### Rule 7: Type Aliases → Follow Underlying Type
- Named type aliases follow the rules of their underlying type
- The alias name is preserved for imports and type references

## Transitive Dependency Discovery

The compiler automatically discovers transitive class dependencies:

```typescript
// app-dependencies.ts
export type AppDependencies = {
  eventEmitterService: EventEmitterService;  // Needs S3 in constructor
};

// event-emitter-service.ts
class EventEmitterService {
  constructor(logger: ILogger, s3Client: S3) {}
}

// Generated: S3 is auto-discovered
type FactoryDeps = {
  eventEmitterService?: EventEmitterService;
  s3?: S3;  // Auto-discovered transitive dependency
  // ... other providers
};
```

## Type-Based Dependency Matching

Constructor parameters are matched to providers by **type**, not by name:

```typescript
// user-service.ts
class UserService {
  constructor(
    logger: ILogger,
    emailService: EmailService,  // Parameter name
    authService: AuthService
  ) {}
}

// app-dependencies.ts
export type AppDependencies = {
  email: EmailService;  // Provider name (different from parameter name)
  auth: AuthService;
};

// Generated: Correctly maps by type
userService: ({ logger, email, auth }) => {
  return new UserService(logger, email, auth);
}
```

## CLI Usage

```bash
# Generate container from dependencies type
npx typewryter generate

# With custom configuration
npx typewryter generate --config typewryter.config.json

# Verbose output
npx typewryter generate --verbose
```

## Configuration

Create a `typewryter.config.json`:

```json
{
  "entryPoint": "./src/app-dependencies.ts",
  "typeName": "AppDependencies",
  "outputFile": "./src/generated/container.ts"
}
```

## Benefits

### Complete Type Safety
- All providers are fully typed
- TypeScript catches missing dependencies at compile time
- No runtime reflection needed

### Explicit Dependencies
- All dependencies are visible in one type definition
- Clear dependency graph
- No hidden magic

### Tree-Shakeable
- Only used services are included in the bundle
- Generated code is optimized for your specific needs
- Smaller bundle sizes

### Zero Runtime Overhead
- All analysis happens at compile time
- Generated code is plain TypeScript
- No decorators or metadata required
