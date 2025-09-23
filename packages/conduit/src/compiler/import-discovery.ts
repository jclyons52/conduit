import * as fs from 'fs';
import * as path from 'path';

/**
 * Discovers imports from TypeScript files by analyzing import statements
 */
export class ImportDiscovery {
  /**
   * Analyze a services file and extract all class imports
   */
  public discoverImports(servicesFilePath: string): Record<string, string> {
    const imports: Record<string, string> = {};

    if (!fs.existsSync(servicesFilePath)) {
      throw new Error(`Services file not found: ${servicesFilePath}`);
    }

    const content = fs.readFileSync(servicesFilePath, 'utf8');
    const importStatements = this.extractImportStatements(content);

    for (const importStmt of importStatements) {
      const classNames = this.extractClassNames(importStmt.namedImports);
      for (const className of classNames) {
        imports[className] = this.resolvePath(
          servicesFilePath,
          importStmt.path
        );
      }
    }

    return imports;
  }

  /**
   * Extract all import statements from TypeScript content
   */
  private extractImportStatements(content: string): ImportStatement[] {
    const statements: ImportStatement[] = [];

    // Match named imports: import { Class1, Class2 } from './path';
    const namedImportRegex =
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"`]([^'"`]+)['"`]/g;

    let match;
    while ((match = namedImportRegex.exec(content)) !== null) {
      if (match[1] && match[2]) {
        statements.push({
          namedImports: match[1].trim(),
          path: match[2],
        });
      }
    }

    return statements;
  }

  /**
   * Extract class names from named import string
   */
  private extractClassNames(namedImports: string): string[] {
    return namedImports
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .filter(name => this.isLikelyClassName(name));
  }

  /**
   * Check if an import name is likely a class (starts with uppercase)
   */
  private isLikelyClassName(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Resolve relative import path to absolute path
   */
  private resolvePath(baseFile: string, importPath: string): string {
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const baseDir = path.dirname(baseFile);
      const resolved = path.resolve(baseDir, importPath);
      const relative = path.relative(path.dirname(baseFile), resolved);
      return relative.startsWith('.') ? relative : `./${relative}`;
    }
    return importPath;
  }

  /**
   * Discover imports from multiple files in a directory
   */
  public discoverFromDirectory(directoryPath: string): Record<string, string> {
    const imports: Record<string, string> = {};

    if (!fs.existsSync(directoryPath)) {
      return imports;
    }

    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
      if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        const filePath = path.join(directoryPath, file);
        try {
          const fileImports = this.discoverImports(filePath);
          Object.assign(imports, fileImports);
        } catch (error) {
          // Skip files that can't be parsed
          console.warn(
            `Warning: Could not parse imports from ${filePath}: ${error}`
          );
        }
      }
    }

    return imports;
  }

  /**
   * Discover all class implementations from a services directory
   */
  public discoverServiceClasses(servicesDir: string): Record<string, string> {
    const classes: Record<string, string> = {};

    if (!fs.existsSync(servicesDir)) {
      return classes;
    }

    const files = fs.readdirSync(servicesDir);

    for (const file of files) {
      if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        const filePath = path.join(servicesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Find class declarations
        const classRegex = /export\s+class\s+([A-Z][a-zA-Z0-9_]*)/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
          const className = match[1];
          if (className) {
            const relativePath = `./${path.relative(path.dirname(servicesDir), filePath).replace(/\.ts$/, '')}`;
            classes[className] = relativePath;
          }
        }
      }
    }

    return classes;
  }
}

interface ImportStatement {
  namedImports: string;
  path: string;
}
