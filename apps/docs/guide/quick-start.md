# Quick Start

This guide will get you up and running with Conduit in just a few minutes.

## 1. Create Your First Service

Let's start with a simple logging service:

```typescript
// services/logger.ts
export interface Logger {
  log(message: string): void;
}

export class ConsoleLogger implements Logger {
  constructor(private prefix: string) {}

  log(message: string): void {
    console.log(`${this.prefix}: ${message}`);
  }
}
```

## 2. Define Service Definitions

Create your service definitions using Conduit's factory functions:

```typescript
// services.ts
import { ServiceDefinitions, singleton } from '@typewryter/di';
import { ConsoleLogger, type Logger } from './services/logger';

export const services: ServiceDefinitions<{
  logger: Logger;
}> = {
  logger: singleton(() => new ConsoleLogger('[APP]')),
};
```

## 3. Create and Use Container

```typescript
// main.ts
import { createContainer } from '@typewryter/di';
import { services } from './services';

const container = createContainer(services);
const logger = container.get('logger');

logger.log('Hello, Conduit!'); // Output: [APP]: Hello, Conduit!
```

## 4. Add More Services

Let's add a database service that depends on the logger:

```typescript
// services/database.ts
export interface Database {
  query(sql: string): Promise<any>;
}

export class PostgresDatabase implements Database {
  constructor(
    private connectionString: string,
    private logger: Logger
  ) {}

  async query(sql: string): Promise<any> {
    this.logger.log(`Executing query: ${sql}`);
    // Database logic here...
  }
}
```

Update your service definitions:

```typescript
// services.ts
import { ServiceDefinitions, singleton, scoped } from '@typewryter/di';
import { ConsoleLogger, type Logger } from './services/logger';
import { PostgresDatabase, type Database } from './services/database';

export const services: ServiceDefinitions<{
  logger: Logger;
  database: Database;
}> = {
  logger: singleton(() => new ConsoleLogger('[APP]')),
  database: scoped(
    container =>
      new PostgresDatabase(process.env.DATABASE_URL!, container.get('logger'))
  ),
};
```

## 5. Tree-shaking Compilation

The real power of Conduit comes from tree-shaking compilation. Create a config file:

```javascript
// typewryter.config.js
module.exports = {
  servicesFile: './services.ts',
  outputDir: './generated',
  entryPoints: {
    database: { mode: 'container' },
  },
};
```

Compile your services:

```bash
npx typewryter compile database
```

This generates an optimized container that includes only the `database` service and its dependencies (`logger`), resulting in much smaller bundles.

## Next Steps

- Learn about [Core Concepts](/guide/concepts)
- Explore [Tree-shaking Compilation](/guide/compilation)
- Check out more [Examples](/examples/basic)
