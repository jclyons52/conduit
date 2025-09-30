import { DependencyNode } from '../types';

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

function opt(node: DependencyNode): string {
  return node.optional ? '?' : '';
}

function buildDepsConfig(nodes: DependencyNode[]): string {
  function renderNode(node: DependencyNode, indent = 2): string {
    if (node.kind === 'primitive' || node.kind === 'enum') {
      return `${' '.repeat(indent)}${node.name}${opt(node)}: ${node.typeName ?? 'string'};`;
    }
    if (node.children?.some(c => c.kind === 'primitive' || c.kind === 'enum')) {
      const childLines = node.children
        .filter(c => c.kind === 'primitive' || c.kind === 'enum')
        .map(c => renderNode(c, indent + 2))
        .join('\n');
      return `${' '.repeat(indent)}${node.name}${opt(node)}: {\n${childLines}\n${' '.repeat(indent)}};`;
    }
    return '';
  }

  const fields = nodes
    .map(n => renderNode(n))
    .filter(Boolean)
    .join('\n');
  return `export interface DepsConfig {\n${fields}\n}`;
}

function buildFactoryDeps(nodes: DependencyNode[]): string {
  const services = nodes.flatMap(node => {
    if (node.kind === 'class') {
      return [`${node.name}?: ${getName(node)};`];
    }
    if (node.kind === 'function') {
      // Function types are required (not optional)
      return [`${node.name}: ${node.typeName};`];
    }
    if (node.kind === 'interface') {
      return [`${node.name}: ${getName(node)};`];
    }
    return [];
  });

  return `type FactoryDeps = {\n  ${services.join('\n  ')}\n};`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderFactory(node: DependencyNode): string | null {
  if (node.kind === 'class') {
    const args =
      node.children
        ?.map(c => {
          if (c.kind === 'primitive' || c.kind === 'enum') return `config.${node.name}.${c.name}`;
          return c.name;
        })
        .join(', ') ?? '';
    return `${node.name}: ({ ${node.children
      ?.filter(c => c.kind !== 'primitive' && c.kind !== 'enum')
      .map(c => c.name)
      .join(', ')} }) => {
        return new ${getName(node)}(${args}); ${node.circular ? ' // Note: Circular dependency detected' : ''}
      }`;
  }
  return null;
}

function buildServiceDefinitions(nodes: DependencyNode[]): string {
  const factories = nodes.map(n => renderFactory(n)).filter(Boolean);

  return `const serviceDefinitions: ServiceDefinitions<Required<FactoryDeps>> = {
${factories.length > 0 ? factories.join(',\n') + ',\n' : ''}
...factories
};`;
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

  // Generate import statements
  const valueImports = Array.from(valueImportMap.entries())
    .map(([path, types]) => `import { ${Array.from(types).join(', ')} } from "${path}";`)
    .join('\n');

  const typeImports = Array.from(typeImportMap.entries())
    .map(([path, types]) => `import type { ${Array.from(types).join(', ')} } from "${path}";`)
    .join('\n');

  const imports = [valueImports, typeImports].filter(Boolean).join('\n');

  // Generate code sections
  const depsConfig = buildDepsConfig(deps);
  const factoryDeps = buildFactoryDeps(deps);
  const serviceDefs = buildServiceDefinitions(deps);

  return `
import {
  createContainer,
  ServiceDefinitions,
} from '@typewryter/di';

${imports}

${depsConfig}

${factoryDeps}

export const create${capitalize(appName)}Container = (
  config: DepsConfig,
  factories: ServiceDefinitions<FactoryDeps>
) => {
  ${serviceDefs}
  return createContainer(serviceDefinitions);
};
`;
}
