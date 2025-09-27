---
layout: home

hero:
  name: 'Conduit'
  text: 'TypeScript Dependency Injection'
  tagline: 'Revolutionary serverless optimization through tree-shaking compilation'
  image:
    src: /logo.svg
    alt: Conduit Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quick-start
    - theme: alt
      text: View Examples
      link: /examples/basic

features:
  - icon: 🌳
    title: Tree-shaking Compilation
    details: Compile-time optimization that includes only the services you actually use, perfect for serverless and edge deployments.

  - icon: 🏭
    title: Factory-based DI
    details: No decorators or metadata required. Pure factory functions with full TypeScript type safety.

  - icon: ⚡
    title: Zero Runtime Dependencies
    details: Lightweight containers with no runtime overhead. Generated code has minimal footprint.

  - icon: 🔧
    title: Powerful CLI
    details: Complete toolchain with dependency analysis, service compilation, and project scaffolding.

  - icon: 📦
    title: Monorepo Ready
    details: Built for modern development workflows with Turborepo integration and workspace support.

  - icon: 🎯
    title: TypeScript First
    details: Compile-time type safety with ServiceDefinitions and intelligent parameter inference.
---

## Quick Example

```typescript
import { createContainer, singleton, scoped } from 'conduit-di';

// Define your services with factories
const services = {
  logger: singleton(() => new ConsoleLogger('[APP]')),
  database: singleton(() => new PostgresDatabase(process.env.DB_URL)),
  userService: scoped(
    container =>
      new UserService(container.get('database'), container.get('logger'))
  ),
};

// Create container and get your service
const container = createContainer(services);
const userService = container.get('userService');
```

## Tree-shaking in Action

```bash
# Compile only the services you need
npx conduit compile userService

# Result: 89% smaller bundle
# From: 15KB (all services)
# To:   1.6KB (only userService + dependencies)
```

## Why Conduit?

**Perfect for Serverless** - Tree-shaking compilation ensures your functions include only the code they actually use, dramatically reducing cold start times.

**Developer Experience** - Rich CLI tooling, TypeScript-first design, and comprehensive error messages make development a breeze.

**Production Ready** - Used in production applications with rigorous testing and performance optimization.
