import { compile } from '../src/compiler';
import * as fs from 'fs';
import * as path from 'path';

describe('New Compile Test', () => {
  it('should run the compile command without errors', () => {
    const outputPath = path.resolve(
      __dirname,
      '../src/example/generated/test.ts'
    );
    const tsConfigPath = path.resolve(__dirname, '../tsconfig.json');
    const entryPointPath = path.resolve(
      __dirname,
      '../src/example/services.ts'
    );
    const result = compile(tsConfigPath, {
      entryPoint: entryPointPath,
      typeName: 'Deps',
      outputFile: outputPath,
    });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result);
  });
});
