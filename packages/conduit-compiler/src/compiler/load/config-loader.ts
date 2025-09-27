import * as fs from 'fs';
import * as path from 'path';

export interface ConduitConfig {
  tsConfigPath?: string;
  entryPoints: EntryPointConfig[];
}

export interface EntryPointConfig {
  entryPoint: string;
  typeName: string;
  outputFile: string;
}

/**
 * Loads and processes Conduit configuration files
 */
export class ConfigLoader {
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
    processedConfig.tsConfigPath = this.resolvePath(
      baseDir,
      config.tsConfigPath || 'tsconfig.json'
    );
    processedConfig.entryPoints = config.entryPoints.map(ep => ({
      ...ep,
      entryPoint: this.resolvePath(baseDir, ep.entryPoint),
      outputFile: this.resolvePath(baseDir, ep.outputFile),
    }));

    return processedConfig;
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
    const configNames = ['conduit.config.js', 'conduit.config.json'];

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
}
