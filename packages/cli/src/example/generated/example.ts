
import {
  createContainer,
  ServiceDefinitions,
} from '@typewryter/di';

import { UserService, Foo } from "../services/user-service";
import { UserRepository } from "../services/user-repository";
import { Database } from "../services/database";
import { EmailService } from "../services/email";
import type { Logger } from "../services/logger";
import type { INoodlerService } from "../services/noodler-service";

export interface DepsConfig {
  userService: {
    baz: string;
  };
  database: {
    connectionString: string;
    password?: string | undefined;
  };
  emailService: {
    apiKey: string;
    fromEmail: string;
  };
}

type FactoryDeps = {
  userService?: UserService;
  userRepository?: UserRepository;
  database?: Database;
  logger: Logger;
  emailService?: EmailService;
  foo?: Foo;
  noodler: INoodlerService;
};

export const createDepsContainer = (
  config: DepsConfig,
  factories: ServiceDefinitions<FactoryDeps>
) => {
  const serviceDefinitions: ServiceDefinitions<Required<FactoryDeps>> = {
userService: ({ userRepository, emailService, logger, foo }) => {
        return new UserService(userRepository, emailService, logger, foo, config.userService.baz); 
      },
userRepository: ({ database, logger }) => {
        return new UserRepository(database, logger); 
      },
database: ({  }) => {
        return new Database(config.database.connectionString, config.database.password); 
      },
emailService: ({  }) => {
        return new EmailService(config.emailService.apiKey, config.emailService.fromEmail); 
      },
foo: ({  }) => {
        return new Foo(); 
      },

...factories
};
  return createContainer(serviceDefinitions);
};
