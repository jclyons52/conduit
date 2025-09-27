import { DependencyNode } from '../src/compiler/types';

export const dependencyTree: DependencyNode[] = [
  {
    name: 'userService',
    typeName: 'UserService',
    kind: 'class',
    importPath:
      '/Users/josephlyons/Projects/jclyons52/conduit/packages/conduit-compiler/src/example/services/user-service.ts',
    children: [
      {
        name: 'userRepository',
        typeName: 'UserRepository',
        kind: 'class',
        importPath:
          '/Users/josephlyons/Projects/jclyons52/conduit/packages/conduit-compiler/src/example/services/user-repository.ts',
        children: [
          {
            name: 'database',
            typeName: 'Database',
            kind: 'class',
            importPath:
              '/Users/josephlyons/Projects/jclyons52/conduit/packages/conduit-compiler/src/example/services/database.ts',
            children: [
              {
                name: 'connectionString',
                kind: 'primitive',
                optional: false,
                typeName: 'string',
              },
              {
                name: 'password',
                kind: 'primitive',
                optional: true,
                typeName: 'string | undefined',
              },
            ],
          },
          {
            name: 'logger',
            typeName: 'Logger',
            kind: 'interface',
            importPath:
              '/Users/josephlyons/Projects/jclyons52/conduit/packages/conduit-compiler/src/example/services/logger.ts',
          },
        ],
      },
      {
        name: 'emailService',
        typeName: 'EmailService',
        kind: 'class',
        importPath:
          '/Users/josephlyons/Projects/jclyons52/conduit/packages/conduit-compiler/src/example/services/email.ts',
        children: [
          {
            name: 'apiKey',
            kind: 'primitive',
            optional: false,
            typeName: 'string',
          },
          {
            name: 'fromEmail',
            kind: 'primitive',
            optional: false,
            typeName: 'string',
          },
        ],
      },
      {
        name: 'logger',
        typeName: 'Logger',
        kind: 'interface',
        importPath:
          '/Users/josephlyons/Projects/jclyons52/conduit/packages/conduit-compiler/src/example/services/logger.ts',
      },
      {
        name: 'foo',
        typeName: 'Foo',
        kind: 'class',
        importPath:
          '/Users/josephlyons/Projects/jclyons52/conduit/packages/conduit-compiler/src/example/services/user-service.ts',
        children: [],
      },
      {
        name: 'baz',
        kind: 'primitive',
        optional: false,
        typeName: 'string',
      },
    ],
  },
  {
    name: 'noodler',
    typeName: 'INoodlerService',
    kind: 'interface',
    importPath:
      '/Users/josephlyons/Projects/jclyons52/conduit/packages/conduit-compiler/src/example/services/noodler-service.ts',
  },
];
