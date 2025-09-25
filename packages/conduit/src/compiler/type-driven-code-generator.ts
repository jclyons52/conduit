import { TypeDrivenAnalyzer, TypeAnalysisResult } from './type-driven-analyzer';
import * as path from 'path';

export interface TypeDrivenGenerationResult {
  configInterface: string;
  factoriesInterface: string;
  containerFunction: string;
  generatedCode: string;
}

/**
 * Generates code based on type analysis of ServiceDefinitions
 */
export class TypeDrivenCodeGenerator {
  private analyzer: TypeDrivenAnalyzer;

  constructor(_tsconfigPath?: string) {
    this.analyzer = new TypeDrivenAnalyzer();
  }

  /**
   * Generate container code based on ServiceDefinitions type
   */
  public generateFromServiceDefinitions(
    _serviceDefinitionsTypeName: string,
    sourceFilePath: string
  ): TypeDrivenGenerationResult {
    // Determine the services directory path
    const servicesDir = path.join(path.dirname(sourceFilePath), 'services');
    const analyses = this.analyzer.analyzeServicesFromDirectory(servicesDir);

    // Generate interfaces and container
    const configInterface = this.analyzer.generateConfigInterface(analyses);
    const factoriesInterface =
      this.analyzer.generateFactoriesInterface(analyses);
    const containerFunction = this.generateContainerFunction(analyses);

    // Combine everything into generated code
    const generatedCode = this.combineGeneratedCode(
      analyses,
      configInterface,
      factoriesInterface,
      containerFunction
    );

    return {
      configInterface,
      factoriesInterface,
      containerFunction,
      generatedCode,
    };
  }

  /**
   * Generate the main container function
   */
  private generateContainerFunction(
    analyses: Map<string, TypeAnalysisResult>
  ): string {
    const factoryEntries: string[] = [];

    for (const [serviceName, analysis] of analyses) {
      if (analysis.type === 'class') {
        // Generate factory for this service
        const factoryCode = this.generateServiceFactory(serviceName, analysis);
        factoryEntries.push(`  ${serviceName}: scoped(${factoryCode}),`);
      }
    }

    // Build the container function that matches the expected pattern
    const serviceDefs = Array.from(analyses.entries())
      .map(([name, analysis]) => {
        const typeName =
          analysis.type === 'class'
            ? analysis.className || name.charAt(0).toUpperCase() + name.slice(1)
            : name.charAt(0).toUpperCase() + name.slice(1);
        return `    ${name}: ${typeName};`;
      })
      .join('\n');

    return `export const createAppContainer = (
  config: DepsConfig,
  factories: DepsFactories
): Container<{
${serviceDefs}
}> => {
  const serviceDefinitions: ServiceDefinitions<{
${serviceDefs}
  }> = {
${factoryEntries.join('\n')}
    ...factories,
  };

  return createContainer(serviceDefinitions);
};`;
  }

  /**
   * Generate factory code for a specific service
   */
  private generateServiceFactory(
    serviceName: string,
    analysis: TypeAnalysisResult
  ): string {
    if (analysis.type !== 'class' || !analysis.constructorParams) {
      return '() => { throw new Error("Service factory not implemented"); }';
    }

    const className =
      analysis.className ||
      serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    const params: string[] = [];

    for (const param of analysis.constructorParams) {
      if (param.isPrimitive) {
        // Use config parameter
        params.push(`config.${serviceName}.${param.name}`);
      } else if (param.isService) {
        params.push(param.name);
      }
    }
    const services = analysis.constructorParams
      .filter(p => !p.isPrimitive)
      .map(p => p.name);
    return `({ ${services.length > 0 ? services.join(', ') : ''} }) => {
      return new ${className}(${params.join(', ')});
    }`;
  }

  /**
   * Combine all generated code pieces
   */
  private combineGeneratedCode(
    analyses: Map<string, TypeAnalysisResult>,
    configInterface: string,
    factoriesInterface: string,
    containerFunction: string
  ): string {
    const imports = [
      "import { createContainer, ServiceDefinitions, Container, scoped } from 'conduit';",
      "import { AppServices } from '../services';",
    ];

    // Add individual service imports with proper file names
    const serviceFileMap: Record<string, string> = {
      userService: 'user-service',
      userRepository: 'user-repository',
      database: 'database',
      emailService: 'email',
      logger: 'logger',
    };

    for (const [serviceName, analysis] of analyses) {
      const typeName =
        analysis.type === 'class'
          ? analysis.className ||
            serviceName.charAt(0).toUpperCase() + serviceName.slice(1)
          : serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

      const fileName = serviceFileMap[serviceName] || serviceName;
      imports.push(`import { ${typeName} } from '../services/${fileName}';`);
    }

    return `${imports.join('\n')}

${configInterface}

${factoriesInterface}

export type DepsContainer = (
  config: DepsConfig,
  factories: DepsFactories
) => Container<AppServices>;

${containerFunction}
`;
  }
}
