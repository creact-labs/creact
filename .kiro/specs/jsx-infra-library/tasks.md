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

## Phase 1: Foundation (Tasks 1-2)

Build the core diff and state management infrastructure.

### Task 1: Implement CloudDOM Reconciler

**Goal:** Create diff algorithm that compares CloudDOM trees and computes minimal change sets.

**Why First:** Everything else depends on diffing - plan command, hot reload, incremental deploys.

- [ ] 1.1 Create Reconciler class with diff algorithm
  - Create `src/core/Reconciler.ts`
  - Implement `reconcile(previous: CloudDOMNode[], current: CloudDOMNode[]): ChangeSet`
  - Build ID maps for O(n) lookup: `Map<string, CloudDOMNode>`
  - Detect creates: nodes in current but not in previous
  - Detect updates: nodes in both with different props (use deep equality)
  - Detect deletes: nodes in previous but not in current
  - Return ChangeSet with creates, updates, deletes arrays
  - _Requirements: REQ-O01, REQ-O04_

- [ ] 1.2 Build dependency graph from CloudDOM
  - Scan node props for references to other node IDs
  - Build adjacency list: `Map<string, string[]>` (node ID → dependency IDs)
  - Detect circular dependencies using DFS
  - Throw ValidationError if cycles found
  - _Requirements: REQ-O01_

- [ ] 1.3 Implement topological sort for deployment order
  - Use Kahn's algorithm on dependency graph
  - Return array of node IDs in deployment order
  - Sort nodes with same depth by ID for determinism
  - _Requirements: REQ-O01_

- [ ] 1.4 Compute parallel deployment batches
  - Group nodes by depth in dependency graph
  - Nodes at same depth can deploy in parallel
  - Return `string[][]` (array of batches)
  - _Requirements: REQ-O01_

- [ ] 1.5 Add ChangeSet interface to types
  - Update `src/core/types.ts`
  - Add ChangeSet, DependencyGraph interfaces
  - Export from `src/core/index.ts`
  - _Requirements: REQ-O01_

**Deliverables:**
- `src/core/Reconciler.ts`
- Updated `src/core/types.ts` with ChangeSet interface

---

### Task 2: Implement State Machine

**Goal:** Track deployment lifecycle with crash recovery and transactional guarantees.

**Why Second:** Enables safe deployments with resume/rollback capabilities.

**Architectural Note:** The StateMachine is the universal transaction manager for all providers. It checkpoints after each resource materialization and delegates no control to adapters.

- [ ] 2.1 Create StateMachine class
  - Create `src/core/StateMachine.ts`
  - Define DeploymentState interface (status, cloudDOM, changeSet, checkpoint, error, timestamp, user)
  - Implement state transitions: PENDING → APPLYING → DEPLOYED/FAILED/ROLLED_BACK
  - Store state in BackendProvider
  - _Requirements: REQ-O01_

- [ ] 2.2 Implement deployment transaction methods
  - `startDeployment(stackName, changeSet)` - Set status to APPLYING
  - `updateCheckpoint(stackName, checkpoint)` - Save progress after each resource
  - `completeDeployment(stackName)` - Set status to DEPLOYED
  - `failDeployment(stackName, error)` - Set status to FAILED
  - All methods save state to BackendProvider
  - _Requirements: REQ-O01_

- [ ] 2.3 Implement crash recovery
  - `resumeDeployment(stackName)` - Continue from last checkpoint
  - `rollback(stackName)` - Apply reverse change set
  - Detect incomplete deployments on startup (status = APPLYING)
  - Offer resume or rollback options
  - _Requirements: REQ-O01_

- [ ] 2.4 Integrate StateMachine with CReact
  - Update `src/core/CReact.ts` to use StateMachine
  - Wrap deploy() with state machine transitions
  - Save checkpoints after each resource materializes
  - Handle errors and update state accordingly
  - _Requirements: REQ-O01_

**Deliverables:**
- `src/core/StateMachine.ts`
- Updated `src/core/CReact.ts` with state machine integration
- Updated `src/core/types.ts` with DeploymentState interface

---

## Phase 2: Operational (Tasks 3-5)

Build CLI and developer workflow commands.

### Task 3: Create CLI Structure

**Goal:** Set up CLI framework with command routing and configuration loading.

**Why Third:** Enables developer workflow (build, plan, deploy).

- [ ] 3.1 Create CLI entry point
  - Create `src/cli/index.ts`
  - Use commander or yargs for command parsing
  - Add global options: --stack, --json, --help
  - Route to command handlers
  - _Requirements: REQ-O08_

- [ ] 3.2 Create configuration loader
  - Create `src/cli/config.ts`
  - Load CReact config from `creact.config.ts` or `creact.config.js`
  - Support provider configuration (cloudProvider, backendProvider)
  - Support CLI options override config file
  - _Requirements: REQ-O08_

- [ ] 3.3 Add CLI utilities
  - Create `src/cli/utils.ts`
  - Add colored output helpers (chalk)
  - Add spinner/progress indicators
  - Add error formatting
  - _Requirements: REQ-O08_

- [ ] 3.4 Set up CLI build and packaging
  - Add bin entry in package.json: `"creact": "./dist/cli/index.js"`
  - Configure TypeScript to compile CLI
  - Add shebang to CLI entry point
  - Test CLI installation: `npm link`
  - _Requirements: REQ-O08_

**Deliverables:**
- `src/cli/index.ts` - CLI entry point
- `src/cli/config.ts` - Configuration loader
- `src/cli/utils.ts` - CLI utilities
- Updated `package.json` with bin entry

---

### Task 4: Implement Build and Plan Commands

**Goal:** Enable developers to build CloudDOM and preview changes.

**Why Fourth:** Core developer workflow - see what will change before deploying.

- [ ] 4.1 Implement creact build command
  - Create `src/cli/build.ts`
  - Load app from entry file (default: `infrastructure.tsx`)
  - Call `creact.build(app)`
  - Save CloudDOM to backend
  - Output summary: resource count, validation status
  - Support --json flag for CI/CD
  - _Requirements: REQ-O08_

- [ ] 4.2 Implement creact plan command
  - Create `src/cli/plan.ts`
  - Load previous CloudDOM from backend
  - Build current CloudDOM
  - Use Reconciler to compute diff
  - Display colored diff (green=create, yellow=update, red=delete)
  - Show deployment order
  - Support --json flag for CI/CD
  - _Requirements: REQ-O04_

- [ ] 4.3 Add colored diff output
  - Create `src/cli/diff.ts`
  - Format creates in green with + prefix
  - Format updates in yellow with ~ prefix
  - Format deletes in red with - prefix
  - Show resource type and ID for each change
  - Group by change type
  - _Requirements: REQ-O04_

**Deliverables:**
- `src/cli/build.ts` - Build command
- `src/cli/plan.ts` - Plan command
- `src/cli/diff.ts` - Diff formatting utilities

---

### Task 5: Implement Deploy and Resume Commands

**Goal:** Enable safe deployments with crash recovery.

**Why Fifth:** Complete the core workflow (build → plan → deploy).

- [ ] 5.1 Implement creact deploy command
  - Create `src/cli/deploy.ts`
  - Run plan first (show diff)
  - Prompt for confirmation unless --auto-approve
  - Use StateMachine to track deployment
  - Call `creact.deploy(cloudDOM)`
  - Show progress for each resource
  - Handle errors and offer rollback
  - _Requirements: REQ-O08, REQ-O01_

- [ ] 5.2 Implement creact resume command
  - Create `src/cli/resume.ts`
  - Check for incomplete deployments (status = APPLYING)
  - Show checkpoint info (X of Y resources deployed)
  - Prompt for resume or rollback
  - Continue deployment from checkpoint
  - _Requirements: REQ-O01_

- [ ] 5.3 Add deployment progress indicators
  - Show spinner during resource materialization
  - Show progress bar: [====>    ] 5/10 resources
  - Show elapsed time
  - Show resource name being deployed
  - _Requirements: REQ-O08_

- [ ] 5.4 Implement configurable retry behavior
  - Add CLI flags: --max-retries, --retry-delay
  - Pass retry configuration through to StateMachine
  - Support per-provider retry overrides from config
  - _Requirements: REQ-O03_

**Deliverables:**
- `src/cli/deploy.ts` - Deploy command
- `src/cli/resume.ts` - Resume command
- Progress indicators in CLI utils
- Retry configuration support

---

## Phase 3: Interop Core (Tasks 6-8)

Enable external IaC tool integration and multi-provider support.

### Task 6: Implement IaC Adapter System

**Goal:** Create adapter interface and deterministic ID utilities.

**Why Sixth:** Foundation for wrapping Terraform, Helm, Pulumi.

- [ ] 6.1 Create IIaCAdapter interface
  - Create `src/adapters/IIaCAdapter.ts`
  - Extend ICloudProvider
  - Add metadata field (name, version, supportedFormats)
  - Add `describeCapabilities()` method
  - Add `load(source, options)` method
  - Add `mapOutputs(externalOutputs)` method
  - _Requirements: REQ-I01_

- [ ] 6.2 Implement deterministic ID utilities
  - Create `src/utils/deterministic.ts`
  - Implement `generateDeterministicId(source, config)` using SHA-256
  - Implement `normalizeConfig(config)` - sort keys recursively
  - Ensure no timestamps, random values, or UUIDs
  - _Requirements: REQ-I05_

- [ ] 6.3 Create adapter base class
  - Create `src/adapters/BaseAdapter.ts`
  - Implement common adapter logic (ID generation, config normalization)
  - Provide template methods for subclasses
  - Handle adapter errors with AdapterError class
  - **Adapters must implement pure materialization logic only**
  - **Orchestration (ordering, rollback, retries) is handled by CReact core**
  - **BaseAdapter must explicitly prevent adapters from overriding orchestration behavior**
  - _Requirements: REQ-I01, REQ-ARCH-01_

- [ ] 6.4 Implement Unified Dependency Injection Container
  - Create `src/core/DependencyContainer.ts`
  - Maintain Maps for providers, backends, adapters, extensions
  - Implement `registerProvider(provider)` method
  - Implement `registerBackend(backend)` method
  - Implement `registerExtension(extension)` method
  - Expose `resolve(type)` for dependency lookup
  - _Requirements: REQ-O09_

- [ ] 6.5 Add lifecycle hook system
  - Support `onBuild`, `onDeploy`, `onError` hooks in extensions
  - Execute hooks with shared runtime context
  - Define ICReactExtension interface
  - _Requirements: REQ-O09_

- [ ] 6.6 Integrate with CReact core
  - Inject container into CReact constructor
  - Providers auto-resolve from container
  - Remove static imports of provider classes where possible
  - Initialize container before building CloudDOM
  - _Requirements: REQ-O09_

- [ ] 6.7 Create example extension
  - Create `examples/extensions/telemetry-extension.ts`
  - Add logging for deploy lifecycle
  - Demonstrate `registerExtension()`
  - Show custom hooks usage
  - _Requirements: REQ-O09_

- [ ] 6.8 Add creact info command
  - Create `src/cli/info.ts`
  - List registered providers
  - List registered backends
  - List registered extensions
  - Show capabilities for each
  - _Requirements: REQ-O08, REQ-O09_

- [ ] 6.9 Implement mock provider and fake backend for testing
  - Create `src/testing/MockCloudProvider.ts`
  - Create `src/testing/FakeBackendProvider.ts`
  - Implement deterministic resource simulation
  - Enable snapshot-based testing
  - _Requirements: REQ-O09_

**Deliverables:**
- `src/adapters/IIaCAdapter.ts` - Adapter interface
- `src/utils/deterministic.ts` - Deterministic utilities
- `src/adapters/BaseAdapter.ts` - Base adapter class
- `src/core/DependencyContainer.ts` - DI container
- `src/core/types.ts` - ICReactExtension interface
- `examples/extensions/telemetry-extension.ts` - Example extension
- `src/cli/info.ts` - Info command
- `src/testing/MockCloudProvider.ts` - Mock provider for testing
- `src/testing/FakeBackendProvider.ts` - Fake backend for testing

---

### Task 7: Implement Terraform and Helm Adapters

**Goal:** Create working adapters for Terraform and Helm.

**Why Seventh:** Prove adapter system works with real tools.

- [ ] 7.1 Implement TerraformCloudProvider
  - Create `src/adapters/TerraformCloudProvider.ts`
  - Extend BaseAdapter
  - Implement `load()` - parse Terraform HCL/JSON
  - Implement `materialize()` - run `terraform apply`
  - Implement `mapOutputs()` - convert Terraform outputs
  - Use deterministic ID generation
  - Run Terraform in isolated child process
  - _Requirements: REQ-I01, REQ-I05_

- [ ] 7.2 Implement HelmCloudProvider
  - Create `src/adapters/HelmCloudProvider.ts`
  - Extend BaseAdapter
  - Implement `load()` - parse Helm chart
  - Implement `materialize()` - run `helm install`
  - Implement `mapOutputs()` - convert Helm outputs
  - Use deterministic ID generation
  - Run Helm in isolated child process
  - _Requirements: REQ-I01, REQ-I05_

- [ ] 7.3 Create adapter usage examples
  - Create `examples/terraform-vpc.tsx` - Wrap Terraform VPC module
  - Create `examples/helm-nginx.tsx` - Wrap Helm nginx chart
  - Show how to use adapted resources with native CReact resources
  - _Requirements: REQ-I01_

**Deliverables:**
- `src/adapters/TerraformCloudProvider.ts`
- `src/adapters/HelmCloudProvider.ts`
- `examples/terraform-vpc.tsx`
- `examples/helm-nginx.tsx`

---

### Task 8: Implement Provider Router

**Goal:** Enable mixing resources from multiple providers in one tree.

**Why Eighth:** Enables real-world multi-cloud scenarios.

**Architectural Note:** ProviderRouter interacts only with the StateMachine and Reconciler. It does not perform retries, rollbacks, or state persistence.

- [ ] 8.1 Create ProviderRouter class
  - Create `src/core/ProviderRouter.ts`
  - Implement ICloudProvider interface
  - Add `register(pattern: RegExp, provider: ICloudProvider)` method
  - Store providers in Map<RegExp, ICloudProvider>
  - **ProviderRouter only handles routing, not orchestration**
  - _Requirements: REQ-I04, REQ-ARCH-01_

- [ ] 8.2 Implement routing logic
  - Implement `materialize(cloudDOM)` method
  - Group nodes by provider using construct name pattern matching
  - Route each group to appropriate provider
  - Throw error for unmatched constructs
  - **Do not implement retry or rollback logic (handled by StateMachine)**
  - _Requirements: REQ-I04, REQ-ARCH-01_

- [ ] 8.3 Handle cross-provider dependencies
  - Materialize providers in dependency order
  - Wait for provider outputs before starting dependent providers
  - Aggregate outputs from all providers
  - _Requirements: REQ-I04_

- [ ] 8.4 Create multi-provider example
  - Create `examples/multi-provider.tsx`
  - Mix AwsLambda, DockerContainer, KubernetesDeployment, TerraformModule
  - Show cross-provider dependencies (Lambda uses Docker image URL)
  - _Requirements: REQ-I04_

**Deliverables:**
- `src/core/ProviderRouter.ts`
- `examples/multi-provider.tsx`

---

## Phase 4: State Bridge (Tasks 9-10)

Enable React/Vue/Python apps to consume CloudDOM state.

### Task 9: Implement State Sync Server

**Goal:** Build WebSocket server that publishes CloudDOM state updates.

**Why Ninth:** Foundation for React-to-infra bridge.

- [ ] 9.1 Create StateSyncServer class
  - Create `src/interop/StateSyncServer.ts`
  - Initialize WebSocket server (ws library)
  - Handle client connections
  - Maintain map of stackName → WebSocket[]
  - _Requirements: REQ-I02_

- [ ] 9.2 Implement subscription protocol
  - Handle 'subscribe' messages from clients
  - Add client to subscription list for stack
  - Handle 'unsubscribe' messages
  - Handle client disconnections
  - Define StateSyncMessage types (subscribe, unsubscribe, state_update, error)
  - _Requirements: REQ-I02_

- [ ] 9.3 Implement state publishing
  - Add `publish(stackName, state)` method
  - Serialize CloudDOM state to JSON
  - Send to all subscribed clients
  - Include deployment status, resources, outputs
  - Add schema version for compatibility
  - _Requirements: REQ-I02_

- [ ] 9.4 Integrate with CReact
  - Start StateSyncServer when CReact initializes
  - Publish state after build()
  - Publish state after deploy()
  - Add config option to enable/disable state sync
  - _Requirements: REQ-I02_

**Deliverables:**
- `src/interop/StateSyncServer.ts`
- Updated `src/core/CReact.ts` with state sync integration
- Updated `src/core/types.ts` with StateSyncMessage types

---

### Task 10: Create React Interop Package

**Goal:** Build React hook that subscribes to CloudDOM state.

**Why Tenth:** Enable React apps to display infrastructure state.

- [ ] 10.1 Create creact-react-interop package
  - Create `packages/creact-react-interop/` directory
  - Initialize package.json with React peer dependency
  - Configure TypeScript for React
  - Add ws dependency for WebSocket client
  - _Requirements: REQ-I02_

- [ ] 10.2 Implement useCReactContext hook
  - Create `packages/creact-react-interop/src/useCReactContext.ts`
  - Connect to StateSyncServer via WebSocket
  - Subscribe to stack updates
  - Update React state on messages
  - Handle reconnection with exponential backoff
  - Return CloudDOMState with typed outputs
  - _Requirements: REQ-I02, REQ-I06_

- [ ] 10.3 Add TypeScript types
  - Create `packages/creact-react-interop/src/types.ts`
  - Export CloudDOMState interface
  - Export StateSyncMessage types
  - Enable generic type parameter for outputs: `useCReactContext<T>()`
  - _Requirements: REQ-I06_

- [ ] 10.4 Create React example app
  - Create `examples/react-dashboard/`
  - Initialize React app with Vite
  - Use useCReactContext hook
  - Display deployment status, resources, outputs
  - Show loading and error states
  - _Requirements: REQ-I02_

**Deliverables:**
- `packages/creact-react-interop/` - React package
- `packages/creact-react-interop/src/useCReactContext.ts`
- `packages/creact-react-interop/src/types.ts`
- `examples/react-dashboard/` - React example

---

## Phase 5: Advanced (Tasks 11-12)

Enable recursive app composition and hot reload.

### Task 11: Implement Nested App Deployment

**Goal:** Enable CReact apps to deploy other CReact apps recursively.

**Why Eleventh:** Enables monorepos and modular infrastructure.

- [ ] 11.1 Create CReactApp construct
  - Create `src/constructs/CReactApp.ts`
  - Define props: source, context, onDeploy, onSignal
  - Add manifest support (optional)
  - _Requirements: REQ-I03_

- [ ] 11.2 Create CReactAppProvider
  - Create `src/providers/CReactAppProvider.ts`
  - Implement ICloudProvider interface
  - Detect CReactApp nodes in materialize()
  - Load child app from source path
  - Create nested CReact instance
  - _Requirements: REQ-I03_

- [ ] 11.3 Implement context propagation
  - Inject parent context into child app
  - Support parent → child context flow
  - Support child → parent signals via onSignal callback
  - Extract child outputs and propagate to parent
  - _Requirements: REQ-I03_

- [ ] 11.4 Create monorepo example
  - Create `examples/monorepo/`
  - Create root app that deploys backend, frontend, worker
  - Show output propagation (backend URL → frontend)
  - Show conditional deployment
  - _Requirements: REQ-I03_

**Deliverables:**
- `src/constructs/CReactApp.ts`
- `src/providers/CReactAppProvider.ts`
- `examples/monorepo/` - Monorepo example

---

### Task 12: Implement Hot Reload

**Goal:** Enable incremental infrastructure updates without full redeploys.

**Why Twelfth:** Dramatically improves developer experience.

- [ ] 12.1 Implement creact dev command
  - Create `src/cli/dev.ts`
  - Use chokidar to watch source files
  - Rebuild on file changes
  - Compute diff with Reconciler
  - Apply incremental updates
  - _Requirements: REQ-O07_

- [ ] 12.2 Implement change safety validation
  - Create `src/core/ChangeSetSafety.ts`
  - Define IChangeSetSafety interface
  - Implement safety checks (creates/deletes = unsafe, updates = check type)
  - Database changes = unsafe (data loss risk)
  - VPC/networking changes = unsafe (connectivity risk)
  - Lambda memory/timeout = safe
  - **Ensure all safety checks occur before provider invocation**
  - **Providers cannot veto or override safety classifications**
  - _Requirements: REQ-O07, REQ-ARCH-01_

- [ ] 12.3 Implement incremental deployment
  - Add `deployChangeSet(changeSet)` method to CReact
  - Apply only changed resources
  - Skip unchanged resources
  - Update CloudDOM incrementally
  - _Requirements: REQ-O07_

- [ ] 12.4 Add rollback on failure
  - Catch errors during hot reload
  - Rollback to previous CloudDOM
  - Show error message
  - Keep watching for next change
  - _Requirements: REQ-O07_

- [ ] 12.5 Add step mode
  - Support --step flag for manual approval
  - Show diff and prompt before applying
  - Allow skip or apply
  - _Requirements: REQ-O07_

**Deliverables:**
- `src/cli/dev.ts` - Hot reload command
- `src/core/ChangeSetSafety.ts` - Safety validation
- Updated `src/core/CReact.ts` with incremental deployment

---

## Phase 6: Production (Tasks 13-15)

Add security and reliability features for production use.

### Task 13: Extend IBackendProvider with Locking

**Goal:** Prevent concurrent deployments with distributed locking.

**Why Thirteenth:** Critical for team environments and CI/CD.

- [ ] 13.1 Extend IBackendProvider interface
  - Update `src/providers/IBackendProvider.ts`
  - Add `acquireLock(stackName, holder, ttl)` method
  - Add `releaseLock(stackName)` method
  - Add `checkLock(stackName)` method
  - Add LockInfo interface
  - _Requirements: REQ-O02_

- [ ] 13.2 Implement locking in FileBackendProvider
  - Update `src/providers/DummyBackendProvider.ts` (rename to FileBackendProvider)
  - Use file-based locking (.lock files)
  - Implement TTL expiry
  - Handle stale locks
  - _Requirements: REQ-O02_

- [ ] 13.3 Integrate locking with deployment
  - Update `src/core/CReact.ts` deploy() method
  - Acquire lock before deployment
  - Release lock after deployment (success or failure)
  - Show lock holder info if locked
  - Add --force-unlock flag to CLI
  - _Requirements: REQ-O02_

**Deliverables:**
- Updated `src/providers/IBackendProvider.ts` with locking methods
- Updated `src/providers/DummyBackendProvider.ts` with locking implementation
- Updated `src/core/CReact.ts` with lock integration

---

### Task 14: Implement Secrets Management

**Goal:** Replace .env files with encrypted secret storage.

**Why Fourteenth:** Security best practice for production.

- [ ] 14.1 Extend IBackendProvider with secrets
  - Add `getSecret(key)` method
  - Add `setSecret(key, value)` method
  - Add `listSecrets()` method
  - _Requirements: REQ-O06_

- [ ] 14.2 Implement encryption in FileBackendProvider
  - Use AES-256-GCM encryption
  - Store encrypted secrets in secrets.enc.json
  - Get encryption key from CREACT_ENCRYPTION_KEY env var
  - Implement encrypt() and decrypt() helpers
  - _Requirements: REQ-O06_

- [ ] 14.3 Create creact secrets CLI commands
  - Create `src/cli/secrets.ts`
  - Implement `creact secrets set <key> <value>`
  - Implement `creact secrets get <key>`
  - Implement `creact secrets list`
  - Implement `creact secrets delete <key>`
  - _Requirements: REQ-O06_

- [ ] 14.4 Integrate secrets with adapters
  - Pass secrets to adapters securely at runtime
  - Support secret references in props: `{ apiKey: { $secret: 'API_KEY' } }`
  - Resolve secret references before materialization
  - _Requirements: REQ-O06_

**Deliverables:**
- Updated `src/providers/IBackendProvider.ts` with secrets methods
- Updated `src/providers/DummyBackendProvider.ts` with encryption
- `src/cli/secrets.ts` - Secrets CLI commands

---

### Task 15: Implement Audit Logging

**Goal:** Track all deployment actions for compliance and debugging.

**Why Fifteenth:** Required for production compliance (SOC2, HIPAA).

- [ ] 15.1 Create AuditLogger class
  - Create `src/core/AuditLogger.ts`
  - Define AuditLogEntry interface (timestamp, user, action, stackName, changeSet, status, error)
  - Implement append-only log storage
  - Persist entries as JSONL (newline-delimited JSON) per stack
  - Allow backend override for alternative storage
  - Store logs in backend provider
  - _Requirements: REQ-O05_

- [ ] 15.2 Integrate audit logging with CReact
  - Log deployment start
  - Log deployment complete
  - Log deployment failure
  - Log rollback
  - Log secret access
  - Include user info (from env or config)
  - _Requirements: REQ-O05_

- [ ] 15.3 Create creact audit CLI commands
  - Create `src/cli/audit.ts`
  - Implement `creact audit list` - Show recent entries
  - Implement `creact audit show <id>` - Show entry details
  - Support filtering by user, action, date range
  - Support --json output
  - _Requirements: REQ-O05_

- [ ] 15.4 Add HMAC signatures for tamper detection
  - Sign each audit entry with HMAC-SHA256
  - Use secret key from config
  - Verify signatures when reading logs
  - Detect tampered entries
  - _Requirements: REQ-O05_

**Deliverables:**
- `src/core/AuditLogger.ts`
- Updated `src/core/CReact.ts` with audit logging
- `src/cli/audit.ts` - Audit CLI commands

---

### Task 16: Provider-Orchestration Contract Validation (Optional)

**Goal:** Enforce architectural boundary with runtime assertions.

**Why Sixteenth:** Prevents providers from violating orchestration separation.

- [ ] 16.1 Add runtime assertions to BaseAdapter
  - Check that adapters don't override orchestration methods
  - Throw error if adapter implements retry logic
  - Throw error if adapter implements state management
  - Throw error if adapter implements rollback logic
  - _Requirements: REQ-ARCH-01_

- [ ] 16.2 Create "rogue provider" test
  - Create test adapter that tries to manage its own retries
  - Create test adapter that tries to manage its own state
  - Verify CReact rejects these adapters at runtime
  - _Requirements: REQ-ARCH-01_

- [ ] 16.3 Add contract validation to DependencyContainer
  - Validate providers on registration
  - Check for forbidden methods/properties
  - Provide clear error messages for violations
  - _Requirements: REQ-ARCH-01, REQ-O09_

**Deliverables:**
- Updated `src/adapters/BaseAdapter.ts` with assertions
- `tests/integration/provider-contract.test.ts` - Contract validation tests
- Updated `src/core/DependencyContainer.ts` with validation

---

## Verification

After completing all tasks, verify the implementation:

```bash
# 1. Build and Plan
$ creact build
$ creact plan
# ✅ Shows colored diff

# 2. Deploy with State Machine
$ creact deploy
# ✅ Deploys with progress tracking

# 3. Adapters
$ ts-node examples/terraform-vpc.tsx
# ✅ Terraform module wrapped and deployed

# 4. Multi-Provider
$ ts-node examples/multi-provider.tsx
# ✅ AWS, Docker, Kubernetes resources coexist

# 5. State Sync
$ creact dev &
$ cd examples/react-dashboard && npm start
# ✅ React app shows real-time CloudDOM state

# 6. Nested Apps
$ ts-node examples/monorepo/infrastructure.tsx
# ✅ Backend, frontend, worker deployed in order

# 7. Hot Reload
$ creact dev
# Edit file, see incremental update in <5s
# ✅ Hot reload works

# 8. Locking
$ creact deploy &
$ creact deploy
# ✅ Second deploy blocked by lock

# 9. Secrets
$ creact secrets set API_KEY abc123
$ creact secrets list
# ✅ Secrets encrypted and stored

# 10. Audit
$ creact audit list
# ✅ All actions logged in JSONL format

# 11. Testing
$ npm run test:e2e
# ✅ Uses MockCloudProvider and FakeBackendProvider for deterministic tests

# 12. Dependency Injection
$ creact info
# ✅ Lists registered providers, backends, and extensions
# ✅ Dependency injection runtime loads all components dynamically

# 13. Provider-Orchestration Boundary (Optional Task 16)
$ npm test -- provider-contract
# ✅ Rogue providers rejected at runtime
# ✅ Orchestration separation enforced
```

---

## Notes

- **Build order matters** - Foundation → Operational → Interop → Advanced → Production
- **Optional tasks (marked *)** are testing tasks that can be skipped for MVP
- **Determinism is critical** - All adapters must produce reproducible CloudDOM
- **Security by default** - Locking, secrets, audit logging are core features, not add-ons

---

**End of Implementation Plan**
