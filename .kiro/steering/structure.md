# Project Structure

## Source Organization (`src/`)

### Core (`src/core/`)
Main orchestration and rendering engine:
- **CReact.ts** - Main orchestrator class, coordinates entire pipeline (render → validate → build → reconcile → deploy)
- **Renderer.ts** - JSX → Fiber tree rendering
- **Validator.ts** - Pre-deployment validation
- **CloudDOMBuilder.ts** - Fiber → CloudDOM transformation
- **Reconciler.ts** - Diff computation between CloudDOM trees (creates, updates, deletes, replacements, moves)
- **StateMachine.ts** - Deployment state management with crash recovery and checkpointing
- **ProviderRouter.ts** - Multi-provider routing (dispatches nodes to appropriate providers by construct type)
- **types.ts** - Core type definitions (FiberNode, CloudDOMNode, ChangeSet, DependencyGraph)
- **errors.ts** - Custom error classes (ValidationError, DeploymentError, ReconciliationError)

### JSX Support (`src/`)
- **jsx.ts** - JSX factory (createElement, Fragment)
- **jsx.d.ts** - JSX type definitions

### Hooks (`src/hooks/`)
React-style hooks for infrastructure:
- **useState.ts** - Stateful values in infrastructure
- **useContext.ts** - Context consumption
- **useInstance.ts** - Access to deployed resource outputs

### Context (`src/context/`)
- **createContext.ts** - Context creation API
- **index.ts** - Context exports

### Providers (`src/providers/`)
Pluggable provider interfaces and implementations:
- **ICloudProvider.ts** - Cloud resource materialization interface (with lifecycle hooks: preDeploy, postDeploy, onError)
- **IBackendProvider.ts** - State backend interface (with locking and secrets: acquireLock, releaseLock, getSecret, setSecret)
- **DummyCloudProvider.ts** - Mock provider for testing
- **DummyBackendProvider.ts** - In-memory backend for testing

### Adapters (`src/adapters/`)
External IaC tool integrations (wrap Terraform, Helm, Pulumi as CReact components):
- **IIaCAdapter.ts** - Base adapter interface (extends ICloudProvider with load, mapOutputs)
- **TerraformCloudProvider.ts** - Terraform module adapter
- **HelmCloudProvider.ts** - Helm chart adapter
- **PulumiCloudProvider.ts** - Pulumi stack adapter
- **DockerComposeAdapter.ts** - Docker Compose adapter

All adapters implement ICloudProvider and provide deterministic CloudDOM conversion.

### Interoperability (`src/interop/`)
Cross-runtime state synchronization:
- **StateSyncServer.ts** - WebSocket/HTTP server for real-time CloudDOM state sync
- **CReactAppProvider.ts** - Nested app deployment provider (apps deploying apps)
- **StateProtocol.ts** - JSON protocol definitions for language-agnostic state sync

### CLI (`src/cli/`)
Command-line interface:
- **commands/** - Individual CLI commands (build, plan, deploy, resume, dev, logs, secrets, audit, info)
- **index.ts** - CLI entry point and command router

### Utilities (`src/utils/`)
- **naming.ts** - Resource ID generation, path normalization
- **deepEqual.ts** - Deep equality comparison with memoization

## Test Organization (`tests/`)

Domain-based test structure:

### `tests/unit/`
Individual component tests, focused on single-component behavior

### `tests/integration/`
Full workflow tests spanning multiple components (render → validate → build → deploy)

### `tests/edge-cases/`
Production-critical edge cases: circular refs, memory leaks, security issues

### `tests/performance/`
Performance benchmarks and stress tests (large trees, deep nesting)

### `tests/helpers/`
Shared test utilities:
- **fiber-helpers.ts** - Mock Fiber node creation
- **clouddom-helpers.ts** - Mock CloudDOM creation
- **provider-helpers.ts** - Provider setup utilities
- **assertion-helpers.ts** - Custom assertions
- **cleanup-helpers.ts** - Test cleanup utilities

## Architecture Patterns

### Pipeline Flow
```
JSX → Renderer → Fiber → Validator → CloudDOMBuilder → CloudDOM
                                                          ↓
                                                      Reconciler (diff)
                                                          ↓
                                                    StateMachine (track state)
                                                          ↓
                                                    ProviderRouter
                                                          ↓
                        ┌─────────────────────────────────┼─────────────────────────────────┐
                        ↓                                 ↓                                 ↓
                  CloudProvider                      Adapter1                          Adapter2
                  (AWS/Docker)                    (Terraform)                          (Helm)
                        ↓                                 ↓                                 ↓
                        └─────────────────────────────────┴─────────────────────────────────┘
                                                          ↓
                                                  BackendProvider
                                            (with locking + secrets)
                                                          ↓
                                                  StateSyncServer
                                                          ↓
                                            React/Vue/Python Apps
```

### Dependency Injection
All providers, adapters, and extensions are injected via CReactConfig or DependencyContainer, not inherited. This enables:
- Runtime provider registration
- Multi-provider orchestration
- Testability with mock providers
- Pluggable backends

### Reconciliation
Diff-based deployment: Reconciler computes minimal change sets (creates, updates, deletes, replacements, moves) with dependency-aware ordering. Only materialize resources that changed.

### State Management
StateMachine handles all deployment state with:
- States: PENDING → APPLYING → DEPLOYED/FAILED/ROLLED_BACK
- Checkpointing after each resource
- Crash recovery (resume from checkpoint)
- Rollback capabilities

### Provider-Orchestration Separation
**Critical architectural boundary**: Providers are pure executors (CRUD operations only). All orchestration logic (diffing, transaction control, safety validation, scheduling) lives in the orchestration layer (Reconciler + StateMachine + ProviderRouter). This guarantees all providers automatically inherit transactional safety and deterministic behavior.

### Multi-Provider Routing
ProviderRouter implements ICloudProvider and dispatches nodes to registered providers based on construct type patterns (regex matching). Enables mixing AWS, Docker, Kubernetes, Terraform in one CloudDOM tree.

### Interoperability
- **Adapters**: Wrap external IaC tools (Terraform, Helm, Pulumi) as CReact components with deterministic output
- **State Sync**: Expose CloudDOM state to React/Vue/Python apps via WebSocket/HTTP with JSON protocol
- **Nested Apps**: CReact apps can deploy other CReact apps recursively (apps deploying apps)

### Lifecycle Hooks
Providers can implement optional hooks:
- `preDeploy(cloudDOM)` - Called before deployment (validation, logging)
- `postDeploy(cloudDOM, outputs)` - Called after successful deployment (metrics, notifications)
- `onError(error, cloudDOM)` - Called on deployment failure (cleanup, alerting)

### Determinism
All builds are deterministic (REQ-I05):
- Content-hash-based IDs (no UUIDs or timestamps in CloudDOM)
- Sorted object keys for consistent serialization
- Randomness deferred to deploy phase, not build phase

## Naming Conventions

- **Files**: kebab-case for utilities, PascalCase for classes
- **Components**: PascalCase function names
- **Interfaces**: PascalCase with 'I' prefix for provider interfaces
- **Adapters**: PascalCase with 'CloudProvider' or 'Adapter' suffix
- **Types**: PascalCase for type definitions
- **Tests**: `{component}.{category}.test.ts` format

## Key Architectural Decisions

1. **Fiber-based rendering** - Inspired by React Fiber for reconciliation
2. **CloudDOM abstraction** - Intermediate representation decouples JSX from cloud APIs
3. **Provider pattern** - Pluggable backends enable multi-cloud support
4. **Stateful deployment** - StateMachine tracks progress for resumable deployments
5. **Validation-first** - Validate before any cloud operations to fail fast
6. **Interop-first** - Compose existing tools (Terraform, Helm) rather than replace them
7. **Universal state bridge** - CloudDOM state accessible to any runtime (React, Python, CLI)
8. **Nested composition** - Apps can deploy apps recursively
9. **Provider-orchestration separation** - Providers are pure executors, orchestration is centralized
10. **Deterministic builds** - Same input always produces same CloudDOM (content-hash IDs)
