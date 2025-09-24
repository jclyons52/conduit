/**
 * Service scope options
 */
export type Scope = 'scoped' | 'transient';

export type Factory<T, TServices extends Record<string, any> = any> = (
  container: ProxiedContainer<TServices>
) => T;

/**
 * Service provider definition
 */
export type Provider<T, TServices extends Record<string, any> = any> =
  | {
      scope?: Scope;
      factory: Factory<T, TServices>;
    }
  | Factory<T, TServices>;

/**
 * Service definitions mapping
 */
export type ServiceDefinitions<T extends Record<string, any>> = {
  [K in keyof T]: Provider<T[K]>;
};

/**
 * Main container interface
 */
export interface IContainer<
  TDeps extends Record<string, any> = Record<string, any>,
> {
  get<K extends keyof TDeps>(key: K): TDeps[K];
  createScope(): IContainer<TDeps>;
  dispose(): void;
}

/**
 * Container with proxy support for destructuring
 */
export type ProxiedContainer<TDeps extends Record<string, any>> =
  IContainer<TDeps> & TDeps;

/**
 * Utility function to extract factory code from a provider
 */
export function getProviderFactoryCode<T>(provider: Provider<T>): string {
  return typeof provider === 'function'
    ? provider.toString()
    : provider.factory.toString();
}
