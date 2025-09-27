import { DependencyNode } from '../types';

export function convertToFactoriesStructure(
  tree: DependencyNode[]
): DependencyNode[] {
  return Object.values(recursivelyFlatten(tree, {}));
}

function recursivelyFlatten(
  nodes: DependencyNode[],
  carry: { [key: string]: DependencyNode }
): { [key: string]: DependencyNode } {
  for (const node of nodes) {
    if (node.kind === 'primitive') continue;
    carry[node.name] = node;
    if (node.children) {
      recursivelyFlatten(node.children, carry);
    }
  }
  return carry;
}
