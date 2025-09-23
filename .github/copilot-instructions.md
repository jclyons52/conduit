# TypeScript Dependency Injection Framework Package - Copilot Instructions

This project is a TypeScript dependency injection framework called "conduit" that provides modern DI capabilities with factory-based providers, compile-time type safety, and destructuring support.

## Project Structure

- `/src` - Main source code for the DI framework
- `/lib` - Compiled output directory
- `/tests` - Test files using Jest
- `/examples` - Usage examples and demos

## Development Guidelines

- Use TypeScript with strict mode enabled
- Follow dependency injection design patterns using factory functions
- Implement factory-based service registration (no decorators)
- Provide compile-time type safety with strong typing
- Include comprehensive unit tests
- Support destructuring for clean dependency access

## Key Features Implemented

- Service container with lifecycle management (singleton, transient, scoped)
- Factory-based providers with no decorators or metadata
- Proxy-based destructuring support for clean dependency access
- Compile-time type safety with ServiceDefinitions<T>
- Zero runtime dependencies
- Type-safe service resolution with Container<T> & T
