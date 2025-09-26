import { scoped, singleton } from 'conduit-di';
import { AppDependencies } from './app-dependencies';
import { LoggerService } from './services/logger';
import { DatabaseService } from './services/database';
import { CacheService } from './services/cache';
import { UserRepository } from './services/user-repository';
import { EmailService } from './services/email';
import { AuthService } from './services/auth';
import { UserService } from './services/user-service';

export const appServiceDefinitions = {
  // Singleton logger instance - shared across the entire application
  logger: singleton<LoggerService, AppDependencies>(() => {
    return new LoggerService();
  }),

  // Singleton database service - shared connection pool
  database: singleton<DatabaseService, AppDependencies>((container) => {
    return new DatabaseService(container.get('logger'));
  }),

  // Singleton cache service - shared Redis connection
  cache: singleton<CacheService, AppDependencies>((container) => {
    return new CacheService(container.get('logger'));
  }),

  // Scoped repository - one per request/scope
  userRepository: scoped<UserRepository, AppDependencies>((container) => {
    return new UserRepository(container.get('logger'), container.get('database'));
  }),

  // Scoped email service - one per request/scope
  emailService: scoped<EmailService, AppDependencies>((container) => {
    return new EmailService(container.get('logger'));
  }),

  // Scoped auth service - one per request/scope
  authService: scoped<AuthService, AppDependencies>((container) => {
    return new AuthService(container.get('logger'), container.get('database'), container.get('cache'));
  }),

  // Scoped user service - one per request/scope with all dependencies
  userService: scoped<UserService, AppDependencies>((container) => {
    return new UserService(
      container.get('logger'),
      container.get('userRepository'),
      container.get('emailService'),
      container.get('authService')
    );
  }),
};