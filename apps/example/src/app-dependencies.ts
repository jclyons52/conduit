import App from './app';
import { ILogger } from './services/logger';
import { Database } from './services/database';
import { Cache } from './services/cache';
import { UserRepository } from './services/user-repository';
import { AuthService } from './services/auth';
import { EmailService } from './services/email';
import { UserService } from './services/user-service';
import { S3Storage } from './services/s3-storage';
import { DynamoDBRepository } from './services/dynamodb-repository';
import { QueueService, MessageHandler } from './services/queue-service';
import { ConfigService } from './services/config-service';
import { StorageClass, S3Region, LogLevel } from './types/aws-types';

export type AppDependencies = {
  // Core services
  app: App;
  logger: ILogger;
  database: Database;
  cache: Cache;

  // Repositories
  userRepository: UserRepository;
  dynamoRepository: DynamoDBRepository;

  // Business logic services
  auth: AuthService;
  email: EmailService;
  userService: UserService;

  // AWS services with complex types
  s3Storage: S3Storage;
  queueService: QueueService;

  // Config service with object types
  configService: ConfigService;

  // Function types
  messageHandler: MessageHandler;

  // Utility functions
  errorLogger: (error: Error) => void;
  requestIdGenerator: () => string;
};
