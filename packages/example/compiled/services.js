"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceDefinitions = void 0;
// Main service definitions file - imports all services and defines DI container
var conduit_1 = require("conduit");
// Import all service implementations
var logger_1 = require("./services/logger");
var database_1 = require("./services/database");
var email_1 = require("./services/email");
var user_repository_1 = require("./services/user-repository");
var user_service_1 = require("./services/user-service");
var notification_service_1 = require("./services/notification-service");
// Complete application service definitions
exports.serviceDefinitions = {
    // Logging services
    logger: (0, conduit_1.singleton)(function () { return new logger_1.ConsoleLogger('[APP]'); }),
    fileLogger: (0, conduit_1.singleton)(function () { return new logger_1.FileLogger('[FILE]', '/var/log/app.log'); }),
    // Database services
    database: (0, conduit_1.singleton)(function () {
        return new database_1.PostgresDatabase('postgresql://user:password@localhost:5432/myapp');
    }),
    cache: (0, conduit_1.singleton)(function () { return new database_1.RedisCache('localhost', 6379, 'redis-secret-password'); }),
    // Email services
    emailService: (0, conduit_1.singleton)(function () { return new email_1.SMTPEmailService('smtp-api-key-12345', 'noreply@myapp.com'); }),
    sendGridEmailService: (0, conduit_1.singleton)(function () { return new email_1.SendGridEmailService('sendgrid-api-key-67890'); }),
    // Repository layer
    userRepository: (0, conduit_1.scoped)(function (container) {
        return new user_repository_1.DatabaseUserRepository(container.get('database'), container.get('logger'));
    }),
    // Business logic layer
    userService: (0, conduit_1.scoped)(function (container) {
        return new user_service_1.UserServiceImpl(container.get('userRepository'), container.get('emailService'), container.get('logger'));
    }),
    // High-level services
    notificationService: (0, conduit_1.scoped)(function (container) {
        return new notification_service_1.NotificationServiceImpl(container.get('userService'), container.get('logger'));
    }),
};
