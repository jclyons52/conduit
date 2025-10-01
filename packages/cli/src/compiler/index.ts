import { EntryPointConfig, loadEntrypointType } from './load';
import { analyzeProviders } from './inference';
import { generateContainer } from './codegen';

/**
 * Compiles a TypeScript dependencies type into a DI container.
 *
 * This function uses ts-morph throughout the entire compilation process:
 * 1. Load: Uses ts-morph to load and parse the entry point type
 * 2. Analyze: Analyzes the ts-morph Type to determine what providers are needed
 * 3. Generate: Generates container code using ts-morph's code generation API
 *
 * @param tsConfigPath - Path to tsconfig.json
 * @param config - Entry point configuration
 * @param verbose - Enable verbose logging
 * @returns Generated container code as a string
 */
export function compile(
  tsConfigPath: string,
  { entryPoint, typeName, outputFile }: EntryPointConfig,
  verbose = false
) {
  // STEP 1: Load the entry point type using ts-morph
  const dependenciesType = loadEntrypointType(tsConfigPath, entryPoint, typeName);

  // STEP 2: Analyze the type to determine providers, config, and imports
  // This applies the provider inference rules documented in inference/provider-rules.ts
  const analysis = analyzeProviders(dependenciesType);

  if (verbose) {
    console.log('Provider Analysis:');
    console.log('  Factory Providers:', analysis.factoryProviders.length);
    analysis.factoryProviders.forEach(f => {
      console.log(`    - ${f.name}: ${f.className}`);
      f.constructorParams.forEach(p => {
        console.log(`      * ${p.name}: ${p.source.type === 'config' ? 'config' : 'provider'}`);
      });
    });
    console.log('  External Providers:', analysis.externalProviders.length);
    analysis.externalProviders.forEach(e => {
      console.log(`    - ${e.name}: ${e.typeName} (${e.required ? 'required' : 'optional'})`);
    });
    console.log('  Config Values:', analysis.configValues.length);
    console.log('  Imports:', analysis.imports.length);
  }

  // STEP 3: Generate container code using ts-morph
  return generateContainer(analysis, typeName, outputFile);
}
