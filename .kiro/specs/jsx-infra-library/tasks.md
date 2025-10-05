# CReact Implementation Tasks

## Goal: Working POC

Build a minimal proof-of-concept that demonstrates: **JSX → CloudDOM → Deployment**

**IMPORTANT:** Do NOT run any commands automatically. Pass commands to the user to run manually.

## Core Design Pattern: Dependency Injection

All provider implementations are INJECTED into core classes via constructor. No inheritance.

```typescript
// ✅ CORRECT
const creact = new CReact({ cloudProvider, backendProvider });

// ❌ WRONG
class MyCReact extends CReact {}
```

## Requirement Traceability

Each task references the corresponding requirement (REQ-XX) from the CReact Design Specification. This ensures full traceability between design and implementation. Add `// REQ-XX` comments in code for cross-reference.

## Phase 1: Core Architecture (Tasks 1–6)

Foundation: Provider interfaces, dummy implementations, and core pipeline components.

- [x] 1. Setup package structure
  - Create `lib/creact/` directory with src/ subdirectories
  - Initialize package.json with TypeScript and JSX support
  - Configure tsconfig.json for JSX transformation
  - Install dependencies: React types only (no CDKTF for POC)
  - _Requirements: All_
  - **Note:** Do NOT run npm install automatically

- [x] 2. Implement provider interfaces (dependency injection foundation)
  - Create `ICloudProvider` interface with `materialize()` method
  - Create `IBackendProvider` interface with `getState()` and `saveState()` methods
  - Add optional `initialize()` method to both interfaces (REQ-04.4)
  - Add optional lifecycle hooks to `ICloudProvider`: `preDeploy`, `postDeploy`, `onError` (REQ-09)
  - Export all from `providers/index.ts`
  - _Requirements: REQ-04, REQ-09_
  - **Key:** These are interfaces only, NOT implementations yet
  - **Note:** Do NOT run any test commands

- [x] 3. Implement Dummy providers (POC implementations)
  - Create `DummyCloudProvider` that implements `ICloudProvider`
  - Implement `materialize()` to log CloudDOM structure with indentation
  - Log outputs in format: `nodeId.outputKey = value`
  - Create `DummyBackendProvider` that implements `IBackendProvider`
  - Implement in-memory Map storage for state
  - Add helper methods: `clearAll()`, `getAllState()`
  - _Requirements: REQ-04_
  - **Key:** These are standalone implementations, NOT base classes
  - **Note:** Do NOT run any test commands

- [x] 4. Implement Renderer (JSX → Fiber)
  - Create `Renderer` class (no dependencies injected)
  - Implement `render(jsx)` method that executes JSX components
  - Build Fiber nodes with: `type`, `props`, `children`, `path`
  - Generate hierarchy paths for each node (e.g., `['registry', 'service']`)
  - Execute component functions recursively to resolve children
  - Store current Fiber tree for validation
  - _Requirements: REQ-01_
  - **Note:** Do NOT run any test commands

- [x] 5. Implement Validator (Fiber validation)
  - Create `Validator` class (no dependencies injected)
  - Implement `validate(fiber)` method
  - Check: required props are present
  - Check: context is available when `useStackContext` is called
  - Check: resource IDs are unique
  - Check: no circular dependencies
  - Generate clear error messages with component stack trace (REQ-NF-03.1)
  - Include file paths and line numbers in errors
  - _Requirements: REQ-07_
  - **Note:** Do NOT run any test commands

- [ ] 6. Implement CloudDOMBuilder (Fiber → CloudDOM)
  - Create `CloudDOMBuilder` class that receives `ICloudProvider` via constructor
  - Implement `build(fiber)` method that traverses Fiber tree
  - Collect nodes with `useInstance` calls
  - Build CloudDOM tree with parent-child relationships
  - Filter out container components (no `useInstance`)
  - Generate CloudDOM nodes with: `id`, `path`, `construct`, `props`, `children`, `outputs`
  - _Requirements: REQ-01_
  - **Key:** CloudDOMBuilder RECEIVES cloudProvider via constructor
  - **Note:** Do NOT run any test commands

## Phase 0.5: Test Reorganization (Before Milestone 1)

Foundation: Reorganize and optimize existing tests before continuing with new features.

- [ ] 0.1. Analyze current test structure
  - Document total lines per test file
  - Identify duplicate patterns across files
  - Categorize tests by value (critical/important/nice-to-have)
  - Measure test execution time per file
  - Create analysis report in `.kiro/specs/test-reorganization/analysis.md`
  - _Requirements: Test Reorganization REQ-01_

- [ ] 0.2. Create shared test helpers
  - Create `lib/creact/src/__tests__/helpers/` directory
  - Implement `fiber-helpers.ts` with `createMockFiber()`, `createFiberTree()`
  - Implement `clouddom-helpers.ts` with `createMockCloudDOM()`, `createCloudDOMTree()`
  - Implement `provider-helpers.ts` with `createMockProvider()`, `createMockBackend()`
  - Implement `assertion-helpers.ts` with `expectValidationError()`, `expectNoThrow()`
  - Export all helpers from `helpers/index.ts`
  - _Requirements: Test Reorganization REQ-03_

- [ ] 0.3. Create domain-based test structure
  - Create `lib/creact/src/__tests__/unit/` directory
  - Create `lib/creact/src/__tests__/integration/` directory
  - Create `lib/creact/src/__tests__/edge-cases/` directory
  - Create `lib/creact/src/__tests__/performance/` directory
  - Create `lib/creact/src/__tests__/contracts/` directory
  - Add README.md explaining test organization
  - _Requirements: Test Reorganization REQ-02_

- [ ] 0.4. Reorganize Renderer tests
  - Split `Renderer.test.ts` into:
    - `unit/renderer.unit.test.ts` (core functionality, <300 lines)
    - `edge-cases/renderer.edge-cases.test.ts` (edge cases, <300 lines)
  - Move production-critical tests from `Renderer.production.test.ts` to edge-cases
  - Convert similar test cases to parameterized tests using `it.each()`
  - Use shared helpers to reduce boilerplate
  - Remove redundant tests that duplicate coverage
  - _Requirements: Test Reorganization REQ-02, REQ-04, REQ-05_

- [ ] 0.5. Reorganize Validator tests
  - Split `Validator.test.ts` into:
    - `unit/validator.unit.test.ts` (core validation, <300 lines)
    - `edge-cases/validator.edge-cases.test.ts` (edge cases, <300 lines)
  - Move production-critical tests from `Validator.production.test.ts` to edge-cases
  - Consolidate duplicate validation scenarios
  - Use parameterized tests for similar validation cases
  - Use shared helpers for Fiber creation
  - _Requirements: Test Reorganization REQ-02, REQ-04, REQ-05_

- [ ] 0.6. Reorganize CloudDOMBuilder tests
  - Split `CloudDOMBuilder.test.ts` into:
    - `unit/clouddom-builder.unit.test.ts` (core building, <300 lines)
    - `edge-cases/clouddom-builder.edge-cases.test.ts` (edge cases, <200 lines)
  - Use shared helpers for Fiber and CloudDOM creation
  - Convert repetitive hierarchy tests to parameterized tests
  - Remove tests that duplicate coverage
  - _Requirements: Test Reorganization REQ-02, REQ-04, REQ-05_

- [ ] 0.7. Reorganize Provider tests
  - Split `providers.test.ts` into:
    - `unit/cloud-provider.unit.test.ts` (DummyCloudProvider, <300 lines)
    - `unit/backend-provider.unit.test.ts` (DummyBackendProvider, <300 lines)
  - Move production-critical tests from `providers.production.test.ts` to:
    - `edge-cases/cloud-provider.edge-cases.test.ts` (<200 lines)
    - `edge-cases/backend-provider.edge-cases.test.ts` (<200 lines)
  - Use shared provider helpers
  - Consolidate concurrent operation tests
  - _Requirements: Test Reorganization REQ-02, REQ-04_

- [ ] 0.8. Consolidate integration tests
  - Move `integration-pipeline.test.ts` to `integration/pipeline.integration.test.ts`
  - Combine related workflow scenarios
  - Remove redundant integration tests
  - Focus on critical user journeys
  - Keep file under 400 lines
  - _Requirements: Test Reorganization REQ-08_

- [ ] 0.9. Separate performance tests
  - Move performance tests to `performance/` directory:
    - `performance/renderer.performance.test.ts`
    - `performance/validator.performance.test.ts`
    - `performance/clouddom-builder.performance.test.ts`
    - `performance/providers.performance.test.ts`
  - Add performance thresholds and assertions
  - Tag tests for separate execution
  - Keep each file under 200 lines
  - _Requirements: Test Reorganization REQ-07_

- [ ] 0.10. Move contract tests
  - Move `interface-contracts.test.ts` to `contracts/provider-contracts.test.ts`
  - Add contract tests for other interfaces
  - Keep file under 200 lines
  - _Requirements: Test Reorganization REQ-02_

- [ ] 0.11. Consolidate parameterized tests
  - Move `parameterized.test.ts` content into relevant domain tests
  - Ensure parameterized patterns are used throughout
  - Remove standalone parameterized file
  - _Requirements: Test Reorganization REQ-05_

- [ ] 0.12. Update test configuration
  - Update vitest.config.ts to recognize new structure
  - Add test:unit, test:integration, test:performance scripts
  - Update CI/CD to run tests separately
  - Verify all tests still pass
  - _Requirements: Test Reorganization REQ-09_

- [ ] 0.13. Document test organization
  - Create `lib/creact/src/__tests__/README.md` with:
    - Directory structure explanation
    - Guidelines for adding new tests
    - Examples of using test helpers
    - How to run different test suites
  - Document test helper APIs
  - Add migration notes for contributors
  - _Requirements: Test Reorganization REQ-09_

### Milestone 0.5 Verification (After Test Reorganization)

**Verification Run:**
```bash
$ npm run test:unit
$ npm run test:integration
$ npm run test:performance
```

✅ **Expect:**
- ✔ All tests pass with same or better coverage
- ✔ No test file exceeds 500 lines
- ✔ Test execution time improved by 20%+
- ✔ Clear separation of concerns
- ✔ Shared helpers reduce duplication by 50%+
- _Validates: Test Reorganization Requirements_

### Milestone 1 Verification (After Task 6)

**Verification Run:**
```bash
$ ts-node examples/poc.tsx --dry-run
```

✅ **Expect:**
- ✔ No errors
- ✔ Logs show `build()` and `deploy()` paths invoked manually
- ✔ Providers injected successfully (no direct instantiation inside CReact)
- ✔ CloudDOM structure logged correctly
- _Validates: REQ-04 (DI pattern)_

## Phase 2: Orchestrator & Hooks (Tasks 7–13)

Build the main orchestrator and implement hooks for resource creation and state management.

- [ ] 7. Implement CReact orchestrator (main class)
  - Create `CReactConfig` interface with: `cloudProvider`, `backendProvider`, `migrationMap?`, `asyncTimeout?`
  - Create `CReact` class that receives `CReactConfig` via constructor
  - Instantiate `Renderer`, `Validator`, `CloudDOMBuilder` (inject cloudProvider), `Reconciler` (inject migrationMap)
  - Implement `build(jsx)` method: render → validate → commit → persist (REQ-01.6)
  - Implement `compare(previous, current)` method: validate → diff
  - Implement `deploy(cloudDOM)` method: validate → check idempotency (REQ-05.4) → lifecycle hooks → materialize → save state
  - _Requirements: REQ-01, REQ-04, REQ-05, REQ-07, REQ-09_
  - **Key:** CReact RECEIVES providers, does NOT create them
  - **Note:** Do NOT run any test commands

- [ ] 8. Implement CloudDOM persistence (REQ-01.6)
  - Create `.creact/` directory if it doesn't exist
  - Save CloudDOM to `.creact/clouddom.json` after build
  - Format JSON with indentation for readability
  - Log file path after saving
  - _Requirements: REQ-01.6_
  - **Note:** Do NOT run any test commands

- [ ] 9. Implement useInstance hook
  - Create `useInstance(construct, props)` hook
  - Generate resource ID from current Fiber path
  - Create CloudDOM node and attach to Fiber
  - Store construct type and props
  - Return reference to resource
  - _Requirements: REQ-01, REQ-03_
  - **Note:** Do NOT run any test commands

- [ ] 10. Implement naming system
  - Generate resource IDs from Fiber paths (e.g., `['registry', 'service']` → `'registry.service'`)
  - Use kebab-case for multi-word names (e.g., `'registry-service'`)
  - Support custom keys via `key` prop
  - Ensure IDs are unique within scope
  - _Requirements: REQ-01_
  - **Note:** Do NOT run any test commands

- [ ] 11. Implement useState hook
  - Create `useState(initialValue)` hook
  - Store state in current Fiber node
  - Return `[state, setState]` tuple
  - `setState` is no-op for now (build-time only)
  - State becomes outputs for the component
  - _Requirements: REQ-02_
  - **Note:** Do NOT run any test commands

- [ ] 12. Implement Stack Context
  - Create `StackContext` with `Provider` and `Consumer`
  - Implement `useStackContext()` hook
  - Traverse Fiber tree depth-first to find nearest Provider (REQ-02.3)
  - Return Provider's value
  - Support optional stack name parameter for remote state
  - _Requirements: REQ-02_
  - **Note:** Do NOT run any test commands

- [ ] 13. Implement output system
  - Extract outputs from `useState` calls in Fiber nodes
  - Store outputs in CloudDOM nodes
  - Generate output names: `nodeId.stateKey` (e.g., `'registry.repositoryUrl'`)
  - DummyCloudProvider logs outputs during materialization
  - _Requirements: REQ-02, REQ-06_
  - **Note:** Do NOT run any test commands

### Milestone 2 Verification (After Task 13)

**Verification Run:**
```bash
$ ts-node examples/poc.tsx
```

✅ **Expect:**
- ✔ Hooks work correctly (`useInstance`, `useState`, `useStackContext`)
- ✔ CloudDOM nodes have correct IDs and outputs
- ✔ Stack Context resolves depth-first to nearest Provider
- ✔ Outputs logged in format: `nodeId.outputKey = value`
- _Validates: REQ-01, REQ-02, REQ-03_

## Phase 3: Diff & Lifecycle (Tasks 14–18)

Implement reconciliation, migration hooks, and lifecycle management.

- [ ] 14. Implement Reconciler (diff logic)
  - Create `Reconciler` class that receives optional `migrationMap` via constructor
  - Implement `diff(previous, current)` method
  - Compare CloudDOM trees by ID
  - Detect: creates (ID in current only)
  - Detect: deletes (ID in previous only)
  - Detect: updates (ID in both, props changed)
  - Detect: moves (same resource, different ID)
  - _Requirements: REQ-01, REQ-05_
  - **Note:** Do NOT run any test commands

- [ ] 15. Implement migration map versioning (REQ-08.5)
  - Store migration maps in backend state with version and timestamp
  - Create `MigrationMapVersion` interface
  - Append to `migrationHistory` array in state
  - Load migration history when comparing
  - _Requirements: REQ-08.5_
  - **Note:** Do NOT run any test commands

- [ ] 16. Implement migration hooks (REQ-08)
  - Update `Reconciler` to check migration map for ID changes (REQ-08.2)
  - Treat mapped ID changes as updates (REQ-08.1)
  - Preserve resource state during refactoring (REQ-08.3)
  - Fail with clear error for unmapped ID changes (REQ-08.4)
  - _Requirements: REQ-08_
  - **Note:** Do NOT run any test commands

- [ ] 17. Implement provider lifecycle hooks (REQ-09)
  - Update `CReact.deploy()` to call lifecycle hooks
  - Call `preDeploy(cloudDOM)` before materialization (REQ-09.1)
  - Call `postDeploy(cloudDOM, outputs)` after materialization (REQ-09.2)
  - Call `onError(error, cloudDOM)` on deployment failure (REQ-09.3)
  - Halt deployment if lifecycle hooks fail (REQ-09.4)
  - Emit structured JSON logs for lifecycle events (REQ-09.5)
  - Log format for lifecycle hooks:
    ```json
    {
      "timestamp": "2025-10-04T12:00:00Z",
      "event": "preDeploy",
      "stack": "registry",
      "status": "success"
    }
    ```
  - _Requirements: REQ-09_
  - **Note:** Do NOT run any test commands

## Phase 4: CLI & Utilities (Tasks 19–24)

Build CLI commands and implement security/logging utilities.

- [ ] 18. Implement async resource handling (REQ-10)
  - Add `asyncTimeout` to `CReactConfig` (default 5 minutes) (REQ-10.5)
  - Update deployment to resolve dependencies in order (REQ-10.2)
  - Wait for parent outputs before deploying children (REQ-10.3)
  - Handle async resolution errors with clear messages (REQ-10.4)
  - Include timeout information in error messages
  - _Requirements: REQ-10_
  - **Note:** Do NOT run any test commands

- [ ] 19. Implement CLI: build command
  - Create `cli/build.ts`
  - Parse JSX file path from arguments
  - Instantiate DummyCloudProvider and DummyBackendProvider
  - Inject providers into CReact
  - Call `creact.build(jsx)`
  - Log success message with CloudDOM path
  - Handle errors with clear messages
  - _Requirements: REQ-05_
  - **Key:** CLI is where providers are instantiated and injected
  - **Note:** Do NOT run CLI commands automatically

- [ ] 20. Implement CLI: validate command
  - Create `cli/validate.ts`
  - Parse JSX file path from arguments
  - Instantiate CReact with dummy providers
  - Render JSX to Fiber
  - Run validator only (no commit)
  - Log validation success or errors
  - Exit with appropriate code (0 = success, 1 = error)
  - _Requirements: REQ-07_
  - **Note:** Do NOT run CLI commands automatically

- [ ] 21. Implement CLI: compare command
  - Create `cli/compare.ts`
  - Load previous CloudDOM from `.creact/clouddom.json`
  - Build current CloudDOM from JSX
  - Call `creact.compare(previous, current)`
  - Display diff in readable format:
    - `+` for creates (green)
    - `-` for deletes (red)
    - `Δ` for updates (yellow)
  - Show "Review diff before deploying" message
  - _Requirements: REQ-05_
  - **Note:** Do NOT run CLI commands automatically

- [ ] 22. Implement CLI: deploy command
  - Create `cli/deploy.ts`
  - Load CloudDOM from `.creact/clouddom.json`
  - Call `creact.deploy(cloudDOM)`
  - Show progress indicator during deployment (REQ-NF-03.2)
  - Log deployment time on completion
  - Handle errors with remediation suggestions (REQ-NF-03.3)
  - _Requirements: REQ-05_
  - **Note:** Do NOT run CLI commands automatically

- [ ] 23. Implement secret redaction (REQ-NF-02.1)
  - Create `SecretRedactor` class
  - Define secret patterns: password, secret, token, key, credential
  - Implement `redact(obj)` method that recursively redacts secrets
  - Replace secret values with `***REDACTED***`
  - Use in CLI output and logs
  - _Requirements: REQ-NF-02.1_
  - **Note:** Do NOT run any test commands

- [ ] 24. Implement structured logging (REQ-09.5)
  - Add log levels: info, warn, error
  - Emit JSON logs for lifecycle hooks
  - Include timestamps and request IDs
  - Ensure logs redact secrets (use SecretRedactor)
  - _Requirements: REQ-09.5, REQ-NF-02_
  - **Note:** Do NOT run any test commands

## Phase 5: Examples & Validation (Tasks 25–27)

Create examples and perform final POC validation.

- [ ] 25. Create POC example with dependency injection
  - Create `examples/poc.tsx`
  - Define dummy constructs: `DummyRegistry`, `DummyService`
  - Create `RegistryStack` component with `useInstance` and `useState`
  - Create `Service` component with `useStackContext`
  - Show dependency injection pattern:
    ```typescript
    const cloudProvider = new DummyCloudProvider();
    const backendProvider = new DummyBackendProvider();
    const creact = new CReact({ cloudProvider, backendProvider });
    await creact.build(<RegistryStack><Service /></RegistryStack>);
    await creact.deploy(cloudDOM);
    ```
  - _Requirements: All_
  - **Key:** Example demonstrates dependency injection
  - **Note:** Do NOT run the example automatically

- [ ] 26. Create custom hook examples (REQ-03)
  - Create `examples/custom-hooks.tsx`
  - Implement `useVpc()` hook with sensible defaults
  - Implement `useDatabase()` hook with best practices
  - Show composition of `useInstance` and `useStackContext`
  - Document how to create domain-specific hooks
  - _Requirements: REQ-03_
  - **Note:** Do NOT run any test commands

- [ ] 27. Verification Run (Final POC Validation)
  - Run full CLI flow manually: `build`, `validate`, `compare`, `deploy`
  - Confirm expected output logs match POC Success Criteria
  - Measure build time (<2s for <10 resources) (REQ-NF-01.1)
  - Measure compare time (<1s) (REQ-NF-01.2)
  - Validate no secrets appear in output (REQ-NF-02.1)
  - Document results in README
  - _Requirements: REQ-NF-01, REQ-NF-02, REQ-NF-03_
  - **Note:** Manual verification - document results

## POC Success Criteria

**Minimal working example:**
```tsx
// Dummy constructs
class DummyRegistry {}
class DummyService {}

function RegistryStack({ children }) {
  const repo = useInstance(DummyRegistry, { name: 'app' });
  const [state] = useState({ repositoryUrl: 'registry-url' });
  return <StackContext.Provider value={state}>{children}</StackContext.Provider>;
}

function Service() {
  const { repositoryUrl } = useStackContext();
  useInstance(DummyService, { name: 'api', image: `${repositoryUrl}:latest` });
  return null;
}

// DEPENDENCY INJECTION
const cloudProvider = new DummyCloudProvider();
const backendProvider = new DummyBackendProvider();
const creact = new CReact({ cloudProvider, backendProvider });

const cloudDOM = await creact.build(
  <RegistryStack>
    <Service />
  </RegistryStack>
);

await creact.deploy(cloudDOM);
```

**Expected output:**
```
=== DummyCloudProvider: Materializing CloudDOM ===

Deploying: registry (DummyRegistry)
  Props: {"name":"app"}
  Outputs:
    registry.repositoryUrl = "registry-url"
  Deploying: registry.service (DummyService)
    Props: {"name":"api","image":"registry-url:latest"}

=== Materialization Complete ===
```

**Verification checklist (maps to requirements):**
- ✅ CloudDOM has 2 nodes: `registry`, `registry.service` (REQ-01)
- ✅ Deployment order: registry → service (parent before child) (REQ-05.3)
- ✅ Service receives state from Registry via context (REQ-02.3)
- ✅ Outputs generated from `useState` (REQ-02.1)
- ✅ Output names follow pattern: `nodeId.stateKey` (REQ-06)
- ✅ DummyCloudProvider logs show correct structure (REQ-04)
- ✅ Naming is consistent and deterministic (REQ-01.5)
- ✅ Providers are injected, not inherited (REQ-04.2, REQ-04.3)
- ✅ CloudDOM persisted to `.creact/clouddom.json` (REQ-01.6)
- ✅ Validation runs automatically (REQ-07.6)
- ✅ Idempotent deployment (REQ-05.4)

**CLI commands work:**
```bash
$ creact build examples/poc.tsx
✔ Built CloudDOM (2 resources)

$ creact validate examples/poc.tsx
✔ Validation passed

$ creact compare examples/poc.tsx
+ registry added
+ registry.service added
Review diff before deploying.

$ creact deploy
✔ Deployment complete (0m 2s)
```

## Key Design Principles

1. **Dependency Injection** - All providers injected via constructor
2. **Interface Implementation** - Providers implement interfaces, not extend classes
3. **Composition** - Core classes compose providers, not inherit
4. **Swappable** - Easy to swap DummyProvider for CDKTFProvider
5. **Testable** - Easy to inject mock providers
6. **Validation First** - Validate before commit, compare, and deploy
7. **Idempotent** - Re-running deploy with no changes has no side effects
8. **Traceable** - Every component references REQ-XX in code comments

## Deliverables Summary

| Deliverable | Description | Location |
|-------------|-------------|----------|
| **Core library** | CReact core classes (Renderer, Validator, CloudDOMBuilder, Reconciler, CReact) | `lib/creact/core/` |
| **Dummy providers** | Logging + in-memory POC providers | `lib/creact/providers/` |
| **CLI commands** | Build / Validate / Compare / Deploy | `lib/creact/cli/` |
| **Hooks** | useInstance / useState / useStackContext | `lib/creact/hooks/` |
| **Context** | StackContext Provider/Consumer | `lib/creact/context/` |
| **Examples** | POC & custom hooks | `examples/` |
| **Output** | CloudDOM JSON (persisted) | `.creact/clouddom.json` |
| **Logs** | Structured JSON logs | Console output |

## Notes

- Use DummyCloudProvider (logs CloudDOM) for POC
- Use DummyBackendProvider (in-memory) for POC
- Use dummy constructs (empty classes) for POC
- Focus on proving the architecture works
- CDKTF integration comes later (DI makes this easy)
- Skip remote state, S3 backend for POC
- **Do NOT run commands automatically - always pass to user**
- Validation happens automatically in build, compare, and deploy
- CloudDOM is persisted to disk for debugging and determinism
- Add `// REQ-XX` comments in code for traceability
- Phase labels help align workstreams for parallel implementation
