export type DependencyKind =
  | 'primitive'
  | 'function'
  | 'interface'
  | 'class'
  | 'object'
  | 'enum'
  | 'array'
  | 'union'
  | 'intersection';

export interface DependencyNode {
  name: string;
  kind: DependencyKind;
  importPath?: string;
  typeName?: string; // e.g. "UserService"
  optional?: boolean;
  circular?: boolean;
  isArray?: boolean;
  children?: DependencyNode[];
}
