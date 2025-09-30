import { compile } from '../src/compiler';
import * as path from 'path';

describe('New Compile Test', () => {
  it('should run the compile command without errors', () => {
    const basePath = '../../../apps/example/';
    const outputPath = path.resolve(
      __dirname,
      basePath + 'src/generated/example.ts'
    );
    const tsConfigPath = path.resolve(__dirname, basePath + 'tsconfig.json');
    const entryPointPath = path.resolve(
      __dirname,
      basePath + 'src/app-dependencies.ts'
    );
    const result = compile(tsConfigPath, {
      entryPoint: entryPointPath,
      typeName: 'AppDependencies',
      outputFile: outputPath,
    });
    expect(result).toBeDefined();
  });
});
