export type DependencyKind =
  | 'primitive'
  | 'function'
  | 'interface'
  | 'class'
  | 'object';

export interface DependencyNode {
  name: string;
  kind:
    | 'primitive'
    | 'function'
    | 'interface'
    | 'class'
    | 'object'
    | 'array'
    | 'union'
    | 'intersection';
  importPath?: string;
  typeName?: string; // e.g. "UserService"
  optional?: boolean;
  circular?: boolean;
  isArray?: boolean;
  children?: DependencyNode[];
}
