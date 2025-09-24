import { ServiceDefinitions, Provider, getProviderFactoryCode } from '../types';

/**
 * Analyzes dependency graphs and identifies required services for tree-shaking
 */
export class DependencyAnalyzer {
  private visited = new Set<string>();
  private requiredServices = new Set<string>();

  /**
   * Analyze dependencies starting from an entry point
   */
  public analyzeDependencies<T extends Record<string, any>>(
    serviceDefinitions: ServiceDefinitions<T>,
    entryPoint: keyof T
  ): Set<string> {
    this.visited.clear();
    this.requiredServices.clear();

    this.traverse(serviceDefinitions, entryPoint as string);
    return new Set(this.requiredServices);
  }

  /**
   * Recursively traverse dependencies
   */
  private traverse<T extends Record<string, any>>(
    serviceDefinitions: ServiceDefinitions<T>,
    serviceKey: string
  ): void {
    if (this.visited.has(serviceKey)) {
      return;
    }

    this.visited.add(serviceKey);
    this.requiredServices.add(serviceKey);

    const provider = serviceDefinitions[serviceKey];
    if (!provider) {
      throw new Error(`Service not found: ${serviceKey}`);
    }

    // Extract dependencies from factory function
    const dependencies = this.extractDependencies(provider);

    for (const dep of dependencies) {
      this.traverse(serviceDefinitions, dep);
    }
  }

  /**
   * Extract dependencies from a factory function by analyzing its code
   */
  private extractDependencies(provider: Provider<any>): string[] {
    const factoryCode = getProviderFactoryCode(provider);
    const dependencies: string[] = [];

    // Look for container.get('serviceName') patterns
    const getPattern = /container\.get\(['"`]([^'"`]+)['"`]\)/g;
    let match;

    while ((match = getPattern.exec(factoryCode)) !== null) {
      if (match[1]) {
        dependencies.push(match[1]);
      }
    }

    // Also look for destructuring patterns: ({ database, logger }) =>
    const destructuringPattern = /\(\s*\{\s*([^}]+)\s*\}\s*\)/;
    const destructuringMatch = factoryCode.match(destructuringPattern);

    if (destructuringMatch && destructuringMatch[1]) {
      const destructuredServices = destructuringMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      dependencies.push(...destructuredServices);
    }

    return dependencies;
  }

  /**
   * Extract external parameters from factory functions
   * Only extracts literal values that aren't service names
   */
  public extractExternalParameters<T extends Record<string, any>>(
    serviceDefinitions: ServiceDefinitions<T>,
    requiredServices: Set<string>
  ): string[] {
    const externalParams = new Set<string>();
    const serviceNames = new Set(Object.keys(serviceDefinitions));

    for (const serviceKey of requiredServices) {
      const provider = serviceDefinitions[serviceKey];
      if (!provider) continue;

      const factoryCode = getProviderFactoryCode(provider);

      // Look for string literals that look like external parameters
      const stringLiterals = this.extractStringLiterals(factoryCode);

      for (const literal of stringLiterals) {
        // Skip service names and obvious internal strings
        if (!serviceNames.has(literal) && this.isLikelyExternalParam(literal)) {
          externalParams.add(literal);
        }
      }
    }

    return Array.from(externalParams);
  }

  /**
   * Extract structured external parameters organized by service
   */
  public extractStructuredParameters<T extends Record<string, any>>(
    serviceDefinitions: ServiceDefinitions<T>,
    requiredServices: Set<string>
  ): Record<string, Record<string, any>> {
    const structuredParams: Record<string, Record<string, any>> = {};
    const serviceNames = new Set(Object.keys(serviceDefinitions));

    for (const serviceKey of requiredServices) {
      const provider = serviceDefinitions[serviceKey];
      if (!provider) continue;

      const factoryCode = getProviderFactoryCode(provider);

      // Extract class name and constructor parameters
      const constructorMatch = factoryCode.match(
        /new\s+(?:(?:import_\w+\d*|module_\d+|[a-zA-Z0-9_$]+)\.)?([A-Z][a-zA-Z0-9_]*)\s*\((.*?)\)/
      );

      if (
        !constructorMatch ||
        !constructorMatch[1] ||
        constructorMatch[2] === undefined
      )
        continue;

      const className = constructorMatch[1];
      const constructorArgs = constructorMatch[2];

      // Parse constructor arguments to find external parameters
      const serviceParams: Record<string, any> = {};
      const stringLiterals = this.extractStringLiterals(constructorArgs);

      for (const literal of stringLiterals) {
        if (!serviceNames.has(literal) && this.isLikelyExternalParam(literal)) {
          // Map the parameter to a meaningful name based on the class and value
          const paramName = this.inferParameterName(className, literal);
          serviceParams[paramName] = 'string'; // Default to string type
        }
      }

      // Only add services that have external parameters
      if (Object.keys(serviceParams).length > 0) {
        structuredParams[serviceKey] = serviceParams;
      }
    }

    return structuredParams;
  }

  /**
   * Infer parameter name from class name and parameter value
   */
  private inferParameterName(className: string, paramValue: string): string {
    // Common parameter mappings based on class names and values
    const paramMappings: Record<string, Record<string, string>> = {
      PostgresDatabase: {
        'postgresql://': 'connectionString',
      },
      RedisCache: {
        localhost: 'host',
        'redis-secret-password': 'password',
      },
      SMTPEmailService: {
        'smtp-api-key': 'apiKey',
        'noreply@': 'fromAddress',
      },
      SendGridEmailService: {
        'sendgrid-api-key': 'apiKey',
      },
    };

    // Check for specific class mappings
    if (paramMappings[className]) {
      for (const [pattern, paramName] of Object.entries(
        paramMappings[className]
      )) {
        if (paramValue.includes(pattern)) {
          return paramName;
        }
      }
    }

    // Generic fallbacks based on content patterns
    if (paramValue.includes('://')) return 'connectionString';
    if (paramValue.includes('@')) return 'fromAddress';
    if (paramValue.includes('api-key')) return 'apiKey';
    if (paramValue.includes('password')) return 'password';
    if (paramValue.includes(':') && /:\d+/.test(paramValue)) return 'host';

    // Default fallback
    return 'config';
  }

  /**
   * Extract service class names from factory functions
   */
  public extractServiceClasses<T extends Record<string, any>>(
    serviceDefinitions: ServiceDefinitions<T>,
    requiredServices: Set<string>
  ): Set<string> {
    const classNames = new Set<string>();

    for (const serviceKey of requiredServices) {
      const provider = serviceDefinitions[serviceKey];
      if (!provider) continue;

      const factoryCode = getProviderFactoryCode(provider);

      // Look for 'new ClassName(' patterns, including:
      // - Direct: new ConsoleLogger(
      // - Module references: new module_1.ClassName(
      // - Import references: new import_logger2.ConsoleLogger(
      const classPattern =
        /new\s+(?:(?:import_\w+\d*|module_\d+|[a-zA-Z0-9_$]+)\.)?([A-Z][a-zA-Z0-9_]*)\s*\(/g;
      let match;

      while ((match = classPattern.exec(factoryCode)) !== null) {
        if (match[1]) {
          classNames.add(match[1]);
        }
      }
    }

    return classNames;
  }

  /**
   * Extract string literals from code
   */
  private extractStringLiterals(code: string): string[] {
    const literals: string[] = [];

    // Match strings in quotes (simplified - doesn't handle escaped quotes)
    const stringPattern = /['"`]([^'"`]*?)['"`]/g;
    let match;

    while ((match = stringPattern.exec(code)) !== null) {
      if (match[1]) {
        literals.push(match[1]);
      }
    }

    return literals;
  }

  /**
   * Determine if a string literal is likely an external parameter
   */
  private isLikelyExternalParam(literal: string): boolean {
    // Heuristics for external parameters
    return (
      literal.includes('://') || // URLs
      literal.includes('/') || // Paths
      literal.includes('.') || // Domains/files
      /^\d+$/.test(literal) || // Port numbers
      literal.length > 10 // Long strings likely to be configs
    );
  }
}
