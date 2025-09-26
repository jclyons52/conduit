import { compile } from '../src/new-compiler';
import * as fs from 'fs';
import * as path from 'path';

describe('New Compile Test', () => {
  it('should run the compile command without errors', () => {
    const outputPath = path.resolve(
      __dirname,
      '../src/example/generated/test.ts'
    );
    const result = compile('./tsconfig.json', {
      entryPoint: './src/example/services.ts',
      typeName: 'Deps',
      outputFile: outputPath,
    });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result);
  });
});
