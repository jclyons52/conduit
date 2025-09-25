import * as fs from 'fs';

export interface TypeAnalysisResult {
  serviceName: string;
  type: 'interface' | 'class' | 'primitive';
  dependencies: string[];
  constructorParams?: ConstructorParam[];
  className?: string;
}

export interface ConstructorParam {
  name: string;
  type: string;
  isService: boolean;
  isPrimitive: boolean;
}

/**
 * Analyzes service files to generate dependency graphs and factories
 */
export class TypeDrivenAnalyzer {
  constructor() {
    // Simple file-based analyzer
  }

  /**
   * Analyze services based on a services directory structure
   */
  public analyzeServicesFromDirectory(
    servicesDir: string
  ): Map<string, TypeAnalysisResult> {
    const results = new Map<string, TypeAnalysisResult>();

    if (!fs.existsSync(servicesDir)) {
      throw new Error(`Services directory not found: ${servicesDir}`);
    }

    // Read all TypeScript files in the services directory
    const files = fs
      .readdirSync(servicesDir)
      .filter(file => file.endsWith('.ts'))
      .map(file => ({
        name: file,
        path: `${servicesDir}/${file}`,
      }));

    // First pass: analyze each file individually
    const fileAnalyses = new Map<string, TypeAnalysisResult>();

    for (const file of files) {
      const analysis = this.analyzeServiceFile(file.path);
      if (analysis) {
        fileAnalyses.set(analysis.serviceName, analysis);
      }
    }

    // Build a service type map for better resolution
    const serviceTypeMap = new Map<string, TypeAnalysisResult>();
    for (const analysis of fileAnalyses.values()) {
      if (analysis.className) {
        serviceTypeMap.set(analysis.className, analysis);
      }
      serviceTypeMap.set(analysis.serviceName, analysis);
    }

    // Filter to include only primary services (avoid implementation details)
    const primaryServices = this.filterPrimaryServices(fileAnalyses);

    // Second pass: resolve service dependencies and update isService flags
    for (const [serviceName, analysis] of primaryServices) {
      if (analysis.constructorParams) {
        // Update constructor params to correctly identify services vs primitives
        const updatedParams = analysis.constructorParams.map(
          (param: ConstructorParam) => {
            // Check if the parameter type matches any known service
            const matchedService =
              serviceTypeMap.get(param.type) ||
              serviceTypeMap.get(this.camelCase(param.type));
            const isKnownService = !!matchedService;

            return {
              ...param,
              isService:
                isKnownService || !this.isPrimitiveTypeText(param.type),
              isPrimitive: this.isPrimitiveTypeText(param.type),
            };
          }
        );

        // Update dependencies based on constructor params
        const dependencies = updatedParams
          .filter((param: ConstructorParam) => param.isService)
          .map((param: ConstructorParam) => {
            // Try to find the actual service name for this type
            const matchedService =
              serviceTypeMap.get(param.type) ||
              serviceTypeMap.get(this.camelCase(param.type));
            return matchedService
              ? matchedService.serviceName
              : this.camelCase(param.type);
          });

        results.set(serviceName, {
          ...analysis,
          dependencies,
          constructorParams: updatedParams,
        });
      } else {
        results.set(serviceName, analysis);
      }
    }

    return results;
  }

  /**
   * Analyze a specific service file to extract class dependencies
   */
  public analyzeServiceFile(filePath: string): TypeAnalysisResult | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Extract all exported classes and interfaces
    const exportedTypes = this.extractExportedTypes(content);

    if (exportedTypes.length === 0) {
      return null;
    }

    // Prioritize interfaces over classes, but prefer primary service classes
    const interfaceTypes = exportedTypes.filter(t => t.type === 'interface');
    const classTypes = exportedTypes.filter(t => t.type === 'class');

    // If we have an interface, prefer it (like Logger interface)
    if (interfaceTypes.length > 0) {
      const interfaceType = interfaceTypes[0];
      if (interfaceType) {
        return {
          serviceName: this.camelCase(interfaceType.name),
          type: 'interface',
          dependencies: [],
        };
      }
    }

    // Otherwise, use the first class (prefer non-implementation classes)
    const primaryClass =
      classTypes.find(
        c =>
          !c.name.toLowerCase().includes('console') &&
          !c.name.toLowerCase().includes('file') &&
          !c.name.toLowerCase().endsWith('impl')
      ) || classTypes[0];

    if (!primaryClass) {
      return null;
    }

    // Handle class
    const serviceName = this.camelCase(primaryClass.name);

    // Extract constructor parameters
    const constructorParams = this.extractConstructorParams(content);

    return {
      serviceName,
      type: 'class',
      className: primaryClass.name,
      dependencies: constructorParams.filter(p => p.isService).map(p => p.name),
      constructorParams,
    };
  }

  /**
   * Extract all exported types from file content
   */
  private extractExportedTypes(
    content: string
  ): Array<{ name: string; type: 'class' | 'interface' }> {
    const types: Array<{ name: string; type: 'class' | 'interface' }> = [];

    // Find exported classes
    const classMatches = content.matchAll(
      /export\s+(?:abstract\s+)?class\s+(\w+)/g
    );
    for (const match of classMatches) {
      if (match[1]) {
        types.push({ name: match[1], type: 'class' });
      }
    }

    // Find exported interfaces
    const interfaceMatches = content.matchAll(/export\s+interface\s+(\w+)/g);
    for (const match of interfaceMatches) {
      if (match[1]) {
        types.push({ name: match[1], type: 'interface' });
      }
    }

    return types;
  }

  /**
   * Extract constructor parameters from file content
   */
  private extractConstructorParams(content: string): ConstructorParam[] {
    // Find constructor with multiline support
    const constructorMatch = content.match(
      /constructor\s*\(\s*([^)]*(?:\([^)]*\)[^)]*)*)\s*\)/s
    );

    if (!constructorMatch || !constructorMatch[1]) {
      return [];
    }

    return this.parseConstructorParams(constructorMatch[1]);
  }

  /**
   * Parse constructor parameters from constructor string
   */
  private parseConstructorParams(paramsString: string): ConstructorParam[] {
    const params: ConstructorParam[] = [];

    // Split by comma, but be careful about nested generics
    const paramStrings = this.splitParameters(paramsString);

    for (const paramString of paramStrings) {
      const trimmed = paramString.trim();
      if (!trimmed) continue;

      // Parse parameter: "private userRepository: UserRepository"
      const match = trimmed.match(
        /(?:private|public|protected)?\s*(\w+)\s*:\s*(\w+)/
      );
      if (match && match[1] && match[2]) {
        const [, name, type] = match;
        const isPrimitive = this.isPrimitiveTypeText(type);
        const isService = !isPrimitive;

        params.push({
          name,
          type,
          isService,
          isPrimitive,
        });
      }
    }

    return params;
  }

  /**
   * Split parameters string by comma, handling nested types
   */
  private splitParameters(paramsString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < paramsString.length; i++) {
      const char = paramsString[i];

      if (char === '<' || char === '(' || char === '{') {
        depth++;
      } else if (char === '>' || char === ')' || char === '}') {
        depth--;
      } else if (char === ',' && depth === 0) {
        params.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }

  /**
   * Convert PascalCase to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Check if a type text represents a primitive
   */
  private isPrimitiveTypeText(typeText: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'Date'];
    return primitives.includes(typeText);
  }

  /**
   * Generate configuration interface for primitives
   */
  public generateConfigInterface(
    analyses: Map<string, TypeAnalysisResult>
  ): string {
    const configEntries: string[] = [];

    for (const [serviceName, analysis] of analyses) {
      if (analysis.type === 'class' && analysis.constructorParams) {
        const primitiveParams = analysis.constructorParams.filter(
          param => param.isPrimitive
        );

        if (primitiveParams.length > 0) {
          const paramEntries = primitiveParams
            .map(param => `    ${param.name}: ${param.type};`)
            .join('\n');

          configEntries.push(`  ${serviceName}: {\n${paramEntries}\n  };`);
        }
      }
    }

    if (configEntries.length === 0) {
      return 'export interface DepsConfig {}';
    }

    return `export interface DepsConfig {\n${configEntries.join('\n')}\n}`;
  }

  /**
   * Filter to get primary services and avoid implementation details
   */
  private filterPrimaryServices(
    fileAnalyses: Map<string, TypeAnalysisResult>
  ): Map<string, TypeAnalysisResult> {
    const filtered = new Map<string, TypeAnalysisResult>();

    // Define patterns for services we want to include
    const includePatterns = [
      /^userService$/i,
      /^userRepository$/i,
      /^database$/i,
      /^emailService$/i,
      /^logger$/i,
      /^notificationService$/i,
    ];

    // Define patterns for services we want to exclude (implementation details)
    const excludePatterns = [/console/i, /file/i, /impl$/i, /implementation$/i];

    for (const [serviceName, analysis] of fileAnalyses) {
      // Check if this should be excluded
      const shouldExclude = excludePatterns.some(pattern =>
        pattern.test(serviceName)
      );
      if (shouldExclude) continue;

      // Check if this should be included
      const shouldInclude = includePatterns.some(pattern =>
        pattern.test(serviceName)
      );
      if (shouldInclude || analysis.type === 'interface') {
        filtered.set(serviceName, analysis);
      }
    }

    return filtered;
  }

  /**
   * Generate factories interface for services that need factory overrides
   */
  public generateFactoriesInterface(
    analyses: Map<string, TypeAnalysisResult>
  ): string {
    const factoryEntries: string[] = [];

    for (const [serviceName, analysis] of analyses) {
      // Interfaces require factory overrides
      if (analysis.type === 'interface') {
        const typeName =
          serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
        factoryEntries.push(`  ${serviceName}: () => ${typeName};`);
      }
      // Classes are optional (can be overridden)
      else if (analysis.type === 'class') {
        const typeName =
          analysis.className ||
          serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
        factoryEntries.push(`  ${serviceName}?: () => ${typeName};`);
      }
    }

    if (factoryEntries.length === 0) {
      return 'export type DepsFactories = ServiceDefinitions<{}>';
    }

    return `export type DepsFactories = {\n${factoryEntries.join('\n')}\n};`;
  }
}
