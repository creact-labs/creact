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
  - Create root directory structure with `src/` subdirectories
  - Initialize package.json with TypeScript and JSX support
  - Configure tsconfig.json for JSX transformation
  - Install dependencies: React types only (no CDKTF for POC)
  - _Requirements: All_
  - **Note:** Project is now in root directory (standalone repository), not `lib/creact/`

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

- [x] 6. Implement CloudDOMBuilder (Fiber → CloudDOM)
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

**See detailed tasks in:** `.kiro/specs/test-reorganization/tasks.md`

Foundation: Reorganize and optimize existing tests before continuing with new features. This phase reduces test code by 43% (6,600 → 3,800 lines), eliminates 50%+ duplication through shared helpers, and improves test execution time by 20%+.

**Quick Summary:**
- Create shared test helpers to eliminate duplication
- Reorganize tests into domain-based structure (unit/integration/edge-cases/performance/contracts)
- Split oversized files (some are 1,593 lines!) into focused files (<300 lines each)
- Use parameterized tests to reduce redundancy
- Separate performance tests from regular test runs

**Expected Outcomes:**
- 20 focused test files (vs 10 large files)
- ~3,800 lines (vs ~6,600 lines)
- Max file size: 300 lines (vs 1,593 lines)
- Same or better code coverage
- 20%+ faster test execution

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

- [x] 7. Implement CReact orchestrator (main class)
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

- [ ] 11. Implement useState hook (declarative output binding)
  - Create `useState(initialOutputs)` hook
  - Store outputs in current Fiber node
  - Return `[state, setState]` tuple
  - Implement `setState(updates)` to update output map (NOT a render trigger)
  - During build: `setState()` collects values known at build-time
  - During deploy: `setState()` patches in async resources (queue URLs, ARNs)
  - Outputs become persisted state for the component
  - _Requirements: REQ-02_
  - **Key:** `setState()` is a persistent output update mechanism, not a reactive updater
  - **Note:** Do NOT run any test commands

- [ ] 12. Implement Stack Context
  - Create `StackContext` with `Provider` and `Consumer`
  - Implement `useStackContext()` hook
  - Traverse Fiber tree depth-first to find nearest Provider (REQ-02.5)
  - Return Provider's value
  - Support optional stack name parameter for remote state (REQ-02.8)
  - _Requirements: REQ-02_
  - **Note:** Do NOT run any test commands

- [ ] 13. Implement output system (persistent state snapshots)
  - Extract outputs from `useState` calls in Fiber nodes
  - Store outputs in CloudDOM nodes
  - Generate output names: `nodeId.stateKey` (e.g., `'registry.repositoryUrl'`)
  - Persist outputs to backend provider after deploy (REQ-02.7)
  - On next build, merge persisted outputs into state context
  - DummyCloudProvider logs outputs during materialization
  - _Requirements: REQ-02, REQ-06_
  - **Key:** Outputs are persisted to backend for reconciliation on next build
  - **Note:** Do NOT run any test commands

### Milestone 2 Verification (After Task 14)

**Verification Run:**
```bash
$ ts-node examples/poc.tsx
```

✅ **Expect:**
- ✔ Hooks work correctly (`useInstance`, `useState`, `useStackContext`, `useEffect`)
- ✔ `useState()` declares outputs (NOT reactive state)
- ✔ `setState()` updates output map (NOT a render trigger)
- ✔ `useEffect()` runs once at mount, cleanup runs at unmount
- ✔ CloudDOM nodes have correct IDs and outputs
- ✔ Stack Context resolves depth-first to nearest Provider
- ✔ Outputs logged in format: `nodeId.outputKey = value`
- ✔ Outputs persisted to backend provider
- ✔ On next build, persisted outputs merged into state context
- _Validates: REQ-01, REQ-02, REQ-03, REQ-12_

## Phase 3: Diff & Lifecycle (Tasks 15–19)

Implement reconciliation, migration hooks, lifecycle management, and component callbacks.

- [ ] 15. Implement Reconciler (diff logic)
  - Create `Reconciler` class that receives optional `migrationMap` via constructor
  - Implement `diff(previous, current)` method
  - Compare CloudDOM trees by ID
  - Detect: creates (ID in current only)
  - Detect: deletes (ID in previous only)
  - Detect: updates (ID in both, props changed)
  - Detect: moves (same resource, different ID)
  - _Requirements: REQ-05, REQ-08_
  - **Note:** Do NOT run any test commands

- [ ] 16. Implement migration map versioning
  - Store migration maps in backend state with version and timestamp
  - Create `MigrationMapVersion` interface
  - Append to `migrationHistory` array in state
  - Load migration history when comparing
  - _Requirements: REQ-08.5_
  - **Note:** Do NOT run any test commands

- [ ] 17. Implement migration hooks
  - Update `Reconciler` to check migration map for ID changes (REQ-08.2)
  - Treat mapped ID changes as updates (REQ-08.1)
  - Preserve resource state during refactoring (REQ-08.3)
  - Fail with clear error for unmapped ID changes (REQ-08.4)
  - _Requirements: REQ-08_
  - **Note:** Do NOT run any test commands

- [ ] 18. Implement provider lifecycle hooks
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

- [ ] 19. Implement component lifecycle callbacks
  - Add support for `onDeploy` callback in useInstance props (REQ-11.1)
  - Add support for `onStage` callback in useInstance props (REQ-11.2)
  - Add support for `onDestroy` callback in useInstance props (REQ-11.3)
  - Invoke callbacks at appropriate lifecycle stages
  - Pass outputs and CloudDOM node to callbacks (REQ-11.5)
  - Support async callbacks (REQ-11.6)
  - Halt deployment on callback failure (REQ-11.4)
  - _Requirements: REQ-11_
  - **Note:** Do NOT run any test commands

### Milestone 3 Verification (After Task 19)

**Verification Run:**
```bash
$ ts-node examples/lifecycle-example.tsx
```

✅ **Expect:**
- ✔ Reconciler correctly diffs CloudDOM trees
- ✔ Migration maps preserve resource identity during refactoring
- ✔ Provider lifecycle hooks execute in correct order (preDeploy → materialize → postDeploy)
- ✔ Component callbacks (onDeploy, onStage, onDestroy) execute at correct stages
- ✔ Structured JSON logs emitted for lifecycle events
- ✔ Deployment halts on hook/callback failures
- _Validates: REQ-05, REQ-08, REQ-09, REQ-11_

## Phase 4: Async Handling & CLI (Tasks 20–26)

Build async resource handling, CLI commands, and security/logging utilities.

- [ ] 20. Implement async resource handling
  - Add `asyncTimeout` to `CReactConfig` (default 5 minutes) (REQ-10.5)
  - Update deployment to resolve dependencies in order (REQ-10.2)
  - Wait for parent outputs before deploying children (REQ-10.3)
  - Handle async resolution errors with clear messages (REQ-10.4)
  - Include timeout information in error messages
  - _Requirements: REQ-10_
  - **Note:** Do NOT run any test commands

- [ ] 21. Implement CLI: build command
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

- [ ] 22. Implement CLI: validate command
  - Create `cli/validate.ts`
  - Parse JSX file path from arguments
  - Instantiate CReact with dummy providers
  - Render JSX to Fiber
  - Run validator only (no commit)
  - Log validation success or errors
  - Exit with appropriate code (0 = success, 1 = error)
  - _Requirements: REQ-07_
  - **Note:** Do NOT run CLI commands automatically

- [ ] 23. Implement CLI: compare command
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

- [ ] 24. Implement CLI: deploy command
  - Create `cli/deploy.ts`
  - Load CloudDOM from `.creact/clouddom.json`
  - Call `creact.deploy(cloudDOM)`
  - Show progress indicator during deployment (REQ-NF-03.2)
  - Log deployment time on completion
  - Handle errors with remediation suggestions (REQ-NF-03.3)
  - _Requirements: REQ-05_
  - **Note:** Do NOT run CLI commands automatically

### Milestone 4 Verification (After Task 24)

**Verification Run:**
```bash
$ creact validate examples/poc.tsx
$ creact build examples/poc.tsx
$ creact compare examples/poc.tsx
$ creact deploy
```

✅ **Expect:**
- ✔ All CLI commands execute successfully
- ✔ Async resources resolve with proper timeout handling
- ✔ Build completes in <2s for <10 resources
- ✔ Compare completes in <1s
- ✔ Progress indicators show during long operations
- ✔ Error messages include file paths and remediation suggestions
- _Validates: REQ-01, REQ-05, REQ-07, REQ-10, REQ-NF-01, REQ-NF-03_

- [ ] 25. Implement secret redaction
  - Create `SecretRedactor` class
  - Define secret patterns: password, secret, token, key, credential
  - Implement `redact(obj)` method that recursively redacts secrets
  - Replace secret values with `***REDACTED***`
  - Use in CLI output and logs
  - _Requirements: REQ-NF-02.1_
  - **Note:** Do NOT run any test commands

- [ ] 26. Implement structured logging
  - Add log levels: info, warn, error
  - Emit JSON logs for lifecycle hooks
  - Include timestamps and request IDs
  - Ensure logs redact secrets (use SecretRedactor)
  - _Requirements: REQ-09.5, REQ-NF-02_
  - **Note:** Do NOT run any test commands

## Phase 5: Examples & Final Validation (Tasks 27–29)

Create comprehensive examples and perform final POC validation.

- [ ] 27. Create POC example with dependency injection
  - Create `examples/poc.tsx`
  - Define dummy constructs: `DummyRegistry`, `DummyService`
  - Create `RegistryStack` component with `useInstance`, `useState`, and `useEffect`
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

- [ ] 28. Create custom hook examples
  - Create `examples/custom-hooks.tsx`
  - Implement `useVpc()` hook with sensible defaults
  - Implement `useDatabase()` hook with best practices
  - Show composition of `useInstance`, `useStackContext`, and `useEffect`
  - Document how to create domain-specific hooks
  - _Requirements: REQ-03_
  - **Note:** Do NOT run any test commands

- [ ] 29. Verification Run (Final POC Validation)
  - Run full CLI flow manually: `build`, `validate`, `compare`, `deploy`
  - Confirm expected output logs match POC Success Criteria
  - Measure build time (<2s for <10 resources) (REQ-NF-01.1)
  - Measure compare time (<1s) (REQ-NF-01.2)
  - Validate no secrets appear in output (REQ-NF-02.1)
  - Test useEffect setup/teardown behavior
  - Test component lifecycle callbacks (onDeploy, onStage, onDestroy)
  - Document results in README
  - _Requirements: REQ-NF-01, REQ-NF-02, REQ-NF-03, REQ-11, REQ-12_
  - **Note:** Manual verification - document results

### Milestone 5 Verification (Final POC Complete)

**Verification Run:**
```bash
$ npm run test:all
$ creact validate examples/poc.tsx
$ creact build examples/poc.tsx
$ creact compare examples/poc.tsx
$ creact deploy
```

✅ **Expect:**
- ✔ All tests pass (unit, integration, edge-cases, performance)
- ✔ Full CLI workflow executes successfully
- ✔ All hooks work correctly (useState, useStackContext, useInstance, useEffect)
- ✔ Component lifecycle callbacks execute at correct stages
- ✔ Provider lifecycle hooks execute in correct order
- ✔ Secrets redacted in all output
- ✔ Performance targets met (<2s build, <1s compare)
- ✔ CloudDOM persisted correctly
- ✔ State persisted to backend
- ✔ Migration maps preserve resource identity
- ✔ Idempotent deployments work correctly
- _Validates: ALL REQUIREMENTS (REQ-01 through REQ-12, REQ-NF-01 through REQ-NF-03)_

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
| **Core library** | CReact core classes (Renderer, Validator, CloudDOMBuilder, Reconciler, CReact) | `src/core/` |
| **Dummy providers** | Logging + in-memory POC providers | `src/providers/` |
| **CLI commands** | Build / Validate / Compare / Deploy | `src/cli/` |
| **Hooks** | useInstance / useState / useStackContext | `src/hooks/` |
| **Context** | StackContext Provider/Consumer | `src/context/` |
| **Examples** | POC & custom hooks | `examples/` |
| **Tests** | Unit, integration, edge-cases, performance | `tests/` |
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
