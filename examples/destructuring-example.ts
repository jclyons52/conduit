import { createContainer, scoped, singleton, ServiceDefinitions } from '../src';

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

interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Implementations
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG]: ${message}`);
  }
}

class PostgresDatabase implements Database {
  async query(sql: string): Promise<any> {
    console.log(`Executing query: ${sql}`);
    return { results: [{ id: '123', name: 'John Doe' }] };
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

class EmailServiceImpl implements EmailService {
  constructor(private logger: Logger) {}

  async sendEmail(to: string, subject: string, _body: string): Promise<void> {
    this.logger.log(`Sending email to ${to}: ${subject}`);
    console.log(`Email sent to ${to} with subject: ${subject}`);
  }
}

// Define service dependencies with strong typing
const serviceDefinitions: ServiceDefinitions<{
  logger: Logger;
  database: Database;
  userService: UserService;
  emailService: EmailService;
}> = {
  logger: singleton(() => new ConsoleLogger()),
  database: singleton(() => new PostgresDatabase()),
  userService: scoped(
    container =>
      new UserServiceImpl(container.get('database'), container.get('logger'))
  ),
  emailService: scoped(
    container => new EmailServiceImpl(container.get('logger'))
  ),
};

// Create container
const container = createContainer(serviceDefinitions);

async function main() {
  // Traditional usage with .get()
  console.log('=== Traditional .get() usage ===');
  const userService1 = container.get('userService');
  await userService1.getUser('123');

  // NEW: Destructuring usage!
  console.log('\n=== NEW: Destructuring usage ===');

  // Function that takes container and destructures what it needs
  async function processUser(
    userId: string,
    {
      userService,
      emailService,
    }: { userService: UserService; emailService: EmailService }
  ) {
    const user = await userService.getUser(userId);
    await emailService.sendEmail(
      `${user.results[0].name}@example.com`,
      'Welcome!',
      `Hello ${user.results[0].name}!`
    );
    return user;
  }

  // Call function with destructured dependencies
  await processUser('456', container);

  // You can also destructure inline
  console.log('\n=== Inline destructuring ===');
  const { logger, database } = container;
  logger.log('Direct access via destructuring!');
  await database.query('SELECT * FROM products');

  // Mixed usage - both .get() and destructuring
  console.log('\n=== Mixed usage ===');
  const { emailService } = container;
  const userSvc = container.get('userService');
  const user = await userSvc.getUser('789');
  await emailService.sendEmail(
    'admin@example.com',
    'User Activity',
    `User ${user.results[0].name} was accessed`
  );

  console.log('\n=== All working perfectly! ===');
}

main().catch(console.error);
