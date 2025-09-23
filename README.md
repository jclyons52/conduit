# Conduit

A modern TypeScript dependency injection framework with factory-based providers and compile-time type safety.

## Features

- **Factory-based providers**: No decorators or metadata needed
- **Compile-time type safety**: Strong typing with TypeScript
- **Destructuring support**: Access dependencies as object properties
- **Multiple scopes**: Singleton, transient, and scoped lifetimes
- **Zero dependencies**: Pure TypeScript implementation
- **Simple API**: Easy to understand and use

## Installation

```bash
npm install conduit
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
