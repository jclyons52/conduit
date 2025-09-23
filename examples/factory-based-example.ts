import {
  createContainer,
  scoped,
  transient,
  singleton,
  ServiceDefinitions,
} from '../src';

// Example services without decorators
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<any>;
}

interface UserRepository {
  findById(id: string): Promise<any>;
}

interface UserService {
  getUserById(id: string): Promise<any>;
}

// Define service implementations
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG]: ${message}`);
  }
}

class PostgresDatabase implements Database {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async query(sql: string): Promise<any> {
    console.log(`Executing query: ${sql} on ${this.connectionString}`);
    return { results: [] };
  }
}

class UserRepositoryImpl implements UserRepository {
  constructor(
    private database: Database,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<any> {
    this.logger.log(`Finding user with ID: ${id}`);
    return this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
}

class UserServiceImpl implements UserService {
  constructor(
    private userRepository: UserRepository,
    private logger: Logger
  ) {}

  async getUserById(id: string): Promise<any> {
    this.logger.log(`Getting user: ${id}`);
    return this.userRepository.findById(id);
  }
}

// Define service dependencies with factory functions
const serviceDefinitions: ServiceDefinitions<{
  logger: Logger;
  database: Database;
  userRepository: UserRepository;
  userService: UserService;
}> = {
  logger: singleton(() => new ConsoleLogger()),
  database: singleton(
    () => new PostgresDatabase('postgresql://localhost:5432/myapp')
  ),
  userRepository: scoped(
    container =>
      new UserRepositoryImpl(container.get('database'), container.get('logger'))
  ),
  userService: transient(
    container =>
      new UserServiceImpl(
        container.get('userRepository'),
        container.get('logger')
      )
  ),
};

// Create container with strong typing
const container = createContainer(serviceDefinitions);

// Usage example
async function main() {
  // Get services - all calls are type-safe
  const userService1 = container.get('userService'); // Type: UserService
  const userService2 = container.get('userService'); // Type: UserService
  const logger = container.get('logger'); // Type: Logger

  // Different instances due to transient scope
  console.log(
    'UserService instances are different:',
    userService1 !== userService2
  );

  // Same logger instance due to singleton scope
  const logger2 = container.get('logger');
  console.log('Logger instances are same:', logger === logger2);

  // Use the services
  await userService1.getUserById('123');
  await userService2.getUserById('456');
}

main().catch(console.error);
