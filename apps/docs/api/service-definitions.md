# Service Definitions

Service definitions describe how to create and manage your services using factory functions.

## ServiceDefinitions Interface

```typescript
interface ServiceDefinitions<T> {
  [K in keyof T]: ServiceDefinition<T[K]>
}
```

Service definitions is a type-safe mapping from service names to their factory definitions.

### Example

```typescript
const services: ServiceDefinitions<{
  logger: Logger;
  database: Database;
  userService: UserService;
}> = {
  logger: singleton(() => new ConsoleLogger('[APP]')),
  database: singleton(() => new PostgresDatabase(process.env.DB_URL)),
  userService: scoped(
    container =>
      new UserService(container.get('database'), container.get('logger'))
  ),
};
```

## Factory Functions

Factory functions are pure TypeScript functions that create service instances.

### Simple Factory

For services with no dependencies:

```typescript
const logger = singleton(() => new ConsoleLogger('[APP]'));
```

### Container Factory

For services that depend on other services:

```typescript
const userService = scoped(
  container =>
    new UserService(container.get('database'), container.get('logger'))
);
```

### Factory Parameters

During compilation, Conduit extracts literal values and converts them to parameters:

```typescript
// Before compilation
const database = singleton(
  () => new PostgresDatabase('postgresql://localhost/mydb')
);

// After compilation
const database = singleton(
  () => new PostgresDatabase(params.database.connectionString)
);
```

## Service Scopes

### singleton()

Creates one instance per container that's shared across all requests.

```typescript
singleton<T>(factory: () => T): ServiceDefinition<T>
singleton<T>(factory: (container: Container) => T): ServiceDefinition<T>
```

**Use for**: Configuration, loggers, caches, connection pools

```typescript
const config = singleton(() => new AppConfig());
const logger = singleton(() => new FileLogger('/var/log/app.log'));
const cache = singleton(() => new RedisCache(process.env.REDIS_URL));
```

### scoped()

Creates one instance per scope (typically per request/operation).

```typescript
scoped<T>(factory: () => T): ServiceDefinition<T>
scoped<T>(factory: (container: Container) => T): ServiceDefinition<T>
```

**Use for**: Request handlers, business services, repositories

```typescript
const userService = scoped(
  container =>
    new UserService(container.get('database'), container.get('logger'))
);

const orderProcessor = scoped(
  container =>
    new OrderProcessor(
      container.get('paymentService'),
      container.get('inventoryService'),
      container.get('logger')
    )
);
```

### transient()

Creates a new instance every time the service is requested.

```typescript
transient<T>(factory: () => T): ServiceDefinition<T>
transient<T>(factory: (container: Container) => T): ServiceDefinition<T>
```

**Use for**: Stateless utilities, random number generators, timestamps

```typescript
const requestId = transient(() => crypto.randomUUID());
const timestamp = transient(() => new Date());
const calculator = transient(() => new MathCalculator());
```

## Scope Comparison

| Scope       | Instances       | Shared Across  | Use Cases                            |
| ----------- | --------------- | -------------- | ------------------------------------ |
| `singleton` | 1 per container | All requests   | Config, loggers, caches              |
| `scoped`    | 1 per scope     | Single request | Business services, repositories      |
| `transient` | New every time  | Nothing        | Utilities, values, stateless objects |

### Example with All Scopes

```typescript
const services: ServiceDefinitions<{
  config: AppConfig; // singleton
  logger: Logger; // singleton
  userService: UserService; // scoped
  requestId: string; // transient
}> = {
  config: singleton(() => new AppConfig()),
  logger: singleton(() => new ConsoleLogger('[APP]')),
  userService: scoped(
    container =>
      new UserService(container.get('config'), container.get('logger'))
  ),
  requestId: transient(() => crypto.randomUUID()),
};

// Usage
const container = createContainer(services);
const scope1 = container.createScope();
const scope2 = container.createScope();

// Singletons are shared
console.log(scope1.get('config') === scope2.get('config')); // true
console.log(scope1.get('logger') === scope2.get('logger')); // true

// Scoped services are unique per scope
console.log(scope1.get('userService') === scope2.get('userService')); // false
console.log(scope1.get('userService') === scope1.get('userService')); // true

// Transient services are always new
console.log(scope1.get('requestId') === scope1.get('requestId')); // false
```

## Advanced Patterns

### Conditional Services

```typescript
const logger = singleton(() =>
  process.env.NODE_ENV === 'production'
    ? new FileLogger('/var/log/app.log')
    : new ConsoleLogger()
);
```

### Factory with Multiple Dependencies

```typescript
const orderService = scoped(
  container =>
    new OrderService(
      container.get('database'),
      container.get('paymentProcessor'),
      container.get('inventoryService'),
      container.get('emailService'),
      container.get('logger')
    )
);
```

### Generic Services

```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
}

const userRepository = scoped(
  container => new DatabaseRepository<User>(container.get('database'), 'users')
);
```

### Configuration-Based Services

```typescript
const emailService = singleton(container => {
  const config = container.get('config');

  return config.emailProvider === 'sendgrid'
    ? new SendGridService(config.sendgridApiKey)
    : new SMTPService(config.smtpSettings);
});
```

## Type Safety

Service definitions provide complete compile-time type checking:

```typescript
// ✅ Correct: Factory returns Logger
const logger: ServiceDefinition<Logger> = singleton(() => new ConsoleLogger());

// ❌ Error: Factory returns string, but Logger expected
const logger: ServiceDefinition<Logger> = singleton(() => 'not a logger');

// ✅ Correct: Dependencies match service interfaces
const userService = scoped(
  container =>
    new UserService(
      container.get('database'), // Type: Database ✅
      container.get('logger') // Type: Logger ✅
    )
);

// ❌ Error: Unknown service name
const userService = scoped(
  container =>
    new UserService(
      container.get('unknownService') // TypeScript error ❌
    )
);
```
