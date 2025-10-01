# Compiler API

The Typewryter compiler analyzes your TypeScript dependency type definitions and generates dependency injection containers.

## Architecture

The compiler uses a three-phase architecture powered by [ts-morph](https://ts-morph.com/):

### Phase 1: Load
Uses ts-morph to load and parse the TypeScript project and extract the dependencies type.

### Phase 2: Analyze
Applies [Provider Inference Rules](../guide/compilation.md#provider-inference-rules) to determine:
- Which dependencies need generated factories (classes)
- Which dependencies require external providers (interfaces, functions)
- What configuration values are needed (primitives, enums, objects from constructor parameters)
- What imports are required

### Phase 3: Generate
Uses ts-morph's code generation API to produce optimized TypeScript code with:
- `DepsConfig` interface for configuration values
- `FactoryDeps` type for all providers
- Container creation function with auto-generated factories
- Proper imports with support for node_modules packages

## compile()

The main compilation function.

```typescript
function compile(
  tsConfigPath: string,
  config: EntryPointConfig,
  verbose?: boolean
): string
```

### Parameters

**tsConfigPath**: `string`
- Path to your `tsconfig.json`
- Used to load the TypeScript project with correct compiler options

**config**: `EntryPointConfig`
```typescript
interface EntryPointConfig {
  entryPoint: string;   // Path to file containing the dependencies type
  typeName: string;     // Name of the dependencies type
  outputFile: string;   // Where to write the generated container
}
```

**verbose**: `boolean` (optional)
- Enable detailed logging of the analysis process
- Shows factory providers, external providers, config values, and imports

### Returns

`string` - The generated TypeScript code

### Example

```typescript
import { compile } from '@typewryter/cli';

const generatedCode = compile(
  './tsconfig.json',
  {
    entryPoint: './src/app-dependencies.ts',
    typeName: 'AppDependencies',
    outputFile: './src/generated/container.ts'
  },
  true // verbose
);

console.log(generatedCode);
```

### Verbose Output

When `verbose` is `true`, the compiler logs detailed analysis:

```
Provider Analysis:
  Factory Providers: 10
    - app: App
      * logger: provider
      * userService: provider
      * database: provider
    - database: Database
      * logger: provider
      * url: config
      * port: config
    - userService: UserService
      * logger: provider
      * userRepository: provider
      * email: provider
      * auth: provider
  External Providers: 3
    - logger: ILogger (required)
    - messageHandler: MessageHandler (required)
    - errorLogger: (error: Error) => void (required)
  Config Values: 8
  Imports: 15
```

## Provider Inference Rules

The compiler classifies each dependency using these rules:

### Classes → Factory Providers
```typescript
database: Database;
// Generated:
database: ({ logger }) => new Database(logger, config.database.url)
```

### Interfaces → External Providers
```typescript
logger: ILogger;
// Must be provided in factories parameter:
// factories: { logger: () => new ConsoleLogger() }
```

### Functions → External Providers
```typescript
errorLogger: (error: Error) => void;
// Must be provided in factories parameter:
// factories: { errorLogger: (error) => console.error(error) }
```

### Primitives/Enums/Objects → Config Values
```typescript
// From constructor:
class Database {
  constructor(logger: ILogger, url: string, port: number) {}
}
// Generated config:
interface DepsConfig {
  database: {
    url: string;
    port: number;
  };
}
```

## Transitive Dependency Discovery

The compiler automatically discovers class dependencies needed by your explicitly declared dependencies:

```typescript
// Your dependencies type
export type AppDependencies = {
  eventEmitterService: EventEmitterService;
};

// EventEmitterService needs S3, which isn't in AppDependencies
class EventEmitterService {
  constructor(logger: ILogger, s3Client: S3) {}
}

// Compiler auto-discovers S3 and generates a factory for it
type FactoryDeps = {
  eventEmitterService?: EventEmitterService;
  s3?: S3;  // Auto-discovered!
};
```

This works recursively - if S3 needs other classes, those will be discovered too.

## Type-Based Dependency Matching

Constructor parameters are matched to providers by **type**, not by parameter name:

```typescript
// Class uses parameter name "emailService"
class UserService {
  constructor(
    logger: ILogger,
    emailService: EmailService,
    authService: AuthService
  ) {}
}

// Dependencies type uses provider names "email" and "auth"
export type AppDependencies = {
  logger: ILogger;
  email: EmailService;    // Different name!
  auth: AuthService;      // Different name!
  userService: UserService;
};

// Generated factory correctly maps by type:
userService: ({ logger, email, auth }) => {
  return new UserService(logger, email, auth);
}
```

## Import Handling

The compiler intelligently handles imports:

### Project Files
```typescript
import { UserService } from "../services/user-service";
```

### Node Modules
```typescript
import { S3 } from "@aws-sdk/client-s3";
```

### Built-in Types
Built-in types like `Error`, `Date`, `Promise` are not imported.

### Function Return Types
```typescript
// Dependencies type
s3ClientFactory: () => S3;

// Generated (using imported S3 type)
s3ClientFactory: () => S3;
```

## Configuration Structure

Config values are organized by the provider that needs them:

```typescript
// Multiple classes with config parameters
class Database {
  constructor(logger: ILogger, url: string, port: number) {}
}

class EmailService {
  constructor(logger: ILogger, apiKey: string, from: string) {}
}

// Generated hierarchical config
export interface DepsConfig {
  database: {
    url: string;
    port: number;
  };
  emailService: {
    apiKey: string;
    from: string;
  };
}

// Usage
const config: DepsConfig = {
  database: {
    url: process.env.DATABASE_URL!,
    port: 5432
  },
  emailService: {
    apiKey: process.env.EMAIL_API_KEY!,
    from: 'noreply@example.com'
  }
};
```

## Advanced Usage

### Conditional Compilation

```typescript
const isDev = process.env.NODE_ENV === 'development';

const code = compile(
  './tsconfig.json',
  {
    entryPoint: isDev
      ? './src/dev-dependencies.ts'
      : './src/prod-dependencies.ts',
    typeName: 'AppDependencies',
    outputFile: './src/generated/container.ts'
  }
);
```

### Programmatic Code Generation

```typescript
import { compile } from '@typewryter/cli';
import * as fs from 'fs';

function generateContainer(entryPoint: string, outputFile: string) {
  const code = compile(
    './tsconfig.json',
    { entryPoint, typeName: 'AppDependencies', outputFile }
  );

  fs.writeFileSync(outputFile, code, 'utf-8');
  console.log(`✅ Generated container at ${outputFile}`);
}

generateContainer(
  './src/app-dependencies.ts',
  './src/generated/container.ts'
);
```

### Multiple Containers

```typescript
// Generate different containers for different environments
const environments = [
  { name: 'development', entry: './src/dev-dependencies.ts' },
  { name: 'production', entry: './src/prod-dependencies.ts' },
  { name: 'test', entry: './src/test-dependencies.ts' },
];

for (const env of environments) {
  const code = compile(
    './tsconfig.json',
    {
      entryPoint: env.entry,
      typeName: 'AppDependencies',
      outputFile: `./src/generated/${env.name}-container.ts`
    }
  );

  fs.writeFileSync(
    `./src/generated/${env.name}-container.ts`,
    code,
    'utf-8'
  );
}
```

## See Also

- [CLI Guide](../guide/cli.md) - Using the CLI tool
- [Compilation Guide](../guide/compilation.md) - Detailed compilation process
- [Provider Inference Rules](../guide/compilation.md#provider-inference-rules) - How dependencies are classified
