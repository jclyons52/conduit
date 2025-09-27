# Container API

The Container is the core component that manages service instances and their lifecycles.

## createContainer

Creates a new dependency injection container.

```typescript
function createContainer<T>(definitions: ServiceDefinitions<T>): Container<T>;
```

### Parameters

- `definitions` - Service definitions object mapping service names to their factory functions

### Returns

A `Container<T>` instance that can resolve services.

### Example

```typescript
import { createContainer, singleton, scoped } from 'conduit-di';

const container = createContainer({
  logger: singleton(() => new ConsoleLogger('[APP]')),
  database: scoped(container => new PostgresDatabase(container.get('logger'))),
});
```

## Container Methods

### get()

Resolves and returns a service instance.

```typescript
container.get<K extends keyof T>(serviceName: K): T[K]
```

#### Parameters

- `serviceName` - The name of the service to resolve

#### Returns

The resolved service instance with proper typing.

#### Example

```typescript
const logger = container.get('logger'); // Type: Logger
const database = container.get('database'); // Type: Database
```

### createScope()

Creates a new scoped container for request-scoped services.

```typescript
container.createScope(): Container<T>
```

#### Returns

A new container instance that shares singleton services but creates fresh instances of scoped services.

#### Example

```typescript
// Create scope for handling a request
const requestScope = container.createScope();

// Scoped services are unique to this scope
const userService1 = requestScope.get('userService');
const userService2 = requestScope.get('userService');
console.log(userService1 === userService2); // true (same scope)

// Different scope = different instances
const anotherScope = container.createScope();
const userService3 = anotherScope.get('userService');
console.log(userService1 === userService3); // false (different scopes)
```

### has()

Checks if a service is defined in the container.

```typescript
container.has<K extends keyof T>(serviceName: K): boolean
```

#### Parameters

- `serviceName` - The name of the service to check

#### Returns

`true` if the service is defined, `false` otherwise.

#### Example

```typescript
if (container.has('optionalService')) {
  const service = container.get('optionalService');
  // Use the service...
}
```

### dispose()

Disposes of the container and all its services (if they implement IDisposable).

```typescript
container.dispose(): void
```

#### Example

```typescript
// Clean up resources
container.dispose();
```

## Container Lifecycle

### Service Resolution

1. **Check cache**: For singleton and scoped services
2. **Resolve dependencies**: Recursively resolve any dependencies
3. **Call factory**: Execute the service factory function
4. **Store result**: Cache the result based on scope
5. **Return instance**: Provide the service to the caller

### Scope Hierarchy

```
Root Container (singletons shared)
├── Scope A (scoped services unique to A)
├── Scope B (scoped services unique to B)
└── Scope C (scoped services unique to C)
```

### Error Handling

The container provides detailed error messages for common issues:

```typescript
// Circular dependency detection
Error: Circular dependency detected: userService → database → userService

// Missing service
Error: Service 'unknownService' not found. Available services: logger, database, userService

// Factory function errors
Error: Failed to create service 'database': Connection string is required
```

## Type Safety

The container provides complete compile-time type safety:

```typescript
const container = createContainer({
  logger: singleton((): Logger => new ConsoleLogger()),
  count: singleton((): number => 42),
});

const logger = container.get('logger'); // Type: Logger ✅
const count = container.get('count'); // Type: number ✅
const invalid = container.get('missing'); // TypeScript error ❌
```

## Advanced Usage

### Conditional Services

```typescript
const container = createContainer({
  logger: singleton(() =>
    process.env.NODE_ENV === 'production'
      ? new FileLogger('/var/log/app.log')
      : new ConsoleLogger()
  ),
});
```

### Service Proxies

Services support destructuring through proxies:

```typescript
const { logger, database } = container;
// Equivalent to:
const logger = container.get('logger');
const database = container.get('database');
```

### Factory Dependencies

```typescript
const container = createContainer({
  config: singleton(() => new AppConfig()),
  logger: singleton(container => new Logger(container.get('config').logLevel)),
  database: scoped(
    container =>
      new Database(container.get('config').dbUrl, container.get('logger'))
  ),
});
```
