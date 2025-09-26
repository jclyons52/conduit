import { ILogger, LoggerService } from './services/logger';
import { IDatabase, DatabaseService } from './services/database';
import { ICache, CacheService } from './services/cache';
import { IUserRepository, UserRepository } from './services/user-repository';
import { IEmailService, EmailService } from './services/email';
import { IAuthService, AuthService } from './services/auth';
import { IUserService, UserService } from './services/user-service';

export type AppDependencies = {
  logger: ILogger;
  database: IDatabase;
  cache: ICache;
  userRepository: IUserRepository;
  emailService: IEmailService;
  authService: IAuthService;
  userService: IUserService;
};