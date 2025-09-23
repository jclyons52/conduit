// Test script for the full workspace example
import { ConfigLoader, ContainerCompiler } from 'conduit';
import * as path from 'path';

async function testWorkspaceCompilation() {
  console.log('🚀 Testing Workspace Compilation with Auto-Discovery\n');

  const configLoader = new ConfigLoader();
  const compiler = new ContainerCompiler();

  try {
    // Load configuration from the workspace
    const configPath = path.join(__dirname, 'conduit.config.js');
    console.log(`📁 Loading config from: ${configPath}`);

    const config = await configLoader.loadConfig(configPath);
    console.log(`✅ Config loaded successfully`);
    console.log(`📦 Services file: ${config.servicesFile}`);
    console.log(`📂 Output directory: ${config.outputDir}`);
    console.log(`🔍 Auto-discover imports: ${config.autoDiscoverImports}`);

    // Load service definitions
    const serviceDefinitions = await configLoader.loadServiceDefinitions(
      config.servicesFile
    );
    console.log(
      `📋 Loaded ${Object.keys(serviceDefinitions).length} services\n`
    );

    // Show discovered imports
    if (config.imports) {
      console.log('🔍 Auto-discovered imports:');
      Object.entries(config.imports).forEach(([className, path]) => {
        console.log(`   ${className} -> ${path}`);
      });
      console.log('');
    }

    // Test each entry point
    for (const entryPointConfig of config.entryPoints) {
      console.log(
        `🎯 Testing ${entryPointConfig.entryPoint} (${entryPointConfig.mode}):`
      );

      const result = compiler.compile(serviceDefinitions, {
        entryPoint: entryPointConfig.entryPoint,
        mode: entryPointConfig.mode || config.mode || 'container',
        imports: config.imports || {},
      });

      console.log(`   📊 Services included: ${result.services.length}`);
      console.log(`   🔧 External params: ${result.externalParams.length}`);
      console.log(`   📁 Import groups: ${result.imports.length}`);

      // Show dependency tree
      console.log('   🏗️  Dependency tree:');
      result.services.forEach((service, index) => {
        const deps =
          service.dependencies.length > 0
            ? ` (depends on: ${service.dependencies.join(', ')})`
            : '';
        console.log(`      ${index + 1}. ${service.key}${deps}`);
      });

      if (result.externalParams.length > 0) {
        console.log('   🔧 External parameters:');
        result.externalParams.forEach(param => {
          console.log(`      - ${param}`);
        });
      }

      console.log('');
    }

    // Test specific analysis
    console.log('🔍 Detailed Analysis for userService:');
    console.log('=' + '='.repeat(50));

    const userServiceResult = compiler.compile(serviceDefinitions, {
      entryPoint: 'userService',
      mode: 'container',
      imports: config.imports || {},
    });

    console.log('Generated Code Preview:');
    console.log('-'.repeat(30));
    console.log(userServiceResult.generatedCode);
    console.log('-'.repeat(30));
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

if (require.main === module) {
  testWorkspaceCompilation().catch(console.error);
}

export { testWorkspaceCompilation };
