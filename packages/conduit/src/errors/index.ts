/**
 * Service not found error
 */
export class ServiceNotFoundError extends Error {
  constructor(key: string | symbol) {
    super(`Service not found: ${String(key)}`);
    this.name = 'ServiceNotFoundError';
  }
}
