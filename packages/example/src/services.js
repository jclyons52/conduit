'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.serviceDefinitions = void 0;
// Main service definitions file - imports all services and defines DI container
const conduit_1 = require('conduit');
// Import all service implementations
const logger_1 = require('./services-compiled/logger');
const database_1 = require('./services-compiled/database');
const email_1 = require('./services-compiled/email');
const user_repository_1 = require('./services-compiled/user-repository');
const user_service_1 = require('./services-compiled/user-service');
const notification_service_1 = require('./services-compiled/notification-service');
// Complete application service definitions
exports.serviceDefinitions = {
  // Logging services
  logger: (0, conduit_1.singleton)(() => new logger_1.ConsoleLogger('[APP]')),
  fileLogger: (0, conduit_1.singleton)(
    () => new logger_1.FileLogger('[FILE]', '/var/log/app.log')
  ),
  // Database services
  database: (0, conduit_1.singleton)(
    () =>
      new database_1.PostgresDatabase(
        'postgresql://user:password@localhost:5432/myapp'
      )
  ),
  cache: (0, conduit_1.singleton)(
    () => new database_1.RedisCache('localhost', 6379, 'redis-secret-password')
  ),
  // Email services
  emailService: (0, conduit_1.singleton)(
    () =>
      new email_1.SMTPEmailService('smtp-api-key-12345', 'noreply@myapp.com')
  ),
  sendGridEmailService: (0, conduit_1.singleton)(
    () => new email_1.SendGridEmailService('sendgrid-api-key-67890')
  ),
  // Repository layer
  userRepository: (0, conduit_1.scoped)(
    container =>
      new user_repository_1.DatabaseUserRepository(
        container.get('database'),
        container.get('logger')
      )
  ),
  // Business logic layer
  userService: (0, conduit_1.scoped)(
    container =>
      new user_service_1.UserServiceImpl(
        container.get('userRepository'),
        container.get('emailService'),
        container.get('logger')
      )
  ),
  // High-level services
  notificationService: (0, conduit_1.scoped)(
    container =>
      new notification_service_1.NotificationServiceImpl(
        container.get('userService'),
        container.get('logger')
      )
  ),
};
