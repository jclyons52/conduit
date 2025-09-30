import { createAppDependenciesContainer } from '../src/generated/container';
import { EmailService } from '../src/services/email';
import { LoggerService } from '../src/services/logger';
import { StorageClass } from '../src/types/aws-types';

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
    );

    const app = container.app;
    expect(app).toBeDefined();
  });
});
