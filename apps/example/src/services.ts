// Main service definitions file - imports all services and defines DI container
import { singleton, scoped, ServiceDefinitions, Container } from 'conduit';

// Import all service interfaces
import { Logger } from './services/logger';
import { Database } from './services/database';
import { UserRepository } from './services/user-repository';
import { UserService } from './services/user-service';
import { NotificationService } from './services/notification-service';

// Import all service implementations
import { ConsoleLogger, FileLogger } from './services/logger';
import { NotificationServiceImpl } from './services/notification-service';
import { EmailService } from './services/email';

type Deps = {
  userService: UserService;
};

// Export types for compilation
export type AppServices = ServiceDefinitions<Deps>;

// expected generated code:

type DepsConfig = {
  database: { connectionString: string };
  emailService: { apiKey: string; fromAddress: string };
};

type DepsFactories = ServiceDefinitions<{
  logger: Logger;
  userService?: UserService;
  userRepository?: UserRepository;
  database?: Database;
}>;

type DepsContainer = (
  config: DepsConfig,
  factoriesDepsFactories: DepsFactories
) => Container<AppServices>;
