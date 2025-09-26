import App from './app';

/**
 * Conduit Example Backend API
 *
 * A real-world backend API application demonstrating:
 * - Dependency Injection with conduit-di
 * - Express.js REST API
 * - Database & Cache layers
 * - Authentication & Authorization
 * - Email services
 * - Comprehensive logging
 */

async function bootstrap() {
  const app = new App();

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

  process.on('uncaughtException', (error) => {
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
bootstrap().catch((error) => {
  console.error('💥 Failed to bootstrap application:', error);
  process.exit(1);
});