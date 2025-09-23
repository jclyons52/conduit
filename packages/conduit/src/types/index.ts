/**
 * Service scope options
 */
export type Scope = 'scoped' | 'transient';

/**
 * Service provider definition
 */
export type Provider<T> = {
  scope?: Scope;
  factory: (container: any) => T;
};

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
