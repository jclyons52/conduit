import { DependencyNode } from './buildDependencyTree';

export function printTree({
  nodes,
  indent = 0,
  showPrimitives = false,
  recursive = true,
}: {
  nodes: DependencyNode[];
  indent?: number;
  showPrimitives?: boolean;
  recursive?: boolean;
}) {
  for (const node of nodes) {
    if (showPrimitives || node.kind !== 'primitive') {
      console.log(`${' '.repeat(indent)}- ${node.name} (${node.kind})`);
    }
    if (node.children && recursive) {
      printTree({
        nodes: node.children,
        indent: indent + 2,
        showPrimitives,
      });
    }
  }
}
