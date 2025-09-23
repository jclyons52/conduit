# Conduit

A modern TypeScript dependency injection framework with factory-based providers, compile-time type safety, and revolutionary serverless optimization through tree-shaking compilation.

## Features

- **Factory-based providers**: No decorators or metadata needed
- **Compile-time type safety**: Strong typing with TypeScript
- **Tree-shaking compilation**: Generate optimized containers for serverless deployment
- **Destructuring support**: Access dependencies as object properties
- **Multiple scopes**: Singleton, transient, and scoped lifetimes
- **CLI tooling**: Powerful command-line tools for analysis and compilation
- **Zero runtime dependencies**: Pure TypeScript implementation
- **Monorepo workspace**: Organized as a proper workspace with example project

## Project Structure

This is a monorepo workspace with the following packages:

- **`packages/conduit/`** - Core dependency injection framework
- **`packages/example/`** - Complete example workspace demonstrating usage

## Installation

```bash
# Install the workspace
npm install

# Build the conduit package
cd packages/conduit && npm run build

# Try the example
cd packages/example && npm run build
```

## CLI Usage

Conduit includes powerful CLI tools for analyzing and compiling your dependency injection containers:

```bash
# Compile optimized containers
npx conduit compile

# List all available services
npx conduit list

# Analyze service dependencies
npx conduit analyze userService

# Initialize a new project
npx conduit init
```

## Quick Start

```typescript
import {
  createContainer,
  singleton,
  scoped,
  transient,
  ServiceDefinitions,
} from 'conduit';

// Define your services
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<any>;
}

interface UserService {
  getUser(id: string): Promise<any>;
}

// Implementations
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG]: ${message}`);
  }
}

class PostgresDatabase implements Database {
  async query(sql: string): Promise<any> {
    // Database implementation
    return { results: [] };
  }
}

class UserServiceImpl implements UserService {
  constructor(
    private database: Database,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<any> {
    this.logger.log(`Fetching user ${id}`);
    return this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
}

// Define service dependencies with strong typing
const serviceDefinitions: ServiceDefinitions<{
  logger: Logger;
  database: Database;
  userService: UserService;
}> = {
  logger: singleton(() => new ConsoleLogger()),
  database: singleton(() => new PostgresDatabase()),
  userService: scoped(
    container =>
      new UserServiceImpl(container.get('database'), container.get('logger'))
  ),
};

// Create container
const container = createContainer(serviceDefinitions);

// Use services with full type safety
const userService = container.get('userService'); // Type: UserService
await userService.getUser('123');

// NEW: Destructuring support!
const { logger, database } = container;
logger.log('Direct access via destructuring!');
await database.query('SELECT * FROM products');

// Functions can destructure what they need
function processData({
  userService,
  logger,
}: {
  userService: UserService;
  logger: Logger;
}) {
  logger.log('Processing data...');
  return userService.getUser('123');
}

// Pass container directly - it works with destructuring!
await processData(container);
```

## Serverless Optimization & Compilation

Conduit includes a revolutionary compilation system that generates tree-shaken, optimized containers perfect for serverless deployments. This can reduce bundle sizes by up to 89%!

### Configuration

Create a `conduit.config.js` file:

```javascript
const config = {
  servicesFile: './src/services.ts',
  outputDir: './generated',
  autoDiscoverImports: true,
  mode: 'container',

  entryPoints: [
    {
      entryPoint: 'userService',
      outputFile: 'user-service-container.ts',
      mode: 'container',
    },
    {
      entryPoint: 'emailService',
      outputFile: 'email-factories.ts',
      mode: 'factories',
    },
  ],

  imports: {
    UserService: './services/user-service',
    EmailService: './services/email-service',
    // ... auto-discovered if autoDiscoverImports: true
  },
};

module.exports = config;
```

### Generated Output

The compiler generates optimized containers:

```typescript
// Generated: user-service-container.ts
import { UserService } from './services/user-service';
import { Logger } from './services/logger';
// ... only required imports

export interface ExternalParams {
  database_url: string;
  api_key: string;
}

export function createUserService(params: ExternalParams) {
  const serviceDefinitions = {
    // Only services required by userService
    logger: scoped(() => new Logger()),
    database: scoped(() => new Database(params.database_url)),
    userService: scoped(
      container =>
        new UserService(container.get('database'), container.get('logger'))
    ),
  };

  const container = createContainer(serviceDefinitions);
  return container.get('userService');
}
```

### CLI Commands

```bash
# Compile all entry points
npx conduit compile

# Dry run compilation
npx conduit compile --dry-run

# List all services
npx conduit list

# Analyze dependencies for a service
npx conduit analyze userService

# Initialize new project
npx conduit init
```

## Service Scopes

### Singleton

Services are created once and reused throughout the application lifetime:

```typescript
const services = {
  logger: singleton(() => new ConsoleLogger()),
};
```

### Transient

New instances are created every time the service is requested:

```typescript
const services = {
  requestHandler: transient(() => new RequestHandler()),
};
```

### Scoped

Services are created once per container scope (similar to singleton but can be reset):

```typescript
const services = {
  userRepository: scoped(
    container => new UserRepository(container.get('database'))
  ),
};
```

## Destructuring Support

One of the key features of Conduit is the ability to destructure dependencies directly from the container, making it easy to pass exactly what functions need:

```typescript
// Traditional approach
function processUser(container: Container) {
  const userService = container.get('userService');
  const logger = container.get('logger');
  // ... use services
}

// NEW: Destructuring approach
function processUser({
  userService,
  logger,
}: {
  userService: UserService;
  logger: Logger;
}) {
  // ... use services directly
}

// Call with container - destructuring happens automatically!
processUser(container);

// You can also destructure inline
const { userService, emailService } = container;
await userService.getUser('123');
await emailService.sendWelcomeEmail(user);
```

This makes functions more testable since you can easily mock just the dependencies you need:

```typescript
// Easy to test - just pass mock objects
await processUser({
  userService: mockUserService,
  logger: mockLogger,
});
```

```

## API Reference

### `createContainer<T>(serviceDefinitions: ServiceDefinitions<T>): Container<T>`

Creates a new dependency injection container with the provided service definitions.

### `singleton<T>(factory: () => T): Provider<T>`

Creates a singleton provider that instantiates the service once.

### `transient<T>(factory: () => T): Provider<T>`

Creates a transient provider that instantiates the service on every request.

### `scoped<T>(factory: (container: Container) => T): Provider<T>`

Creates a scoped provider that can access other services from the container.

### `Container<T>.get<K extends keyof T>(key: K): T[K]`

Retrieves a service from the container with full type safety.

## Benefits

- **No decorators**: Clean, explicit dependency definition
- **No metadata**: No need for `reflect-metadata` or experimental decorators
- **Compile-time safety**: All dependencies are checked at compile time
- **Predictable**: Easy to understand factory-based approach
- **Testable**: Easy to mock and test individual services

## License

MIT
```
