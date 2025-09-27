import path from 'path';
import { DependencyNode } from '../types';

export function recursivelyUpdateImportPaths(
  nodes: DependencyNode[],
  outputPath: string
) {
  for (const node of nodes) {
    if (node.importPath) {
      node.importPath = relativeImport(outputPath, node.importPath);
    }
    if (node.children) {
      recursivelyUpdateImportPaths(node.children, outputPath);
    }
  }
  return nodes;
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
