import App from './app';
import { createAppDependenciesContainer } from './generated/container';
import { LoggerService } from './services/logger';
import { EmailService } from './services/email';
import { AuthService } from './services/auth';
import { Cache } from './services/cache';

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
    },
    {
      logger: () => new LoggerService(),
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
