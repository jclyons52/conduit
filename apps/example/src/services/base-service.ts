import { ILogger } from './logger';

// Base class with constructor
export abstract class BaseService {
  constructor(
    protected logger: ILogger,
    protected serviceName: string
  ) {
    this.logger.info(`${serviceName} initialized`);
  }

  abstract getName(): string;
}