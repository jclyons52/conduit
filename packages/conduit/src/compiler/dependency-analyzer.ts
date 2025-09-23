import { ServiceDefinitions, Provider } from '../types';

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
    const factoryCode = provider.factory.toString();
    const dependencies: string[] = [];

    // Look for container.get('serviceName') patterns
    const getPattern = /container\.get\(['"`]([^'"`]+)['"`]\)/g;
    let match;

    while ((match = getPattern.exec(factoryCode)) !== null) {
      if (match[1]) {
        dependencies.push(match[1]);
      }
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

      const factoryCode = provider.factory.toString();

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

      const factoryCode = provider.factory.toString();

      // Look for 'new ClassName(' patterns, including module references like 'new module_1.ClassName('
      const classPattern = /new\s+(?:\w+_\d+\.)?([A-Z][a-zA-Z0-9_]*)\s*\(/g;
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
