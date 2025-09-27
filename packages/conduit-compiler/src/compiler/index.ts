import {
  buildDependencyTree,
  convertToFactoriesStructure,
  recursivelyUpdateImportPaths,
} from './parse';
import { generateContainerCode, printTree } from './output';
import { EntryPointConfig, loadEntrypointType } from './load';

export function compile(
  tsConfigPath: string,
  { entryPoint, typeName, outputFile }: EntryPointConfig,
  verbose = false
) {
  // load
  const entrypoint = loadEntrypointType(tsConfigPath, entryPoint, typeName);

  // parse
  const tree = buildDependencyTree(entrypoint);
  const relativeTree = recursivelyUpdateImportPaths(tree, outputFile);
  if (verbose) {
    console.log('Full Dependency Tree:');
    console.log(printTree('text', { nodes: relativeTree, recursive: true }));
  }
  const factoryTypes = convertToFactoriesStructure(relativeTree);
  if (verbose) {
    console.log('Factory Types Tree:');
    console.log(printTree('text', { nodes: factoryTypes }));
  }

  // output
  return generateContainerCode(typeName, factoryTypes);
}
