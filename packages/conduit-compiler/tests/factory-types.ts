import { DependencyNode } from '../src/compiler/types';

export const factoryTypes: DependencyNode[] = [
  {
    name: 'userService',
    typeName: 'UserService',
    kind: 'class',
    importPath: '../services/user-service',
    children: [
      {
        name: 'userRepository',
        typeName: 'UserRepository',
        kind: 'class',
        importPath: '../services/user-repository',
        children: [
          {
            name: 'database',
            typeName: 'Database',
            kind: 'class',
            importPath: '../services/database',
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
            importPath: '../services/logger',
          },
        ],
      },
      {
        name: 'emailService',
        typeName: 'EmailService',
        kind: 'class',
        importPath: '../services/email',
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
        importPath: '../services/logger',
      },
      {
        name: 'foo',
        typeName: 'Foo',
        kind: 'class',
        importPath: '../services/user-service',
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
    name: 'userRepository',
    typeName: 'UserRepository',
    kind: 'class',
    importPath: '../services/user-repository',
    children: [
      {
        name: 'database',
        typeName: 'Database',
        kind: 'class',
        importPath: '../services/database',
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
        importPath: '../services/logger',
      },
    ],
  },
  {
    name: 'database',
    typeName: 'Database',
    kind: 'class',
    importPath: '../services/database',
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
    importPath: '../services/logger',
  },
  {
    name: 'emailService',
    typeName: 'EmailService',
    kind: 'class',
    importPath: '../services/email',
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
    name: 'foo',
    typeName: 'Foo',
    kind: 'class',
    importPath: '../services/user-service',
    children: [],
  },
  {
    name: 'noodler',
    typeName: 'INoodlerService',
    kind: 'interface',
    importPath: '../services/noodler-service',
  },
];
