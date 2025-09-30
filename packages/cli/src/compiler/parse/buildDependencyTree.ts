import { ts, Type } from 'ts-morph';
import { DependencyKind, DependencyNode } from '../types';

function getTypeImportPath(type: Type): string | undefined {
  const symbol = type.getSymbol() || type.getAliasSymbol();
  if (!symbol) return undefined;

  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return undefined;

  const sourceFile = declarations[0]?.getSourceFile();
  return sourceFile?.getFilePath();
}

function getTypeNames(type: Type): string[] {
  const names: string[] = [];

  // Check alias symbol first (for type aliases like `type Foo = ...`)
  const aliasSymbol = type.getAliasSymbol();
  if (aliasSymbol) {
    const aliasName = aliasSymbol.getName();
    if (aliasName && aliasName !== '__type') {
      names.push(aliasName);
    }
  }

  // Then check regular symbol
  const symbol = type.getSymbol();
  if (symbol) {
    const name = symbol.getName();
    if (name && name !== '__type' && name !== '__function') {
      names.push(name);
    }
  }

  return [...new Set(names)]; // Remove duplicates
}

function classifyType(type: Type): DependencyKind {
  // Handle nullable types first
  if (type.isNullable()) {
    return classifyType(type.getNonNullableType());
  }

  // Handle undefined/void/null types
  if (type.isUndefined() || type.isNull() || type.getText() === 'void') {
    return 'primitive';
  }

  // Handle literal types (string literals, number literals, boolean literals)
  if (type.isLiteral() || type.isStringLiteral() || type.isNumberLiteral() || type.isBooleanLiteral()) {
    return 'primitive';
  }

  if (type.isString() || type.isNumber() || type.isBoolean()) {
    return 'primitive';
  }

  // Check for enums
  if (type.isEnumLiteral() || type.getSymbol()?.getDeclarations()?.some(d => d.getKindName() === 'EnumDeclaration')) {
    return 'enum';
  }

  // Check for arrays
  if (type.isArray()) {
    return 'array';
  }

  // Check for union types
  if (type.isUnion()) {
    return 'union';
  }

  // Check for intersection types
  if (type.isIntersection()) {
    return 'intersection';
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

  throw new Error(
    `Unsupported type: ${type.getText()}, flags: ${type.getFlags()}`
  );
}

function extractDependencies(type: Type, name: string): DependencyNode {
  const kind = classifyType(type);

  switch (kind) {
    case 'primitive': {
      // Check if this primitive is actually a type alias that should be imported
      const importPath = getTypeImportPath(type);
      const typeNames = getTypeNames(type);
      const hasNamedType = typeNames.length > 0;

      if (importPath && hasNamedType) {
        // This is a named type alias, include import info
        return {
          name,
          kind,
          optional: type.isNullable(),
          typeName: typeNames[0],
          importPath,
        };
      }

      // Regular primitive
      return {
        name,
        kind,
        optional: type.isNullable(),
        typeName: type.getText(),
      };
    }

    case 'enum': {
      const importPath = getTypeImportPath(type);
      const typeNames = getTypeNames(type);

      return {
        name,
        kind,
        optional: type.isNullable(),
        typeName: typeNames[0] || type.getText(),
        importPath,
      };
    }

    case 'function': {
      const typeText = type.getText();
      const importPath = getTypeImportPath(type);
      const typeNames = getTypeNames(type);
      const hasNamedType = typeNames.length > 0;

      // If we have a named type alias (like MessageHandler), use it with import
      // Otherwise it's an inline function type, use the full signature without import
      return {
        name,
        kind,
        optional: type.isNullable(),
        typeName: hasNamedType ? typeNames[0] : typeText,
        importPath: hasNamedType ? importPath : undefined,
      };
    }

    case 'array': {
      const arrayElementType = type.getArrayElementTypeOrThrow();
      const elementNode = extractDependencies(arrayElementType, name);
      return {
        name,
        kind,
        typeName: type.getText(),
        isArray: true,
        children: [elementNode],
      };
    }

    case 'union': {
      const unionTypes = type.getUnionTypes();
      // If all union members are literals/primitives, treat the whole union as a primitive
      const allPrimitive = unionTypes.every(t => {
        const unionKind = classifyType(t);
        return unionKind === 'primitive';
      });

      if (allPrimitive) {
        // This is a union of primitives (like string literal union)
        // Check if it has a type alias name and import path
        const importPath = getTypeImportPath(type);
        const typeNames = getTypeNames(type);
        const hasNamedType = typeNames.length > 0;

        return {
          name,
          kind: 'primitive',
          typeName: hasNamedType ? typeNames[0] : type.getText(),
          importPath: hasNamedType ? importPath : undefined,
        };
      }

      const children = unionTypes.map((t, i) =>
        extractDependencies(t, `${name}_union_${i}`)
      );
      return {
        name,
        kind,
        typeName: type.getText(),
        children,
      };
    }

    case 'intersection': {
      const intersectionTypes = type.getIntersectionTypes();
      const children = intersectionTypes.map((t, i) =>
        extractDependencies(t, `${name}_intersection_${i}`)
      );
      return {
        name,
        kind,
        typeName: type.getText(),
        children,
      };
    }

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
      const props = type.getProperties().flatMap(prop => {
        // Some properties (like tuple elements) don't have value declarations
        const valueDecl = prop.getValueDeclaration();
        if (!valueDecl) {
          // Skip properties without declarations (like numeric indices in tuples)
          return [];
        }
        const propType = prop.getTypeAtLocation(valueDecl);
        return [extractDependencies(propType, prop.getName())];
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
