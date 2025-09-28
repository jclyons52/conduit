
import {
  createContainer,
  ServiceDefinitions,
} from '@conduit/di';

import { App } from "../app";
import { ILogger } from "../services/logger";
import { UserService } from "../services/user-service";
import { UserRepository } from "../services/user-repository";
import { Database } from "../services/database";
import { EmailService } from "../services/email";
import { AuthService } from "../services/auth";
import { Cache } from "../services/cache";

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
        return new Database(logger, config.database.url, config.database.host, config.database.port, config.database.database, config.database.user, config.database.password); 
      },
emailService: ({ logger }) => {
        return new EmailService(logger, config.emailService.host, config.emailService.port, config.emailService.user, config.emailService.password); 
      },
authService: ({ logger, database, cache }) => {
        return new AuthService(logger, database, cache); 
      },
cache: ({ logger }) => {
        return new Cache(logger, config.cache.host, config.cache.port, config.cache.password); 
      },

...factories
};
  return createContainer(serviceDefinitions);
};
