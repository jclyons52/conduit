import { IContainer, ServiceDefinitions, Provider } from '../types';

/**
 * Service not found error
 */
export class ServiceNotFoundError extends Error {
  constructor(key: string | symbol) {
    super(`Service not found: ${String(key)}`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Main dependency injection container with proxy support for destructuring
 */
export class Container<TDeps extends Record<string, any>>
  implements IContainer<TDeps>
{
  private cache = new Map<keyof TDeps, any>();

  constructor(private services: ServiceDefinitions<TDeps>) {
    // Return a proxy that allows property access for destructuring
    return new Proxy(this, {
      get(target, prop) {
        // If it's a method or property of the container itself, return it
        if (prop in target && typeof prop === 'string') {
          const value = (target as any)[prop];
          // Bind methods to maintain context
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }

        // If it's a service key, resolve the service
        if (typeof prop === 'string' && prop in target.services) {
          return target.get(prop as keyof TDeps);
        }

        // Default behavior for other properties
        return (target as any)[prop];
      },
    }) as unknown as Container<TDeps> & TDeps;
  }

  /**
   * Get a service by key with strong typing
   */
  public get<K extends keyof TDeps>(key: K): TDeps[K] {
    const provider = this.services[key];
    if (!provider) {
      throw new ServiceNotFoundError(key as string | symbol);
    }
    return this.cacheOrGet(key, provider);
  }

  /**
   * Internal method to handle caching based on scope
   */
  private cacheOrGet<K extends keyof TDeps>(
    key: K,
    provider: Provider<TDeps[K]>
  ): TDeps[K] {
    if (provider.scope === 'transient') {
      return provider.factory(this);
    }

    // Default to scoped (cached) behavior
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = provider.factory(this);
    this.cache.set(key, result);
    return result;
  }

  /**
   * Create a child scope with the same service definitions
   */
  public createScope(): Container<TDeps> {
    return new Container(this.services);
  }

  /**
   * Clear the cache
   */
  public dispose(): void {
    this.cache.clear();
  }
}
