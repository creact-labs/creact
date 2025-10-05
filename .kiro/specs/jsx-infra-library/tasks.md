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
  - **Deliverables:**
    - `package.json` with TypeScript, Vitest, and React types
    - `tsconfig.json` configured for JSX
    - Directory structure: `src/`, `tests/`, `examples/`
  - **Testing Strategy:**
    - Verify TypeScript compilation works
    - Verify JSX transformation is enabled
    - Check all directories exist
  - **QA Checklist:**
    - [ ] `npm install` runs without errors
    - [ ] `tsc --noEmit` compiles successfully
    - [ ] Directory structure matches design
    - [ ] All required dependencies installed

- [x] 2. Implement provider interfaces (dependency injection foundation)
  - Create `ICloudProvider` interface with `materialize()` method
  - Create `IBackendProvider` interface with `getState()` and `saveState()` methods
  - Add optional `initialize()` method to both interfaces (REQ-04.4)
  - Add optional lifecycle hooks to `ICloudProvider`: `preDeploy`, `postDeploy`, `onError` (REQ-09)
  - Export all from `providers/index.ts`
  - _Requirements: REQ-04, REQ-09_
  - **Key:** These are interfaces only, NOT implementations yet
  - **Deliverables:**
    - `src/providers/ICloudProvider.ts` - Cloud provider interface
    - `src/providers/IBackendProvider.ts` - Backend provider interface
    - `src/providers/index.ts` - Barrel export
  - **Testing Strategy:**
    - TypeScript compilation validates interface structure
    - No runtime tests needed (interfaces only)
  - **QA Checklist:**
    - [ ] ICloudProvider has materialize() method
    - [ ] ICloudProvider has optional initialize(), preDeploy(), postDeploy(), onError()
    - [ ] IBackendProvider has getState() and saveState() methods
    - [ ] IBackendProvider has optional initialize()
    - [ ] All interfaces exported from index.ts
    - [ ] TypeScript compiles without errors

- [x] 3. Implement Dummy providers (POC implementations)
  - Create `DummyCloudProvider` that implements `ICloudProvider`
  - Implement `materialize()` to log CloudDOM structure with indentation
  - Log outputs in format: `nodeId.outputKey = value`
  - Create `DummyBackendProvider` that implements `IBackendProvider`
  - Implement in-memory Map storage for state
  - Add helper methods: `clearAll()`, `getAllState()`
  - _Requirements: REQ-04_
  - **Key:** These are standalone implementations, NOT base classes
  - **Deliverables:**
    - `src/providers/DummyCloudProvider.ts` - Logging cloud provider
    - `src/providers/DummyBackendProvider.ts` - In-memory backend provider
  - **Testing Strategy:**
    - Unit tests verify materialize() logs CloudDOM correctly
    - Unit tests verify state storage/retrieval works
    - Unit tests verify clearAll() and getAllState() helpers
  - **QA Checklist:**
    - [ ] DummyCloudProvider implements ICloudProvider
    - [ ] materialize() logs CloudDOM with indentation
    - [ ] Outputs logged in format: nodeId.outputKey = value
    - [ ] DummyBackendProvider implements IBackendProvider
    - [ ] In-memory Map storage works correctly
    - [ ] clearAll() and getAllState() helpers work
    - [ ] No inheritance - standalone implementations

- [x] 4. Implement Renderer (JSX → Fiber)
  - Create `Renderer` class (no dependencies injected)
  - Implement `render(jsx)` method that executes JSX components
  - Build Fiber nodes with: `type`, `props`, `children`, `path`
  - Generate hierarchy paths for each node (e.g., `['registry', 'service']`)
  - Execute component functions recursively to resolve children
  - Store current Fiber tree for validation
  - _Requirements: REQ-01_
  - **Deliverables:**
    - `src/core/Renderer.ts` - JSX to Fiber renderer
    - Fiber node structure with type, props, children, path
  - **Testing Strategy:**
    - Unit tests verify JSX → Fiber transformation
    - Unit tests verify hierarchy path generation
    - Unit tests verify recursive component execution
  - **QA Checklist:**
    - [ ] Renderer class created with no dependencies
    - [ ] render() method executes JSX components
    - [ ] Fiber nodes have correct structure
    - [ ] Hierarchy paths generated correctly
    - [ ] Recursive execution works for nested components
    - [ ] Current Fiber tree stored for validation

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
  - **Deliverables:**
    - `src/core/Validator.ts` - Fiber validation logic
    - Clear error messages with stack traces
  - **Testing Strategy:**
    - Unit tests verify required props validation
    - Unit tests verify context availability checks
    - Unit tests verify unique ID enforcement
    - Unit tests verify circular dependency detection
    - Unit tests verify error message quality
  - **QA Checklist:**
    - [ ] Validator class created with no dependencies
    - [ ] validate() checks required props
    - [ ] validate() checks context availability
    - [ ] validate() checks resource ID uniqueness
    - [ ] validate() detects circular dependencies
    - [ ] Error messages include component stack trace
    - [ ] Error messages include file paths and line numbers

- [x] 6. Implement CloudDOMBuilder (Fiber → CloudDOM)
  - Create `CloudDOMBuilder` class that receives `ICloudProvider` via constructor
  - Implement `build(fiber)` method that traverses Fiber tree
  - Collect nodes with `useInstance` calls
  - Build CloudDOM tree with parent-child relationships
  - Filter out container components (no `useInstance`)
  - Generate CloudDOM nodes with: `id`, `path`, `construct`, `props`, `children`, `outputs`
  - _Requirements: REQ-01_
  - **Key:** CloudDOMBuilder RECEIVES cloudProvider via constructor
  - **Deliverables:**
    - `src/core/CloudDOMBuilder.ts` - Fiber to CloudDOM builder
    - CloudDOM node structure with id, path, construct, props, children, outputs
  - **Testing Strategy:**
    - Unit tests verify Fiber → CloudDOM transformation
    - Unit tests verify useInstance node collection
    - Unit tests verify parent-child relationships
    - Unit tests verify container filtering
  - **QA Checklist:**
    - [ ] CloudDOMBuilder receives ICloudProvider via constructor
    - [ ] build() traverses Fiber tree correctly
    - [ ] Collects nodes with useInstance calls
    - [ ] Builds parent-child relationships
    - [ ] Filters out container components
    - [ ] CloudDOM nodes have correct structure
    - [ ] Dependency injection pattern followed

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
  - **Deliverables:**
    - `src/core/CReact.ts` - Main orchestrator class
    - `CReactConfig` interface for dependency injection
    - build(), compare(), deploy() methods
  - **Testing Strategy:**
    - Integration tests verify full pipeline (render → validate → build → deploy)
    - Unit tests verify idempotent deployment
    - Unit tests verify lifecycle hook invocation
    - Unit tests verify provider injection
  - **QA Checklist:**
    - [ ] CReactConfig interface created
    - [ ] CReact receives config via constructor
    - [ ] Renderer, Validator, CloudDOMBuilder instantiated
    - [ ] build() method: render → validate → commit → persist
    - [ ] compare() method: validate → diff
    - [ ] deploy() method: validate → idempotency → hooks → materialize → save
    - [ ] Providers injected, not created
    - [ ] All tests passing

- [x] 8. Implement CloudDOM persistence (REQ-01.6)
  - Create `.creact/` directory if it doesn't exist
  - Save CloudDOM to `.creact/clouddom.json` after build
  - Format JSON with indentation for readability
  - Log file path after saving
  - _Requirements: REQ-01.6_
  - **Deliverables:**
    - CloudDOM persistence logic in CReact.ts
    - `.creact/clouddom.json` file with formatted JSON
  - **Testing Strategy:**
    - Unit tests verify directory creation
    - Unit tests verify JSON formatting
    - Unit tests verify file persistence
    - Integration tests verify persistence after build
  - **QA Checklist:**
    - [ ] .creact/ directory created if missing
    - [ ] CloudDOM saved to .creact/clouddom.json
    - [ ] JSON formatted with indentation
    - [ ] File path logged after saving
    - [ ] Tests verify persistence works

- [x] 9. Implement useInstance hook
  - Create `useInstance(construct, props)` hook
  - Generate resource ID from current Fiber path
  - Create CloudDOM node and attach to Fiber
  - Store construct type and props
  - Return reference to resource
  - _Requirements: REQ-01, REQ-03_
  - **Deliverables:**
    - `src/hooks/useInstance.ts` - Resource creation hook
    - CloudDOM node creation logic
  - **Testing Strategy:**
    - Unit tests verify resource ID generation
    - Unit tests verify CloudDOM node creation
    - Unit tests verify node attachment to Fiber
    - Integration tests verify hook usage in components
  - **QA Checklist:**
    - [ ] useInstance hook created
    - [ ] Resource ID generated from Fiber path
    - [ ] CloudDOM node created and attached
    - [ ] Construct type and props stored
    - [ ] Reference to resource returned
    - [ ] Tests verify hook behavior

- [ ] 10. Implement naming system
  - Generate resource IDs from Fiber paths (e.g., `['registry', 'service']` → `'registry.service'`)
  - Use kebab-case for multi-word names (e.g., `'registry-service'`)
  - Support custom keys via `key` prop
  - Ensure IDs are unique within scope
  - _Requirements: REQ-01_
  - **Deliverables:**
    - Naming utility functions
    - ID generation logic
  - **Testing Strategy:**
    - Unit tests verify path → ID conversion
    - Unit tests verify kebab-case formatting
    - Unit tests verify custom key support
    - Unit tests verify ID uniqueness enforcement
  - **QA Checklist:**
    - [ ] IDs generated from Fiber paths
    - [ ] Kebab-case used for multi-word names
    - [ ] Custom keys supported via key prop
    - [ ] IDs unique within scope
    - [ ] Tests verify naming logic

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
  - **Deliverables:**
    - `src/hooks/useState.ts` - Declarative output hook
    - Output storage in Fiber nodes
  - **Testing Strategy:**
    - Unit tests verify output declaration
    - Unit tests verify setState updates output map
    - Integration tests verify build-time vs deploy-time behavior
    - Integration tests verify output persistence
  - **QA Checklist:**
    - [ ] useState hook created
    - [ ] Outputs stored in Fiber node
    - [ ] [state, setState] tuple returned
    - [ ] setState updates output map (not render trigger)
    - [ ] Build-time collection works
    - [ ] Deploy-time patching works
    - [ ] Tests verify declarative semantics

- [ ] 12. Implement Stack Context
  - Create `StackContext` with `Provider` and `Consumer`
  - Implement `useStackContext()` hook
  - Traverse Fiber tree depth-first to find nearest Provider (REQ-02.5)
  - Return Provider's value
  - Support optional stack name parameter for remote state (REQ-02.8)
  - _Requirements: REQ-02_
  - **Deliverables:**
    - `src/context/StackContext.ts` - Context implementation
    - `src/hooks/useStackContext.ts` - Context hook
  - **Testing Strategy:**
    - Unit tests verify Provider/Consumer creation
    - Unit tests verify depth-first traversal
    - Integration tests verify parent-child output sharing
    - Integration tests verify remote state support
  - **QA Checklist:**
    - [ ] StackContext with Provider and Consumer created
    - [ ] useStackContext hook implemented
    - [ ] Depth-first traversal to nearest Provider
    - [ ] Provider's value returned
    - [ ] Optional stack name parameter supported
    - [ ] Tests verify context propagation

- [ ] 13. Implement output system (persistent state snapshots)
  - Extract outputs from `useState` calls in Fiber nodes
  - Store outputs in CloudDOM nodes
  - Generate output names: `nodeId.stateKey` (e.g., `'registry.repositoryUrl'`)
  - Persist outputs to backend provider after deploy (REQ-02.7)
  - On next build, merge persisted outputs into state context
  - DummyCloudProvider logs outputs during materialization
  - _Requirements: REQ-02, REQ-06_
  - **Key:** Outputs are persisted to backend for reconciliation on next build
  - **Deliverables:**
    - Output extraction logic in CReact.ts
    - Output persistence to backend
    - Output merging on next build
  - **Testing Strategy:**
    - Unit tests verify output extraction from Fiber
    - Unit tests verify output name generation
    - Integration tests verify persistence to backend
    - Integration tests verify merging on next build
  - **QA Checklist:**
    - [ ] Outputs extracted from useState calls
    - [ ] Outputs stored in CloudDOM nodes
    - [ ] Output names follow nodeId.stateKey pattern
    - [ ] Outputs persisted to backend after deploy
    - [ ] Outputs merged into context on next build
    - [ ] DummyCloudProvider logs outputs
    - [ ] Tests verify output system

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
  - **Deliverables:**
    - `src/core/Reconciler.ts` - Diff logic implementation
    - Diff result with creates, updates, deletes, moves
  - **Testing Strategy:**
    - Unit tests verify create detection
    - Unit tests verify delete detection
    - Unit tests verify update detection
    - Unit tests verify move detection
    - Integration tests verify full diff scenarios
  - **QA Checklist:**
    - [ ] Reconciler receives migrationMap via constructor
    - [ ] diff() compares CloudDOM trees by ID
    - [ ] Creates detected (ID in current only)
    - [ ] Deletes detected (ID in previous only)
    - [ ] Updates detected (ID in both, props changed)
    - [ ] Moves detected (same resource, different ID)
    - [ ] Tests verify diff logic

- [ ] 16. Implement migration map versioning
  - Store migration maps in backend state with version and timestamp
  - Create `MigrationMapVersion` interface
  - Append to `migrationHistory` array in state
  - Load migration history when comparing
  - _Requirements: REQ-08.5_
  - **Deliverables:**
    - `MigrationMapVersion` interface
    - Migration history storage in backend
  - **Testing Strategy:**
    - Unit tests verify version storage
    - Unit tests verify history appending
    - Integration tests verify history loading
  - **QA Checklist:**
    - [ ] Migration maps stored with version and timestamp
    - [ ] MigrationMapVersion interface created
    - [ ] History appended to migrationHistory array
    - [ ] History loaded when comparing
    - [ ] Tests verify versioning

- [ ] 17. Implement migration hooks
  - Update `Reconciler` to check migration map for ID changes (REQ-08.2)
  - Treat mapped ID changes as updates (REQ-08.1)
  - Preserve resource state during refactoring (REQ-08.3)
  - Fail with clear error for unmapped ID changes (REQ-08.4)
  - _Requirements: REQ-08_
  - **Deliverables:**
    - Migration map checking logic in Reconciler
    - Error handling for unmapped ID changes
  - **Testing Strategy:**
    - Unit tests verify migration map checking
    - Unit tests verify mapped changes treated as updates
    - Unit tests verify state preservation
    - Unit tests verify error on unmapped changes
  - **QA Checklist:**
    - [ ] Reconciler checks migration map for ID changes
    - [ ] Mapped ID changes treated as updates
    - [ ] Resource state preserved during refactoring
    - [ ] Clear error for unmapped ID changes
    - [ ] Tests verify migration hooks

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
  - **Deliverables:**
    - Lifecycle hook invocation in CReact.deploy()
    - Structured JSON logging
  - **Testing Strategy:**
    - Integration tests verify hook invocation order
    - Unit tests verify preDeploy called before materialization
    - Unit tests verify postDeploy called after materialization
    - Unit tests verify onError called on failure
    - Unit tests verify deployment halts on hook failure
    - Unit tests verify JSON log structure
  - **QA Checklist:**
    - [ ] CReact.deploy() calls lifecycle hooks
    - [ ] preDeploy called before materialization
    - [ ] postDeploy called after materialization
    - [ ] onError called on deployment failure
    - [ ] Deployment halts if hooks fail
    - [ ] Structured JSON logs emitted
    - [ ] Tests verify hook behavior

- [ ] 19. Implement component lifecycle callbacks
  - Add support for `onDeploy` callback in useInstance props (REQ-11.1)
  - Add support for `onStage` callback in useInstance props (REQ-11.2)
  - Add support for `onDestroy` callback in useInstance props (REQ-11.3)
  - Invoke callbacks at appropriate lifecycle stages
  - Pass outputs and CloudDOM node to callbacks (REQ-11.5)
  - Support async callbacks (REQ-11.6)
  - Halt deployment on callback failure (REQ-11.4)
  - _Requirements: REQ-11_
  - **Deliverables:**
    - Component callback support in useInstance
    - Callback invocation logic
  - **Testing Strategy:**
    - Unit tests verify onDeploy callback invocation
    - Unit tests verify onStage callback invocation
    - Unit tests verify onDestroy callback invocation
    - Unit tests verify outputs passed to callbacks
    - Unit tests verify async callback support
    - Unit tests verify deployment halts on failure
  - **QA Checklist:**
    - [ ] onDeploy callback supported in useInstance
    - [ ] onStage callback supported in useInstance
    - [ ] onDestroy callback supported in useInstance
    - [ ] Callbacks invoked at correct stages
    - [ ] Outputs and CloudDOM node passed to callbacks
    - [ ] Async callbacks supported
    - [ ] Deployment halts on callback failure
    - [ ] Tests verify callback behavior

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
  - **Deliverables:**
    - Async timeout configuration in CReactConfig
    - Dependency resolution logic in deploy()
  - **Testing Strategy:**
    - Unit tests verify timeout configuration
    - Integration tests verify dependency order resolution
    - Integration tests verify parent-before-child deployment
    - Unit tests verify timeout error handling
  - **QA Checklist:**
    - [ ] asyncTimeout added to CReactConfig (default 5 min)
    - [ ] Deployment resolves dependencies in order
    - [ ] Waits for parent outputs before children
    - [ ] Async errors have clear messages
    - [ ] Timeout information in error messages
    - [ ] Tests verify async handling

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
  - **Deliverables:**
    - `src/cli/build.ts` - Build command implementation
  - **Testing Strategy:**
    - E2E tests verify CLI execution
    - Unit tests verify argument parsing
    - Unit tests verify provider instantiation
    - Unit tests verify error handling
  - **QA Checklist:**
    - [ ] cli/build.ts created
    - [ ] JSX file path parsed from arguments
    - [ ] Providers instantiated and injected
    - [ ] creact.build(jsx) called
    - [ ] Success message logged with path
    - [ ] Errors handled with clear messages
    - [ ] Tests verify CLI behavior

- [ ] 22. Implement CLI: validate command
  - Create `cli/validate.ts`
  - Parse JSX file path from arguments
  - Instantiate CReact with dummy providers
  - Render JSX to Fiber
  - Run validator only (no commit)
  - Log validation success or errors
  - Exit with appropriate code (0 = success, 1 = error)
  - _Requirements: REQ-07_
  - **Deliverables:**
    - `src/cli/validate.ts` - Validate command implementation
  - **Testing Strategy:**
    - E2E tests verify CLI execution
    - Unit tests verify validation-only behavior
    - Unit tests verify exit codes
  - **QA Checklist:**
    - [ ] cli/validate.ts created
    - [ ] JSX file path parsed
    - [ ] CReact instantiated with providers
    - [ ] Validator runs without commit
    - [ ] Success/errors logged
    - [ ] Exit codes correct (0=success, 1=error)
    - [ ] Tests verify validation

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
  - **Deliverables:**
    - `src/cli/compare.ts` - Compare command implementation
    - Colored diff output
  - **Testing Strategy:**
    - E2E tests verify CLI execution
    - Unit tests verify diff display formatting
    - Unit tests verify color coding
  - **QA Checklist:**
    - [ ] cli/compare.ts created
    - [ ] Previous CloudDOM loaded
    - [ ] Current CloudDOM built
    - [ ] creact.compare() called
    - [ ] Diff displayed with colors
    - [ ] Review message shown
    - [ ] Tests verify compare output

- [ ] 24. Implement CLI: deploy command
  - Create `cli/deploy.ts`
  - Load CloudDOM from `.creact/clouddom.json`
  - Call `creact.deploy(cloudDOM)`
  - Show progress indicator during deployment (REQ-NF-03.2)
  - Log deployment time on completion
  - Handle errors with remediation suggestions (REQ-NF-03.3)
  - _Requirements: REQ-05_
  - **Deliverables:**
    - `src/cli/deploy.ts` - Deploy command implementation
    - Progress indicators
  - **Testing Strategy:**
    - E2E tests verify CLI execution
    - Unit tests verify progress indicators
    - Unit tests verify timing logs
    - Unit tests verify error remediation
  - **QA Checklist:**
    - [ ] cli/deploy.ts created
    - [ ] CloudDOM loaded from file
    - [ ] creact.deploy() called
    - [ ] Progress indicator shown
    - [ ] Deployment time logged
    - [ ] Errors have remediation suggestions
    - [ ] Tests verify deploy behavior

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
  - **Deliverables:**
    - `src/utils/SecretRedactor.ts` - Secret redaction utility
  - **Testing Strategy:**
    - Unit tests verify pattern matching
    - Unit tests verify recursive redaction
    - Unit tests verify replacement format
    - Integration tests verify CLI usage
  - **QA Checklist:**
    - [ ] SecretRedactor class created
    - [ ] Secret patterns defined (password, secret, token, key, credential)
    - [ ] redact() recursively redacts secrets
    - [ ] Secrets replaced with ***REDACTED***
    - [ ] Used in CLI output and logs
    - [ ] Tests verify redaction

- [ ] 26. Implement structured logging
  - Add log levels: info, warn, error
  - Emit JSON logs for lifecycle hooks
  - Include timestamps and request IDs
  - Ensure logs redact secrets (use SecretRedactor)
  - _Requirements: REQ-09.5, REQ-NF-02_
  - **Deliverables:**
    - `src/utils/Logger.ts` - Structured logging utility
    - JSON log format
  - **Testing Strategy:**
    - Unit tests verify log levels
    - Unit tests verify JSON format
    - Unit tests verify timestamp inclusion
    - Unit tests verify secret redaction
  - **QA Checklist:**
    - [ ] Log levels added (info, warn, error)
    - [ ] JSON logs emitted for lifecycle hooks
    - [ ] Timestamps included
    - [ ] Request IDs included
    - [ ] Secrets redacted in logs
    - [ ] Tests verify logging

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
  - **Deliverables:**
    - `examples/poc.tsx` - Complete POC example
    - Dummy constructs
    - Component examples
  - **Testing Strategy:**
    - Manual execution verifies example works
    - Example serves as integration test
  - **QA Checklist:**
    - [ ] examples/poc.tsx created
    - [ ] Dummy constructs defined
    - [ ] RegistryStack uses useInstance, useState, useEffect
    - [ ] Service uses useStackContext
    - [ ] Dependency injection pattern demonstrated
    - [ ] Example runs successfully

- [ ] 28. Create custom hook examples
  - Create `examples/custom-hooks.tsx`
  - Implement `useVpc()` hook with sensible defaults
  - Implement `useDatabase()` hook with best practices
  - Show composition of `useInstance`, `useStackContext`, and `useEffect`
  - Document how to create domain-specific hooks
  - _Requirements: REQ-03_
  - **Deliverables:**
    - `examples/custom-hooks.tsx` - Custom hook examples
    - Documentation for hook creation
  - **Testing Strategy:**
    - Manual execution verifies examples work
    - Examples demonstrate best practices
  - **QA Checklist:**
    - [ ] examples/custom-hooks.tsx created
    - [ ] useVpc() hook with sensible defaults
    - [ ] useDatabase() hook with best practices
    - [ ] Hook composition demonstrated
    - [ ] Documentation included
    - [ ] Examples run successfully

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
  - **Deliverables:**
    - Verification results documented in README
    - Performance measurements
    - Security validation results
  - **Testing Strategy:**
    - Manual CLI execution
    - Performance benchmarking
    - Security audit
    - Feature validation
  - **QA Checklist:**
    - [ ] Full CLI flow executed (build, validate, compare, deploy)
    - [ ] Output logs match POC Success Criteria
    - [ ] Build time <2s for <10 resources
    - [ ] Compare time <1s
    - [ ] No secrets in output
    - [ ] useEffect behavior verified
    - [ ] Component callbacks verified
    - [ ] Results documented in README
    - [ ] All requirements validated

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
