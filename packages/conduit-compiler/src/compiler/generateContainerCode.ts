import { DependencyNode } from './buildDependencyTree';

function collectImports(
  nodes: DependencyNode[]
): { name: string; path: string; typeName: string | undefined }[] {
  return nodes
    .map(n => ({ name: n.name, typeName: n.typeName, path: n.importPath! }))
    .filter(n => n.path);
}

function buildDepsConfig(nodes: DependencyNode[]): string {
  function renderNode(node: DependencyNode, indent = 2): string {
    if (node.kind === 'primitive') {
      return `${' '.repeat(indent)}${node.name}: ${'string'};`;
    }
    if (node.children?.some(c => c.kind === 'primitive')) {
      const childLines = node.children
        .filter(c => c.kind === 'primitive')
        .map(c => renderNode(c, indent + 2))
        .join('\n');
      return `${' '.repeat(indent)}${node.name}: {\n${childLines}\n${' '.repeat(indent)}};`;
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
    if (node.kind === 'class' || node.kind === 'function') {
      return [`${node.name}?: ${getName(node)};`];
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
          if (c.kind === 'primitive') return `config.${node.name}.${c.name}`;
          return c.name;
        })
        .join(', ') ?? '';
    return `${node.name}: ({ ${node.children
      ?.filter(c => c.kind !== 'primitive')
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
  deps: DependencyNode[],
  entryFilePath: string
): string {
  const imports = collectImports(deps)
    .map(i => `import { ${getName(i)} } from "${i.path}";`)
    .join('\n');

  const depsConfig = buildDepsConfig(deps);
  const factoryDeps = buildFactoryDeps(deps);
  const serviceDefs = buildServiceDefinitions(deps);

  return `
import {
  createContainer,
  ServiceDefinitions,
} from 'conduit-di';
import { ${capitalize(appName)} } from '${entryFilePath}';

${imports}

${depsConfig}

${factoryDeps}

export const create${capitalize(appName)}Container = (
  config: DepsConfig,
  factories: ServiceDefinitions<FactoryDeps>
): ${capitalize(appName)} => {
  ${serviceDefs}
  return createContainer(serviceDefinitions);
};
`;
}
