/**
 * Compilation mode - what to generate
 */
export type CompilationMode = 'factories' | 'container';

/**
 * Configuration for the compilation process
 */
export interface CompileConfig {
  /** Entry point service key */
  entryPoint: string;
  /** What to generate - factories or complete container */
  mode?: CompilationMode;
  /** Service class imports - map from service class name to import path */
  imports?: Record<string, string>;
  /** Output file path */
  outputPath?: string;
}

/**
 * Represents a compiled service factory
 */
export interface CompiledService {
  /** Service key */
  key: string;
  /** Dependencies this service requires */
  dependencies: string[];
  /** External parameters this service needs (structured by parameter name) */
  externalParams: Record<string, any>;
  /** Generated factory code */
  factoryCode: string;
  /** Service scope */
  scope: 'singleton' | 'transient' | 'scoped';
  /** Service class name */
  className?: string;
}

/**
 * Import statement for service classes
 */
export interface ImportStatement {
  /** Class names to import */
  classNames: string[];
  /** Import path */
  path: string;
}

/**
 * Result of the compilation process
 */
export interface CompilationResult {
  /** Entry point service */
  entryPoint: string;
  /** Compilation mode used */
  mode: CompilationMode;
  /** All external parameters needed (structured by service) */
  externalParams: Record<string, Record<string, any>>;
  /** Required imports for service classes */
  imports: ImportStatement[];
  /** Compiled services in dependency order */
  services: CompiledService[];
  /** Generated TypeScript code */
  generatedCode: string;
}
