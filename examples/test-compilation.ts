import {
  scoped,
  singleton,
  ServiceDefinitions,
  ContainerCompiler,
} from '../src';

// Simple example to test the corrected compilation system

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<any>;
}

interface UserService {
  getUser(id: string): Promise<any>;
}

class ConsoleLogger implements Logger {
  constructor(private prefix: string) {}
  log(message: string): void {
    console.log(`${this.prefix}: ${message}`);
  }
}

class PostgresDatabase implements Database {
  constructor(private connectionString: string) {}
  async query(sql: string): Promise<any> {
    console.log(`Executing on ${this.connectionString}: ${sql}`);
    return { id: 1, name: 'Test User' };
  }
}

class UserServiceImpl implements UserService {
  constructor(
    private database: Database,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<any> {
    this.logger.log(`Getting user: ${id}`);
    return this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
}

const serviceDefinitions: ServiceDefinitions<{
  logger: Logger;
  database: Database;
  userService: UserService;
}> = {
  logger: singleton(() => new ConsoleLogger('[APP]')),
  database: singleton(
    () => new PostgresDatabase('postgresql://localhost:5432/myapp')
  ),
  userService: scoped(
    container =>
      new UserServiceImpl(container.get('database'), container.get('logger'))
  ),
};

async function testCompilation() {
  console.log('=== Testing Container Compilation ===\n');

  const compiler = new ContainerCompiler();

  // Test container mode (generates complete tree-shaken container)
  console.log('1. Container mode (tree-shaken container):');
  const containerResult = compiler.compile(serviceDefinitions, {
    entryPoint: 'userService',
    mode: 'container',
    imports: {
      ConsoleLogger: './services/logger',
      PostgresDatabase: './services/database',
      UserServiceImpl: './services/user',
    },
  });

  console.log(`   Services included: ${containerResult.services.length}`);
  console.log(`   External params: ${containerResult.externalParams.length}`);
  console.log(`   Mode: ${containerResult.mode}`);
  console.log(`   Imports: ${containerResult.imports.length} import groups\n`);

  // Test factory mode (generates individual factories)
  console.log('2. Factory mode (individual factory functions):');
  const factoryResult = compiler.compile(serviceDefinitions, {
    entryPoint: 'userService',
    mode: 'factories',
    imports: {
      ConsoleLogger: './services/logger',
      PostgresDatabase: './services/database',
      UserServiceImpl: './services/user',
    },
  });

  console.log(`   Services included: ${factoryResult.services.length}`);
  console.log(`   External params: ${factoryResult.externalParams.length}`);
  console.log(`   Mode: ${factoryResult.mode}`);
  console.log(`   Imports: ${factoryResult.imports.length} import groups\n`);

  console.log('3. Generated container code preview:');
  console.log('=====================================');
  console.log(containerResult.generatedCode);
  console.log('\n4. Generated factory code preview:');
  console.log('===================================');
  console.log(factoryResult.generatedCode);
}

if (require.main === module) {
  testCompilation().catch(console.error);
}
