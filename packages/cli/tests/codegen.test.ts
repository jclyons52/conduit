import { Project } from 'ts-morph';
import { analyzeProviders } from '../src/compiler/inference/analyze-providers';
import { generateContainer } from '../src/compiler/codegen/generate-container';
import * as path from 'path';

describe('Code Generation', () => {
  let project: Project;

  beforeAll(() => {
    project = new Project({
      tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
    });
  });

  describe('generateContainer', () => {
    it('should generate valid TypeScript code', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const simpleDepsType = sourceFile
        .getTypeAlias('SimpleDependencies')!
        .getType();

      const analysis = analyzeProviders(simpleDepsType);
      const code = generateContainer(
        analysis,
        'SimpleDependencies',
        '/test/output.ts'
      );

      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThan(0);
      expect(code).toContain('export interface DepsConfig');
      expect(code).toContain('type FactoryDeps');
      expect(code).toContain('export function createSimpleDependenciesContainer');
    });

    it('should include DepsConfig for classes with config params', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const configDepsType = sourceFile
        .getTypeAlias('ConfigDependencies')!
        .getType();

      const analysis = analyzeProviders(configDepsType);
      const code = generateContainer(
        analysis,
        'ConfigDependencies',
        '/test/output.ts'
      );

      expect(code).toContain('export interface DepsConfig');
      expect(code).toContain('database:');
      expect(code).toContain('url: string');
      expect(code).toContain('port: number');
      expect(code).toContain('ssl: boolean');
    });

    it('should generate FactoryDeps with optional class providers', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const simpleDepsType = sourceFile
        .getTypeAlias('SimpleDependencies')!
        .getType();

      const analysis = analyzeProviders(simpleDepsType);
      const code = generateContainer(
        analysis,
        'SimpleDependencies',
        '/test/output.ts'
      );

      expect(code).toContain('type FactoryDeps');
      expect(code).toContain('simple?: SimpleService');
      expect(code).toContain('logger: ILogger');
    });

    it('should generate factory functions with correct dependencies', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const complexDepsType = sourceFile
        .getTypeAlias('ComplexDependencies')!
        .getType();

      const analysis = analyzeProviders(complexDepsType);
      const code = generateContainer(
        analysis,
        'ComplexDependencies',
        '/test/output.ts'
      );

      // AdminService depends on logger and userService
      expect(code).toContain('adminService: ({ logger, userService }) =>');
      expect(code).toContain('new AdminService(logger, userService)');

      // UserService depends on logger, databaseService (auto-discovered), and has apiKey from config
      expect(code).toContain('userService: ({ logger, databaseService }) =>');
      expect(code).toContain('new UserService(logger, databaseService,');
    });

    it('should generate imports for all dependencies', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const complexDepsType = sourceFile
        .getTypeAlias('ComplexDependencies')!
        .getType();

      const analysis = analyzeProviders(complexDepsType);
      const code = generateContainer(
        analysis,
        'ComplexDependencies',
        '/test/output.ts'
      );

      expect(code).toContain('import { createContainer, ServiceDefinitions }');
      // Classes can be grouped in one import statement
      expect(code).toMatch(/import.*UserService/);
      expect(code).toMatch(/import.*AdminService/);
      expect(code).toContain('import type { ILogger }');
    });

    it('should handle function types correctly', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const functionDepsType = sourceFile
        .getTypeAlias('FunctionDependencies')!
        .getType();

      const analysis = analyzeProviders(functionDepsType);
      const code = generateContainer(
        analysis,
        'FunctionDependencies',
        '/test/output.ts'
      );

      expect(code).toContain('errorHandler: (error: Error) => void');
      expect(code).toContain('idGenerator: () => string');
    });

    it('should create proper container creation function', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const simpleDepsType = sourceFile
        .getTypeAlias('SimpleDependencies')!
        .getType();

      const analysis = analyzeProviders(simpleDepsType);
      const code = generateContainer(
        analysis,
        'SimpleDependencies',
        '/test/output.ts'
      );

      expect(code).toContain(
        'export function createSimpleDependenciesContainer('
      );
      expect(code).toContain('config: DepsConfig');
      expect(code).toContain('factories: ServiceDefinitions<FactoryDeps>');
      expect(code).toContain('const serviceDefinitions');
      expect(code).toContain('return createContainer(serviceDefinitions)');
    });

    it('should handle nested config objects', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const objectDepsType = sourceFile
        .getTypeAlias('ObjectDependencies')!
        .getType();

      const analysis = analyzeProviders(objectDepsType);
      const code = generateContainer(
        analysis,
        'ObjectDependencies',
        '/test/output.ts'
      );

      expect(code).toContain('cache:');
      expect(code).toContain('options:');
      expect(code).toContain('host: string');
      expect(code).toContain('port: number');
      expect(code).toContain('ttl?: number');
    });

    it('should access config values correctly in factories', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const configDepsType = sourceFile
        .getTypeAlias('ConfigDependencies')!
        .getType();

      const analysis = analyzeProviders(configDepsType);
      const code = generateContainer(
        analysis,
        'ConfigDependencies',
        '/test/output.ts'
      );

      expect(code).toContain('config.database.url');
      expect(code).toContain('config.database.port');
      expect(code).toContain('config.database.ssl');
    });

    it('should spread user-provided factories', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const simpleDepsType = sourceFile
        .getTypeAlias('SimpleDependencies')!
        .getType();

      const analysis = analyzeProviders(simpleDepsType);
      const code = generateContainer(
        analysis,
        'SimpleDependencies',
        '/test/output.ts'
      );

      expect(code).toContain('...factories');
    });
  });

  describe('Import path handling', () => {
    it('should generate relative imports for project files', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const simpleDepsType = sourceFile
        .getTypeAlias('SimpleDependencies')!
        .getType();

      const analysis = analyzeProviders(simpleDepsType);
      const outputPath = path.resolve(
        __dirname,
        './fixtures/generated/output.ts'
      );
      const code = generateContainer(
        analysis,
        'SimpleDependencies',
        outputPath
      );

      // Should have relative imports starting with ../
      expect(code).toMatch(/from ['"]\.\.\//);
    });
  });
});
