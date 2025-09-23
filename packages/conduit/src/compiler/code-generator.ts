import { ServiceDefinitions } from '../types';
import {
  CompiledService,
  CompilationResult,
  CompileConfig,
  ImportStatement,
} from './types';
import { DependencyAnalyzer } from './dependency-analyzer';

/**
 * Generates compiled factory code for tree-shaken containers
 */
export class CodeGenerator {
  private analyzer = new DependencyAnalyzer();

  /**
   * Compile a service definition tree for a specific entry point
   */
  public compile<T extends Record<string, any>>(
    serviceDefinitions: ServiceDefinitions<T>,
    config: CompileConfig
  ): CompilationResult {
    const mode = config.mode || 'container';

    // Analyze dependencies
    const requiredServices = this.analyzer.analyzeDependencies(
      serviceDefinitions,
      config.entryPoint
    );

    // Extract structured external parameters (organized by service)
    const structuredParams = this.analyzer.extractStructuredParameters(
      serviceDefinitions,
      requiredServices
    );

    // Extract service class names for imports
    const serviceClasses = this.analyzer.extractServiceClasses(
      serviceDefinitions,
      requiredServices
    );

    // Generate imports
    const imports = this.generateImports(serviceClasses, config.imports || {});

    // Generate compiled services
    const compiledServices = this.generateCompiledServices(
      serviceDefinitions,
      requiredServices,
      structuredParams
    );

    // Generate the final code based on mode
    const generatedCode =
      mode === 'factories'
        ? this.generateFactoryCode(compiledServices, structuredParams, imports)
        : this.generateContainerCode(
            config.entryPoint,
            compiledServices,
            structuredParams,
            imports
          );

    return {
      entryPoint: config.entryPoint,
      mode,
      externalParams: structuredParams,
      imports,
      services: compiledServices,
      generatedCode,
    };
  }

  /**
   * Generate import statements
   */
  private generateImports(
    serviceClasses: Set<string>,
    imports: Record<string, string>
  ): ImportStatement[] {
    const importGroups = new Map<string, string[]>();

    for (const className of serviceClasses) {
      const importPath = imports[className] || './services';
      if (!importGroups.has(importPath)) {
        importGroups.set(importPath, []);
      }
      importGroups.get(importPath)!.push(className);
    }

    return Array.from(importGroups.entries()).map(([path, classNames]) => ({
      path,
      classNames: classNames.sort(),
    }));
  }

  /**
   * Generate compiled service objects
   */
  private generateCompiledServices<T extends Record<string, any>>(
    serviceDefinitions: ServiceDefinitions<T>,
    requiredServices: Set<string>,
    structuredParams: Record<string, Record<string, any>>
  ): CompiledService[] {
    const services: CompiledService[] = [];

    for (const serviceKey of requiredServices) {
      const provider = serviceDefinitions[serviceKey];
      if (!provider) continue;

      const dependencies = this.analyzer['extractDependencies'](provider);
      const serviceExternalParams = structuredParams[serviceKey] || {};

      const factoryCode = this.generateServiceFactory(
        provider,
        serviceKey,
        serviceExternalParams
      );

      // Extract class name from factory
      const className = this.extractClassName(provider.factory.toString());

      const service: CompiledService = {
        key: serviceKey,
        dependencies,
        externalParams: serviceExternalParams,
        factoryCode,
        scope: provider.scope || 'scoped',
      };

      if (className) {
        service.className = className;
      }

      services.push(service);
    }

    // Sort services in dependency order
    return this.topologicalSort(services);
  }

  /**
   * Extract class name from factory function
   */
  private extractClassName(factoryCode: string): string | undefined {
    const match = factoryCode.match(/new\s+([A-Z][a-zA-Z0-9_]*)\s*\(/);
    return match ? match[1] : undefined;
  }

  /**
   * Generate factory code for a single service (cleaned up)
   */
  private generateServiceFactory(
    provider: any,
    serviceKey: string,
    serviceParams: Record<string, any>
  ): string {
    let factoryCode = provider.factory.toString();

    // Clean up module references from compiled JavaScript (e.g., database_1.PostgresDatabase -> PostgresDatabase)
    factoryCode = this.cleanupModuleReferences(factoryCode);

    // Replace external parameters with structured parameter references
    for (const [paramName, _paramType] of Object.entries(serviceParams)) {
      // Find the original parameter value that maps to this parameter name
      const originalValue = this.findOriginalParameterValue(
        factoryCode,
        paramName
      );
      if (originalValue) {
        const escapedValue = originalValue.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );
        const pattern = new RegExp(`(['"\`])${escapedValue}\\1`, 'g');
        // Use structured parameter reference: params.serviceName.paramName
        factoryCode = factoryCode.replace(
          pattern,
          `params.${serviceKey}.${paramName}`
        );
      }
    }

    return factoryCode;
  }

  /**
   * Find the original parameter value in factory code that corresponds to a parameter name
   */
  private findOriginalParameterValue(
    factoryCode: string,
    paramName: string
  ): string | null {
    // This is a reverse mapping - we need to find which string literal corresponds to this parameter name
    // For now, we'll use a simple heuristic based on the parameter name
    const stringLiterals = this.analyzer['extractStringLiterals'](factoryCode);

    for (const literal of stringLiterals) {
      if (this.analyzer['isLikelyExternalParam'](literal)) {
        // Check if this literal would generate the same parameter name
        const inferredName = this.inferParameterName('', literal);
        if (inferredName === paramName) {
          return literal;
        }
      }
    }

    return null;
  }

  /**
   * Infer parameter name from parameter value (moved from analyzer for consistency)
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
   * Clean up module references from compiled JavaScript code
   */
  private cleanupModuleReferences(code: string): string {
    // Replace patterns like module_1.ClassName or import_module2.ClassName with just ClassName
    return code.replace(/(?:module_\d+|import_\w+\d*)\.([A-Z]\w+)/g, '$1');
  }

  /**
   * Sort services in dependency order using topological sort
   */
  private topologicalSort(services: CompiledService[]): CompiledService[] {
    const sorted: CompiledService[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const serviceMap = new Map(services.map(s => [s.key, s]));

    const visit = (serviceKey: string) => {
      if (visiting.has(serviceKey)) {
        throw new Error(`Circular dependency detected: ${serviceKey}`);
      }
      if (visited.has(serviceKey)) {
        return;
      }

      visiting.add(serviceKey);

      const service = serviceMap.get(serviceKey);
      if (service) {
        for (const dep of service.dependencies) {
          visit(dep);
        }
        visited.add(serviceKey);
        sorted.push(service);
      }

      visiting.delete(serviceKey);
    };

    for (const service of services) {
      visit(service.key);
    }

    return sorted;
  }

  /**
   * Generate factory code (individual factories)
   */
  private generateFactoryCode(
    services: CompiledService[],
    structuredParams: Record<string, Record<string, any>>,
    imports: ImportStatement[]
  ): string {
    const importStatements = imports
      .map(imp => `import { ${imp.classNames.join(', ')} } from '${imp.path}';`)
      .join('\n');

    const paramInterface = this.generateParameterInterface(structuredParams);

    const factories = services
      .map(service => {
        // For factory mode, we need to wrap factories that use external params
        let factoryCode = service.factoryCode;

        if (Object.keys(service.externalParams).length > 0) {
          // Factory uses external params, so it needs to be wrapped
          factoryCode = `(params: ExternalParams) => ${factoryCode.replace(/^[^(]*\(/, '(')}`;
        }

        return `export const ${service.key}Factory = ${factoryCode};`;
      })
      .join('\n\n');

    return `${importStatements}\n\n${paramInterface}\n\n${factories}`;
  }

  /**
   * Generate container code (complete tree-shaken container)
   */
  private generateContainerCode(
    entryPoint: string,
    services: CompiledService[],
    structuredParams: Record<string, Record<string, any>>,
    imports: ImportStatement[]
  ): string {
    const importStatements = imports
      .map(imp => `import { ${imp.classNames.join(', ')} } from '${imp.path}';`)
      .join('\n');

    const coreImports =
      "import { createContainer, ServiceDefinitions, singleton, scoped } from 'conduit';";

    const paramInterface = this.generateParameterInterface(structuredParams);

    const factoriesCode = services
      .map(service => {
        const scope = service.scope === 'singleton' ? 'singleton' : 'scoped';
        return `  ${service.key}: ${scope}(${service.factoryCode}),`;
      })
      .join('\n');

    const entryCapitalized =
      entryPoint.charAt(0).toUpperCase() + entryPoint.slice(1);

    return `${importStatements}
${coreImports}

${paramInterface}

export function create${entryCapitalized}(params: ExternalParams) {
  const serviceDefinitions: ServiceDefinitions<{
${services.map(s => `    ${s.key}: any;`).join('\n')}
  }> = {
${factoriesCode}
  };

  const container = createContainer(serviceDefinitions);
  return container.get('${entryPoint}');
}`;
  }

  /**
   * Generate TypeScript interface for structured external parameters
   */
  private generateParameterInterface(
    structuredParams: Record<string, Record<string, any>>
  ): string {
    if (Object.keys(structuredParams).length === 0) {
      return 'export interface ExternalParams {}';
    }

    const serviceProperties = Object.entries(structuredParams)
      .map(([serviceName, params]) => {
        const paramProperties = Object.entries(params)
          .map(([paramName, _paramType]) => `    ${paramName}: string;`)
          .join('\n');
        return `  ${serviceName}: {\n${paramProperties}\n  };`;
      })
      .join('\n');

    return `export interface ExternalParams {\n${serviceProperties}\n}`;
  }
}
