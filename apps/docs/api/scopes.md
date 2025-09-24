# Lifecycle Scopes

Service scopes determine how long service instances live and when they're shared or recreated.

## Overview

Conduit supports three lifecycle scopes:

- **Singleton**: One instance per container (application lifetime)
- **Scoped**: One instance per scope (request/operation lifetime)
- **Transient**: New instance every time (no sharing)

## Singleton Scope

### Behavior

- Created once when first requested
- Same instance returned for all subsequent requests
- Shared across all scopes created from the container
- Lives for the entire application lifetime

### Use Cases

- Application configuration
- Loggers and metrics collectors
- Database connection pools
- Caches and shared state
- Expensive-to-create resources

### Example

```typescript
// Created once, shared everywhere
const services = {
  config: singleton(() => new AppConfig()),
  logger: singleton(() => new FileLogger('/var/log/app.log')),
  cache: singleton(() => new RedisCache(process.env.REDIS_URL)),
};

const container = createContainer(services);

// Same instance across different scopes
const scope1 = container.createScope();
const scope2 = container.createScope();

console.log(scope1.get('logger') === scope2.get('logger')); // true
```

### Memory Considerations

Singleton services live for the entire application lifetime, so be careful with:

- Large objects that accumulate data
- Services that hold references to request-specific data
- Resources that should be periodically refreshed

## Scoped Scope

### Behavior

- Created once per scope (usually per request)
- Same instance returned within the same scope
- Different instances across different scopes
- Automatically disposed when scope ends

### Use Cases

- Business logic services
- Repository implementations
- Request-specific context
- User sessions
- Database transactions

### Example

```typescript
const services = {
  database: singleton(() => new PostgresDatabase()),
  userRepository: scoped(
    container => new UserRepository(container.get('database'))
  ),
  orderService: scoped(
    container =>
      new OrderService(
        container.get('userRepository'),
        container.get('paymentService')
      )
  ),
};

const container = createContainer(services);

// Each scope gets its own instances of scoped services
const request1 = container.createScope();
const request2 = container.createScope();

const userRepo1 = request1.get('userRepository');
const userRepo2 = request2.get('userRepository');

console.log(userRepo1 === userRepo2); // false - different scopes

// But within the same scope, same instance
const orderService1 = request1.get('orderService');
const userRepo1Again = request1.get('userRepository');

// orderService1 and userRepo1Again reference the same userRepository
```

### Web Application Pattern

```typescript
// Express.js middleware example
app.use((req, res, next) => {
  // Create new scope for each request
  const requestScope = container.createScope();

  // All scoped services are unique to this request
  req.services = {
    userService: requestScope.get('userService'),
    orderService: requestScope.get('orderService'),
  };

  // Cleanup after request
  res.on('finish', () => requestScope.dispose());
  next();
});
```

## Transient Scope

### Behavior

- New instance created every time service is requested
- Never cached or reused
- No sharing between requests
- Garbage collected when no longer referenced

### Use Cases

- Stateless utility functions
- Random values or timestamps
- Lightweight objects with no shared state
- Factory functions that create different instances

### Example

```typescript
const services = {
  requestId: transient(() => crypto.randomUUID()),
  timestamp: transient(() => new Date()),
  calculator: transient(() => new MathCalculator()),
  emailBuilder: transient(() => new EmailBuilder()),
};

const container = createContainer(services);

// Every call returns a new instance
const id1 = container.get('requestId'); // "uuid-1"
const id2 = container.get('requestId'); // "uuid-2" (different!)

const time1 = container.get('timestamp'); // 2025-09-24T10:00:00.000Z
const time2 = container.get('timestamp'); // 2025-09-24T10:00:00.005Z (different!)
```

### Performance Considerations

Transient services have the lowest memory footprint but highest CPU cost:

- No caching overhead
- New allocation on every request
- Good for lightweight objects
- Avoid for expensive-to-create services

## Scope Interaction Patterns

### Mixed Dependencies

Services can depend on services with different scopes:

```typescript
const services = {
  // Singleton: shared configuration
  config: singleton(() => new AppConfig()),

  // Singleton: shared logger
  logger: singleton(() => new ConsoleLogger()),

  // Scoped: per-request service using singleton dependencies
  userService: scoped(
    container =>
      new UserService(
        container.get('config'), // singleton
        container.get('logger') // singleton
      )
  ),

  // Transient: fresh ID each time, but uses scoped service
  auditEvent: transient(
    container =>
      new AuditEvent(
        crypto.randomUUID(),
        container.get('userService') // scoped
      )
  ),
};
```

### Dependency Rules

| Parent Scope | Can Depend On     | Reasoning                                          |
| ------------ | ----------------- | -------------------------------------------------- |
| Singleton    | Singleton only    | Singletons live for app lifetime                   |
| Scoped       | Singleton, Scoped | Scoped services can use shared or scoped resources |
| Transient    | Any scope         | Transient services are recreated each time         |

❌ **Anti-pattern**: Singleton depending on scoped service

```typescript
// DON'T DO THIS
const badSingleton = singleton(
  container => new BadService(container.get('scopedService')) // ❌ Will use first scope's instance forever
);
```

## Scope Lifecycle Management

### Automatic Cleanup

```typescript
const container = createContainer(services);

// Create scope
const requestScope = container.createScope();

// Use services
const userService = requestScope.get('userService');
await userService.processRequest();

// Cleanup (disposes all scoped services)
requestScope.dispose();
```

### IDisposable Pattern

Services can implement cleanup logic:

```typescript
interface IDisposable {
  dispose(): void;
}

class DatabaseConnection implements IDisposable {
  private connection: Connection;

  constructor() {
    this.connection = createConnection();
  }

  dispose(): void {
    this.connection.close();
  }
}

const services = {
  database: scoped(() => new DatabaseConnection()),
};

// When scope.dispose() is called, database.dispose() is called automatically
```

### Memory Management Best Practices

1. **Create scopes for logical units of work** (requests, operations, transactions)
2. **Dispose scopes promptly** when work is complete
3. **Use singleton for expensive, stateless resources**
4. **Use scoped for business logic and stateful operations**
5. **Use transient sparingly** for lightweight, stateless objects

```typescript
// Good pattern: Request-scoped services
async function handleRequest(request: Request): Promise<Response> {
  const scope = container.createScope();

  try {
    const orderService = scope.get('orderService');
    const result = await orderService.processOrder(request.orderId);
    return { success: true, data: result };
  } finally {
    scope.dispose(); // Always cleanup
  }
}
```
