#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader,ConduitConfig } from './compiler/config-loader';
import { compile } from './new-compiler';

/**
 * Conduit CLI - Command line interface for the Conduit DI compiler
 */
class ConduitCLI {
  private configLoader = new ConfigLoader();
  private program = new Command();

  constructor() {
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('conduit')
      .description('Conduit Dependency Injection Compiler')
      .version('1.0.0');

    // Generate config command
    this.program
      .command('init')
      .description('Generate a sample conduit.config.ts file')
      .option('-f, --force', 'Overwrite existing config file')
      .action(this.handleInit.bind(this));

    // Type-driven generate command
    this.program
      .command('compile')
      .description(
        'Generate type-driven containers based on ServiceDefinitions'
      )
      .option('-c, --config <path>', 'Path to conduit config file')
      .option('-o, --output <file>', 'Output file name')
      .option('--dry-run', 'Show what would be generated without writing files')
      .action(this.handleGenerateTypes.bind(this));
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
    const sampleConfig: ConduitConfig = {
      tsConfigPath: 'tsconfig.json',
      entryPoints: [
        {
          entryPoint: './src/app.ts',
          typeName: 'AppDependencies',
          outputFile: './src/generated/container.ts',
        },
      ],
    }
    return JSON.stringify(sampleConfig, null, 2).replace(/\"([^(\")"]+)\":/g,"$1:");
  }

  /**
   * Handle the generate-types command
   */
  private async handleGenerateTypes(options: any): Promise<void> {
    try {
      console.log('🚀 Starting type-driven generation...\n');

      const configPath = this.findConfigPath(options.config);
      const config = await this.configLoader.loadConfig(configPath);

      config.entryPoints.forEach(ep => {
        const result = compile('./tsconfig.json', ep);
        const outputPath = ep.outputFile
        console.log(`📁 Writing to: ${outputPath}`);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputPath, result, 'utf8');
        console.log(`📁 Generated: ${outputPath}`);
      });
      console.log('✨ Type-driven generation completed successfully!');
    } catch (error) {
      console.error('❌ Type-driven generation failed:', error);
      process.exit(1);
    }
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
