# CReact Test Organization

This directory contains all tests for the CReact library, organized by purpose and domain.

## Directory Structure

```
__tests__/
├── helpers/              # Shared test utilities
│   ├── fiber-helpers.ts       # Fiber node creation helpers
│   ├── clouddom-helpers.ts    # CloudDOM node creation helpers
│   ├── provider-helpers.ts    # Provider setup helpers
│   ├── assertion-helpers.ts   # Custom assertion helpers
│   └── index.ts              # Centralized exports
├── unit/                # Unit tests for individual components
├── integration/         # Full workflow and cross-component tests
├── edge-cases/          # Production-critical edge cases
├── performance/         # Performance benchmarks and stress tests
└── contracts/           # Interface and contract validation
```

## Test Categories

### Unit Tests (`unit/`)

Core functionality tests for individual components. These tests focus on:

- Single component behavior
- Public API contracts
- Basic error handling
- Expected functionality

**Naming:** `{component}.unit.test.ts`

**Example:** `renderer.unit.test.ts`, `validator.unit.test.ts`

### Integration Tests (`integration/`)

Full workflow scenarios that test multiple components working together:

- Complete pipelines (Render → Validate → Build → Deploy)
- Cross-component interactions
- State consistency across operations
- Provider lifecycle integration

**Naming:** `{feature}.integration.test.ts`

**Example:** `pipeline.integration.test.ts`

### Edge Case Tests (`edge-cases/`)

Production-critical edge cases and error scenarios:

- Security vulnerabilities
- Data integrity issues
- Circular references
- Memory leaks
- Concurrent operations
- Extreme inputs

**Naming:** `{component}.edge-cases.test.ts`

**Example:** `renderer.edge-cases.test.ts`

### Performance Tests (`performance/`)

Performance benchmarks and stress tests:

- Large tree rendering (1000+ nodes)
- Deep nesting (100+ levels)
- Concurrent operations
- Memory usage patterns
- Execution time thresholds

**Naming:** `{component}.performance.test.ts`

**Example:** `renderer.performance.test.ts`

**Note:** Run separately from unit tests to avoid slowing down regular test runs.

### Contract Tests (`contracts/`)

Interface and contract validation:

- Provider interface compliance
- Type safety verification
- API stability checks
- Breaking change detection

**Naming:** `{interface}.contracts.test.ts`

**Example:** `provider-contracts.test.ts`

## Using Test Helpers

Import helpers from the centralized export:

```typescript
import {
  createMockFiber,
  createFiberTree,
  createMockCloudDOM,
  createCloudDOMTree,
  createMockCloudProvider,
  expectValidationError,
  expectNoThrow,
} from '../helpers';
```

### Fiber Helpers

```typescript
// Create a simple mock Fiber node
const fiber = createMockFiber({
  type: MyComponent,
  props: { name: 'test' },
  path: ['app', 'component'],
});

// Create a Fiber tree with children
const tree = createFiberTree({ type: Parent, path: ['parent'] }, [
  { type: Child1, path: ['parent', 'child1'] },
  { type: Child2, path: ['parent', 'child2'] },
]);

// Create a deep tree for testing recursion
const deepTree = createDeepFiberTree(10); // 10 levels deep

// Create a wide tree for testing many siblings
const wideTree = createWideFiberTree(100); // 100 siblings
```

### CloudDOM Helpers

```typescript
// Create a simple mock CloudDOM node
const cloudDOM = createMockCloudDOM({
  id: 'resource',
  path: ['resource'],
  construct: MyConstruct,
  props: { name: 'test' },
});

// Create a CloudDOM tree with children
const tree = createCloudDOMTree({ id: 'parent', construct: Parent }, [
  { id: 'parent.child1', construct: Child1 },
  { id: 'parent.child2', construct: Child2 },
]);
```

### Provider Helpers

```typescript
// Setup cloud provider with console spies
const { provider, consoleSpy, cleanup } = createMockCloudProvider();

// Use provider in tests
provider.materialize(cloudDOM);

// Cleanup after test
cleanup();

// Or setup complete test environment
const { cloudProvider, backendProvider, consoleDebugSpy, cleanup } = setupProviderTest();
```

### Assertion Helpers

```typescript
// Assert validation error
expectValidationError(() => validator.validate(invalidFiber), 'Missing required prop');

// Assert no error
expectNoThrow(() => validator.validate(validFiber));

// Async validation error
await expectAsyncValidationError(
  async () => await builder.build(invalidFiber),
  /Circular dependency/
);
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only performance tests
npm run test:performance

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Writing New Tests

### Guidelines

1. **Keep files small:** Target <300 lines per file
2. **Use helpers:** Leverage shared helpers to reduce boilerplate
3. **Use parameterized tests:** Use `it.each()` for similar test cases
4. **Focus on value:** Test critical paths, not implementation details
5. **Clear descriptions:** Test names should clearly state what is being tested
6. **Arrange-Act-Assert:** Follow AAA pattern for clarity

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockFiber, expectValidationError } from '../helpers';
import { Validator } from '../../core/Validator';

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('Required Props Validation', () => {
    it('should pass when all required props are present', () => {
      const fiber = createMockFiber({
        type: function Component() {},
        props: { name: 'test', value: 42 },
      });

      Component.requiredProps = ['name', 'value'];

      expectNoThrow(() => validator.validate(fiber));
    });

    it('should fail when required prop is missing', () => {
      const fiber = createMockFiber({
        type: function Component() {},
        props: { name: 'test' },
      });

      Component.requiredProps = ['name', 'value'];

      expectValidationError(() => validator.validate(fiber), "Missing required prop 'value'");
    });
  });
});
```

### Parameterized Test Example

```typescript
describe('Falsy Values', () => {
  it.each([
    [null, 'null', true],
    [undefined, 'undefined', false],
    [false, 'false', true],
    [0, 'zero', true],
    ['', 'empty string', true],
  ])('should handle %s (%s)', (value, description, shouldPass) => {
    const fiber = createMockFiber({
      props: { value },
    });

    if (shouldPass) {
      expectNoThrow(() => validator.validate(fiber));
    } else {
      expectValidationError(() => validator.validate(fiber));
    }
  });
});
```

## Test Principles

1. **Domain-Based Organization:** Tests grouped by purpose, not by file location
2. **Shared Helpers:** Eliminate duplication through reusable utilities
3. **Parameterized Tests:** Use `it.each()` for similar test cases
4. **File Size Limits:** No file exceeds 500 lines (target: <300 lines)
5. **Value Focus:** Keep critical tests, remove redundant coverage
6. **Performance Separation:** Performance tests don't slow regular runs
7. **Clear Documentation:** Easy for contributors to understand and extend

## Migration Notes

This test structure was reorganized from the original flat structure to improve:

- **Maintainability:** Smaller, focused files easier to navigate
- **Reusability:** Shared helpers reduce duplication by 50%+
- **Performance:** Separate performance tests don't slow regular runs
- **Clarity:** Domain-based organization makes purpose clear
- **Efficiency:** Parameterized tests reduce redundancy

For the old test structure, see git history before the reorganization commit.

## Contributing

When adding new tests:

1. Choose the appropriate directory based on test purpose
2. Use existing helpers or create new ones if needed
3. Follow naming conventions
4. Keep files under 300 lines
5. Add parameterized tests for similar cases
6. Update this README if adding new patterns or helpers
