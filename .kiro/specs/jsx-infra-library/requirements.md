# CReact Requirements — Production-Ready Interoperability

**Product:** CReact – Universal Declarative Runtime  
**Version:** 3.1  
**Date:** 2025-10-05

> **"If React made UI declarative, CReact makes reality declarative."**

**The Problem CReact Solves:**
- ❌ Infrastructure tools don't talk to each other (Terraform, Helm, Docker, Pulumi are silos)
- ❌ .env files are a security nightmare and drift from reality
- ❌ Frontend apps can't see backend deployment state
- ❌ Infrastructure changes require full redeploys (no hot reload)
- ❌ No type safety between infrastructure outputs and application code

**The CReact Solution:**
- ✅ **Universal interoperability** - Compose Terraform, Helm, Docker, AWS, Kubernetes in one tree
- ✅ **Type-safe state bridge** - React/Vue/Python apps consume CloudDOM state with full TypeScript types
- ✅ **Encrypted secrets** - No more .env files, encrypted storage with automatic propagation
- ✅ **Hot reload for infrastructure** - Change code, see updates in <5 seconds
- ✅ **Production-grade reliability** - State machine, locking, audit logs, crash recovery

---

## 1. Vision

CReact is a **universal declarative runtime** that composes infrastructure and applications into one reactive graph. It bridges Terraform, Pulumi, Helm, Docker, and app frameworks like React — so code and infrastructure finally speak the same language.

**CloudDOM:** The declarative object graph representing all infrastructure and runtime state — analogous to React's Virtual DOM, but for the cloud.

**Goal:** Make infrastructure interoperable, deterministic, and reactive, with production-grade reliability and developer speed.

**Developer Experience:** CReact includes a live CLI runtime (`creact dev`) for hot reload — enabling rapid feedback and incremental infrastructure updates without full redeploys.

---

## 2. Core Foundations (Already Built)

- JSX to CloudDOM compiler
- Hooks: useInstance, useState, useContext, useEffect
- Provider lifecycle and dependency injection
- Deterministic build pipeline
- CloudDOM persistence and validation
- Crash-safe rendering model

---

## 3. Key Interoperability Features

### REQ-I01 External IaC Adapters

**Goal:** Wrap Terraform, Pulumi, Helm, or Docker modules as components. All adapters return deterministic CloudDOM nodes.

**Guarantees:**
- Core integration
- Deterministic output (content-hash IDs, no timestamps)
- Human-readable errors

**Acceptance Criteria:**
1. WHEN I use TerraformModule component THEN it SHALL load and execute the module
2. WHEN adapters execute THEN they SHALL return deterministic CloudDOM nodes
3. WHEN adapters fail THEN they SHALL provide clear error messages with source context

**Verification:** T-I01

---

### REQ-I02 Universal State Bridge

**Goal:** Expose CloudDOM state to any runtime (React, CLI, Python, etc.). Sync via WebSocket, HTTP, or gRPC.

**Guarantees:**
- Real-time updates
- Cross-runtime APIs (React, Vue, Python, CLI)
- 100ms update latency target

**Acceptance Criteria:**
1. WHEN I connect to state sync server THEN I SHALL receive CloudDOM state updates
2. WHEN CloudDOM state updates THEN subscribed clients SHALL receive updates in real-time
3. WHEN I subscribe via WebSocket/HTTP/gRPC THEN I SHALL receive JSON-serialized state

**Verification:** T-I02

---

### REQ-I03 Nested App Deployment

**Goal:** CReact apps can deploy other CReact apps.

**Guarantees:**
- Enables modular stacks
- Enables self-hosting demos
- Deterministic, depth-first orchestration

**Acceptance Criteria:**
1. WHEN I use CReactApp component THEN it SHALL deploy the child app
2. WHEN child apps complete THEN their outputs SHALL be available to parent via context
3. WHEN I nest multiple levels THEN deployment SHALL proceed depth-first

**Verification:** T-I03

---

### REQ-I04 Multi-Provider Routing

**Goal:** One CloudDOM tree to many providers. AWS, Docker, and Kubernetes resources coexist and resolve dependencies automatically.

**Guarantees:**
- Smart routing by type
- Cross-provider outputs supported
- **ProviderRouter only handles routing and ordering; execution safety remains in StateMachine**

**Acceptance Criteria:**
1. WHEN I declare AwsLambda and DockerContainer THEN both SHALL coexist in CloudDOM
2. WHEN CloudDOM builds THEN CReact SHALL route nodes to appropriate providers
3. WHEN resources depend on cross-provider outputs THEN CReact SHALL resolve dependencies
4. WHEN ProviderRouter executes THEN it SHALL NOT perform retries, rollbacks, or state persistence

**Verification:** T-I04

**Cross-references:** REQ-ARCH-01 (Provider-Orchestration Separation)

---

### REQ-I05 Deterministic Outputs

**Goal:** Identical inputs produce identical CloudDOM. No random IDs, timestamps, or drift.

**Guarantees:**
- Content-hash-based IDs
- Reproducible builds
- Audit-safe determinism

**Acceptance Criteria:**
1. WHEN I run creact build twice THEN CloudDOM SHALL be byte-for-byte identical
2. WHEN adapters generate IDs THEN they SHALL use deterministic algorithms (hash-based)
3. WHEN adapters use timestamps THEN they SHALL be isolated at deploy level, not build level

**Verification:** T-I05

---

### REQ-I06 — Interop Contracts (Type Safety Across Adapters)

**Goal:** Ensure cross-runtime type safety between CloudDOM outputs and consumer applications.

**Guarantees:**
- ✅ TypeScript definitions for all CloudDOM outputs
- ✅ Static verification in React and Node clients
- ✅ Type mismatch detection at compile-time

**Acceptance Criteria:**
1. WHEN CloudDOM outputs are defined THEN TypeScript types SHALL be generated automatically
2. WHEN I consume outputs in React/Node THEN TypeScript SHALL validate types at compile-time
3. WHEN output types change THEN consumers SHALL get compile-time errors

**Verification:** T-I06

---

## 4. Operational Core

### REQ-O01 CloudDOM State Machine

**Goal:** Transactional deployment engine with crash recovery. **Transactional logic applies globally, not per-provider.**

**States:** PENDING to APPLYING to DEPLOYED or FAILED or ROLLED_BACK

**Features:**
- Resume from checkpoints via creact resume
- Crash-safe
- Atomic state persistence via BackendProvider
- Universal transaction manager for all providers

**Acceptance Criteria:**
1. WHEN deployment starts THEN CloudDOM state SHALL transition to APPLYING
2. WHEN deployment succeeds THEN state SHALL transition to DEPLOYED
3. WHEN CReact process crashes mid-deploy THEN state SHALL remain in APPLYING
4. WHEN CReact restarts THEN it SHALL detect incomplete transactions and offer resume/rollback
5. WHEN any provider executes THEN StateMachine SHALL checkpoint after each resource

**Verification:** T-O01

**Cross-references:** REQ-ARCH-01 (Provider-Orchestration Separation)

---

### REQ-O02 — State Locking (via BackendProvider)

**Goal:** Prevent concurrent deploys. Locking is implemented by BackendProvider, making it customizable per backend.

**Mechanisms (BackendProvider-specific):**
- Local file backend: `.creact/.lock` with flock
- S3 backend: DynamoDB conditional writes
- Redis backend: SETNX with TTL
- Custom backends: Implement `IBackendProvider.acquireLock()` and `releaseLock()`

**Guarantees:**
- ✅ Distributed lock safety
- ✅ Force-unlock + TTL expiry
- ✅ Lock mechanism is pluggable (part of BackendProvider interface)

**Acceptance Criteria:**
1. WHEN deployment starts THEN CReact SHALL call `backendProvider.acquireLock(stackName)`
2. WHEN lock is held by another process THEN `acquireLock()` SHALL throw error with lock holder info
3. WHEN process crashes THEN lock SHALL have TTL and auto-expire (BackendProvider responsibility)
4. WHEN I implement custom BackendProvider THEN I SHALL implement lock methods
5. WHEN deployment completes THEN CReact SHALL call `backendProvider.releaseLock(stackName)`

**Design Notes:**
- Locking is part of `IBackendProvider` interface, not a separate system
- Each backend implements locking appropriate to its storage mechanism
- File backend uses OS-level locks (flock)
- Remote backends use distributed locks (DynamoDB, Redis, etcd)

**Verification:** T-O02

---

### REQ-O03 Error Handling and Retry Logic

**Goal:** Transient provider errors auto-retry (1s to 2s to 4s). Permanent errors fail fast with context.

**Guarantees:**
- Standard error taxonomy (AdapterError, ProviderTimeoutError, ExecutionError)
- Exponential backoff
- Structured telemetry

**Acceptance Criteria:**
1. WHEN adapter execution fails with transient error THEN CReact SHALL retry with exponential backoff
2. WHEN error is permanent THEN CReact SHALL fail immediately
3. WHEN retry count exceeds max THEN CReact SHALL fail with aggregated error context
4. WHEN retry policies are configured THEN they SHALL be exposed through both CLI flags and configuration files (`creact.config.ts`), allowing per-provider backoff tuning, maximum retries, and timeout overrides

**Verification:** T-O03

---

### REQ-O04 Plan and Change Preview

**Goal:** creact plan previews all changes before deploy. Colored diff (create = green, update = yellow, delete = red).

**Guarantees:**
- Safety before apply
- JSON output for CI/CD

**Acceptance Criteria:**
1. WHEN I run creact plan THEN CReact SHALL compute diff without deploying
2. WHEN plan completes THEN CReact SHALL display colored diff (creates, updates, deletes)
3. WHEN I run creact plan --json THEN CReact SHALL output machine-readable JSON

**Verification:** T-O04

---

### REQ-O05 Audit Log and RBAC

**Goal:** Immutable audit log and role-based permissions.

**Guarantees:**
- Append-only, signed entries
- viewer, editor, admin roles
- External sinks: CloudWatch, Loki

**Acceptance Criteria:**
1. WHEN deployment starts THEN CReact SHALL log: user, timestamp, stack, action
2. WHEN I run creact audit list THEN CReact SHALL display audit log entries
3. WHEN user deploys THEN CReact SHALL check permissions for stack
4. WHEN user lacks permission THEN deployment SHALL fail with 403 Forbidden
5. WHEN audit logs are stored THEN format SHALL be deterministic and portable using newline-delimited JSON (JSONL) per stack, persisted via backend provider, including timestamps, user IDs, and cryptographic signatures for tamper detection

**Verification:** T-O05

---

### REQ-O06 — Config and Secrets Isolation

**Goal:** Replace .env files securely.

**Guarantees:**
- ✅ Encrypted secret values in CloudDOM backend
- ✅ Automatic propagation to adapters (Terraform, Helm)
- ✅ No plaintext environment files on disk

**Acceptance Criteria:**
1. WHEN secrets are stored THEN they SHALL be encrypted in BackendProvider
2. WHEN adapters need secrets THEN they SHALL receive them securely at runtime
3. WHEN I run `creact secrets list` THEN CReact SHALL show secret keys (not values)
4. WHEN secrets are accessed THEN audit log SHALL record access

**Verification:** T-O06

---

### REQ-O07 — Hot Reload for Infrastructure

**Goal:** Enable live, incremental deployment updates — bringing React-style hot reload to infrastructure — with both watch mode and manual approval flow.

**Guarantees:**
- ✅ Detects changes to component files and updates only affected CloudDOM subtrees
- ✅ Reconciles deltas without full rebuild or redeploy
- ✅ Falls back to safe rollback on failed reloads
- ✅ Target iteration time: <5 seconds for small changes
- ✅ Supports both automatic watch mode and manual step-through

**Acceptance Criteria:**
1. WHEN I run `creact dev` THEN CReact SHALL watch source files for changes and auto-apply
2. WHEN I run `creact dev --step` THEN CReact SHALL pause after each change and wait for approval
3. WHEN I run `creact apply --incremental` THEN CReact SHALL apply one render cycle manually
4. WHEN a watched file changes THEN CReact SHALL rebuild and apply only affected CloudDOM subtree
5. WHEN a reload fails THEN CReact SHALL rollback to the last stable CloudDOM
6. WHEN hot reload completes THEN logs SHALL show "Δ applied" and updated resource count

**Verification:** T-O07

**CLI Commands:**
```bash
# Watch mode (automatic)
$ creact dev
# Watching ./infra for changes...
# Δ Updated: AwsLambda.api (1 resource changed)
# ✅ Hot reload applied in 3.8s

# Step-through mode (manual approval)
$ creact dev --step
# Watching ./infra for changes...
# Δ Detected: AwsLambda.api (1 resource changed)
# Apply changes? [y/N] y
# ✅ Hot reload applied in 3.8s

# Single render cycle (manual)
$ creact apply --incremental
# Δ Computing diff...
# Δ 1 resource changed
# ✅ Applied in 3.2s
```

---

### REQ-O08 — Command Line Interface (CLI Surface)

**Goal:** Provide developer-friendly commands for building, planning, and deploying CloudDOM graphs.

**Commands:**

| Command | Description |
|---------|-------------|
| `creact build` | Compile JSX → CloudDOM |
| `creact plan` | Show diff preview without apply |
| `creact deploy` | Apply changes to infrastructure |
| `creact resume` | Resume interrupted deployment |
| `creact dev` | Hot reload infrastructure |
| `creact logs` | Stream CloudDOM event logs |
| `creact secrets` | Manage encrypted configuration |
| `creact audit` | View audit log entries |
| `creact info` | List registered providers, backends, and extensions |

**Guarantees:**
- ✅ Unified interface across all providers
- ✅ Consistent UX (help text, JSON output)
- ✅ All commands return structured exit codes for CI/CD

**Acceptance Criteria:**
1. WHEN I run any command with `--help` THEN CReact SHALL display usage information
2. WHEN I run any command with `--json` THEN CReact SHALL output machine-readable JSON
3. WHEN command succeeds THEN exit code SHALL be 0
4. WHEN command fails THEN exit code SHALL be non-zero with error context
5. WHEN CLI commands are used THEN output and terminology SHALL align with established IaC conventions (e.g., "plan", "apply", "destroy") for developer familiarity and intuitive UX

**Verification:** T-O08

---

### REQ-O09 — Dependency Injection Runtime

**Goal:** Provide unified dependency injection runtime for providers, adapters, and extensions.

**Guarantees:**
- ✅ Dynamic registration of providers, adapters, and extensions at runtime
- ✅ Contextual resolution between parent and child apps
- ✅ Lifecycle hooks (`onBuild`, `onDeploy`, `onError`) for extensions
- ✅ Replaces the need for a separate plugin or extension API
- ✅ All injected components are deterministic and sandboxed

**Acceptance Criteria:**
1. WHEN I register a provider THEN it SHALL be available for dependency resolution
2. WHEN I register an extension THEN its lifecycle hooks SHALL execute at appropriate times
3. WHEN nested apps run THEN they SHALL inherit parent container context
4. WHEN I run `creact info` THEN it SHALL list all registered providers and extensions
5. WHEN testing infrastructure THEN the framework SHALL include a deterministic mock provider and fake backend for E2E and integration testing, ensuring reproducible test runs without real provider dependencies

**Verification:** T-O09

**Cross-references:** REQ-I01 (adapters), REQ-I04 (multi-provider), REQ-I03 (nested apps)

---

### REQ-ARCH-01 — Provider-Orchestration Separation

**Goal:** Enforce strict boundary between orchestration and provider execution.

**Guarantees:**
- ✅ Providers are responsible only for resource materialization (CRUD)
- ✅ The orchestration layer (Reconciler + StateMachine) handles transaction safety, diffing, and rollback
- ✅ No provider may implement its own concurrency, retry, or state logic
- ✅ All providers automatically inherit transactional safety and deterministic behavior

**Acceptance Criteria:**
1. WHEN a provider is implemented THEN it SHALL only implement materialization logic
2. WHEN orchestration logic is attempted in a provider THEN CReact SHALL reject it
3. WHEN a provider crashes mid-deploy THEN StateMachine SHALL resume safely
4. WHEN reviewing BaseAdapter THEN orchestration hooks SHALL be disabled

**Verification:** T-ARCH-01

**Cross-references:** REQ-O01 (State Machine), REQ-I04 (Provider Router), REQ-I01 (Adapters)

---

**Developer Loop:** The developer experience is unified — edit a CReact component, run `creact dev`, and see CloudDOM reconcile changes live. The same CLI powers both interactive development (`dev`) and CI/CD (`deploy`, `plan`). No extra tooling required.

---

## 5. Security Baseline

| Layer | Guarantee |
|-------|-----------|
| **Adapter Sandbox** | Isolated processes for Terraform/Helm execution |
| **Auth** | JWT / API key for state sync and deploys |
| **Audit Log** | Tamper-evident JSONL, per-user actions |
| **Locking** | Prevents state corruption across sessions |
| **Secrets** | Encrypted storage, no plaintext .env files |
| **Hot Reload Sandbox** | Safe delta application with rollback fallback |

---

## 6. Positioning & Differentiation

| Capability | Analogy |
|------------|---------|
| CloudDOM Reconciler | React Fiber for infrastructure |
| Universal State Bridge | Redux DevTools for your Cloud |
| Nested Apps | Monorepos that deploy themselves |
| Deterministic Adapters | Git-like reproducibility |
| Audit Log | git blame for your cloud state |

---

## 7. Traceability Matrix

| ID | Title | Test ID |
|----|-------|---------|
| **Interoperability** |
| I01 | External IaC Adapters | T-I01 |
| I02 | Universal State Bridge | T-I02 |
| I03 | Nested App Deployment | T-I03 |
| I04 | Multi-Provider Routing | T-I04 |
| I05 | Deterministic Outputs | T-I05 |
| I06 | Interop Contracts (Type Safety) | T-I06 |
| **Operational** |
| O01 | State Machine | T-O01 |
| O02 | State Locking | T-O02 |
| O03 | Retry Logic | T-O03 |
| O04 | Plan Command | T-O04 |
| O05 | Audit and RBAC | T-O05 |
| O06 | Config & Secrets Isolation | T-O06 |
| O07 | Hot Reload | T-O07 |
| O08 | CLI Surface | T-O08 |
| O09 | Dependency Injection Runtime | T-O09 |
| **Architecture** |
| ARCH-01 | Provider-Orchestration Separation | T-ARCH-01 |

---

## 8. Enhancements (Optional / Future)

- 🔌 **Plugin System:** Extend with sandboxed hooks
- 📊 **Telemetry:** Prometheus metrics via EventBus
- 🧪 **Integration Tests:** Mock providers for full-stack verification
- 🛠️ **CLI Extensions:** Interactive mode, watch mode enhancements

---

## 9. The CloudDOM Reconciler

The CloudDOM Reconciler is CReact's equivalent to React's Fiber architecture — the algorithm that diffs CloudDOM state across build/deploy cycles and computes minimal change sets.

**Future Capabilities:**
- Smart diffing (semantic equivalence)
- Conflict resolution
- Preview mode
- Rollback planning
- Parallel execution

---

## 10. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-05 | Initial POC baseline |
| 2.0 | 2025-10-05 | Interoperability milestone |
| 3.0 | 2025-10-05 | Production-ready: streamlined, focused, investor-demo ready |
| 3.1 | 2025-10-05 | Added Hot Reload as core developer feature (REQ-O07) |

---

**End of Requirements Specification**

