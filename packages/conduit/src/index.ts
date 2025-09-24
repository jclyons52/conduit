// Re-export types
export type { Scope, Provider, ServiceDefinitions, IContainer } from './types';

// Re-export container
export { Container } from './container';

// Re-export errors
export { ServiceNotFoundError } from './errors';

// Re-export compiler
export {
  ContainerCompiler,
  compileContainer,
  previewCompilation,
} from './compiler';
export type {
  CompileConfig,
  CompilationResult,
  CompiledService,
  CompilationMode,
} from './compiler/types';

// Re-export configuration and CLI
export { ConfigLoader } from './compiler/config-loader';
export { ImportDiscovery } from './compiler/import-discovery';
export { ConduitCLI } from './cli';
export type { ConduitConfig, EntryPointConfig } from './compiler/config-loader';

// Create helper functions for common patterns
import { ServiceDefinitions, Provider, ProxiedContainer } from './types';
import { Container } from './container';

/**
 * Create a new container with service definitions
 */
export function createContainer<T extends Record<string, any>>(
  services: ServiceDefinitions<T>
): Container<T> & T {
  return new Container(services) as Container<T> & T;
}

/**
 * Helper to create a scoped provider
 */
export function scoped<T, TServices extends Record<string, any> = any>(
  factory: (container: ProxiedContainer<TServices>) => T
): Provider<T> {
  return { scope: 'scoped', factory };
}

/**
 * Helper to create a transient provider
 */
export function transient<T, TServices extends Record<string, any> = any>(
  factory: (container: ProxiedContainer<TServices>) => T
): Provider<T> {
  return { scope: 'transient', factory };
}

/**
 * Helper to create a singleton provider (same as scoped)
 */
export function singleton<T, TServices extends Record<string, any> = any>(
  factory: (container: ProxiedContainer<TServices>) => T
): Provider<T> {
  return { scope: 'scoped', factory };
}
