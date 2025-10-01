# CLI Architecture

## Overview

The CLI uses **ts-morph throughout** to analyze TypeScript types and generate dependency injection containers. The compilation process is broken into three clear phases:

## Phase 1: Load (`load/`)

Uses ts-morph to load the entry point type from the TypeScript project.

**Input:** TypeScript project + type name
**Output:** ts-morph `Type` object

## Phase 2: Analyze (`inference/`)

Analyzes the ts-morph Type to determine what providers are needed for the DI container.

### Provider Inference Rules (`inference/provider-rules.ts`)

This module contains the **core rules** for determining provider types:

1. **CLASS TYPES → Generated Factory Provider**
   - Classes become factory functions in the container
   - Constructor parameters are analyzed to determine dependencies
   - Config values (primitives, enums, objects) are accessed via config object
   - Other dependencies are injected from the container

2. **INTERFACE TYPES → Required External Provider**
   - Interfaces must be provided by the user
   - They cannot be instantiated, so no factory is generated
   - User must supply these in the `factories` parameter

3. **FUNCTION TYPES → Required External Provider**
   - Function types (named or inline) must be provided by the user
   - No factory can be generated for a function type
   - User must supply these in the `factories` parameter

4. **PRIMITIVE TYPES → Config Value**
   - Primitives become required fields in the DepsConfig interface
   - They are accessed via config object when needed by classes

5. **ENUM TYPES → Config Value**
   - Enums are treated like primitives
   - They become required fields in the DepsConfig interface

6. **OBJECT TYPES → Config Value**
   - Plain object types become config fields
   - They are nested in the config structure

7. **TYPE ALIASES → Follow Underlying Type**
   - Named type aliases follow the rules of their underlying type
   - The alias name is preserved for imports and type references

### Provider Analyzer (`inference/analyze-providers.ts`)

Applies the rules to analyze a dependencies type and produce:

- **Factory Providers**: Classes that will have factories generated
- **External Providers**: Interfaces/functions that must be supplied by user
- **Config Values**: Primitives/enums/objects needed for configuration
- **Import Information**: All imports needed for the generated code

**Input:** ts-morph `Type` object
**Output:** `ProviderAnalysis` object

## Phase 3: Generate (`codegen/`)

Uses ts-morph's code generation API to produce the container code.

### Code Generator (`codegen/generate-container.ts`)

Generates TypeScript code using ts-morph:

- Creates imports (properly handling node_modules packages)
- Generates `DepsConfig` interface for configuration
- Generates `FactoryDeps` type for user-supplied providers
- Generates container creation function with factory implementations

**Input:** `ProviderAnalysis` object
**Output:** Generated TypeScript code as string

## Benefits of This Architecture

1. **Type-Safe Throughout**: Uses ts-morph Types instead of custom intermediate formats
2. **Clear Rules**: Provider inference rules are explicitly documented
3. **Maintainable**: Each phase has a single, clear responsibility
4. **Testable**: Each phase can be tested independently
5. **Debuggable**: Can inspect ts-morph Types at any point

## Key Design Decisions

### Only Top-Level Dependencies Are Analyzed

The analyzer ONLY looks at properties directly on the dependencies type. It does NOT recursively discover transitive dependencies.

**Why?**
- Makes dependencies explicit and visible
- Avoids confusion from auto-discovered dependencies
- Gives users full control over what's in their container
- Prevents duplicate providers with different names

**Example:**

```typescript
export type AppDependencies = {
  userService: UserService;  // Will be analyzed
  logger: ILogger;           // Will be analyzed (external provider)
  // Note: If UserService needs EmailService, you must also list it here
  emailService: EmailService; // Must be explicit
}
```

### Constructor Parameter Matching

When generating factories, constructor parameters are matched by name to top-level dependencies.

- Parameter name `logger` → looks for `logger` in dependencies
- If a parameter is a primitive/enum/object, it comes from config
- If a parameter is a class/interface/function, it comes from another provider

This means constructor parameter names should match dependency names.

## Migration from Old Architecture

The old implementation used a custom `DependencyNode` intermediate format and recursively discovered all transitive dependencies. The new implementation:

**Removed:**
- `DependencyNode` type
- `buildDependencyTree()` - replaced by ts-morph Type analysis
- `convertToFactoriesStructure()` - no longer needed
- `recursivelyUpdateImportPaths()` - handled in code generator
- Recursive dependency discovery

**Added:**
- `inference/` module with explicit provider rules
- `codegen/` module using ts-morph code generation
- Clear documentation of inference rules

**If you need all transitive dependencies auto-discovered**, you must explicitly list them in your dependencies type. This is actually better because it:

1. Makes the API surface explicit
2. Prevents accidental dependency inclusion
3. Gives you control over naming
4. Avoids duplicate providers
