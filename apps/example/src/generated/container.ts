import { createContainer, ServiceDefinitions } from "@typewryter/di";
import { App } from "../app";
import { UserService } from "../services/user-service";
import { Database } from "../services/database";
import { Cache } from "../services/cache";
import { UserRepository } from "../services/user-repository";
import { DynamoDBRepository } from "../services/dynamodb-repository";
import { AuthService } from "../services/auth";
import { EmailService } from "../services/email";
import { S3Storage } from "../services/s3-storage";
import { QueueService } from "../services/queue-service";
import { ConfigService } from "../services/config-service";
import { DerivedService } from "../services/derived-service";
import { EventEmitterService } from "../services/event-emitter-service";
import { S3 } from "@aws-sdk/client-s3";
import type { ILogger } from "../services/logger";
import type { S3Region, StorageClass } from "../types/aws-types";
import type { MessageHandler } from "../services/queue-service";

export interface DepsConfig {
    database: {
            url: string;
            host: string;
            port: number;
            database: string;
            user: string;
            password?: string;
        };
    cache: {
            host: string;
            port: number;
            password?: string;
        };
    dynamoRepository: {
            region: S3Region;
            tableName: string;
            endpoint?: string;
        };
    email: {
            host: string;
            port: number;
            user?: string;
            password?: string;
        };
    s3Storage: {
            region: S3Region;
            bucket: string;
            storageClass: StorageClass;
            endpoint?: string;
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
    derivedService: {
            serviceName: string;
        };
    eventEmitterService: {
            maxListeners: number;
        };
}

type FactoryDeps = {
        app?: App;
        database?: Database;
        cache?: Cache;
        userRepository?: UserRepository;
        dynamoRepository?: DynamoDBRepository;
        auth?: AuthService;
        email?: EmailService;
        userService?: UserService;
        s3Storage?: S3Storage;
        queueService?: QueueService;
        configService?: ConfigService;
        derivedService?: DerivedService;
        eventEmitterService?: EventEmitterService;
        s3?: S3;
        logger: ILogger;
        messageHandler: MessageHandler;
        s3ClientFactory: () => S3;
        errorLogger: (error: Error) => void;
        requestIdGenerator: () => string;
    };

export function createAppDependenciesContainer(config: DepsConfig, factories: ServiceDefinitions<FactoryDeps>) {
    const serviceDefinitions: ServiceDefinitions<Required<FactoryDeps>> = {
    app: ({ logger, userService, database, cache }) => {
            return new App(logger, userService, database, cache);
          }
    ,
    database: ({ logger }) => {
            return new Database(logger, config.database.url, config.database.host, config.database.port, config.database.database, config.database.user, config.database.password);
          }
    ,
    cache: ({ logger }) => {
            return new Cache(logger, config.cache.host, config.cache.port, config.cache.password);
          }
    ,
    userRepository: ({ logger, database }) => {
            return new UserRepository(logger, database);
          }
    ,
    dynamoRepository: ({ logger }) => {
            return new DynamoDBRepository(logger, config.dynamoRepository.region, config.dynamoRepository.tableName, config.dynamoRepository.endpoint);
          }
    ,
    auth: ({ logger, database, cache }) => {
            return new AuthService(logger, database, cache);
          }
    ,
    email: ({ logger }) => {
            return new EmailService(logger, config.email.host, config.email.port, config.email.user, config.email.password);
          }
    ,
    userService: ({ logger, userRepository, email, auth }) => {
            return new UserService(logger, userRepository, email, auth);
          }
    ,
    s3Storage: ({ logger }) => {
            return new S3Storage(logger, config.s3Storage.region, config.s3Storage.bucket, config.s3Storage.storageClass, config.s3Storage.endpoint, config.s3Storage.forcePathStyle);
          }
    ,
    queueService: ({ logger }) => {
            return new QueueService(logger, config.queueService.region, config.queueService.queueUrl, config.queueService.visibilityTimeout, config.queueService.messageRetentionPeriod);
          }
    ,
    configService: ({ logger }) => {
            return new ConfigService(logger, config.configService.endpoints, config.configService.timeouts);
          }
    ,
    derivedService: ({ logger }) => {
            return new DerivedService(logger, config.derivedService.serviceName);
          }
    ,
    eventEmitterService: ({ logger, s3 }) => {
            return new EventEmitterService(logger, s3, config.eventEmitterService.maxListeners);
          }
    ,
    s3: () => {
            return new S3();
          }
    ,
    ...factories
    };
    return createContainer(serviceDefinitions);
}
