import { DependencyNode } from '../types';
import { Project, Writers, SourceFile, InterfaceDeclaration, CodeBlockWriter } from 'ts-morph';

interface Import {
  typeName: string;
  importPath: string;
  isTypeOnly: boolean;
}

function collectAllImports(nodes: DependencyNode[]): Import[] {
  const imports: Import[] = [];

  function traverse(node: DependencyNode) {
    if (node.importPath && node.typeName) {
      // Determine if this is a type-only import
      const isTypeOnly =
        node.kind === 'enum' ||
        node.kind === 'function' ||
        (node.kind === 'primitive' && node.importPath !== undefined) ||
        node.kind === 'interface';

      imports.push({
        typeName: node.typeName,
        importPath: node.importPath,
        isTypeOnly,
      });
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);

  // Deduplicate by typeName and importPath
  const seen = new Map<string, Import>();
  for (const imp of imports) {
    const key = `${imp.typeName}:${imp.importPath}`;
    if (!seen.has(key)) {
      seen.set(key, imp);
    }
  }

  return Array.from(seen.values());
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderFactory(node: DependencyNode): string | null {
  if (node.kind === 'class') {
    const args =
      node.children
        ?.map(c => {
          if (c.kind === 'primitive' || c.kind === 'enum') {
            return `config.${node.name}.${c.name}`;
          }
          if (c.kind === 'object') {
            return `config.${node.name}.${c.name}`;
          }
          return c.name;
        })
        .join(', ') ?? '';

    const depNames =
      node.children
        ?.filter(
          c =>
            c.kind !== 'primitive' && c.kind !== 'enum' && c.kind !== 'object'
        )
        .map(c => c.name) ?? [];

    return `${node.name}: ({ ${depNames.join(', ')} }) => {
        return new ${getName(node)}(${args}); ${node.circular ? ' // Note: Circular dependency detected' : ''}
      }`;
  }
  return null;
}

function getName({
  name,
  typeName,
}: {
  name: string;
  typeName?: string;
}): string {
  return typeName ? typeName : capitalize(name);
}

export function generateContainerCode(
  appName: string,
  deps: DependencyNode[]
): string {
  // Create an in-memory project
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: 99, // ESNext
      module: 99, // ESNext
    },
  });

  // Create a source file
  const sourceFile = project.createSourceFile('container.ts', '', {
    overwrite: true,
  });

  // Collect all imports
  const allImports = collectAllImports(deps);

  // Group imports by path and type (value vs type-only)
  const valueImportMap = new Map<string, Set<string>>();
  const typeImportMap = new Map<string, Set<string>>();

  for (const imp of allImports) {
    const targetMap = imp.isTypeOnly ? typeImportMap : valueImportMap;
    if (!targetMap.has(imp.importPath)) {
      targetMap.set(imp.importPath, new Set());
    }
    targetMap.get(imp.importPath)!.add(imp.typeName);
  }

  // Add framework imports
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@typewryter/di',
    namedImports: ['createContainer', 'ServiceDefinitions'],
  });

  // Add value imports
  for (const [path, types] of valueImportMap.entries()) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: path,
      namedImports: Array.from(types),
    });
  }

  // Add type-only imports
  for (const [path, types] of typeImportMap.entries()) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: path,
      namedImports: Array.from(types),
      isTypeOnly: true,
    });
  }

  // Add DepsConfig interface
  addDepsConfigInterface(sourceFile, deps);

  // Add FactoryDeps type
  addFactoryDepsType(sourceFile, deps);

  // Add container creation function
  addContainerFunction(sourceFile, appName, deps);

  return sourceFile.getFullText();
}

function addDepsConfigInterface(sourceFile: SourceFile, deps: DependencyNode[]) {
  const interfaceDecl = sourceFile.addInterface({
    name: 'DepsConfig',
    isExported: true,
  });

  function addProperties(
    target: InterfaceDeclaration,
    nodes: DependencyNode[]
  ) {
    for (const node of nodes) {
      if (node.kind === 'primitive' || node.kind === 'enum') {
        target.addProperty({
          name: node.name,
          type: node.typeName ?? 'string',
          hasQuestionToken: node.optional,
        });
      } else if (
        node.kind === 'object' &&
        node.children?.some(c => c.kind === 'primitive' || c.kind === 'enum')
      ) {
        target.addProperty({
          name: node.name,
          hasQuestionToken: node.optional,
          type: Writers.objectType({
            properties: node.children
              .filter(c => c.kind === 'primitive' || c.kind === 'enum')
              .map(c => ({
                name: c.name,
                type: c.typeName ?? 'string',
                hasQuestionToken: c.optional,
              })),
          }),
        });
      } else if (node.kind === 'class' && node.children) {
        const configChildren = node.children.filter(
          c =>
            c.kind === 'primitive' || c.kind === 'enum' || c.kind === 'object'
        );

        if (configChildren.length > 0) {
          const nestedProps = configChildren.map(c => {
            if (c.kind === 'object' && c.children) {
              return {
                name: c.name,
                type: Writers.objectType({
                  properties: c.children
                    .filter(
                      child =>
                        child.kind === 'primitive' || child.kind === 'enum'
                    )
                    .map(child => ({
                      name: child.name,
                      type: child.typeName ?? 'string',
                      hasQuestionToken: child.optional,
                    })),
                }),
                hasQuestionToken: c.optional,
              };
            }
            return {
              name: c.name,
              type: c.typeName ?? 'string',
              hasQuestionToken: c.optional,
            };
          });

          target.addProperty({
            name: node.name,
            hasQuestionToken: node.optional,
            type: Writers.objectType({
              properties: nestedProps,
            }),
          });
        }
      }
    }
  }

  addProperties(interfaceDecl, deps);
}

function addFactoryDepsType(sourceFile: SourceFile, deps: DependencyNode[]) {
  const typeMembers: Array<{ name: string; type: string; optional: boolean }> =
    [];

  for (const node of deps) {
    if (node.kind === 'class') {
      typeMembers.push({
        name: node.name,
        type: getName(node),
        optional: true,
      });
    } else if (node.kind === 'function') {
      typeMembers.push({
        name: node.name,
        type: node.typeName!,
        optional: false,
      });
    } else if (node.kind === 'interface') {
      typeMembers.push({
        name: node.name,
        type: getName(node),
        optional: false,
      });
    }
  }

  sourceFile.addTypeAlias({
    name: 'FactoryDeps',
    type: Writers.objectType({
      properties: typeMembers.map(m => ({
        name: m.name,
        type: m.type,
        hasQuestionToken: m.optional,
      })),
    }),
  });
}

function addContainerFunction(
  sourceFile: SourceFile,
  appName: string,
  deps: DependencyNode[]
) {
  const functionName = `create${capitalize(appName)}Container`;

  sourceFile.addFunction({
    name: functionName,
    isExported: true,
    parameters: [
      { name: 'config', type: 'DepsConfig' },
      { name: 'factories', type: 'ServiceDefinitions<FactoryDeps>' },
    ],
    statements: (writer: CodeBlockWriter) => {
      // Create serviceDefinitions object
      writer.writeLine(
        'const serviceDefinitions: ServiceDefinitions<Required<FactoryDeps>> = {'
      );

      // Add service factories
      for (const node of deps) {
        const factory = renderFactory(node);
        if (factory) {
          writer.writeLine(factory + ',');
        }
      }

      // Spread factories
      writer.writeLine('...factories');
      writer.writeLine('};');

      // Return statement
      writer.writeLine('return createContainer(serviceDefinitions);');
    },
  });
}
