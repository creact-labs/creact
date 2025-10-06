# CReact Implementation Tasks

**Last Updated:** 2025-10-06  
**Status:** Milestone 1 Complete, Milestone 2 In Progress

---

## Overview

CReact is a React-inspired infrastructure-as-code library that renders JSX to CloudDOM (Cloud Document Object Model) for declarative infrastructure management.

**Vision:** Production-ready universal declarative runtime that bridges infrastructure tools (Terraform, Helm, Docker) and application frameworks (React, Vue, Python).

---

## ✅ Milestone 1: Core Foundation (COMPLETE)

**What's Built:**
- JSX → Fiber → CloudDOM rendering pipeline
- Hooks: `useInstance`, `useState`, `useContext`, `createContext`
- Provider interfaces: `ICloudProvider`, `IBackendProvider`
- Validation engine with circular dependency detection
- Reconciler with diff algorithm and dependency-aware ordering
- StateMachine with deployment state tracking and locking
- CloudDOM persistence with atomic writes
- 696 tests passing

**Key Files:**
- `src/core/Renderer.ts` - JSX to Fiber tree
- `src/core/Validator.ts` - Pre-deployment validation
- `src/core/CloudDOMBuilder.ts` - Fiber to CloudDOM
- `src/core/Reconciler.ts` - Diff computation
- `src/core/StateMachine.ts` - Deployment orchestration
- `src/core/CReact.ts` - Main orchestrator
- `src/hooks/` - React-style hooks
- `src/providers/` - Provider interfaces

---

## 🎯 Milestone 2: Production Readiness (IN PROGRESS)

### Phase 1: Complete State Machine (HIGH PRIORITY)

**Status:** 95% Complete

**Remaining Work:**
- [x] Implement crash recovery (`resumeDeployment()`)
- [x] Implement rollback (`rollback()` with reverse change sets)
- [x] Integrate StateMachine fully into `CReact.deploy()`
- [ ] Add CLI prompts for resume vs rollback on startup

**Why This Matters:** Enables transactional deployments with crash recovery - critical for production reliability.

**Requirements:** REQ-O01

---

### Phase 2: CLI & Developer Workflow (HIGH PRIORITY)

**Status:** Not Started

**What to Build:**

#### CLI Foundation
- [ ] Entry point with command routing (`src/cli/index.ts`)
- [ ] Configuration loader (`creact.config.ts` support)
- [ ] Colored output, spinners, progress indicators
- [ ] Build and packaging setup (bin entry in package.json)

#### Core Commands
- [ ] `creact build` - Compile JSX to CloudDOM, save to backend
- [ ] `creact plan` - Show colored diff (+green, ~yellow, -red)
- [ ] `creact deploy` - Apply changes with confirmation prompt
- [ ] `creact resume` - Continue interrupted deployments
- [ ] `creact info` - Show registered providers and stack status

**Why This Matters:** Developers need a usable CLI for daily workflow. This is the primary interface.

**Requirements:** REQ-O04, REQ-O08

---

### Phase 3: External Tool Integration (MEDIUM PRIORITY)

**Status:** Not Started

**What to Build:**

#### Adapter Framework
- [ ] `IIaCAdapter` interface extending `ICloudProvider`
- [ ] Deterministic ID generation (content-hash based, no timestamps)
- [ ] Output mapping from external tools to CloudDOM

#### Provider Router
- [ ] Route CloudDOM nodes to multiple providers by construct type
- [ ] Handle cross-provider dependencies
- [ ] Example: Mix AWS + Docker + Kubernetes in one tree

#### Terraform Adapter (Reference Implementation)
- [ ] Load Terraform modules as CloudDOM nodes
- [ ] Execute `terraform apply` and capture outputs
- [ ] Map Terraform outputs to `node.outputs`

**Why This Matters:** Enables wrapping existing IaC tools (Terraform, Helm) as CReact components.

**Requirements:** REQ-I01, REQ-I04, REQ-I05

---

### Phase 4: State Bridge (MEDIUM PRIORITY)

**Status:** Not Started

**What to Build:**

#### State Sync Server
- [ ] WebSocket server for real-time CloudDOM updates
- [ ] Subscription protocol (subscribe/unsubscribe/state_update)
- [ ] Publish CloudDOM state after build/deploy
- [ ] JSON serialization with schema versioning

#### React Integration Package
- [ ] New package: `creact-react-interop`
- [ ] `useCReactContext()` hook for consuming CloudDOM state
- [ ] WebSocket client with reconnection logic
- [ ] TypeScript types for outputs

**Why This Matters:** Enables React/Vue apps to consume infrastructure state in real-time (e.g., API URLs, database connections).

**Requirements:** REQ-I02, REQ-I06

---

### Phase 5: Advanced Features (LOW PRIORITY)

**Status:** Not Started

**What to Build:**

#### Nested App Deployment
- [ ] `CReactApp` component for deploying child apps
- [ ] Context inheritance (parent → child)
- [ ] Output propagation (child → parent)

#### Hot Reload
- [ ] `creact dev` command with file watcher
- [ ] Incremental CloudDOM updates (only affected subtrees)
- [ ] Rollback on failed reloads
- [ ] Target: <5 second iteration time

**Why This Matters:** Enables apps deploying apps (monorepos) and React-style hot reload for infrastructure.

**Requirements:** REQ-I03, REQ-O07

---

### Phase 6: Production Hardening (MEDIUM PRIORITY)

**Status:** Not Started

**What to Build:**

#### Secrets Management
- [ ] Extend `IBackendProvider` with `getSecret()`, `setSecret()`, `listSecrets()`
- [ ] Encrypted storage in backend
- [ ] `creact secrets` CLI commands

#### Audit Logging
- [ ] Append-only JSONL audit log
- [ ] Log: user, timestamp, stack, action, changes
- [ ] `creact audit list` command
- [ ] Cryptographic signatures for tamper detection

#### Error Handling & Retry
- [ ] Exponential backoff for transient errors
- [ ] Configurable retry policies (CLI flags + config file)
- [ ] Clear error taxonomy (AdapterError, ProviderTimeoutError, etc.)

#### RBAC (Optional)
- [ ] Role-based permissions (viewer, editor, admin)
- [ ] Permission checks before deployment

**Why This Matters:** Security, reliability, and observability for production deployments.

**Requirements:** REQ-O02, REQ-O03, REQ-O05, REQ-O06

---

## 📊 Progress Tracking

| Phase | Status | Priority | Completion |
|-------|--------|----------|------------|
| Milestone 1: Core Foundation | ✅ Complete | - | 100% |
| Phase 1: State Machine | 🟡 In Progress | HIGH | 95% |
| Phase 2: CLI & Workflow | ⚪ Not Started | HIGH | 0% |
| Phase 3: External Tools | ⚪ Not Started | MEDIUM | 0% |
| Phase 4: State Bridge | ⚪ Not Started | MEDIUM | 0% |
| Phase 5: Advanced Features | ⚪ Not Started | LOW | 0% |
| Phase 6: Production Hardening | ⚪ Not Started | MEDIUM | 0% |

---

## 🎯 Recommended Next Steps

1. **Finish crash recovery** - Complete `resumeDeployment()` and `rollback()` in StateMachine
2. **Wire StateMachine into CReact** - Integrate checkpoints into `CReact.deploy()`
3. **Build CLI foundation** - Entry point, config loader, command routing
4. **Implement core commands** - `build`, `plan`, `deploy` for daily workflow
5. **Add Terraform adapter** - Prove external tool integration pattern works
6. **Build state sync server** - Enable React apps to consume CloudDOM state

---

## 🔑 Key Architectural Principles

1. **Determinism First** - All IDs are content-hash based, no timestamps in CloudDOM
2. **StateMachine Owns Orchestration** - Providers only materialize resources, no retry/rollback logic
3. **Provider-Orchestration Separation** - Clear boundary between execution and orchestration (REQ-ARCH-01)
4. **CLI UX Matters** - Follow Terraform conventions (plan/apply), clear error messages
5. **Type Safety Everywhere** - Full TypeScript support from CloudDOM to React apps
6. **Test Coverage** - Maintain high coverage (currently 686 tests passing)

---

## 📝 Requirements Mapping

| Requirement | Description | Status | Phase |
|-------------|-------------|--------|-------|
| REQ-O01 | State Machine with crash recovery | 🟡 95% | Phase 1 |
| REQ-O02 | State locking | ✅ Done | Milestone 1 |
| REQ-O03 | Error handling & retry | ⚪ Todo | Phase 6 |
| REQ-O04 | Plan command | ⚪ Todo | Phase 2 |
| REQ-O05 | Audit log & RBAC | ⚪ Todo | Phase 6 |
| REQ-O06 | Secrets management | ⚪ Todo | Phase 6 |
| REQ-O07 | Hot reload | ⚪ Todo | Phase 5 |
| REQ-O08 | CLI surface | ⚪ Todo | Phase 2 |
| REQ-O09 | Dependency injection | ✅ Done | Milestone 1 |
| REQ-I01 | External IaC adapters | ⚪ Todo | Phase 3 |
| REQ-I02 | State bridge | ⚪ Todo | Phase 4 |
| REQ-I03 | Nested apps | ⚪ Todo | Phase 5 |
| REQ-I04 | Multi-provider routing | ⚪ Todo | Phase 3 |
| REQ-I05 | Deterministic outputs | ✅ Done | Milestone 1 |
| REQ-I06 | Type safety | ⚪ Todo | Phase 4 |
| REQ-ARCH-01 | Provider-orchestration separation | ✅ Done | Milestone 1 |

---

## 🚀 Success Criteria

**Milestone 2 is complete when:**
- [ ] CLI commands work end-to-end (`build`, `plan`, `deploy`)
- [ ] Crash recovery and rollback work reliably
- [ ] Terraform adapter demonstrates external tool integration
- [ ] React apps can consume CloudDOM state via `useCReactContext()`
- [ ] All tests pass (target: >700 tests)
- [ ] Documentation covers all CLI commands and APIs

---

## 📚 Reference Documents

- **Design:** `.kiro/specs/jsx-infra-library/design.md`
- **Requirements:** `.kiro/specs/jsx-infra-library/requirements.md`
- **Manifesto:** `.kiro/specs/jsx-infra-library/manifesto.md`
- **Steering Rules:** `.kiro/steering/`
