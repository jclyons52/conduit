import { compile } from '../src/compiler';
import * as path from 'path';
import * as fs from 'fs';

describe('Integration Tests', () => {
  const outputDir = path.resolve(__dirname, './fixtures/generated');

  beforeAll(() => {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up generated files
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe('End-to-End Compilation', () => {
    it('should compile example app dependencies successfully', () => {
      const basePath = '../../../apps/example/';
      const outputPath = path.resolve(
        __dirname,
        outputDir,
        'example-container.ts'
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
      expect(result.length).toBeGreaterThan(0);

      // Should contain key structures
      expect(result).toContain('export interface DepsConfig');
      expect(result).toContain('type FactoryDeps');
      expect(result).toContain('export function createAppDependenciesContainer');
    });

    // Note: Additional integration tests using test fixtures would require
    // including test files in tsconfig, which we don't want for the build.
    // The example app test above provides sufficient end-to-end coverage.
  });

  describe('Verbose Mode', () => {
    it('should log analysis details in verbose mode', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const basePath = '../../../apps/example/';
      const outputPath = path.resolve(
        __dirname,
        outputDir,
        'verbose-test.ts'
      );
      const tsConfigPath = path.resolve(__dirname, basePath + 'tsconfig.json');
      const entryPointPath = path.resolve(
        __dirname,
        basePath + 'src/app-dependencies.ts'
      );

      compile(
        tsConfigPath,
        {
          entryPoint: entryPointPath,
          typeName: 'AppDependencies',
          outputFile: outputPath,
        },
        true // verbose
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('Provider Analysis:');

      // Check that the expected log messages appear in the call list
      const calls = consoleLogSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Factory Providers'))).toBe(true);
      expect(calls.some(call => call.includes('External Providers'))).toBe(true);
      expect(calls.some(call => call.includes('Config Values'))).toBe(true);
      expect(calls.some(call => call.includes('Imports'))).toBe(true);

      consoleLogSpy.mockRestore();
    });
  });

  // Generated code validity is implicitly tested by the example app build
});
