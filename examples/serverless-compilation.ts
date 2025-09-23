import {
  scoped,
  singleton,
  ServiceDefinitions,
  ContainerCompiler,
} from '../src';
import * as fs from 'fs';
import * as path from 'path';

// Example showing how to use the compilation system for serverless deployment

// Define your complete application services
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

// Service implementations (these would be in separate files)
class ConsoleLogger implements Logger {
  constructor(private prefix: string) {}
  log(message: string): void {
    console.log(`${this.prefix}: ${message}`);
  }
}

class PostgresDatabase implements Database {
  constructor(private connectionString: string) {}
  async query(sql: string): Promise<any> {
    console.log(`Query on ${this.connectionString}: ${sql}`);
    return { results: [] };
  }
}

class UserRepositoryImpl implements UserRepository {
  constructor(
    private database: Database,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<any> {
    this.logger.log(`Finding user: ${id}`);
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

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`Sending email to ${to} with API key: ${this.apiKey}`);
    console.log(`Email: ${subject} -> ${body}`);
  }
}

class UserServiceImpl implements UserService {
  constructor(
    private userRepository: UserRepository,
    private logger: Logger
  ) {}

  async getUser(id: string): Promise<any> {
    return this.userRepository.findById(id);
  }

  async createUser(userData: any): Promise<any> {
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
    const user = await this.userService.getUser(userId);
    await this.emailService.sendEmail(
      user.email,
      'Welcome!',
      `Welcome ${user.name}!`
    );
  }
}

// Complete service definitions
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

async function generateServerlessFunctions() {
  console.log('=== Generating Serverless Functions ===\n');

  const compiler = new ContainerCompiler();

  // Define your serverless functions and their entry points
  const functions = [
    { name: 'getUserHandler', entryPoint: 'userService' },
    { name: 'createUserHandler', entryPoint: 'userService' },
    { name: 'sendNotificationHandler', entryPoint: 'notificationService' },
  ];

  // Create output directory
  const outputDir = './generated-functions';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const func of functions) {
    console.log(`Generating ${func.name}...`);

    const result = compiler.compile(serviceDefinitions, {
      entryPoint: func.entryPoint,
      outputPath: path.join(outputDir, `${func.name}.ts`),
    });

    console.log(`  Services included: ${result.services.length}`);
    console.log(`  External params: ${result.externalParams.length}`);
    console.log(
      `  Tree-shaking saved: ${6 - result.services.length} services\n`
    );

    // Also generate a wrapper function for serverless deployment
    const wrapperCode = generateServerlessWrapper(
      func.name,
      func.entryPoint,
      result
    );
    fs.writeFileSync(
      path.join(outputDir, `${func.name}-handler.ts`),
      wrapperCode,
      'utf8'
    );
  }

  console.log('Generated files:');
  const files = fs.readdirSync(outputDir);
  files.forEach(file => console.log(`  - ${file}`));
}

function generateServerlessWrapper(
  functionName: string,
  entryPoint: string,
  compilationResult: any
): string {
  const capitalizedEntry =
    entryPoint.charAt(0).toUpperCase() + entryPoint.slice(1);

  return `// Generated serverless handler for ${functionName}
import { create${capitalizedEntry} } from './${functionName}';

// Runtime configuration (would come from environment variables)
const externalParams = {
  postgresql___localhost_5432_myapp: process.env.DATABASE_URL || '',
  sk_email_api_key_12345: process.env.EMAIL_API_KEY || '',
  _app_: process.env.LOG_PREFIX || '[APP]',
};

// Create the service instance
const ${entryPoint} = create${capitalizedEntry}(externalParams);

// Serverless handler
export async function handler(event: any, context: any) {
  try {
    console.log('Event:', JSON.stringify(event));
    
    // Your business logic here using the ${entryPoint}
    // Example for different functions:
    ${generateHandlerLogic(functionName, entryPoint)}
    
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}`;
}

function generateHandlerLogic(
  functionName: string,
  entryPoint: string
): string {
  switch (functionName) {
    case 'getUserHandler':
      return `const userId = event.pathParameters?.id;
    const user = await ${entryPoint}.getUser(userId);
    
    return {
      statusCode: 200,
      body: JSON.stringify(user),
    };`;

    case 'createUserHandler':
      return `const userData = JSON.parse(event.body);
    const user = await ${entryPoint}.createUser(userData);
    
    return {
      statusCode: 201,
      body: JSON.stringify(user),
    };`;

    case 'sendNotificationHandler':
      return `const userId = event.Records[0].dynamodb.Keys.userId.S;
    await ${entryPoint}.sendWelcomeNotification(userId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification sent' }),
    };`;

    default:
      return `// Add your business logic here for ${functionName}`;
  }
}

// Run the generation
if (require.main === module) {
  generateServerlessFunctions().catch(console.error);
}
