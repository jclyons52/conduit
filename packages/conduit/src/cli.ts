#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ContainerCompiler } from './compiler';
import { ConfigLoader } from './compiler/config-loader';

/**
 * Conduit CLI - Command line interface for the Conduit DI compiler
 */
class ConduitCLI {
  private configLoader = new ConfigLoader();
  private compiler = new ContainerCompiler();
  private program = new Command();

  constructor() {
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('conduit')
      .description('Conduit Dependency Injection Compiler')
      .version('1.0.0');

    // Compile command
    this.program
      .command('compile')
      .description('Compile service definitions into tree-shaken containers')
      .option('-c, --config <path>', 'Path to conduit config file')
      .option('-o, --output <dir>', 'Output directory')
      .option('-m, --mode <mode>', 'Compilation mode (container|factories)')
      .option('--dry-run', 'Show what would be generated without writing files')
      .action(this.handleCompile.bind(this));

    // Generate config command
    this.program
      .command('init')
      .description('Generate a sample conduit.config.ts file')
      .option('-f, --force', 'Overwrite existing config file')
      .action(this.handleInit.bind(this));

    // List services command
    this.program
      .command('list')
      .description('List all available services from the config')
      .option('-c, --config <path>', 'Path to conduit config file')
      .action(this.handleList.bind(this));

    // Analyze command
    this.program
      .command('analyze <entryPoint>')
      .description('Analyze dependencies for a specific entry point')
      .option('-c, --config <path>', 'Path to conduit config file')
      .action(this.handleAnalyze.bind(this));
  }

  /**
   * Handle the compile command
   */
  private async handleCompile(options: any): Promise<void> {
    try {
      console.log('🚀 Starting Conduit compilation...\n');

      // Load configuration
      const configPath = this.findConfigPath(options.config);
      const config = await this.configLoader.loadConfig(configPath);

      // Load service definitions
      const serviceDefinitions = await this.configLoader.loadServiceDefinitions(
        config.servicesFile
      );

      console.log(`📁 Using config: ${configPath}`);
      console.log(`📦 Services file: ${config.servicesFile}`);
      console.log(`📂 Output directory: ${config.outputDir}`);
      console.log(
        `🔍 Auto-discover imports: ${config.autoDiscoverImports ? 'Yes' : 'No'}`
      );
      console.log(
        `📝 Found ${Object.keys(serviceDefinitions).length} services`
      );
      console.log(`🎯 Compiling ${config.entryPoints.length} entry points\n`);

      // Ensure output directory exists
      if (!options.dryRun && !fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
      }

      // Compile each entry point
      for (const entryPointConfig of config.entryPoints) {
        console.log(`🔨 Compiling ${entryPointConfig.entryPoint}...`);

        const mode = entryPointConfig.mode || config.mode || 'container';
        const imports = {
          ...config.imports,
          ...entryPointConfig.imports,
        };

        const compileConfig = {
          entryPoint: entryPointConfig.entryPoint,
          mode,
          imports,
        };

        if (!options.dryRun) {
          (compileConfig as any).outputPath = path.join(
            config.outputDir,
            entryPointConfig.outputFile
          );
        }

        const result = this.compiler.compile(serviceDefinitions, compileConfig);

        console.log(`   ✅ Mode: ${result.mode}`);
        console.log(`   📊 Services: ${result.services.length}`);
        console.log(
          `   🔧 External params: ${Object.keys(result.externalParams).length}`
        );
        console.log(`   📁 Output: ${entryPointConfig.outputFile}`);

        if (options.dryRun) {
          console.log('\n📄 Generated code preview:');
          console.log('=' + '='.repeat(50));
          console.log(result.generatedCode);
          console.log('=' + '='.repeat(50));
        }

        console.log('');
      }

      console.log('✨ Compilation completed successfully!');
    } catch (error) {
      console.error('❌ Compilation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Handle the init command
   */
  private async handleInit(options: any): Promise<void> {
    const configPath = path.join(process.cwd(), 'conduit.config.ts');

    if (fs.existsSync(configPath) && !options.force) {
      console.error('❌ Config file already exists. Use --force to overwrite.');
      process.exit(1);
    }

    const sampleConfig = this.generateSampleConfig();
    fs.writeFileSync(configPath, sampleConfig, 'utf8');

    console.log('✅ Generated conduit.config.ts');
    console.log('📝 Edit the config file to match your project structure');
    console.log('🚀 Run "conduit compile" to start compiling!');
  }

  /**
   * Handle the list command
   */
  private async handleList(options: any): Promise<void> {
    try {
      const configPath = this.findConfigPath(options.config);
      const config = await this.configLoader.loadConfig(configPath);
      const serviceDefinitions = await this.configLoader.loadServiceDefinitions(
        config.servicesFile
      );

      console.log('📦 Available Services:');
      console.log('=' + '='.repeat(30));

      for (const [key, provider] of Object.entries(serviceDefinitions)) {
        const typedProvider = provider as any;
        console.log(`🔧 ${key} (${typedProvider.scope || 'scoped'})`);
      }

      console.log(
        `\n📊 Total: ${Object.keys(serviceDefinitions).length} services`
      );
    } catch (error) {
      console.error('❌ Failed to list services:', error);
      process.exit(1);
    }
  }

  /**
   * Handle the analyze command
   */
  private async handleAnalyze(entryPoint: string, options: any): Promise<void> {
    try {
      const configPath = this.findConfigPath(options.config);
      const config = await this.configLoader.loadConfig(configPath);
      const serviceDefinitions = await this.configLoader.loadServiceDefinitions(
        config.servicesFile
      );

      console.log(`🔍 Analyzing dependencies for: ${entryPoint}\n`);

      const result = this.compiler.compile(serviceDefinitions, {
        entryPoint,
        mode: 'container',
        imports: config.imports || {},
      });

      console.log('📊 Dependency Analysis:');
      console.log('=' + '='.repeat(30));
      console.log(`🎯 Entry point: ${entryPoint}`);
      console.log(`📦 Required services: ${result.services.length}`);
      console.log(
        `🔧 External parameters: ${Object.keys(result.externalParams).length}`
      );
      console.log(`📁 Import groups: ${result.imports.length}`);

      console.log('\n🏗️  Services in dependency order:');
      result.services.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.key} (${service.scope})`);
        if (service.dependencies.length > 0) {
          console.log(`     Dependencies: ${service.dependencies.join(', ')}`);
        }
      });

      if (Object.keys(result.externalParams).length > 0) {
        console.log('\n🔧 External parameters:');
        Object.entries(result.externalParams).forEach(
          ([serviceName, params]) => {
            console.log(`  - ${serviceName}:`);
            Object.entries(params).forEach(([paramName, paramType]) => {
              console.log(`    • ${paramName}: ${paramType}`);
            });
          }
        );
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }

  /**
   * Find configuration file path
   */
  private findConfigPath(providedPath?: string): string {
    if (providedPath) {
      if (!fs.existsSync(providedPath)) {
        throw new Error(`Config file not found: ${providedPath}`);
      }
      return providedPath;
    }

    const foundPath = this.configLoader.findConfigFile();
    if (!foundPath) {
      throw new Error(
        'No conduit config file found. Run "conduit init" to create one.'
      );
    }

    return foundPath;
  }

  /**
   * Generate sample configuration file content
   */
  private generateSampleConfig(): string {
    return `// Conduit compilation configuration
import { ConduitConfig } from 'conduit';

const config: ConduitConfig = {
  servicesFile: './src/services.ts',
  outputDir: './generated',
  autoDiscoverImports: true,
  mode: 'container',
  
  entryPoints: [
    {
      entryPoint: 'userService',
      outputFile: 'user-service-container.ts',
      mode: 'container',
    },
    // Add more entry points as needed
  ],
  
  // Manual import mappings (auto-discovered if autoDiscoverImports is true)
  imports: {
    // 'ClassName': './path/to/class',
  },
};

export default config;
`;
  }

  /**
   * Run the CLI
   */
  public run(): void {
    this.program.parse();
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new ConduitCLI();
  cli.run();
}

export { ConduitCLI };
