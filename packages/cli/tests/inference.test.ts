import { Project } from 'ts-morph';
import { analyzeProviders } from '../src/compiler/inference/analyze-providers';
import { classifyProviderType } from '../src/compiler/inference/provider-rules';
import * as path from 'path';

describe('Provider Inference', () => {
  let project: Project;

  beforeAll(() => {
    project = new Project({
      tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
    });
  });

  describe('classifyProviderType', () => {
    it('should classify classes as factory', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const simpleServiceType = sourceFile
        .getClass('SimpleService')!
        .getType();

      expect(classifyProviderType(simpleServiceType)).toBe('factory');
    });

    it('should classify interfaces as external', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const loggerType = sourceFile.getInterface('ILogger')!.getType();

      expect(classifyProviderType(loggerType)).toBe('external');
    });

    it('should classify primitives as config', () => {
      const sourceFile = project.createSourceFile(
        'test-primitives.ts',
        'type Config = { name: string; port: number; enabled: boolean; };',
        { overwrite: true }
      );
      const configType = sourceFile.getTypeAlias('Config')!.getType();
      const properties = configType.getProperties();

      expect(classifyProviderType(properties[0]!.getTypeAtLocation(properties[0]!.getValueDeclarationOrThrow()))).toBe('config');
      expect(classifyProviderType(properties[1]!.getTypeAtLocation(properties[1]!.getValueDeclarationOrThrow()))).toBe('config');
      expect(classifyProviderType(properties[2]!.getTypeAtLocation(properties[2]!.getValueDeclarationOrThrow()))).toBe('config');
    });
  });

  describe('analyzeProviders', () => {
    it('should generate factory providers for classes', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const simpleDepsType = sourceFile
        .getTypeAlias('SimpleDependencies')!
        .getType();

      const analysis = analyzeProviders(simpleDepsType);

      expect(analysis.factoryProviders).toHaveLength(1);
      expect(analysis.factoryProviders[0]!.name).toBe('simple');
      expect(analysis.factoryProviders[0]!.className).toBe('SimpleService');
      expect(analysis.externalProviders).toHaveLength(1);
      expect(analysis.externalProviders[0]!.name).toBe('logger');
    });

    it('should extract config from class constructors', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const configDepsType = sourceFile
        .getTypeAlias('ConfigDependencies')!
        .getType();

      const analysis = analyzeProviders(configDepsType);

      const databaseProvider = analysis.factoryProviders.find(
        f => f.name === 'database'
      );
      expect(databaseProvider).toBeDefined();
      expect(databaseProvider!.constructorParams).toHaveLength(3);

      // Check that all params are config
      databaseProvider!.constructorParams.forEach(param => {
        expect(param.source.type).toBe('config');
      });
    });

    it('should identify external providers for interfaces and functions', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const functionDepsType = sourceFile
        .getTypeAlias('FunctionDependencies')!
        .getType();

      const analysis = analyzeProviders(functionDepsType);

      expect(analysis.externalProviders).toHaveLength(3);

      const logger = analysis.externalProviders.find(e => e.name === 'logger');
      const errorHandler = analysis.externalProviders.find(
        e => e.name === 'errorHandler'
      );
      const idGenerator = analysis.externalProviders.find(
        e => e.name === 'idGenerator'
      );

      expect(logger).toBeDefined();
      expect(errorHandler).toBeDefined();
      expect(idGenerator).toBeDefined();

      expect(logger!.typeName).toBe('ILogger');
      expect(errorHandler!.typeName).toContain('Error');
      expect(idGenerator!.typeName).toContain('string');
    });

    it('should auto-discover transitive class dependencies', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const complexDepsType = sourceFile
        .getTypeAlias('ComplexDependencies')!
        .getType();

      const analysis = analyzeProviders(complexDepsType);

      // Should have: userService, adminService
      // Auto-discovered: database (needed by userService)
      const factoryNames = analysis.factoryProviders.map(f => f.name).sort();

      expect(factoryNames).toContain('userService');
      expect(factoryNames).toContain('adminService');
      expect(factoryNames).toContain('databaseService'); // Auto-discovered as databaseService
    });

    it('should handle enum types as config', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const enumDepsType = sourceFile
        .getTypeAlias('EnumDependencies')!
        .getType();

      const analysis = analyzeProviders(enumDepsType);

      const configProvider = analysis.factoryProviders.find(
        f => f.name === 'config'
      );
      expect(configProvider).toBeDefined();

      // Should have env and appName as config params
      const envParam = configProvider!.constructorParams.find(
        p => p.name === 'env'
      );
      const appNameParam = configProvider!.constructorParams.find(
        p => p.name === 'appName'
      );

      expect(envParam?.source.type).toBe('config');
      expect(appNameParam?.source.type).toBe('config');
    });

    it('should handle object type parameters as config', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const objectDepsType = sourceFile
        .getTypeAlias('ObjectDependencies')!
        .getType();

      const analysis = analyzeProviders(objectDepsType);

      const cacheProvider = analysis.factoryProviders.find(
        f => f.name === 'cache'
      );
      expect(cacheProvider).toBeDefined();

      // Should have logger as provider and options as config
      const loggerParam = cacheProvider!.constructorParams.find(
        p => p.name === 'logger'
      );
      const optionsParam = cacheProvider!.constructorParams.find(
        p => p.name === 'options'
      );

      expect(loggerParam?.source.type).toBe('provider');
      expect(optionsParam?.source.type).toBe('config');
    });

    it('should properly collect all imports', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const complexDepsType = sourceFile
        .getTypeAlias('ComplexDependencies')!
        .getType();

      const analysis = analyzeProviders(complexDepsType);

      // Should have imports for: ILogger, UserService, AdminService, DatabaseService
      expect(analysis.imports.length).toBeGreaterThan(0);

      const importPaths = analysis.imports.map(i => i.typeName);
      expect(importPaths).toContain('ILogger');
      expect(importPaths).toContain('UserService');
      expect(importPaths).toContain('AdminService');
    });
  });

  describe('Type-based dependency matching', () => {
    it('should match constructor params to providers by type, not name', () => {
      const sourceFile = project.addSourceFileAtPath(
        path.resolve(__dirname, './fixtures/test-dependencies.ts')
      );
      const userServiceType = sourceFile
        .getTypeAlias('ComplexDependencies')!
        .getType();

      const analysis = analyzeProviders(userServiceType);

      const userServiceProvider = analysis.factoryProviders.find(
        f => f.name === 'userService'
      );

      // UserService constructor has 'database: DatabaseService' parameter
      // It should map to the auto-discovered 'database' provider
      const dbParam = userServiceProvider!.constructorParams.find(
        p => p.name === 'database'
      );

      expect(dbParam).toBeDefined();
      expect(dbParam!.source.type).toBe('provider');

      if (dbParam!.source.type === 'provider') {
        expect(dbParam!.source.providerName).toBe('databaseService');
      }
    });
  });
});
