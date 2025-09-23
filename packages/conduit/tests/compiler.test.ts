import {
  scoped,
  singleton,
  ServiceDefinitions,
  compileContainer,
} from '../src';

describe('Container Compilation', () => {
  interface Logger {
    log(message: string): void;
  }

  interface Database {
    query(sql: string): Promise<any>;
  }

  interface UserService {
    getUser(id: string): Promise<any>;
  }

  class TestLogger implements Logger {
    constructor(private prefix: string) {}
    log(message: string): void {
      console.log(`${this.prefix}: ${message}`);
    }
  }

  class TestDatabase implements Database {
    constructor(private connectionString: string) {}
    async query(sql: string): Promise<any> {
      return { connectionString: this.connectionString, sql };
    }
  }

  class TestUserService implements UserService {
    constructor(
      private database: Database,
      private logger: Logger
    ) {}

    async getUser(id: string): Promise<any> {
      this.logger.log(`Getting user: ${id}`);
      return this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
    }
  }

  const serviceDefinitions: ServiceDefinitions<{
    logger: Logger;
    database: Database;
    userService: UserService;
  }> = {
    logger: singleton(() => new TestLogger('[TEST]')),
    database: singleton(() => new TestDatabase('test://localhost')),
    userService: scoped(
      container =>
        new TestUserService(container.get('database'), container.get('logger'))
    ),
  };

  describe('Dependency Analysis', () => {
    it('should identify required services for tree-shaking', () => {
      const result = compileContainer(serviceDefinitions, 'userService');

      expect(result.entryPoint).toBe('userService');
      expect(result.services).toHaveLength(3);

      const serviceKeys = result.services.map(s => s.key);
      expect(serviceKeys).toContain('logger');
      expect(serviceKeys).toContain('database');
      expect(serviceKeys).toContain('userService');
    });

    it('should extract external parameters', () => {
      const result = compileContainer(serviceDefinitions, 'userService');

      expect(
        Object.values(result.externalParams).some(service =>
          Object.keys(service).some(param => service[param] === 'string')
        )
      ).toBe(true);
      // Should have at least one service with external parameters
      expect(Object.keys(result.externalParams).length).toBeGreaterThan(0);
    });

    it('should identify service dependencies correctly', () => {
      const result = compileContainer(serviceDefinitions, 'userService');

      const userService = result.services.find(s => s.key === 'userService');
      expect(userService?.dependencies).toEqual(['database', 'logger']);

      const logger = result.services.find(s => s.key === 'logger');
      expect(logger?.dependencies).toEqual([]);
    });
  });

  describe('Code Generation', () => {
    it('should generate valid TypeScript code', () => {
      const result = compileContainer(serviceDefinitions, 'userService');

      expect(result.generatedCode).toContain('export interface ExternalParams');
      expect(result.generatedCode).toContain(
        'export function createUserService'
      );
      expect(result.generatedCode).toContain('params: ExternalParams');
    });

    it('should generate parameter interface with correct types', () => {
      const result = compileContainer(serviceDefinitions, 'userService');

      expect(result.generatedCode).toContain('export interface ExternalParams');
      expect(result.generatedCode).toContain('connectionString: string;');
    });

    it('should replace external parameters in factory code', () => {
      const result = compileContainer(serviceDefinitions, 'userService');

      expect(result.generatedCode).toContain(
        'params.database.connectionString'
      );
    });

    it('should handle dependency injection in generated code', () => {
      const result = compileContainer(serviceDefinitions, 'userService');

      expect(result.generatedCode).toContain("container.get('database')");
      expect(result.generatedCode).toContain("container.get('logger')");
    });
  });

  describe('Tree Shaking', () => {
    it('should only include required services', () => {
      // If we only need logger, it shouldn't include database or userService
      const result = compileContainer(serviceDefinitions, 'logger');

      expect(result.services).toHaveLength(1);
      expect(result.services[0]?.key).toBe('logger');
    });

    it('should include transitive dependencies', () => {
      // userService depends on both logger and database
      const result = compileContainer(serviceDefinitions, 'userService');

      const serviceKeys = result.services.map(s => s.key);
      expect(serviceKeys).toContain('logger');
      expect(serviceKeys).toContain('database');
      expect(serviceKeys).toContain('userService');
    });
  });

  describe('Service Scopes', () => {
    it('should preserve service scopes in compilation', () => {
      const result = compileContainer(serviceDefinitions, 'userService');

      const logger = result.services.find(s => s.key === 'logger');
      const userService = result.services.find(s => s.key === 'userService');

      expect(logger?.scope).toBe('scoped'); // singleton becomes scoped
      expect(userService?.scope).toBe('scoped');
    });

    it('should generate different code for different scopes', () => {
      const transientDefinitions: ServiceDefinitions<{
        transientService: Logger;
      }> = {
        transientService: {
          scope: 'transient',
          factory: () => new TestLogger('[TRANSIENT]'),
        },
      };

      const result = compileContainer(transientDefinitions, 'transientService');

      expect(result.generatedCode).toContain('createTransientService');
      expect(result.generatedCode).toContain(
        "container.get('transientService')"
      );
    });
  });
});
