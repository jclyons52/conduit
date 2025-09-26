import {
  createContainer,
  scoped,
  transient,
  singleton,
  ServiceDefinitions,
} from '../src';

describe('Container', () => {
  interface TestService {
    getValue(): string;
  }

  interface AnotherService {
    getDependency(): TestService;
  }

  class TestServiceImpl implements TestService {
    getValue(): string {
      return 'test-value';
    }
  }

  class AnotherServiceImpl implements AnotherService {
    constructor(private testService: TestService) {}

    getDependency(): TestService {
      return this.testService;
    }
  }

  describe('Basic functionality', () => {
    it('should resolve singleton services correctly', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
      }> = {
        testService: singleton(() => new TestServiceImpl()),
      };

      const container = createContainer(serviceDefinitions);

      const service1 = container.get('testService');
      const service2 = container.get('testService');

      expect(service1).toBe(service2);
      expect(service1.getValue()).toBe('test-value');
    });

    it('should resolve transient services correctly', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
      }> = {
        testService: transient(() => new TestServiceImpl()),
      };

      const container = createContainer(serviceDefinitions);

      const service1 = container.get('testService');
      const service2 = container.get('testService');

      expect(service1).not.toBe(service2);
      expect(service1.getValue()).toBe('test-value');
      expect(service2.getValue()).toBe('test-value');
    });

    it('should resolve scoped services correctly', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
      }> = {
        testService: scoped(() => new TestServiceImpl()),
      };

      const container = createContainer(serviceDefinitions);

      const service1 = container.get('testService');
      const service2 = container.get('testService');

      expect(service1).toBe(service2);
      expect(service1.getValue()).toBe('test-value');
    });
  });

  describe('Dependency injection', () => {
    it('should inject dependencies correctly', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
        anotherService: AnotherService;
      }> = {
        testService: singleton(() => new TestServiceImpl()),
        anotherService: scoped(
          container => new AnotherServiceImpl(container.get('testService'))
        ),
      };

      const container = createContainer(serviceDefinitions);

      const anotherService = container.get('anotherService');
      const testService = container.get('testService');

      expect(anotherService.getDependency()).toBe(testService);
    });

    it('should handle complex dependency chains', () => {
      interface Logger {
        log(message: string): void;
      }

      interface Database {
        query(sql: string): string;
      }

      interface Repository {
        findById(id: string): string;
      }

      class ConsoleLogger implements Logger {
        log(_message: string): void {
          // Mock implementation
        }
      }

      class MockDatabase implements Database {
        query(sql: string): string {
          return `Result for: ${sql}`;
        }
      }

      class UserRepository implements Repository {
        constructor(
          private database: Database,
          private logger: Logger
        ) {}

        findById(id: string): string {
          this.logger.log(`Finding user ${id}`);
          return this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
        }
      }

      const serviceDefinitions: ServiceDefinitions<{
        logger: Logger;
        database: Database;
        repository: Repository;
      }> = {
        logger: singleton(() => new ConsoleLogger()),
        database: singleton(() => new MockDatabase()),
        repository: scoped(
          container =>
            new UserRepository(
              container.get('database'),
              container.get('logger')
            )
        ),
      };

      const container = createContainer(serviceDefinitions);

      const repository = container.get('repository');
      const result = repository.findById('123');

      expect(result).toBe("Result for: SELECT * FROM users WHERE id = '123'");
    });
  });

  describe('Error handling', () => {
    it('should throw ServiceNotFoundError for unknown services', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
      }> = {
        testService: singleton(() => new TestServiceImpl()),
      };

      const container = createContainer(serviceDefinitions);

      expect(() => {
        // @ts-expect-error - Testing runtime error for unknown service
        container.get('unknownService');
      }).toThrow('Service not found: unknownService');
    });
  });

  describe('Type safety', () => {
    it('should provide strong typing for service resolution', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
        anotherService: AnotherService;
      }> = {
        testService: singleton(() => new TestServiceImpl()),
        anotherService: scoped(
          container => new AnotherServiceImpl(container.get('testService'))
        ),
      };

      const container = createContainer(serviceDefinitions);

      // These should be properly typed
      const testService: TestService = container.get('testService');
      const anotherService: AnotherService = container.get('anotherService');

      expect(testService.getValue()).toBe('test-value');
      expect(anotherService.getDependency()).toBe(testService);
    });
  });

  describe('Proxy destructuring', () => {
    it('should allow destructuring of services from container', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
        anotherService: AnotherService;
      }> = {
        testService: singleton(() => new TestServiceImpl()),
        anotherService: scoped(
          container => new AnotherServiceImpl(container.get('testService'))
        ),
      };

      const container = createContainer(serviceDefinitions);

      // Destructuring should work
      const { testService, anotherService } = container;

      expect(testService.getValue()).toBe('test-value');
      expect(anotherService.getDependency()).toBe(testService);

      // Should be the same instances as .get() method
      expect(testService).toBe(container.get('testService'));
      expect(anotherService).toBe(container.get('anotherService'));
    });

    it('should work with functions that destructure container', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
        anotherService: AnotherService;
      }> = {
        testService: singleton(() => new TestServiceImpl()),
        anotherService: scoped(
          container => new AnotherServiceImpl(container.get('testService'))
        ),
      };

      const container = createContainer(serviceDefinitions);

      // Function that takes destructured services
      function useServices({
        testService,
        anotherService,
      }: {
        testService: TestService;
        anotherService: AnotherService;
      }) {
        return {
          value: testService.getValue(),
          dependency: anotherService.getDependency(),
        };
      }

      const result = useServices(container);

      expect(result.value).toBe('test-value');
      expect(result.dependency).toBe(container.get('testService'));
    });

    it('should preserve container methods when using destructuring', () => {
      const serviceDefinitions: ServiceDefinitions<{
        testService: TestService;
      }> = {
        testService: singleton(() => new TestServiceImpl()),
      };

      const container = createContainer(serviceDefinitions);

      // Destructure a service
      const { testService } = container;

      // Container methods should still work
      expect(typeof container.get).toBe('function');
      expect(typeof container.createScope).toBe('function');
      expect(typeof container.dispose).toBe('function');

      // And they should return the same results
      expect(container.get('testService')).toBe(testService);
    });
  });
});
