import { createContainer, ServiceDefinitions } from '@typewryter/di';

import { App } from '../app';
import { UserService } from '../services/user-service';
import { UserRepository } from '../services/user-repository';
import { Database } from '../services/database';
import { EmailService } from '../services/email';
import { AuthService } from '../services/auth';
import { Cache } from '../services/cache';
import { DynamoDBRepository } from '../services/dynamodb-repository';
import { S3Storage } from '../services/s3-storage';
import { QueueService } from '../services/queue-service';
import { ConfigService } from '../services/config-service';
import type { ILogger } from '../services/logger';
import type { S3Region, StorageClass } from '../types/aws-types';
import type { MessageHandler } from '../services/queue-service';

export interface DepsConfig {
  database: {
    url: string;
    host: string;
    port: number;
    database: string;
    user: string;
    password?: string | undefined;
  };
  emailService: {
    host: string;
    port: number;
    user?: string | undefined;
    password?: string | undefined;
  };
  cache: {
    host: string;
    port: number;
    password?: string | undefined;
  };
  dynamoRepository: {
    region: S3Region;
    tableName: string;
    endpoint?: string | undefined;
  };
  email: {
    host: string;
    port: number;
    user?: string | undefined;
    password?: string | undefined;
  };
  s3Storage: {
    region: S3Region;
    bucket: string;
    storageClass: StorageClass;
    endpoint?: string | undefined;
    forcePathStyle: boolean;
  };
  queueService: {
    region: S3Region;
    queueUrl: string;
    visibilityTimeout: number;
    messageRetentionPeriod: number;
  };
  configService: {
    endpoints: {
      api: string;
      websocket: string;
    };
    timeouts: {
      connect: number;
      read: number;
      write: number;
    };
  };
}

type FactoryDeps = {
  app?: App;
  logger: ILogger;
  userService?: UserService;
  userRepository?: UserRepository;
  database?: Database;
  emailService?: EmailService;
  authService?: AuthService;
  cache?: Cache;
  dynamoRepository?: DynamoDBRepository;
  auth?: AuthService;
  email?: EmailService;
  s3Storage?: S3Storage;
  queueService?: QueueService;
  configService?: ConfigService;
  messageHandler: MessageHandler;
  errorLogger: (error: Error) => void;
  requestIdGenerator: () => string;
};

export const createAppDependenciesContainer = (
  config: DepsConfig,
  factories: ServiceDefinitions<FactoryDeps>
) => {
  const serviceDefinitions: ServiceDefinitions<Required<FactoryDeps>> = {
    app: ({ logger, userService, database, cache }) => {
      return new App(logger, userService, database, cache);
    },
    userService: ({ logger, userRepository, emailService, authService }) => {
      return new UserService(logger, userRepository, emailService, authService);
    },
    userRepository: ({ logger, database }) => {
      return new UserRepository(logger, database);
    },
    database: ({ logger }) => {
      return new Database(
        logger,
        config.database.url,
        config.database.host,
        config.database.port,
        config.database.database,
        config.database.user,
        config.database.password
      );
    },
    emailService: ({ logger }) => {
      return new EmailService(
        logger,
        config.emailService.host,
        config.emailService.port,
        config.emailService.user,
        config.emailService.password
      );
    },
    authService: ({ logger, database, cache }) => {
      return new AuthService(logger, database, cache);
    },
    cache: ({ logger }) => {
      return new Cache(
        logger,
        config.cache.host,
        config.cache.port,
        config.cache.password
      );
    },
    dynamoRepository: ({ logger }) => {
      return new DynamoDBRepository(
        logger,
        config.dynamoRepository.region,
        config.dynamoRepository.tableName,
        config.dynamoRepository.endpoint
      );
    },
    auth: ({ logger, database, cache }) => {
      return new AuthService(logger, database, cache);
    },
    email: ({ logger }) => {
      return new EmailService(
        logger,
        config.email.host,
        config.email.port,
        config.email.user,
        config.email.password
      );
    },
    s3Storage: ({ logger }) => {
      return new S3Storage(
        logger,
        config.s3Storage.region,
        config.s3Storage.bucket,
        config.s3Storage.storageClass,
        config.s3Storage.endpoint,
        config.s3Storage.forcePathStyle
      );
    },
    queueService: ({ logger }) => {
      return new QueueService(
        logger,
        config.queueService.region,
        config.queueService.queueUrl,
        config.queueService.visibilityTimeout,
        config.queueService.messageRetentionPeriod
      );
    },
    configService: ({ logger }) => {
      return new ConfigService(
        logger,
        config.configService.endpoints,
        config.configService.timeouts
      );
    },

    ...factories,
  };
  return createContainer(serviceDefinitions);
};
