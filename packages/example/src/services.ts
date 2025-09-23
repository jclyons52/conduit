// Main service definitions file - imports all services and defines DI container
import { singleton, scoped, ServiceDefinitions } from 'conduit';

// Import all service interfaces
import { Logger } from './services/logger';
import { Database } from './services/database';
import { EmailService } from './services/email';
import { UserRepository } from './services/user-repository';
import { UserService } from './services/user-service';
import { NotificationService } from './services/notification-service';

// Import all service implementations
import { ConsoleLogger, FileLogger } from './services/logger';
import { PostgresDatabase, RedisCache } from './services/database';
import { SMTPEmailService, SendGridEmailService } from './services/email';
import { DatabaseUserRepository } from './services/user-repository';
import { UserServiceImpl } from './services/user-service';
import { NotificationServiceImpl } from './services/notification-service';

// Complete application service definitions
export const serviceDefinitions: ServiceDefinitions<{
  logger: Logger;
  fileLogger: Logger;
  database: Database;
  cache: Database;
  emailService: EmailService;
  sendGridEmailService: EmailService;
  userRepository: UserRepository;
  userService: UserService;
  notificationService: NotificationService;
}> = {
  // Logging services
  logger: singleton(() => new ConsoleLogger('[APP]')),

  fileLogger: singleton(() => new FileLogger('[FILE]', '/var/log/app.log')),

  // Database services
  database: singleton(
    () =>
      new PostgresDatabase('postgresql://user:password@localhost:5432/myapp')
  ),

  cache: singleton(
    () => new RedisCache('localhost', 6379, 'redis-secret-password')
  ),

  // Email services
  emailService: singleton(
    () => new SMTPEmailService('smtp-api-key-12345', 'noreply@myapp.com')
  ),

  sendGridEmailService: singleton(
    () => new SendGridEmailService('sendgrid-api-key-67890')
  ),

  // Repository layer
  userRepository: scoped(
    container =>
      new DatabaseUserRepository(
        container.get('database'),
        container.get('logger')
      )
  ),

  // Business logic layer
  userService: scoped(
    container =>
      new UserServiceImpl(
        container.get('userRepository'),
        container.get('emailService'),
        container.get('logger')
      )
  ),

  // High-level services
  notificationService: scoped(
    container =>
      new NotificationServiceImpl(
        container.get('userService'),
        container.get('logger')
      )
  ),
};

// Export types for compilation
export type AppServices = typeof serviceDefinitions;
