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

async function bootstrap() {
  const app = createAppDependenciesContainer(
    {
      database: {
        database: 'exampledb',
        host: 'localhost',
        port: 5432,
        url: 'postgresql://user:password@localhost:5432/exampledb',
        user: 'user',
        password: 'password',
      },
      emailService: {
        host: 'smtp.example.com',
        port: 587,
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
      storageClass: StorageClass.STANDARD,
      queueService: {
        queueUrl:
          'https://sqs.us-east-1.amazonaws.com/123456789012/example-queue',
        region: 'us-east-1',
        messageRetentionPeriod: 1209600,
        visibilityTimeout: 30,
      },
    },
    {
      logger: () => new LoggerService(),
      errorLogger: () => err => console.log(err),
      emailService: deps =>
        new EmailService(deps.logger, 'smtp.example.com', 5623),
      messageHandler: deps => async message => {
        deps.logger.info(`Processing message: ${message}`);
        // Process the message...
      },
      requestIdGenerator: () => () => 'req-' + Date.now(),
    }
  ).app;

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

// Bootstrap the application
bootstrap().catch(error => {
  console.error('💥 Failed to bootstrap application:', error);
  process.exit(1);
});
