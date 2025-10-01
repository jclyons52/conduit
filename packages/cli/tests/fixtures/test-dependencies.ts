/**
 * Test fixtures for compiler tests
 */

// Simple class with no dependencies
export class SimpleService {
  getValue(): string {
    return 'simple';
  }
}

// Class with primitive config parameters
export class DatabaseService {
  constructor(
    public readonly url: string,
    public readonly port: number,
    public readonly ssl: boolean
  ) {}
}

// Interface that must be provided externally
export interface ILogger {
  info(message: string): void;
  error(message: string, error?: Error): void;
}

// Class with both config and dependency parameters
export class UserService {
  constructor(
    private logger: ILogger,
    private database: DatabaseService,
    private apiKey: string
  ) {}
}

// Class that depends on UserService (transitive dependency test)
export class AdminService {
  constructor(
    private logger: ILogger,
    private userService: UserService
  ) {}
}

// Enum for config
export enum Environment {
  Development = 'dev',
  Production = 'prod',
}

// Class with enum parameter
export class ConfigService {
  constructor(
    public readonly env: Environment,
    public readonly appName: string
  ) {}
}

// Test dependencies type - simple case
export type SimpleDependencies = {
  simple: SimpleService;
  logger: ILogger;
};

// Test dependencies type - with config
export type ConfigDependencies = {
  database: DatabaseService;
  logger: ILogger;
};

// Test dependencies type - complex with transitive deps
export type ComplexDependencies = {
  logger: ILogger;
  userService: UserService;
  adminService: AdminService; // Should auto-discover UserService and DatabaseService
};

// Test dependencies type - with enums
export type EnumDependencies = {
  config: ConfigService;
  logger: ILogger;
};

// Test dependencies type - with function types
export type FunctionDependencies = {
  logger: ILogger;
  errorHandler: (error: Error) => void;
  idGenerator: () => string;
};

// Class with object parameter
export class CacheService {
  constructor(
    private logger: ILogger,
    private options: {
      host: string;
      port: number;
      ttl?: number;
    }
  ) {}
}

export type ObjectDependencies = {
  cache: CacheService;
  logger: ILogger;
};
