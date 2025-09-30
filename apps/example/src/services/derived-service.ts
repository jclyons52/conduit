import { BaseService } from './base-service';

// Derived class with NO explicit constructor - should inherit parent's constructor
export class DerivedService extends BaseService {
  getName(): string {
    return 'DerivedService';
  }

  performAction(): void {
    this.logger.info(`${this.serviceName} performing action`);
  }
}