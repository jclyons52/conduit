import * as fs from 'fs';
import * as path from 'path';
import { ImportDiscovery } from './import-discovery';

export interface ConduitConfig {
  /** Entry points to compile */
  entryPoints: EntryPointConfig[];

  /** Global import mappings */
  imports?: Record<string, string>;

  /** Output directory for generated files */
  outputDir: string;

  /** Services file location */
  servicesFile: string;

  /** Auto-discover imports from service files */
  autoDiscoverImports?: boolean;

  /** Mode for compilation */
  mode?: 'container' | 'factories';
}

export interface EntryPointConfig {
  /** Service key to use as entry point */
  entryPoint: string;

  typeName: string;

  /** Output filename */
  outputFile: string;

  /** Compilation mode for this entry point */
  mode?: 'container' | 'factories';

  /** Custom imports for this entry point */
  imports?: Record<string, string>;
}

/**
 * Loads and processes Conduit configuration files
 */
export class ConfigLoader {
  private importDiscovery = new ImportDiscovery();

  /**
   * Load configuration from a file
   */
  public async loadConfig(configPath: string): Promise<ConduitConfig> {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const resolvedPath = path.resolve(configPath);

    // Clear require cache to ensure fresh config load
    delete require.cache[resolvedPath];

    let config: ConduitConfig;

    try {
      // Handle TypeScript config files
      if (configPath.endsWith('.ts')) {
        // Try to register tsx
        try {
          require('tsx/cjs');
        } catch (e1) {
          try {
            require('ts-node/register');
          } catch (e2) {
            throw new Error(
              'TypeScript config files require tsx or ts-node to be installed. Install with: npm install tsx'
            );
          }
        }
      }

      // Import the config file
      const configModule = require(resolvedPath);
      config = configModule.default || configModule;
    } catch (error) {
      throw new Error(`Failed to load config from ${configPath}: ${error}`);
    }

    return this.processConfig(config, path.dirname(configPath));
  }

  /**
   * Process and enhance configuration with auto-discovery
   */
  private processConfig(config: ConduitConfig, baseDir: string): ConduitConfig {
    const processedConfig = { ...config };

    // Resolve paths relative to config file
    processedConfig.servicesFile = this.resolvePath(
      baseDir,
      config.servicesFile
    );
    processedConfig.outputDir = this.resolvePath(baseDir, config.outputDir);

    // Auto-discover imports if enabled
    if (config.autoDiscoverImports) {
      const discoveredImports = this.discoverImports(
        processedConfig.servicesFile,
        baseDir
      );
      processedConfig.imports = {
        ...discoveredImports,
        ...config.imports, // Manual imports override auto-discovered
      };
    }

    return processedConfig;
  }

  /**
   * Auto-discover imports from services file and directory
   */
  private discoverImports(
    servicesFile: string,
    baseDir: string
  ): Record<string, string> {
    const imports: Record<string, string> = {};

    try {
      // Discover from the main services file
      const serviceFileImports =
        this.importDiscovery.discoverImports(servicesFile);
      Object.assign(imports, serviceFileImports);

      // Also discover from services directory if it exists
      const servicesDir = path.join(baseDir, 'src', 'services');
      if (fs.existsSync(servicesDir)) {
        const serviceDirImports =
          this.importDiscovery.discoverServiceClasses(servicesDir);
        Object.assign(imports, serviceDirImports);
      }
    } catch (error) {
      console.warn(`Warning: Could not auto-discover imports: ${error}`);
    }

    return imports;
  }

  /**
   * Resolve path relative to base directory
   */
  private resolvePath(baseDir: string, relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.resolve(baseDir, relativePath);
  }

  /**
   * Find config file in current directory or parent directories
   */
  public findConfigFile(startDir: string = process.cwd()): string | null {
    const configNames = [
      'conduit.config.ts',
      'conduit.config.js',
      'conduit.config.json',
    ];

    let currentDir = startDir;

    while (currentDir !== path.dirname(currentDir)) {
      for (const configName of configNames) {
        const configPath = path.join(currentDir, configName);
        if (fs.existsSync(configPath)) {
          return configPath;
        }
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Load services definitions from the configured services file
   */
  public async loadServiceDefinitions(servicesFile: string): Promise<any> {
    if (!fs.existsSync(servicesFile)) {
      throw new Error(`Services file not found: ${servicesFile}`);
    }

    const resolvedPath = path.resolve(servicesFile);

    // Clear require cache
    delete require.cache[resolvedPath];

    try {
      // Handle TypeScript service files
      if (servicesFile.endsWith('.ts')) {
        // Try to register tsx
        try {
          require('tsx/cjs');
        } catch (e1) {
          try {
            require('ts-node/register');
          } catch (e2) {
            throw new Error(
              'TypeScript service files require tsx or ts-node to be installed. Install with: npm install tsx'
            );
          }
        }
      }

      const servicesModule = require(resolvedPath);
      return (
        servicesModule.serviceDefinitions ||
        servicesModule.default ||
        servicesModule
      );
    } catch (error) {
      throw new Error(`Failed to load services from ${servicesFile}: ${error}`);
    }
  }
}
