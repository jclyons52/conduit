import { DependencyNode } from '../types';

type PrintInput = {
  nodes: DependencyNode[];
  indent?: number;
  showPrimitives?: boolean;
  recursive?: boolean;
};

export function printTree(
  format: 'text' | 'json' | 'html' | 'markdown' = 'text',
  input: PrintInput
) {
  switch (format) {
    case 'json':
      return JSON.stringify(printTreeAsJson(input));
    case 'text':
    default:
      return printTreeAsText(input);
    case 'html':
      throw new Error('HTML format not implemented yet');
    case 'markdown':
      throw new Error('Markdown format not implemented yet');
  }
}

function printTreeAsJson(
  { nodes, indent = 0, showPrimitives = false, recursive = false }: PrintInput,
  carry: Record<string, any> = {}
) {
  for (const node of nodes) {
    if (showPrimitives || node.kind !== 'primitive') {
      carry[node.name] = { kind: node.kind };
    }
    if (node.children && recursive) {
      carry[node.name]['children'] = {};
      printTreeAsJson(
        {
          nodes: node.children,
          indent: indent + 2,
          showPrimitives,
          recursive,
        },
        carry[node.name]['children']
      );
    }
  }
  return carry;
}

function printTreeAsText(
  { nodes, indent = 0, showPrimitives = false, recursive = false }: PrintInput,
  carry = ''
) {
  for (const node of nodes) {
    if (showPrimitives || node.kind !== 'primitive') {
      carry += `${' '.repeat(indent)}- ${node.name} (${node.kind})\n`;
    }
    if (node.children && recursive) {
      carry = printTreeAsText(
        {
          nodes: node.children,
          indent: indent + 2,
          showPrimitives,
          recursive,
        },
        carry
      );
    }
  }
  return carry;
}
