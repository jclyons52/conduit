import path from 'path';
import {
  convertToFactoriesStructure,
  recursivelyUpdateImportPaths,
} from '../src/compiler/parse';
import { dependencyTree } from './dependency-tree';
import { relativeDependencyTree } from './relative-dependency-tree';
import { factoryTypes as expectedFactoryTypes } from './factory-types';

describe('Parse Test', () => {
  test('should convert imports to relative paths', () => {
    const outputFile = path.resolve(
      __dirname,
      '../src/example/generated/test.ts'
    );
    const relativeTree = recursivelyUpdateImportPaths(
      dependencyTree,
      outputFile
    );
    expect(relativeTree).toEqual(relativeDependencyTree);
  });

  test('should convert dependency tree to factory types', () => {
    const factoryTypes = convertToFactoriesStructure(relativeDependencyTree);
    expect(factoryTypes).toEqual(expectedFactoryTypes);
  });
});
