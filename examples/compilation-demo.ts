import {
  scoped,
  singleton,
  ServiceDefinitions,
  previewCompilation,
  compileContainer,
} from '../src';

// Define services for a typical serverless application
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<any>;
}

interface UserRepository {
  findById(id: string): Promise<any>;
  create(user: any): Promise<any>;
}

interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

interface UserService {
  getUser(id: string): Promise<any>;
  createUser(userData: any): Promise<any>;
}

interface NotificationService {
  sendWelcomeNotification(userId: string): Promise<void>;
}

// Implementations
class ConsoleLogger implements Logger {
  constructor(private prefix: string) {}

  log(message: string): void {
    console.log(`${this.prefix}: ${message}`);
  }
}

class PostgresDatabase implements Database {
  constructor(private connectionString: string) {}

  async query(sql: string): Promise<any> {
    console.log(`Executing query on ${this.connectionString}: ${sql}`);
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

  async create(user: any): Promise<any> {
    this.logger.log(`Creating user: ${user.name}`);
    return this.database.query(`INSERT INTO users ...`);
  }
}

class EmailServiceImpl implements EmailService {
  constructor(
    private apiKey: string,
    private logger: Logger
  ) {}

  async sendEmail(to: string, subject: string, _body: string): Promise<void> {
    this.logger.log(`Sending email to ${to} using API key: ${this.apiKey}`);
    console.log(`Email sent: ${subject}`);
  }
}

class UserServiceImpl implements UserService {
  constructor(
    private userRepository: UserRepository,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<any> {
    this.logger.log(`Getting user: ${id}`);
    return this.userRepository.findById(id);
  }

  async createUser(userData: any): Promise<any> {
    this.logger.log(`Creating new user: ${userData.name}`);
    return this.userRepository.create(userData);
  }
}

class NotificationServiceImpl implements NotificationService {
  constructor(
    private emailService: EmailService,
    private userService: UserService,
    private logger: Logger
  ) {}

  async sendWelcomeNotification(userId: string): Promise<void> {
    this.logger.log(`Sending welcome notification to user: ${userId}`);
    const user = await this.userService.getUser(userId);
    await this.emailService.sendEmail(
      user.email,
      'Welcome!',
      `Welcome ${user.name}!`
    );
  }
}

// Complete service definitions - this would be the "global" container
const serviceDefinitions: ServiceDefinitions<{
  logger: Logger;
  database: Database;
  userRepository: UserRepository;
  emailService: EmailService;
  userService: UserService;
  notificationService: NotificationService;
}> = {
  logger: singleton(() => new ConsoleLogger('[APP]')),

  database: singleton(
    () => new PostgresDatabase('postgresql://localhost:5432/myapp')
  ),

  userRepository: scoped(
    container =>
      new UserRepositoryImpl(container.get('database'), container.get('logger'))
  ),

  emailService: singleton(
    container =>
      new EmailServiceImpl('sk-email-api-key-12345', container.get('logger'))
  ),

  userService: scoped(
    container =>
      new UserServiceImpl(
        container.get('userRepository'),
        container.get('logger')
      )
  ),

  notificationService: scoped(
    container =>
      new NotificationServiceImpl(
        container.get('emailService'),
        container.get('userService'),
        container.get('logger')
      )
  ),
};

async function demonstrateCompilation() {
  console.log('=== Container Compilation Demo ===\n');

  // 1. Show what services would be included for different entry points
  console.log('1. Compiling for userService entry point...');
  const userServiceCompilation = compileContainer(
    serviceDefinitions,
    'userService'
  );

  console.log(
    'Services included:',
    userServiceCompilation.services.map(s => s.key)
  );
  console.log(
    'External params detected:',
    userServiceCompilation.externalParams
  );
  console.log('');

  // 2. Show compilation for notificationService (more dependencies)
  console.log('2. Compiling for notificationService entry point...');
  const notificationCompilation = compileContainer(
    serviceDefinitions,
    'notificationService'
  );

  console.log(
    'Services included:',
    notificationCompilation.services.map(s => s.key)
  );
  console.log(
    'External params detected:',
    notificationCompilation.externalParams
  );
  console.log('');

  // 3. Preview the generated code for userService
  console.log('3. Generated code for userService:');
  console.log('=====================================');
  const generatedCode = previewCompilation(serviceDefinitions, 'userService');
  console.log(generatedCode);
  console.log('=====================================\n');

  // 4. Show how this would reduce bundle size
  console.log('4. Bundle size comparison:');
  console.log('Full container services: 6');
  console.log(
    'userService compilation: ' + userServiceCompilation.services.length
  );
  console.log(
    'Tree-shaking savings: ' +
      (6 - userServiceCompilation.services.length) +
      ' services\n'
  );

  console.log(
    '5. This demonstrates how each serverless function would only include'
  );
  console.log(
    '   the exact dependencies it needs, with external configuration'
  );
  console.log('   extracted as function parameters for runtime injection.');
}

demonstrateCompilation().catch(console.error);
