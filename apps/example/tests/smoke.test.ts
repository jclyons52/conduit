import { createAppDependenciesContainer } from '../src/generated/container';
import { LoggerService } from '../src/services/logger';

describe('Smoke Tests', () => {
  test('should instantiate the app without errors', async () => {
    const container = createAppDependenciesContainer(
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
    );

    const app = container.app;
    expect(app).toBeDefined();
  });
});
