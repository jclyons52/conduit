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

    // Extract external parameters (only real config, not service names)
    const externalParams = this.analyzer.extractExternalParameters(
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
      externalParams
    );

    // Generate the final code based on mode
    const generatedCode =
      mode === 'factories'
        ? this.generateFactoryCode(compiledServices, externalParams, imports)
        : this.generateContainerCode(
            config.entryPoint,
            compiledServices,
            externalParams,
            imports
          );

    return {
      entryPoint: config.entryPoint,
      mode,
      externalParams,
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
    externalParams: string[]
  ): CompiledService[] {
    const services: CompiledService[] = [];

    for (const serviceKey of requiredServices) {
      const provider = serviceDefinitions[serviceKey];
      if (!provider) continue;

      const dependencies = this.analyzer['extractDependencies'](provider);
      const serviceExternalParams = this.getServiceExternalParams(
        provider.factory.toString(),
        externalParams
      );

      const factoryCode = this.generateServiceFactory(
        provider,
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
   * Get external parameters used by a specific service
   */
  private getServiceExternalParams(
    factoryCode: string,
    allExternalParams: string[]
  ): string[] {
    return allExternalParams.filter(
      param =>
        factoryCode.includes(`'${param}'`) || factoryCode.includes(`"${param}"`)
    );
  }

  /**
   * Generate factory code for a single service (cleaned up)
   */
  private generateServiceFactory(
    provider: any,
    externalParams: string[]
  ): string {
    let factoryCode = provider.factory.toString();

    // Replace external parameters with parameter references
    for (const param of externalParams) {
      const escapedParam = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(['"\`])${escapedParam}\\1`, 'g');
      const paramName = this.parameterize(param);
      factoryCode = factoryCode.replace(pattern, `params.${paramName}`);
    }

    return factoryCode;
  }

  /**
   * Convert a string literal to a parameter name
   */
  private parameterize(literal: string): string {
    return literal
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .replace(/_+/g, '_');
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
    externalParams: string[],
    imports: ImportStatement[]
  ): string {
    const importStatements = imports
      .map(imp => `import { ${imp.classNames.join(', ')} } from '${imp.path}';`)
      .join('\n');

    const paramInterface = this.generateParameterInterface(externalParams);

    const factories = services
      .map(service => {
        // For factory mode, we need to wrap factories that use external params
        let factoryCode = service.factoryCode;

        if (service.externalParams.length > 0) {
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
    externalParams: string[],
    imports: ImportStatement[]
  ): string {
    const importStatements = imports
      .map(imp => `import { ${imp.classNames.join(', ')} } from '${imp.path}';`)
      .join('\n');

    const coreImports =
      "import { createContainer, ServiceDefinitions, singleton, scoped } from '../src';";

    const paramInterface = this.generateParameterInterface(externalParams);

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
   * Generate TypeScript interface for external parameters
   */
  private generateParameterInterface(externalParams: string[]): string {
    if (externalParams.length === 0) {
      return 'export interface ExternalParams {}';
    }

    const properties = externalParams
      .map(param => `  ${this.parameterize(param)}: string;`)
      .join('\n');

    return `export interface ExternalParams {\n${properties}\n}`;
  }
}
