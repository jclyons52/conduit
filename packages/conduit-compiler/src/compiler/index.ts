import { buildDependencyTree, loadEntrypointType,DependencyNode } from './buildDependencyTree';
import { generateContainerCode } from './generateContainerCode';
import * as path from 'path';
import { EntryPointConfig } from "..";

export function compile(
  tsConfigPath: string,
  {
    entryPoint, typeName, outputFile
  }: EntryPointConfig,
) {
  const entrypoint = loadEntrypointType(tsConfigPath, entryPoint, typeName);
  const tree = buildDependencyTree(entrypoint);
  recursivelyUpdateImportPaths(tree, outputFile);
  const flatTree: DependencyNode[] =  Object.values(recursivelyFlatten(tree, {}));
  return generateContainerCode(typeName, flatTree, relativeImport(outputFile, entryPoint));
}

function recursivelyFlatten(nodes:DependencyNode[], carry: { [key: string]: DependencyNode }): { [key: string]: DependencyNode } {
    for (const node of nodes) {
        if (node.kind === 'primitive') continue;
        carry[node.name] = node;
        if (node.children) {
            recursivelyFlatten(node.children, carry);
        }
    }
    return carry
}

function recursivelyUpdateImportPaths(nodes:DependencyNode[], outputPath: string) {
    for (const node of nodes) {
        if (node.importPath) {
            node.importPath = relativeImport(outputPath, node.importPath);
        }
        if (node.children) {
            recursivelyUpdateImportPaths(node.children, outputPath);
        }
    }
}

function relativeImport(from: string, to: string): string {
    let relativePath = path.relative(path.dirname(from), to).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
    }
    if (relativePath.endsWith('.ts')) {
        relativePath = relativePath.slice(0, -3);
    }
    return relativePath;
}
