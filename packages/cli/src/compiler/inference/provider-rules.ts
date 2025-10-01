import { Type } from 'ts-morph';

/**
 * Provider Inference Rules
 *
 * This module contains the core rules for determining what providers are needed
 * in the dependency injection container based on the TypeScript type analysis.
 *
 * RULES FOR PROVIDER INFERENCE:
 *
 * 1. CLASS TYPES → Generated Factory Provider
 *    - Classes become factory functions in the container
 *    - Constructor parameters are analyzed to determine dependencies
 *    - Config values (primitives, enums, objects) are accessed via config object
 *    - Other dependencies are injected from the container
 *
 * 2. INTERFACE TYPES → Required External Provider
 *    - Interfaces must be provided by the user
 *    - They cannot be instantiated, so no factory is generated
 *    - User must supply these in the `factories` parameter
 *
 * 3. FUNCTION TYPES → Required External Provider
 *    - Function types (named or inline) must be provided by the user
 *    - No factory can be generated for a function type
 *    - User must supply these in the `factories` parameter
 *
 * 4. PRIMITIVE TYPES (string, number, boolean, literals) → Config Value
 *    - Primitives become required fields in the DepsConfig interface
 *    - They are accessed via config object when needed by classes
 *
 * 5. ENUM TYPES → Config Value
 *    - Enums are treated like primitives
 *    - They become required fields in the DepsConfig interface
 *
 * 6. OBJECT TYPES → Config Value
 *    - Plain object types (like { x: number, y: string }) become config fields
 *    - They are nested in the config structure
 *
 * 7. TYPE ALIASES → Follow Underlying Type
 *    - Named type aliases (type Foo = ...) follow the rules of their underlying type
 *    - The alias name is preserved for imports and type references
 */

/**
 * Represents a dependency that needs a factory provider generated
 */
export interface FactoryProvider {
  type: 'factory';
  /** The property name from the dependencies type */
  name: string;
  /** The ts-morph Type object */
  tsType: Type;
  /** The class name to instantiate */
  className: string;
  /** Constructor parameters */
  constructorParams: ConstructorParam[];
  /** Import information */
  importInfo: ImportInfo | null;
  /** Whether this provider has circular dependencies */
  hasCircularDependency?: boolean;
}

/**
 * Represents a dependency that must be provided externally
 */
export interface ExternalProvider {
  type: 'external';
  /** The property name from the dependencies type */
  name: string;
  /** The ts-morph Type object */
  tsType: Type;
  /** The type name to use in the generated code */
  typeName: string;
  /** Import information */
  importInfo: ImportInfo | null;
  /** Whether this is required (non-optional) */
  required: boolean;
}

/**
 * Represents a configuration value needed by providers
 */
export interface ConfigValue {
  type: 'config';
  /** The property name in the config object */
  name: string;
  /** The ts-morph Type object */
  tsType: Type;
  /** The TypeScript type string to use */
  typeString: string;
  /** Whether this is optional */
  optional: boolean;
  /** Import information for the type */
  importInfo: ImportInfo | null;
  /** Nested config values (for object types) */
  nested?: ConfigValue[];
}

/**
 * Constructor parameter information
 */
export interface ConstructorParam {
  /** Parameter name */
  name: string;
  /** The ts-morph Type object */
  tsType: Type;
  /** How this parameter should be provided */
  source: ConfigValue | ProviderReference;
}

/**
 * Reference to another provider
 */
export interface ProviderReference {
  type: 'provider';
  /** The name of the provider to reference */
  providerName: string;
}

/**
 * Import information for a type
 */
export interface ImportInfo {
  /** The type/class name to import */
  typeName: string;
  /** The module path or file path to import from */
  importPath: string;
  /** Whether this should be a type-only import */
  isTypeOnly: boolean;
}

/**
 * Complete analysis result
 */
export interface ProviderAnalysis {
  /** Providers that will have factories generated */
  factoryProviders: FactoryProvider[];
  /** Providers that must be supplied externally */
  externalProviders: ExternalProvider[];
  /** Configuration values needed */
  configValues: ConfigValue[];
  /** All import information */
  imports: ImportInfo[];
}

/**
 * Classifies a Type to determine what kind of provider it needs
 */
export function classifyProviderType(type: Type): 'factory' | 'external' | 'config' {
  // Unwrap nullable types
  const nonNullable = type.isNullable() ? type.getNonNullableType() : type;

  // RULE 4: Primitives → Config
  if (
    nonNullable.isString() ||
    nonNullable.isNumber() ||
    nonNullable.isBoolean() ||
    nonNullable.isLiteral() ||
    nonNullable.isStringLiteral() ||
    nonNullable.isNumberLiteral() ||
    nonNullable.isBooleanLiteral() ||
    nonNullable.isUndefined() ||
    nonNullable.isNull()
  ) {
    return 'config';
  }

  // RULE 5: Enums → Config
  if (
    nonNullable.isEnumLiteral() ||
    nonNullable
      .getSymbol()
      ?.getDeclarations()
      ?.some(d => d.getKindName() === 'EnumDeclaration')
  ) {
    return 'config';
  }

  // RULE 1: Classes → Factory
  if (
    nonNullable.isClass() ||
    nonNullable
      .getSymbol()
      ?.getDeclarations()
      ?.some(d => d.getKindName() === 'ClassDeclaration')
  ) {
    return 'factory';
  }

  // RULE 3: Functions → External
  if (nonNullable.getCallSignatures().length > 0) {
    return 'external';
  }

  // RULE 2: Interfaces → External
  if (nonNullable.isInterface()) {
    return 'external';
  }

  // RULE 6: Objects → Config
  if (nonNullable.isObject()) {
    return 'config';
  }

  // Arrays and unions - check element types
  if (nonNullable.isArray()) {
    return 'config'; // Arrays are treated as config for now
  }

  if (nonNullable.isUnion()) {
    const unionTypes = nonNullable.getUnionTypes();
    // If all union members are config types, treat as config
    const allConfig = unionTypes.every(t => classifyProviderType(t) === 'config');
    if (allConfig) {
      return 'config';
    }
  }

  // Default to config for unknown types
  return 'config';
}

/**
 * Gets import information for a type
 */
export function getImportInfo(type: Type, isTypeOnly: boolean = false): ImportInfo | null {
  const symbol = type.getAliasSymbol() || type.getSymbol();
  if (!symbol) return null;

  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return null;

  const sourceFile = declarations[0]?.getSourceFile();
  if (!sourceFile) return null;

  const filePath = sourceFile.getFilePath();

  // Check if this is from node_modules
  if (filePath.includes('node_modules')) {
    // For pnpm, the path might look like: node_modules/.pnpm/@aws-sdk+client-s3@3.899.0/node_modules/@aws-sdk/client-s3/...
    // For npm/yarn: node_modules/@aws-sdk/client-s3/...

    // Try to extract package name from pnpm path first
    const pnpmMatch = filePath.match(/node_modules\/.pnpm\/[^\/]+\/node_modules\/(@[^\/]+\/[^\/]+|[^\/]+)/);
    if (pnpmMatch && pnpmMatch[1]) {
      return {
        typeName: symbol.getName(),
        importPath: pnpmMatch[1],
        isTypeOnly,
      };
    }

    // Try standard node_modules path
    const standardMatch = filePath.match(/node_modules\/(@[^\/]+\/[^\/]+|[^@][^\/]+)/);
    if (standardMatch && standardMatch[1]) {
      return {
        typeName: symbol.getName(),
        importPath: standardMatch[1],
        isTypeOnly,
      };
    }
  }

  return {
    typeName: symbol.getName(),
    importPath: filePath,
    isTypeOnly,
  };
}
