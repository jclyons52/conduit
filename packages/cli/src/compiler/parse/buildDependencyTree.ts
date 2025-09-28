import { ts, Type } from 'ts-morph';
import { DependencyKind, DependencyNode } from '../types';

function classifyType(type: Type): DependencyKind {
  if (type.isString() || type.isNumber() || type.isBoolean()) {
    return 'primitive';
  }
  if (type.getCallSignatures().length > 0) {
    return 'function';
  }
  if (type.isInterface()) {
    return 'interface';
  }
  if (
    type.isClass() ||
    type
      .getSymbol()
      ?.getDeclarations()
      ?.some(d => d.getKindName() === 'ClassDeclaration')
  ) {
    return 'class';
  }
  if (type.isObject()) {
    return 'object';
  }
  if (type.isNullable()) {
    return classifyType(type.getNonNullableType());
  }
  throw new Error(
    `Unsupported type: ${type.getText()}, flags: ${type.getFlags()}`
  );
}

function extractDependencies(type: Type, name: string): DependencyNode {
  const kind = classifyType(type);

  switch (kind) {
    case 'primitive':
    case 'function':
      return {
        name,
        kind,
        optional: type.isNullable(),
        typeName: type.getText(),
      };
    case 'interface': {
      const decl = type.getSymbol()?.getDeclarations()?.[0];

      return {
        name,
        typeName: type.getSymbol()?.getName() ?? undefined,
        kind,
        importPath: decl?.getSourceFile().getFilePath() as string,
      };
    }

    case 'class': {
      const decl = type.getSymbol()?.getDeclarations()?.[0];
      const ctor = decl
        ?.asKindOrThrow(ts.SyntaxKind.ClassDeclaration)
        .getConstructors()[0];
      const params = ctor
        ? ctor
            .getParameters()
            .map(p => extractDependencies(p.getType(), p.getName()))
        : [];
      return {
        name,
        typeName: type.getSymbol()?.getName() ?? undefined,
        kind,
        importPath: decl?.getSourceFile().getFilePath() as string,
        children: params,
      };
    }

    case 'object': {
      const props = type.getProperties().map(prop => {
        const propType = prop.getTypeAtLocation(
          prop.getValueDeclarationOrThrow()
        );
        return extractDependencies(propType, prop.getName());
      });
      return { name, kind, children: props };
    }
  }
}

export function buildDependencyTree(type: Type): DependencyNode[] {
  return type.getProperties().map(prop => {
    const propType = prop.getTypeAtLocation(prop.getValueDeclarationOrThrow());
    return extractDependencies(propType, prop.getName());
  });
}
