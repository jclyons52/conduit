import App from './app';
import { createAppDependenciesContainer } from './generated/container';
import { LoggerService } from './services/logger';
import { EmailService } from './services/email';
import { AuthService } from './services/auth';
import { Cache } from './services/cache';
import { StorageClass } from './types/aws-types';

/**
 * Conduit Example Backend API
 *
 * A real-world backend API application demonstrating:
 * - Dependency Injection with @typewryter/di
 * - Express.js REST API
 * - Database & Cache layers
 * - Authentication & Authorization
 * - Email services
 * - Comprehensive logging
 */

export function getContainer() {
  return createAppDependenciesContainer(
    {
      database: {
        database: 'exampledb',
        host: 'localhost',
        port: 5432,
        url: 'postgresql://user:password@localhost:5432/exampledb',
        user: 'user',
        password: 'password',
      },
      cache: {
        host: 'localhost',
        port: 6379,
      },
      dynamoRepository: {
        region: 'us-east-1',
        tableName: 'ExampleTable',
      },
      email: {
        host: 'smtp.example.com',
        port: 587,
      },
      s3Storage: {
        region: 'us-east-1',
        bucket: 'example-bucket',
        storageClass: StorageClass.STANDARD,
        forcePathStyle: false,
      },
      queueService: {
        queueUrl:
          'https://sqs.us-east-1.amazonaws.com/123456789012/example-queue',
        region: 'us-east-1',
        messageRetentionPeriod: 1209600,
        visibilityTimeout: 30,
      },
      configService: {
        endpoints: {
          api: 'https://api.example.com',
          websocket: 'https://auth.example.com',
        },
        timeouts: {
          connect: 5000,
          read: 10000,
          write: 10000,
        },
      },
      derivedService: {
        serviceName: 'DerivedExampleService',
      },
      eventEmitterService: {
        maxListeners: 20,
      },
    },
    {
      logger: () => new LoggerService(),
      errorLogger: () => (err: Error) => console.log(err),
      messageHandler: (deps) => async (message: string) => {
        deps.logger.info(`Processing message: ${message}`);
        // Process the message...
      },
      requestIdGenerator: () => () => 'req-' + Date.now(),
      s3ClientFactory: () => {
        // Example S3 client factory
        const { S3 } = require('@aws-sdk/client-s3');
        return () => new S3({ region: 'us-east-1' });
      },
    }
  );
}

async function bootstrap() {
  const app = getContainer().app;

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('uncaughtException', error => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Start the application
  await app.start();
}

// Bootstrap the application (only if not in test mode)
if (require.main === module) {
  bootstrap().catch(error => {
    console.error('💥 Failed to bootstrap application:', error);
    process.exit(1);
  });
}
