const config = {
  servicesFile: './src/services.ts',
  outputDir: './src/generated',
  autoDiscoverImports: true,
  mode: 'container',

  entryPoints: [
    {
      entryPoint: 'userService',
      outputFile: 'user-service-container.ts',
      mode: 'container',
    },
    {
      entryPoint: 'userService',
      outputFile: 'user-service-factories.ts',
      mode: 'factories',
    },
    {
      entryPoint: 'notificationService',
      outputFile: 'notification-service-container.ts',
      mode: 'container',
    },
    {
      entryPoint: 'emailService',
      outputFile: 'email-service-container.ts',
      mode: 'container',
    },
  ],

  imports: {
    ConsoleLogger: '../services/logger',
    FileLogger: '../services/logger',
    PostgresDatabase: '../services/database',
    RedisCache: '../services/database',
    SMTPEmailService: '../services/email',
    SendGridEmailService: '../services/email',
    DatabaseUserRepository: '../services/user-repository',
    UserServiceImpl: '../services/user-service',
    NotificationServiceImpl: '../services/notification-service',
  },
};

module.exports = config;
