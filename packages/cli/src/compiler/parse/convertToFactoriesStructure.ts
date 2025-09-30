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
    // Skip primitives, enums, and plain objects (which are config data)
    if (node.kind === 'primitive' || node.kind === 'enum' || node.kind === 'object') {
      continue;
    }

    carry[node.name] = node;
    if (node.children) {
      recursivelyFlatten(node.children, carry);
    }
  }
  return carry;
}
