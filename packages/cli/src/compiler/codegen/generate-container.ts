import { Project, SourceFile, Writers, CodeBlockWriter } from 'ts-morph';
import {
  ProviderAnalysis,
  ConfigValue,
  ConstructorParam,
  ProviderReference,
  ImportInfo,
} from '../inference';
import * as path from 'path';

/**
 * Generates container code from provider analysis
 */
export function generateContainer(
  analysis: ProviderAnalysis,
  containerName: string,
  outputFilePath: string
): string {
  // Create in-memory project
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 99, // ESNext
      module: 99, // ESNext
    },
  });

  const sourceFile = project.createSourceFile('container.ts', '', {
    overwrite: true,
  });

  // Add imports
  addImports(sourceFile, analysis.imports, outputFilePath);

  // Add DepsConfig interface
  addDepsConfigInterface(sourceFile, analysis);

  // Add FactoryDeps type
  addFactoryDepsType(sourceFile, analysis);

  // Add container creation function
  addContainerFunction(sourceFile, analysis, containerName);

  return sourceFile.getFullText();
}

/**
 * Adds all necessary imports to the source file
 */
function addImports(
  sourceFile: SourceFile,
  imports: ImportInfo[],
  outputFilePath: string
) {
  // Framework imports
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@typewryter/di',
    namedImports: ['createContainer', 'ServiceDefinitions'],
  });

  // Group imports by module and type-only status
  const valueImports = new Map<string, Set<string>>();
  const typeImports = new Map<string, Set<string>>();

  for (const imp of imports) {
    // Convert absolute file paths to relative paths
    let importPath = imp.importPath;
    if (!imp.importPath.startsWith('.') && !imp.importPath.startsWith('@')) {
      // This is an absolute file path, convert to relative
      const outputDir = path.dirname(outputFilePath);
      let relativePath = path.relative(outputDir, imp.importPath);

      // Remove .ts extension and ensure it starts with ./
      relativePath = relativePath.replace(/\.tsx?$/, '');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      importPath = relativePath;
    }

    const targetMap = imp.isTypeOnly ? typeImports : valueImports;
    if (!targetMap.has(importPath)) {
      targetMap.set(importPath, new Set());
    }
    targetMap.get(importPath)!.add(imp.typeName);
  }

  // Add value imports
  for (const [modulePath, types] of valueImports.entries()) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: modulePath,
      namedImports: Array.from(types),
    });
  }

  // Add type-only imports
  for (const [modulePath, types] of typeImports.entries()) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: modulePath,
      namedImports: Array.from(types),
      isTypeOnly: true,
    });
  }
}

/**
 * Adds the DepsConfig interface
 */
function addDepsConfigInterface(
  sourceFile: SourceFile,
  analysis: ProviderAnalysis
) {
  const interfaceDecl = sourceFile.addInterface({
    name: 'DepsConfig',
    isExported: true,
  });

  // Group config values by their parent provider
  const topLevelConfig = new Map<string, ConfigValue[]>();

  // First, collect config from factory providers
  for (const factory of analysis.factoryProviders) {
    const configParams = factory.constructorParams.filter(
      p => p.source.type === 'config'
    );

    if (configParams.length > 0) {
      topLevelConfig.set(
        factory.name,
        configParams.map(p => p.source as ConfigValue)
      );
    }
  }

  // Add each provider's config as a nested object
  for (const [providerName, configValues] of topLevelConfig.entries()) {
    const properties = configValues.map(cv => buildConfigProperty(cv));

    interfaceDecl.addProperty({
      name: providerName,
      type: Writers.objectType({
        properties,
      }),
    });
  }
}

/**
 * Builds a property descriptor for a config value
 */
function buildConfigProperty(config: ConfigValue): any {
  if (config.nested && config.nested.length > 0) {
    // Nested object type
    return {
      name: config.name,
      type: Writers.objectType({
        properties: config.nested.map(n => buildConfigProperty(n)),
      }),
      hasQuestionToken: config.optional,
    };
  }

  // Simple value
  return {
    name: config.name,
    type: config.typeString,
    hasQuestionToken: config.optional,
  };
}

/**
 * Adds the FactoryDeps type alias
 */
function addFactoryDepsType(sourceFile: SourceFile, analysis: ProviderAnalysis) {
  const properties: any[] = [];

  // Add factory providers (optional)
  for (const factory of analysis.factoryProviders) {
    properties.push({
      name: factory.name,
      type: factory.className,
      hasQuestionToken: true, // Factory providers are optional (can be overridden)
    });
  }

  // Add external providers
  for (const external of analysis.externalProviders) {
    properties.push({
      name: external.name,
      type: external.typeName,
      hasQuestionToken: !external.required,
    });
  }

  sourceFile.addTypeAlias({
    name: 'FactoryDeps',
    type: Writers.objectType({
      properties,
    }),
  });
}

/**
 * Adds the container creation function
 */
function addContainerFunction(
  sourceFile: SourceFile,
  analysis: ProviderAnalysis,
  containerName: string
) {
  const functionName = `create${capitalize(containerName)}Container`;

  sourceFile.addFunction({
    name: functionName,
    isExported: true,
    parameters: [
      { name: 'config', type: 'DepsConfig' },
      { name: 'factories', type: 'ServiceDefinitions<FactoryDeps>' },
    ],
    statements: (writer: CodeBlockWriter) => {
      writer.writeLine(
        'const serviceDefinitions: ServiceDefinitions<Required<FactoryDeps>> = {'
      );

      // Generate factory for each factory provider
      for (const factory of analysis.factoryProviders) {
        writer.write(generateFactoryFunction(factory));
        writer.writeLine(',');
      }

      // Spread user-provided factories
      writer.writeLine('...factories');
      writer.writeLine('};');

      writer.writeLine('return createContainer(serviceDefinitions);');
    },
  });
}

/**
 * Generates a factory function for a provider
 */
function generateFactoryFunction(factory: any): string {
  // Build parameter list for factory function (using actual provider names from container)
  const providerParams = factory.constructorParams
    .filter((p: ConstructorParam) => p.source.type === 'provider')
    .map((p: ConstructorParam) => (p.source as ProviderReference).providerName);

  // Build argument list for constructor
  const constructorArgs = factory.constructorParams.map((p: ConstructorParam) => {
    if (p.source.type === 'config') {
      // Access from config object
      const config = p.source as ConfigValue;
      return `config.${factory.name}.${config.name}`;
    } else {
      // Reference to another provider (use the actual provider name from the container)
      const providerRef = p.source as ProviderReference;
      return providerRef.providerName;
    }
  });

  const paramList = providerParams.length > 0 ? `{ ${providerParams.join(', ')} }` : '';
  const argList = constructorArgs.join(', ');

  return `${factory.name}: (${paramList}) => {
        return new ${factory.className}(${argList});
      }`;
}

/**
 * Capitalizes first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
