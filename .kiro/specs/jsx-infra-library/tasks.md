# CReact Implementation Plan — Milestone 2: Interoperability

**Vision:** Transform CReact from a working prototype into a production-ready universal declarative runtime.

**Current State (Milestone 1 ✅):**
- Core rendering: JSX → Fiber → CloudDOM
- Hooks: useInstance, useState, useContext, createContext
- Providers: ICloudProvider, IBackendProvider (with DummyBackendProvider)
- Validation: Circular dependency detection, schema validation
- Persistence: CloudDOM saved to disk with atomic writes

**Target State (Milestone 2):**
- Reconciler: Diff algorithm for incremental updates
- State Machine: Crash recovery and transactional deployments
- Adapters: Wrap Terraform, Helm, Pulumi as CReact components
- Provider Router: Mix AWS, Docker, Kubernetes in one tree
- State Sync: Real-time CloudDOM updates to React/Vue/Python apps
- Nested Apps: Apps deploying apps recursively
- CLI: Developer-friendly commands (build, plan, deploy, dev)
- Hot Reload: React Fast Refresh for infrastructure
- Security: Locking, secrets, audit logs

---

## Implementation Strategy

**Build Order:**
1. **Foundation** - Reconciler + State Machine (enables everything else)
2. **Operational** - CLI + Plan + Deploy (developer workflow)
3. **Interop Core** - Adapters + Provider Router (external tool integration)
4. **State Bridge** - State Sync + React Hook (app integration)
5. **Advanced** - Nested Apps + Hot Reload (recursive composition)
6. **Production** - Locking + Secrets + Audit (security & reliability)

---

## Phase 1: Foundation

Build the core diff and state management infrastructure.

- [ ] 1. Create Reconciler class with diff algorithm
  - Create `src/core/Reconciler.ts`
  - Implement `reconcile(previous: CloudDOMNode[], current: CloudDOMNode[]): ChangeSet`
  - Build ID maps for O(n) lookup: `Map<string, CloudDOMNode>`
  - Detect creates: nodes in current but not in previous
  - Detect updates: nodes in both with different props (use deep equality)
  - Detect deletes: nodes in previous but not in current
  - Return ChangeSet with creates, updates, deletes arrays
  - _Requirements: REQ-O01, REQ-O04_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests written for all new public functions
- [ ] Integration tests for Reconciler diff algorithm
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] All interfaces documented with JSDoc

**Determinism / Safety**
- [ ] Deterministic outputs verified via snapshot tests
- [ ] No non-deterministic values (timestamps, random IDs)
- [ ] Reproducibility verified with same input twice

**Deliverables**
- ✅ `src/core/Reconciler.ts`
- ✅ Tests under `tests/core/reconciler.test.ts`
- ✅ Example usage in `examples/reconciler-demo.ts`
- ✅ QA evidence logged in `qa/phase1-task1.md`

**Acceptance**
- [ ] Task demo or test passes
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 2. Build dependency graph from CloudDOM
  - Scan node props for references to other node IDs
  - Build adjacency list: `Map<string, string[]>` (node ID → dependency IDs)
  - Detect circular dependencies using DFS
  - Throw ValidationError if cycles found
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for dependency graph construction
- [ ] Tests for circular dependency detection
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] All interfaces documented with JSDoc

**Determinism / Safety**
- [ ] Graph construction is deterministic
- [ ] Circular dependency errors are clear and actionable
- [ ] No false positives in cycle detection

**Deliverables**
- ✅ Code in `src/core/Reconciler.ts` (dependency graph methods)
- ✅ Tests under `tests/core/dependency-graph.test.ts`
- ✅ QA evidence logged in `qa/phase1-task2.md`

**Acceptance**
- [ ] Circular dependency test passes
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 3. Implement topological sort for deployment order
  - Use Kahn's algorithm on dependency graph
  - Return array of node IDs in deployment order
  - Sort nodes with same depth by ID for determinism
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for topological sort
- [ ] Tests verify deterministic ordering
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Algorithm documented with JSDoc

**Determinism / Safety**
- [ ] Sort order is deterministic across runs
- [ ] Same-depth nodes sorted by ID
- [ ] Handles empty graphs correctly

**Deliverables**
- ✅ Code in `src/core/Reconciler.ts` (topological sort method)
- ✅ Tests under `tests/core/topological-sort.test.ts`
- ✅ QA evidence logged in `qa/phase1-task3.md`

**Acceptance**
- [ ] Sort produces correct deployment order
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 4. Compute parallel deployment batches
  - Group nodes by depth in dependency graph
  - Nodes at same depth can deploy in parallel
  - Return `string[][]` (array of batches)
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for batch computation
- [ ] Tests verify parallel safety
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Batching logic documented

**Determinism / Safety**
- [ ] Batch grouping is deterministic
- [ ] No dependencies within same batch
- [ ] Handles single-node graphs

**Deliverables**
- ✅ Code in `src/core/Reconciler.ts` (batch computation method)
- ✅ Tests under `tests/core/parallel-batches.test.ts`
- ✅ QA evidence logged in `qa/phase1-task4.md`

**Acceptance**
- [ ] Batches are safe for parallel execution
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 5. Add ChangeSet interface to types
  - Update `src/core/types.ts`
  - Add ChangeSet, DependencyGraph interfaces
  - Export from `src/core/index.ts`
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] All interfaces have JSDoc comments
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Interfaces exported correctly

**Determinism / Safety**
- [ ] Type definitions are complete
- [ ] No `any` types used
- [ ] All fields documented

**Deliverables**
- ✅ Updated `src/core/types.ts`
- ✅ Updated `src/core/index.ts`
- ✅ QA evidence logged in `qa/phase1-task5.md`

**Acceptance**
- [ ] Types compile without errors
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 6. Create StateMachine class
  - Create `src/core/StateMachine.ts`
  - Define DeploymentState interface (status, cloudDOM, changeSet, checkpoint, error, timestamp, user)
  - Implement state transitions: PENDING → APPLYING → DEPLOYED/FAILED/ROLLED_BACK
  - Store state in BackendProvider
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for all state transitions
- [ ] Integration tests with BackendProvider
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] State machine documented with JSDoc

**Determinism / Safety**
- [ ] State transitions are atomic
- [ ] No race conditions in state updates
- [ ] Crash recovery tested

**Security**
- [ ] User info captured in state
- [ ] Audit log entries generated

**Deliverables**
- ✅ `src/core/StateMachine.ts`
- ✅ Tests under `tests/core/state-machine.test.ts`
- ✅ QA evidence logged in `qa/phase1-task6.md`

**Acceptance**
- [ ] All state transitions work correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 7. Implement deployment transaction methods
  - `startDeployment(stackName, changeSet)` - Set status to APPLYING
  - `updateCheckpoint(stackName, checkpoint)` - Save progress after each resource
  - `completeDeployment(stackName)` - Set status to DEPLOYED
  - `failDeployment(stackName, error)` - Set status to FAILED
  - All methods save state to BackendProvider
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for each transaction method
- [ ] Integration tests with BackendProvider
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Methods documented with JSDoc

**Determinism / Safety**
- [ ] Checkpoints saved atomically
- [ ] State persists across crashes
- [ ] Error handling tested

**Security**
- [ ] Audit log entries for all state changes

**Deliverables**
- ✅ Code in `src/core/StateMachine.ts`
- ✅ Tests under `tests/core/state-machine-transactions.test.ts`
- ✅ QA evidence logged in `qa/phase1-task7.md`

**Acceptance**
- [ ] Transactions work end-to-end
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 8. Implement crash recovery
  - `resumeDeployment(stackName)` - Continue from last checkpoint
  - `rollback(stackName)` - Apply reverse change set
  - Detect incomplete deployments on startup (status = APPLYING)
  - Offer resume or rollback options
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for resume and rollback
- [ ] Integration tests simulating crashes
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Recovery logic documented

**Determinism / Safety**
- [ ] Resume continues from exact checkpoint
- [ ] Rollback reverses all changes
- [ ] No partial state corruption

**CLI / UX Validation**
- [ ] Clear prompts for resume vs rollback
- [ ] Error messages are actionable

**Deliverables**
- ✅ Code in `src/core/StateMachine.ts`
- ✅ Tests under `tests/core/crash-recovery.test.ts`
- ✅ QA evidence logged in `qa/phase1-task8.md`

**Acceptance**
- [ ] Crash recovery works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 9. Integrate StateMachine with CReact
  - Update `src/core/CReact.ts` to use StateMachine
  - Wrap deploy() with state machine transitions
  - Save checkpoints after each resource materializes
  - Handle errors and update state accordingly
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Integration tests for full deploy cycle
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Integration documented

**Determinism / Safety**
- [ ] Deployment is transactional
- [ ] Checkpoints saved correctly
- [ ] Error handling tested

**Deliverables**
- ✅ Updated `src/core/CReact.ts`
- ✅ Tests under `tests/integration/creact-statemachine.test.ts`
- ✅ QA evidence logged in `qa/phase1-task9.md`

**Acceptance**
- [ ] Full deployment cycle works
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

## Phase 2: Operational

Build CLI and developer workflow commands.

- [ ] 10. Create CLI entry point
  - Create `src/cli/index.ts`
  - Use commander or yargs for command parsing
  - Add global options: --stack, --json, --help
  - Route to command handlers
  - _Requirements: REQ-O08_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] CLI help output tested
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Command routing documented

**CLI / UX Validation**
- [ ] `--help` shows all commands
- [ ] Global options work across commands
- [ ] Exit codes correct (0 = success, non-zero = error)

**Deliverables**
- ✅ `src/cli/index.ts`
- ✅ Tests under `tests/cli/index.test.ts`
- ✅ QA evidence logged in `qa/phase2-task10.md`

**Acceptance**
- [ ] CLI entry point works
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 11. Create configuration loader
  - Create `src/cli/config.ts`
  - Load CReact config from `creact.config.ts` or `creact.config.js`
  - Support provider configuration (cloudProvider, backendProvider)
  - Support CLI options override config file
  - _Requirements: REQ-O08_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for config loading
- [ ] Tests for config override behavior
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Config schema documented

**Determinism / Safety**
- [ ] Config loading is deterministic
- [ ] Clear error messages for invalid config
- [ ] No secrets in config files

**Deliverables**
- ✅ `src/cli/config.ts`
- ✅ Tests under `tests/cli/config.test.ts`
- ✅ Example config: `examples/creact.config.ts`
- ✅ QA evidence logged in `qa/phase2-task11.md`

**Acceptance**
- [ ] Config loading works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 12. Add CLI utilities
  - Create `src/cli/utils.ts`
  - Add colored output helpers (chalk)
  - Add spinner/progress indicators
  - Add error formatting
  - _Requirements: REQ-O08_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for utility functions
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Utilities documented

**CLI / UX Validation**
- [ ] Colors work in terminal
- [ ] Spinners don't interfere with output
- [ ] Error formatting is clear

**Deliverables**
- ✅ `src/cli/utils.ts`
- ✅ Tests under `tests/cli/utils.test.ts`
- ✅ QA evidence logged in `qa/phase2-task12.md`

**Acceptance**
- [ ] Utilities work correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 13. Set up CLI build and packaging
  - Add bin entry in package.json: `"creact": "./dist/cli/index.js"`
  - Configure TypeScript to compile CLI
  - Add shebang to CLI entry point
  - Test CLI installation: `npm link`
  - _Requirements: REQ-O08_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] CLI builds without errors
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Build process documented

**CLI / UX Validation**
- [ ] `npm link` works correctly
- [ ] CLI executable from command line
- [ ] Shebang correct for target platform

**Deliverables**
- ✅ Updated `package.json`
- ✅ Updated `tsconfig.json`
- ✅ QA evidence logged in `qa/phase2-task13.md`

**Acceptance**
- [ ] CLI installs and runs
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 14. Implement creact build command
  - Create `src/cli/build.ts`
  - Load app from entry file (default: `infrastructure.tsx`)
  - Call `creact.build(app)`
  - Save CloudDOM to backend
  - Output summary: resource count, validation status
  - Support --json flag for CI/CD
  - _Requirements: REQ-O08_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for build command
- [ ] Integration tests end-to-end
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Command documented with JSDoc

**Determinism / Safety**
- [ ] Build output is deterministic
- [ ] CloudDOM saved atomically
- [ ] Validation errors are clear

**CLI / UX Validation**
- [ ] Output matches IaC conventions
- [ ] `--json` flag works for CI/CD
- [ ] Exit codes correct

**Deliverables**
- ✅ `src/cli/build.ts`
- ✅ Tests under `tests/cli/build.test.ts`
- ✅ Example: `examples/basic-build.tsx`
- ✅ QA evidence logged in `qa/phase2-task14.md`

**Acceptance**
- [ ] Build command works end-to-end
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 15. Implement creact plan command
  - Create `src/cli/plan.ts`
  - Load previous CloudDOM from backend
  - Build current CloudDOM
  - Use Reconciler to compute diff
  - Display colored diff (green=create, yellow=update, red=delete)
  - Show deployment order
  - Support --json flag for CI/CD
  - _Requirements: REQ-O04_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests: `plan.test.ts` validates diff output
- [ ] Integration test: `cli-plan.e2e.ts` runs plan end-to-end
- [ ] CLI passes `npm run lint` and `npm run typecheck`
- [ ] Help output (`creact plan --help`) verified

**Determinism / Safety**
- [ ] Plan output deterministic across runs
- [ ] No timestamps or environment leakage in diff

**CLI / UX Validation**
- [ ] Matches Terraform-style plan output colors (+/~/-) 
- [ ] Works with `--json` for machine consumption
- [ ] Produces exit code 0 if no changes, 2 if changes detected

**Deliverables**
- ✅ `src/cli/plan.ts`
- ✅ `src/cli/diff.ts` (used internally)
- ✅ Tests under `tests/cli/plan.test.ts`
- ✅ Example: `examples/basic-plan.tsx`
- ✅ QA evidence logged in `qa/phase2-task15.md`

**Acceptance**
- [ ] Manual run: `$ creact plan` shows correct diff
- [ ] Snapshot output stable across builds
- [ ] Reviewed by 1 maintainer

---

- [ ] 16. Add colored diff output
  - Create `src/cli/diff.ts`
  - Format creates in green with + prefix
  - Format updates in yellow with ~ prefix
  - Format deletes in red with - prefix
  - Show resource type and ID for each change
  - Group by change type
  - _Requirements: REQ-O04_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for diff formatting
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Formatting documented

**CLI / UX Validation**
- [ ] Colors work in terminal
- [ ] Output is readable
- [ ] Grouping makes sense

**Deliverables**
- ✅ `src/cli/diff.ts`
- ✅ Tests under `tests/cli/diff.test.ts`
- ✅ QA evidence logged in `qa/phase2-task16.md`

**Acceptance**
- [ ] Diff output looks good
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 17. Implement creact deploy command
  - Create `src/cli/deploy.ts`
  - Run plan first (show diff)
  - Prompt for confirmation unless --auto-approve
  - Use StateMachine to track deployment
  - Call `creact.deploy(cloudDOM)`
  - Show progress for each resource
  - Handle errors and offer rollback
  - _Requirements: REQ-O08, REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for deploy command
- [ ] Integration tests end-to-end
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Command documented

**Determinism / Safety**
- [ ] Deployment is transactional
- [ ] Rollback works on failure
- [ ] Progress saved to checkpoints

**CLI / UX Validation**
- [ ] Confirmation prompt works
- [ ] `--auto-approve` skips prompt
- [ ] Progress indicators clear
- [ ] Error messages actionable

**Security**
- [ ] Audit log entries generated
- [ ] User info captured

**Deliverables**
- ✅ `src/cli/deploy.ts`
- ✅ Tests under `tests/cli/deploy.test.ts`
- ✅ Example: `examples/basic-deploy.tsx`
- ✅ QA evidence logged in `qa/phase2-task17.md`

**Acceptance**
- [ ] Deploy command works end-to-end
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 18. Implement creact resume command
  - Create `src/cli/resume.ts`
  - Check for incomplete deployments (status = APPLYING)
  - Show checkpoint info (X of Y resources deployed)
  - Prompt for resume or rollback
  - Continue deployment from checkpoint
  - _Requirements: REQ-O01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for resume command
- [ ] Integration tests with crash simulation
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Command documented

**Determinism / Safety**
- [ ] Resume continues from exact checkpoint
- [ ] No duplicate resource creation
- [ ] State consistent after resume

**CLI / UX Validation**
- [ ] Checkpoint info is clear
- [ ] Prompt offers resume/rollback
- [ ] Progress continues correctly

**Deliverables**
- ✅ `src/cli/resume.ts`
- ✅ Tests under `tests/cli/resume.test.ts`
- ✅ QA evidence logged in `qa/phase2-task18.md`

**Acceptance**
- [ ] Resume command works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 19. Add deployment progress indicators
  - Show spinner during resource materialization
  - Show progress bar: [====>    ] 5/10 resources
  - Show elapsed time
  - Show resource name being deployed
  - _Requirements: REQ-O08_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for progress indicators
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Progress logic documented

**CLI / UX Validation**
- [ ] Spinner doesn't interfere with output
- [ ] Progress bar updates correctly
- [ ] Elapsed time accurate
- [ ] Resource names displayed

**Deliverables**
- ✅ Code in `src/cli/utils.ts`
- ✅ Tests under `tests/cli/progress.test.ts`
- ✅ QA evidence logged in `qa/phase2-task19.md`

**Acceptance**
- [ ] Progress indicators work well
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 20. Implement configurable retry behavior
  - Add CLI flags: --max-retries, --retry-delay
  - Pass retry configuration through to StateMachine
  - Support per-provider retry overrides from config
  - _Requirements: REQ-O03_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for retry configuration
- [ ] Integration tests with retries
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Retry logic documented

**Determinism / Safety**
- [ ] Retry behavior is predictable
- [ ] Exponential backoff works
- [ ] Max retries respected

**CLI / UX Validation**
- [ ] CLI flags work correctly
- [ ] Config file overrides work
- [ ] Retry messages clear

**Deliverables**
- ✅ Updated CLI commands with retry flags
- ✅ Updated `src/core/StateMachine.ts`
- ✅ Tests under `tests/core/retry.test.ts`
- ✅ QA evidence logged in `qa/phase2-task20.md`

**Acceptance**
- [ ] Retry behavior works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

## Phase 3: Interop Core

Enable external IaC tool integration and multi-provider support.

structs
  - **Do not implement retry or rollback logic (handled by StateMachine)**
  - _Requirements: REQ-I04, REQ-ARCH-01_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for routing logic
- [ ] Tests verify provider grouping
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Logic documented

**Determinism / Safety**
- [ ] Routing is deterministic
- [ ] Error messages are clear
- [ ] No orchestration in routing

**Deliverables**
- ✅ Code in `src/core/ProviderRouter.ts`
- ✅ Tests under `tests/core/routing-logic.test.ts`
- ✅ QA evidence logged in `qa/phase3-task34.md`

**Acceptance**
- [ ] Routing logic works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 35. Handle cross-provider dependencies
  - Materialize providers in dependency order
  - Wait for provider outputs before starting dependent providers
  - Aggregate outputs from all providers
  - _Requirements: REQ-I04_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for cross-provider dependencies
- [ ] Integration tests with multiple providers
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Dependency handling documented

**Determinism / Safety**
- [ ] Dependency resolution is deterministic
- [ ] Outputs flow correctly
- [ ] No race conditions

**Deliverables**
- ✅ Code in `src/core/ProviderRouter.ts`
- ✅ Tests under `tests/core/cross-provider-deps.test.ts`
- ✅ QA evidence logged in `qa/phase3-task35.md`

**Acceptance**
- [ ] Cross-provider dependencies work
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 36. Create multi-provider example
  - Create `examples/multi-provider.tsx`
  - Mix AwsLambda, DockerContainer, KubernetesDeployment, TerraformModule
  - Show cross-provider dependencies (Lambda uses Docker image URL)
  - _Requirements: REQ-I04_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Example runs without errors
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Example documented

**CLI / UX Validation**
- [ ] Example demonstrates key features
- [ ] Shows real-world use case
- [ ] Easy to understand

**Deliverables**
- ✅ `examples/multi-provider.tsx`
- ✅ README for example
- ✅ QA evidence logged in `qa/phase3-task36.md`

**Acceptance**
- [ ] Example works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

## Phase 4: State Bridge

Enable React/Vue/Python apps to consume CloudDOM state.

- [ ] 37. Create StateSyncServer class
  - Create `src/interop/StateSyncServer.ts`
  - Initialize WebSocket server (ws library)
  - Handle client connections
  - Maintain map of stackName → WebSocket[]
  - _Requirements: REQ-I02_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for StateSyncServer
- [ ] Integration tests with WebSocket clients
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Server documented

**Determinism / Safety**
- [ ] Server handles disconnections gracefully
- [ ] No memory leaks
- [ ] Thread-safe operations

**Security**
- [ ] No secrets in state sync
- [ ] Authentication considered (future)

**Deliverables**
- ✅ `src/interop/StateSyncServer.ts`
- ✅ Tests under `tests/interop/state-sync-server.test.ts`
- ✅ QA evidence logged in `qa/phase4-task37.md`

**Acceptance**
- [ ] StateSyncServer works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 38. Implement subscription protocol
  - Handle 'subscribe' messages from clients
  - Add client to subscription list for stack
  - Handle 'unsubscribe' messages
  - Handle client disconnections
  - Define StateSyncMessage types (subscribe, unsubscribe, state_update, error)
  - _Requirements: REQ-I02_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for subscription protocol
- [ ] Tests for all message types
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Protocol documented

**Determinism / Safety**
- [ ] Protocol is well-defined
- [ ] Error handling is robust
- [ ] No message loss

**Deliverables**
- ✅ Code in `src/interop/StateSyncServer.ts`
- ✅ Updated `src/core/types.ts` (StateSyncMessage types)
- ✅ Tests under `tests/interop/subscription-protocol.test.ts`
- ✅ QA evidence logged in `qa/phase4-task38.md`

**Acceptance**
- [ ] Subscription protocol works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 39. Implement state publishing
  - Add `publish(stackName, state)` method
  - Serialize CloudDOM state to JSON
  - Send to all subscribed clients
  - Include deployment status, resources, outputs
  - Add schema version for compatibility
  - _Requirements: REQ-I02_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for state publishing
- [ ] Tests verify JSON serialization
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Publishing logic documented

**Determinism / Safety**
- [ ] Serialization is deterministic
- [ ] Schema version tracked
- [ ] No data loss

**Deliverables**
- ✅ Code in `src/interop/StateSyncServer.ts`
- ✅ Tests under `tests/interop/state-publishing.test.ts`
- ✅ QA evidence logged in `qa/phase4-task39.md`

**Acceptance**
- [ ] State publishing works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 40. Integrate with CReact
  - Start StateSyncServer when CReact initializes
  - Publish state after build()
  - Publish state after deploy()
  - Add config option to enable/disable state sync
  - _Requirements: REQ-I02_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Integration tests end-to-end
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Integration documented

**Determinism / Safety**
- [ ] State sync doesn't block deployment
- [ ] Server lifecycle managed correctly
- [ ] Config option works

**Deliverables**
- ✅ Updated `src/core/CReact.ts`
- ✅ Tests under `tests/integration/state-sync-integration.test.ts`
- ✅ QA evidence logged in `qa/phase4-task40.md`

**Acceptance**
- [ ] State sync integration works
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 41. Create creact-react-interop package
  - Create `packages/creact-react-interop/` directory
  - Initialize package.json with React peer dependency
  - Configure TypeScript for React
  - Add ws dependency for WebSocket client
  - _Requirements: REQ-I02_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Package builds without errors
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Package documented

**CLI / UX Validation**
- [ ] Package installs correctly
- [ ] Peer dependencies correct
- [ ] README clear

**Deliverables**
- ✅ `packages/creact-react-interop/package.json`
- ✅ `packages/creact-react-interop/tsconfig.json`
- ✅ `packages/creact-react-interop/README.md`
- ✅ QA evidence logged in `qa/phase4-task41.md`

**Acceptance**
- [ ] Package setup complete
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 42. Implement useCReactContext hook
  - Create `packages/creact-react-interop/src/useCReactContext.ts`
  - Connect to StateSyncServer via WebSocket
  - Subscribe to stack updates
  - Update React state on messages
  - Handle reconnection with exponential backoff
  - Return CloudDOMState with typed outputs
  - _Requirements: REQ-I02, REQ-I06_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Unit tests for hook
- [ ] Integration tests with React
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Hook documented

**Determinism / Safety**
- [ ] Reconnection logic works
- [ ] No memory leaks
- [ ] State updates are correct

**CLI / UX Validation**
- [ ] Hook is easy to use
- [ ] Type safety works
- [ ] Error handling clear

**Deliverables**
- ✅ `packages/creact-react-interop/src/useCReactContext.ts`
- ✅ Tests under `packages/creact-react-interop/tests/hook.test.ts`
- ✅ QA evidence logged in `qa/phase4-task42.md`

**Acceptance**
- [ ] Hook works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 43. Add TypeScript types
  - Create `packages/creact-react-interop/src/types.ts`
  - Export CloudDOMState interface
  - Export StateSyncMessage types
  - Enable generic type parameter for outputs: `useCReactContext<T>()`
  - _Requirements: REQ-I06_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] All types documented with JSDoc
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Types are complete

**Determinism / Safety**
- [ ] No `any` types
- [ ] Generic types work correctly
- [ ] Type safety enforced

**Deliverables**
- ✅ `packages/creact-react-interop/src/types.ts`
- ✅ QA evidence logged in `qa/phase4-task43.md`

**Acceptance**
- [ ] Types compile correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

- [ ] 44. Create React example app
  - Create `examples/react-dashboard/`
  - Initialize React app with Vite
  - Use useCReactContext hook
  - Display deployment status, resources, outputs
  - Show loading and error states
  - _Requirements: REQ-I02_

#### ✅ QA & Deliverables Checklist

**Quality Criteria**
- [ ] Example runs without errors
- [ ] TypeScript passes `npm run typecheck`
- [ ] Lint passes `npm run lint`
- [ ] Example documented

**CLI / UX Validation**
- [ ] Example is easy to understand
- [ ] Demonstrates key features
- [ ] UI is clear

**Deliverables**
- ✅ `examples/react-dashboard/`
- ✅ README for example
- ✅ QA evidence logged in `qa/phase4-task44.md`

**Acceptance**
- [ ] Example works correctly
- [ ] CI suite green
- [ ] Reviewed by 1 maintainer

---

## Phase 5: Advanced

Enable recursive app composition and hot reload.

