# Compiler API

The Conduit compiler analyzes your service definitions and generates optimized containers through tree-shaking.

## compileContainer

The main compilation function that analyzes dependencies and generates optimized code.

```typescript
function compileContainer<T>(
  serviceDefinitions: ServiceDefinitions<T>,
  entryPoint: keyof T,
  options?: CompileOptions
): CompilationResult;
```

### Parameters

- `serviceDefinitions` - Your service definitions object
- `entryPoint` - The service to compile (starting point for tree-shaking)
- `options` - Optional compilation settings

### Returns

A `CompilationResult` object containing the generated code and metadata.

### Example

```typescript
import { compileContainer } from '@typewryter/cli';

const result = compileContainer(services, 'userService', {
  mode: 'container',
  autoDiscoverImports: true,
});

console.log(result.generatedCode);
console.log(`Included ${result.services.length} services`);
```

## CompileOptions

Configuration options for the compilation process.

```typescript
interface CompileOptions {
  mode?: 'container' | 'factories';
  autoDiscoverImports?: boolean;
  imports?: Record<string, string>;
  outputPath?: string;
}
```

### mode

Output format for the generated code.

- `'container'` (default) - Generates a complete container function
- `'factories'` - Generates individual factory functions

```typescript
// Container mode
const containerResult = compileContainer(services, 'userService', {
  mode: 'container',
});

// Factories mode
const factoriesResult = compileContainer(services, 'userService', {
  mode: 'factories',
});
```

### autoDiscoverImports

Automatically discovers and includes import statements.

```typescript
const result = compileContainer(services, 'userService', {
  autoDiscoverImports: true, // Recommended
});
```

When enabled, the compiler analyzes your service factories and automatically generates the necessary import statements.

### imports

Manual import mappings when auto-discovery is disabled or needs overrides.

```typescript
const result = compileContainer(services, 'userService', {
  autoDiscoverImports: false,
  imports: {
    Logger: './services/logger',
    Database: './services/database',
    UserService: './services/user',
  },
});
```

## CompilationResult

The result object returned by `compileContainer`.

```typescript
interface CompilationResult {
  entryPoint: string;
  services: ServiceInfo[];
  externalParams: ExternalParams;
  generatedCode: string;
  imports: ImportInfo[];
}
```

### entryPoint

The service that was compiled (the starting point).

```typescript
console.log(result.entryPoint); // 'userService'
```

### services

Array of services included in the compilation.

```typescript
interface ServiceInfo {
  key: string;
  name: string;
  scope: 'singleton' | 'scoped' | 'transient';
  dependencies: string[];
}

result.services.forEach(service => {
  console.log(
    `${service.key}: ${service.scope}, depends on [${service.dependencies.join(', ')}]`
  );
});
```

### externalParams

Extracted external parameters organized by service.

```typescript
interface ExternalParams {
  [serviceName: string]: {
    [paramName: string]: string; // TypeScript type
  };
}

console.log(result.externalParams);
// {
//   database: { connectionString: 'string' },
//   emailService: { apiKey: 'string', fromAddress: 'string' }
// }
```

### generatedCode

The complete TypeScript code for the optimized container.

```typescript
console.log(result.generatedCode);
```

Sample output:

```typescript
import { UserService } from './services/user';
import { Database } from './services/database';
import { Logger } from './services/logger';
import {
  createContainer,
  ServiceDefinitions,
  singleton,
  scoped,
} from '@typewryter/di';

export interface ExternalParams {
  database: {
    connectionString: string;
  };
}

export function createUserService(params: ExternalParams) {
  const serviceDefinitions: ServiceDefinitions<{
    database: any;
    logger: any;
    userService: any;
  }> = {
    database: singleton(() => new Database(params.database.connectionString)),
    logger: singleton(() => new Logger()),
    userService: scoped(
      container =>
        new UserService(container.get('database'), container.get('logger'))
    ),
  };

  const container = createContainer(serviceDefinitions);
  return container.get('userService');
}
```

## Tree-shaking Analysis

The compiler performs dependency analysis to include only required services.

### Before Compilation

```typescript
// All services defined
const services = {
  logger: singleton(() => new Logger()),
  database: singleton(() => new Database()),
  cache: singleton(() => new Cache()), // Unused
  userRepo: scoped(c => new UserRepo(c.get('database'))),
  orderRepo: scoped(c => new OrderRepo(c.get('database'))), // Unused
  emailService: singleton(() => new EmailService()), // Unused
  userService: scoped(c => new UserService(c.get('userRepo'), c.get('logger'))),
};
```

### After Compilation (entry point: 'userService')

```typescript
// Only required services included
const optimizedServices = {
  logger: singleton(() => new Logger()),
  database: singleton(() => new Database()),
  userRepo: scoped(c => new UserRepo(c.get('database'))),
  userService: scoped(c => new UserService(c.get('userRepo'), c.get('logger'))),
};
```

**Result**: 43% smaller bundle (4 services vs 7 services)

## External Parameter Extraction

The compiler analyzes factory functions and extracts literal values as parameters.

### Input Code

```typescript
const services = {
  database: singleton(
    () => new PostgresDatabase('postgresql://localhost/mydb')
  ),
  emailService: singleton(
    () => new SMTPService('api-key-123', 'noreply@example.com')
  ),
};
```

### Generated Interface

```typescript
export interface ExternalParams {
  database: {
    connectionString: string;
  };
  emailService: {
    apiKey: string;
    fromAddress: string;
  };
}
```

### Generated Code

```typescript
database: singleton(() => new PostgresDatabase(params.database.connectionString)),
emailService: singleton(() => new SMTPService(params.emailService.apiKey, params.emailService.fromAddress))
```

This allows you to configure services at runtime without hardcoded values.

## Advanced Usage

### Batch Compilation

```typescript
const entryPoints = ['userService', 'orderService', 'emailService'];

const results = entryPoints.map(entryPoint =>
  compileContainer(services, entryPoint, { mode: 'container' })
);

results.forEach((result, index) => {
  console.log(`${entryPoints[index]}: ${result.services.length} services`);
});
```

### Custom Import Resolution

```typescript
const result = compileContainer(services, 'userService', {
  autoDiscoverImports: true,
  imports: {
    // Override specific imports
    Logger: '@company/logging',
    Database: '@company/database',
  },
});
```

### Compilation Metrics

```typescript
const result = compileContainer(services, 'userService');

console.log(`Entry point: ${result.entryPoint}`);
console.log(`Services included: ${result.services.length}`);
console.log(
  `External parameters: ${Object.keys(result.externalParams).length}`
);
console.log(`Generated code size: ${result.generatedCode.length} characters`);

// Calculate reduction percentage
const totalServices = Object.keys(originalServices).length;
const includedServices = result.services.length;
const reduction = Math.round((1 - includedServices / totalServices) * 100);
console.log(`Bundle size reduction: ${reduction}%`);
```
