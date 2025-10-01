import { Type, ts } from 'ts-morph';
import {
  ProviderAnalysis,
  FactoryProvider,
  ExternalProvider,
  ConfigValue,
  ImportInfo,
  ConstructorParam,
  ProviderReference,
  classifyProviderType,
  getImportInfo,
} from './provider-rules';

/**
 * Check if a type is a built-in TypeScript type (like Error, Date, Promise, etc.)
 */
function isBuiltInType(type: Type): boolean {
  const symbol = type.getSymbol();
  if (!symbol) return false;

  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return false;

  const sourceFile = declarations[0]?.getSourceFile();
  if (!sourceFile) return false;

  const filePath = sourceFile.getFilePath();

  // Built-in types come from lib.*.d.ts files
  return filePath.includes('/typescript/lib/lib.') || filePath.includes('\\typescript\\lib\\lib.');
}

/**
 * Analyzes a dependencies type and determines what providers, config, and imports are needed.
 *
 * @param dependenciesType - The ts-morph Type representing the dependencies interface/type
 * @returns Complete analysis of providers, config, and imports needed
 */
export function analyzeProviders(dependenciesType: Type): ProviderAnalysis {
  const factoryProviders: FactoryProvider[] = [];
  const externalProviders: ExternalProvider[] = [];
  const configValues: ConfigValue[] = [];
  const importsMap = new Map<string, ImportInfo>();

  // First pass: Build a type-to-provider-name map
  const typeToProviderMap = new Map<string, string>();
  const properties = dependenciesType.getProperties();

  for (const prop of properties) {
    const propName = prop.getName();
    const propType = prop.getTypeAtLocation(prop.getValueDeclarationOrThrow());
    const isOptional = propType.isNullable();
    const nonNullableType = isOptional ? propType.getNonNullableType() : propType;

    // Map type name/text to provider name
    const symbol = nonNullableType.getSymbol();
    const typeName = symbol?.getName();
    if (typeName) {
      typeToProviderMap.set(typeName, propName);
    }

    // Also map by full text for function types
    const typeText = nonNullableType.getText();
    typeToProviderMap.set(typeText, propName);
  }

  // Second pass: Analyze each property
  for (const prop of properties) {
    const propName = prop.getName();
    const propType = prop.getTypeAtLocation(prop.getValueDeclarationOrThrow());
    const isOptional = propType.isNullable();
    const nonNullableType = isOptional ? propType.getNonNullableType() : propType;

    const classification = classifyProviderType(nonNullableType);

    switch (classification) {
      case 'factory': {
        const factory = analyzeFactoryProvider(propName, nonNullableType, importsMap, typeToProviderMap);
        factoryProviders.push(factory);
        break;
      }

      case 'external': {
        const external = analyzeExternalProvider(propName, nonNullableType, !isOptional, importsMap);
        externalProviders.push(external);
        break;
      }

      case 'config': {
        const config = analyzeConfigValue(propName, propType, importsMap);
        configValues.push(config);
        break;
      }
    }
  }

  // Third pass: Discover transitive class dependencies
  // If a factory provider needs a class that's not in the dependencies, auto-generate it
  // Do this iteratively until no new providers are discovered
  const discoveredFactories: FactoryProvider[] = [];
  let allFactories = [...factoryProviders];
  let previousCount = 0;

  while (allFactories.length > previousCount) {
    previousCount = allFactories.length;

    for (const factory of allFactories) {
      for (const param of factory.constructorParams) {
        if (param.source.type === 'provider') {
          const providerRef = param.source as ProviderReference;
          const paramType = param.tsType.isNullable() ? param.tsType.getNonNullableType() : param.tsType;

          // Check if this provider exists
          const providerExists =
            allFactories.some(f => f.name === providerRef.providerName) ||
            externalProviders.some(e => e.name === providerRef.providerName);

          if (!providerExists && classifyProviderType(paramType) === 'factory') {
            // This is a class that's not in the dependencies - auto-discover it
            const paramTypeName = paramType.getSymbol()?.getName();
            if (paramTypeName) {
              // Use the type name (e.g., "S3") as the provider name
              const providerName = paramTypeName.charAt(0).toLowerCase() + paramTypeName.slice(1);

              // Add to type map BEFORE analyzing so the constructor params can find it
              typeToProviderMap.set(paramTypeName, providerName);

              const discovered = analyzeFactoryProvider(
                providerName, // camelCase the name
                paramType,
                importsMap,
                typeToProviderMap
              );
              discoveredFactories.push(discovered);
              allFactories.push(discovered);

              // Update the provider reference to use the correct name
              providerRef.providerName = providerName;
            }
          }
        }
      }
    }
  }

  return {
    factoryProviders: allFactories,
    externalProviders,
    configValues,
    imports: Array.from(importsMap.values()),
  };
}

/**
 * Analyzes a class type to create a FactoryProvider
 */
function analyzeFactoryProvider(
  name: string,
  type: Type,
  importsMap: Map<string, ImportInfo>,
  typeToProviderMap: Map<string, string>
): FactoryProvider {
  const className = type.getSymbol()?.getName() || name;

  // Get import info for the class (value import, not type-only)
  const importInfo = getImportInfo(type, false);
  if (importInfo) {
    const key = `${importInfo.importPath}:${importInfo.typeName}`;
    importsMap.set(key, importInfo);
  }

  // Analyze constructor parameters
  const constructorParams = analyzeConstructorParameters(type, importsMap, typeToProviderMap);

  return {
    type: 'factory',
    name,
    tsType: type,
    className,
    constructorParams,
    importInfo,
  };
}

/**
 * Analyzes constructor parameters of a class
 */
function analyzeConstructorParameters(
  classType: Type,
  importsMap: Map<string, ImportInfo>,
  typeToProviderMap: Map<string, string>
): ConstructorParam[] {
  // Get class declaration
  const symbol = classType.getSymbol();
  if (!symbol) return [];

  const decl = symbol.getDeclarations()?.[0];
  if (!decl || decl.getKind() !== ts.SyntaxKind.ClassDeclaration) {
    return [];
  }

  const classDecl = decl.asKindOrThrow(ts.SyntaxKind.ClassDeclaration);

  // Get constructor
  let ctor = classDecl.getConstructors()[0];

  // If no constructor, check parent class
  if (!ctor) {
    const baseTypes = classType.getBaseTypes();
    if (baseTypes.length > 0) {
      const baseDecl = baseTypes[0]?.getSymbol()?.getDeclarations()?.[0];
      if (baseDecl && baseDecl.getKind() === ts.SyntaxKind.ClassDeclaration) {
        const baseClassDecl = baseDecl.asKindOrThrow(ts.SyntaxKind.ClassDeclaration);
        ctor = baseClassDecl.getConstructors()[0];
      }
    }
  }

  if (!ctor) return [];

  // Analyze each parameter
  const params = ctor.getParameters();
  return params.map(param => {
    const paramName = param.getName();
    const paramType = param.getType();

    const classification = classifyProviderType(paramType);

    if (classification === 'config') {
      // This parameter should come from config
      const configValue = analyzeConfigValue(paramName, paramType, importsMap);
      return {
        name: paramName,
        tsType: paramType,
        source: configValue,
      };
    } else {
      // This parameter should come from another provider
      // Look up the actual provider name by type
      const nonNullable = paramType.isNullable() ? paramType.getNonNullableType() : paramType;
      const symbol = nonNullable.getSymbol();
      const typeName = symbol?.getName();

      // Try to find the provider name by type name first, then fallback to param name
      let actualProviderName = paramName;
      if (typeName && typeToProviderMap.has(typeName)) {
        actualProviderName = typeToProviderMap.get(typeName)!;
      } else {
        // Try by full type text for function types
        const typeText = nonNullable.getText();
        if (typeToProviderMap.has(typeText)) {
          actualProviderName = typeToProviderMap.get(typeText)!;
        }
      }

      const providerRef: ProviderReference = {
        type: 'provider',
        providerName: actualProviderName,
      };

      // Add import if needed
      if (classification === 'factory' || classification === 'external') {
        const importInfo = getImportInfo(paramType, classification === 'external');
        if (importInfo) {
          const key = `${importInfo.importPath}:${importInfo.typeName}`;
          importsMap.set(key, importInfo);
        }
      }

      return {
        name: paramName,
        tsType: paramType,
        source: providerRef,
      };
    }
  });
}

/**
 * Analyzes an interface or function type to create an ExternalProvider
 */
function analyzeExternalProvider(
  name: string,
  type: Type,
  required: boolean,
  importsMap: Map<string, ImportInfo>
): ExternalProvider {
  // Get type name
  const symbol = type.getAliasSymbol() || type.getSymbol();
  const hasNamedType = symbol && symbol.getName() && symbol.getName() !== '__type' && symbol.getName() !== '__function';

  // For function types, we need to extract types from the signature and build a clean type string
  const callSignatures = type.getCallSignatures();
  let typeName: string;

  if (callSignatures.length > 0 && !hasNamedType) {
    // Inline function type - extract and add imports for parameter and return types
    const signature = callSignatures[0]!;
    const parameters = signature.getParameters();
    const returnType = signature.getReturnType();

    // Add import for return type if it has one and it's not a built-in
    const returnTypeSymbol = returnType.getSymbol();
    if (returnTypeSymbol && !isBuiltInType(returnType)) {
      const returnImport = getImportInfo(returnType, true);
      if (returnImport) {
        const key = `${returnImport.importPath}:${returnImport.typeName}`;
        importsMap.set(key, returnImport);
      }
    }

    // Add imports for parameter types (excluding built-ins)
    for (const param of parameters) {
      const paramType = param.getTypeAtLocation(param.getValueDeclarationOrThrow());
      const paramSymbol = paramType.getSymbol();
      if (paramSymbol && !isBuiltInType(paramType)) {
        const paramImport = getImportInfo(paramType, true);
        if (paramImport) {
          const key = `${paramImport.importPath}:${paramImport.typeName}`;
          importsMap.set(key, paramImport);
        }
      }
    }

    // Build a clean function signature using just type names
    const paramStrings = parameters.map(p => {
      const paramType = p.getTypeAtLocation(p.getValueDeclarationOrThrow());
      const paramSymbol = paramType.getSymbol();
      const paramTypeName = paramSymbol?.getName() || paramType.getText();
      return `${p.getName()}: ${paramTypeName}`;
    });

    const returnTypeName = returnTypeSymbol?.getName() || returnType.getText();
    typeName = `(${paramStrings.join(', ')}) => ${returnTypeName}`;
  } else {
    typeName = hasNamedType ? symbol!.getName() : type.getText();
  }

  // Get import info (type-only for interfaces and named function types)
  const isTypeOnly = type.isInterface() || (!!hasNamedType && callSignatures.length > 0);
  const importInfo = getImportInfo(type, isTypeOnly);

  if (importInfo && hasNamedType) {
    const key = `${importInfo.importPath}:${importInfo.typeName}`;
    importsMap.set(key, importInfo);
  }

  return {
    type: 'external',
    name,
    tsType: type,
    typeName,
    importInfo: hasNamedType ? importInfo : null,
    required,
  };
}

/**
 * Analyzes a primitive, enum, or object type to create a ConfigValue
 */
function analyzeConfigValue(
  name: string,
  type: Type,
  importsMap: Map<string, ImportInfo>
): ConfigValue {
  const isOptional = type.isNullable();
  const nonNullableType = isOptional ? type.getNonNullableType() : type;

  // Check if this has a named type alias
  const symbol = nonNullableType.getAliasSymbol() || nonNullableType.getSymbol();
  const hasNamedType = symbol && symbol.getName() && symbol.getName() !== '__type';

  // Get type string
  let typeString = nonNullableType.getText();
  if (hasNamedType) {
    typeString = symbol!.getName();
  }

  // Get import info for named types
  let importInfo: ImportInfo | null = null;
  if (hasNamedType) {
    importInfo = getImportInfo(nonNullableType, true); // Config types are always type-only imports
    if (importInfo) {
      const key = `${importInfo.importPath}:${importInfo.typeName}`;
      importsMap.set(key, importInfo);
    }
  }

  // Handle object types - analyze nested properties
  let nested: ConfigValue[] | undefined;
  if (nonNullableType.isObject() && !nonNullableType.isArray()) {
    const properties = nonNullableType.getProperties();
    nested = properties.flatMap(prop => {
      const valueDecl = prop.getValueDeclaration();
      if (!valueDecl) return [];

      const propType = prop.getTypeAtLocation(valueDecl);
      return [analyzeConfigValue(prop.getName(), propType, importsMap)];
    });
  }

  return {
    type: 'config',
    name,
    tsType: type,
    typeString,
    optional: isOptional,
    importInfo,
    nested,
  };
}
