# CReact Design Document

**Version:** 1.0 MVP  
**Date:** 2025-10-06  
**Status:** MVP Implementation

> **"If React made UI declarative, CReact makes infrastructure declarative."**

---

## 1. What is a CReact App?

A **CReact app** is like a React app, but for infrastructure. Instead of rendering UI components to the DOM, you render infrastructure components to the cloud.

Just like React apps have an `index.js` entry point, CReact apps have an `index.ts` entry point that defines your infrastructure.

### Hello World CReact App

```tsx
// index.ts - Your CReact app entry point
import { CReact, useState } from 'creact';
import { DummyCloudProvider, FileBackendProvider } from 'creact/providers';

// 1. Configure providers (like ReactDOM.render setup)
CReact.cloudProvider = new DummyCloudProvider();
CReact.backendProvider = new FileBackendProvider({ path: './.creact' });

// 2. Define your infrastructure (like React components)
function App() {
  const [replicas] = useState(3);
  
  return (
    <>
      <AwsLambda key="api" handler="index.handler" />
      <DockerContainer key="db" image="postgres:14" replicas={replicas} />
    </>
  );
}

// 3. Export your app (like ReactDOM.render)
export default CReact.renderCloudDOM(<App />, 'my-stack');
```

### How to Run Your CReact App

```bash
# Build your infrastructure (like npm run build)
creact build

# Preview changes (like git diff)
creact plan

# Deploy to cloud (like npm run deploy)
creact deploy

# Hot reload development (like npm run dev)
creact dev
```

**Key Insight:** CReact uses familiar React patterns but with a fundamental difference - hooks are **declarative, not reactive**. This is by design for infrastructure use cases.

### How to Extend CReact

CReact is extensible through **providers** - just like React is extensible through libraries:

```tsx
// Add AWS support
import { AwsCloudProvider } from 'creact-aws';
CReact.cloudProvider = new AwsCloudProvider();

// Add S3 state backend  
import { S3BackendProvider } from 'creact-s3';
CReact.backendProvider = new S3BackendProvider({ bucket: 'my-state' });

// Use community components
import { PostgresCluster } from 'creact-postgres';

function App() {
  return <PostgresCluster replicas={3} />;
}
```

### CloudDOM: Infrastructure as a Graph

**CloudDOM** is CReact's equivalent to React's Virtual DOM. It's the intermediate representation between your JSX and actual cloud resources.

- **React:** JSX → Virtual DOM → Real DOM
- **CReact:** JSX → CloudDOM → Real Infrastructure

---

## 2. Critical Understanding: CReact Hooks Are NOT Reactive

**This is the most important concept to understand about CReact.**

### React vs CReact: Fundamental Difference

| Aspect | React (UI) | CReact (Infrastructure) |
|--------|------------|-------------------------|
| **useState** | `setState()` → triggers re-render → component sees new state immediately | `setState()` → updates persisted output → takes effect in next build/deploy cycle |
| **useContext** | Context changes → subscribers re-render → components see new values | Context values → resolved once during render → static for that render cycle |
| **Mental Model** | **Runtime Reactive** - Changes cause immediate re-execution | **Build-time Declarative** - Components declare desired outputs |
| **When Changes Apply** | Immediately in memory | Next deployment cycle |

### Why CReact Hooks Are Not Reactive

**Infrastructure is fundamentally different from UI:**

1. **Infrastructure Has Deploy Cycles, Not Render Cycles**
   - UI: User clicks → state changes → re-render (milliseconds)
   - Infrastructure: Code changes → build → deploy (seconds/minutes)

2. **Infrastructure Resources Are Expensive to Create/Destroy**
   - UI: Creating/destroying DOM nodes is cheap
   - Infrastructure: Creating/destroying cloud resources costs time and money

3. **Infrastructure Needs Persistence Across Deployments**
   - UI: State lives in memory during user session
   - Infrastructure: State must persist across build/deploy cycles

4. **Infrastructure Changes Should Be Deliberate, Not Reactive**
   - UI: Reactive updates provide smooth user experience
   - Infrastructure: Reactive updates could cause accidental resource churn

### What CReact Hooks Actually Do

```tsx
function MyStack() {
  // useState declares an OUTPUT that persists across cycles
  const [dbUrl, setDbUrl] = useState(''); // NOT reactive state
  
  // useContext reads configuration (static during this render)
  const config = useContext(ConfigContext); // NOT reactive subscription
  
  // useInstance creates infrastructure resources
  const db = useInstance(Database, { 
    name: 'my-db',
    region: config.region 
  });
  
  // setState updates the OUTPUT for next cycle (doesn't re-render)
  setDbUrl(db.connectionUrl); // Takes effect after deployment
  
  return null; // Components don't return JSX for rendering
}
```

### When State Changes Take Effect

```tsx
// Build Cycle 1: Initial deployment
function App() {
  const [status, setStatus] = useState('deploying'); // Initial value
  const db = useInstance(Database, { name: 'my-db' });
  
  // This setState doesn't cause re-render - it updates persisted output
  setStatus('deployed'); 
  
  return null;
}
// Result: Database created, status output = 'deployed'

// Build Cycle 2: Code change triggers new deployment
function App() {
  const [status, setStatus] = useState('deploying'); // Reads previous value: 'deployed'
  const db = useInstance(Database, { name: 'my-db' }); // Existing resource
  
  setStatus('updated');
  
  return null;
}
// Result: No infrastructure changes, status output = 'updated'
```

### This Design Is Intentional

CReact's non-reactive design prevents common infrastructure anti-patterns:

- **No Accidental Resource Churn** - State changes don't immediately recreate resources
- **Predictable Deployment Cycles** - Changes only apply when you explicitly deploy
- **Cost Control** - No surprise resource creation from reactive updates
- **Debugging** - Clear separation between build-time and deploy-time behavior

---

## 3. Current Implementation Status

### What's Already Built ✅

CReact has a solid foundation that's already working:

**Core Engine (Complete)**
- ✅ **JSX → Fiber → CloudDOM pipeline** - Full React-style JSX rendering
- ✅ **Hooks system** - useState, useContext, useInstance all working
- ✅ **Reconciler** - Diff algorithm computes minimal change sets
- ✅ **State Machine** - Deployment tracking with crash recovery
- ✅ **Validation** - Circular dependency detection and pre-deploy checks
- ✅ **Provider system** - ICloudProvider and IBackendProvider interfaces
- ✅ **696 tests passing** - Comprehensive test coverage

**What This Means:** The hard parts are done. CReact can already render JSX to CloudDOM, compute diffs, and manage deployment state safely.

### What's Left for MVP

**CLI Commands (In Progress)**
- 🔄 `creact build` - Basic implementation exists, needs polish
- 🔄 `creact plan` - Diff preview functionality exists, needs CLI wrapper
- 🔄 `creact deploy` - Core deployment works, needs CLI integration
- ❌ `creact dev` - Hot reload needs to be implemented

**Developer Experience**
- ❌ **Hot reload** - File watching and incremental updates
- 🔄 **Better error messages** - Current errors are too generic
- 🔄 **Entry point convention** - Standardize on index.ts pattern

**Architecture Cleanup**
- 🔄 **Remove ProviderRouter** - Simplify to single provider per app
- 🔄 **Simplify backend interfaces** - Remove unused secrets functionality

---

## 4. Architecture

CReact follows the same architecture pattern as React, but for infrastructure:

```
React:  JSX → Virtual DOM → Real DOM
CReact: JSX → CloudDOM → Real Infrastructure
```

### Current Pipeline (All Working ✅)

```
index.ts → Renderer → Validator → CloudDOMBuilder → CloudDOM
                                                        ↓
                                                   Reconciler (diff)
                                                        ↓
                                                 StateMachine (deploy)
                                                        ↓
                                                  CloudProvider
                                                        ↓
                                                 BackendProvider
```

**What Each Component Does:**
- **Renderer** - Converts your JSX to Fiber tree (like React)
- **Validator** - Catches errors before deployment (circular deps, etc.)
- **CloudDOMBuilder** - Converts Fiber to CloudDOM (like Virtual DOM)
- **Reconciler** - Computes minimal diffs (like React reconciliation)
- **StateMachine** - Manages deployment with crash recovery
- **CloudProvider** - Actually creates resources (AWS, Docker, etc.)
- **BackendProvider** - Saves state (file system, S3, etc.)

---

## 5. Core Interfaces

CReact's extensibility comes from two simple interfaces:

### ICloudProvider - Where Resources Get Created

```typescript
interface ICloudProvider {
  initialize?(): Promise<void>;
  materialize(cloudDOM: CloudDOMNode[]): void;
}
```

**Current Implementations:**
- `DummyCloudProvider` ✅ - For testing (logs to console)
- `AwsCloudProvider` 🔄 - Creates real AWS resources (planned)
- `DockerCloudProvider` 🔄 - Manages Docker containers (planned)

### IBackendProvider - Where State Gets Saved

```typescript
interface IBackendProvider<TState = any> {
  initialize?(): Promise<void>;
  getState(stackName: string): Promise<TState | undefined>;
  saveState(stackName: string, state: TState): Promise<void>;
  
  // Optional locking (for production use)
  acquireLock?(stackName: string, holder: string, ttl: number): Promise<void>;
  releaseLock?(stackName: string): Promise<void>;
  checkLock?(stackName: string): Promise<LockInfo | null>;
}
```

**Current Implementations:**
- `DummyBackendProvider` ✅ - In-memory only (no locking)
- `FileBackendProvider` ✅ - Local `.creact/` folder (basic file locking)
- `S3BackendProvider` 🔄 - S3 bucket with DynamoDB locking (planned)

### How to Use Them

```typescript
// index.ts
import { CReact } from 'creact';

// Pick your providers (like choosing a React renderer)
CReact.cloudProvider = new DummyCloudProvider();
CReact.backendProvider = new FileBackendProvider({ path: './.creact' });

function App() {
  return <AwsLambda key="api" handler="index.handler" />;
}

export default CReact.renderCloudDOM(<App />, 'my-stack');
```

---

## 6. CLI Commands (MVP)

CReact CLI follows familiar patterns from React and other dev tools:

```bash
# Build your app (like npm run build)
creact build

# Preview changes (like git diff)  
creact plan

# Deploy to cloud (like npm run deploy)
creact deploy

# Development mode with hot reload (like npm run dev)
creact dev
```

**Convention:** CReact looks for `index.ts` in the current directory (like React looks for `index.js`).

### Hot Reload (Key MVP Feature)

The killer feature that makes CReact feel like modern frontend development:

```bash
$ creact dev
# Watching index.ts for changes...
# ✅ Built CloudDOM in 1.2s
# 🚀 Deployed 3 resources in 2.8s
# 
# [File changed: index.ts]
# Δ Computing diff...
# Δ 1 resource changed (AwsLambda.api)
# ✅ Hot reload applied in 3.1s
```

**How It Works:**
1. **File Watcher** - Monitors `index.ts` and imported files
2. **Incremental Build** - Only rebuilds changed components
3. **Smart Diff** - Applies minimal change sets
4. **Rollback Safety** - Falls back on errors

**Target:** < 5 seconds from file save to deployed change.

---

## 7. Production Readiness Improvements

While CReact's core engine is solid, several improvements are needed for production use:

### 6.1 Critical Safety Issues (MUST FIX)

**Hook Context - Async Safety**
- **Files:** `hooks/useInstance.ts`, `hooks/useState.ts`, `hooks/useContext.ts`
- **Issue:** Module-level state (currentFiber, contextStacks) unsafe for concurrent operations
- **Fix:** Use AsyncLocalStorage from Node.js async_hooks
- **Impact:** Prevents state corruption in concurrent deployments

**Memory Leak - Context Stacks**
- **File:** `hooks/useContext.ts`
- **Issue:** contextStacks Map grows unbounded, never cleared
- **Fix:** Add clearContextStacks() in Renderer's finally block
- **Impact:** Memory exhaustion in long-running processes

**Lock Auto-Renewal**
- **File:** `core/StateMachine.ts`
- **Issue:** Locks expire during long deployments (>10 min TTL)
- **Fix:** Add setInterval to renew at 50% TTL with cleanup
- **Impact:** Race conditions, data corruption
- **Note:** Only applies to backends that implement locking

### 6.2 Performance Issues (SHOULD FIX)

**Deep Copy Actually Deep**
- **File:** `core/CloudDOMBuilder.ts`
- **Issue:** createDeepDefensiveCopy only shallow copies nested objects
- **Fix:** Use structuredClone() or JSON roundtrip with fallback
- **Impact:** Subtle mutation bugs

**Hash Function Robustness**
- **File:** `core/Reconciler.ts`
- **Issue:** computeShallowHash uses JSON.stringify which can fail/collide
- **Fix:** Recursive type-aware hash function
- **Impact:** Wrong change detection

**Cache Scalability**
- **File:** `utils/deepEqual.ts`
- **Issue:** Simple FIFO doesn't optimize for access patterns
- **Fix:** LRU cache implementation
- **Impact:** Better cache efficiency

### 6.3 Type Safety (SHOULD FIX)

**Replace any Types**
- **Files:** Multiple
- **Issue:** Widespread use of `any` types reduces compile-time safety
- **Fix:** Define proper TypeScript interfaces:
```typescript
// Before
type: any

// After  
type ComponentType = FunctionComponent | ClassComponent | IntrinsicElement
construct: ConstructType<T>
```

**Hook State Types**
- **File:** `core/types.ts`
- **Fix:** Add discriminated union for hook states:
```typescript
type HookState = 
  | { type: 'state'; value: any }
  | { type: 'effect'; cleanup?: () => void }
```

### 6.4 Developer Experience (SHOULD FIX)

**Better Error Messages**
- **Files:** `core/Renderer.ts`, `core/Validator.ts`
- **Issue:** Generic errors lack context
- **Fix:** Include actual values, expected types, suggestions
- **Impact:** Better developer experience

**Deployment Timeout**
- **File:** `core/CReact.ts`
- **Issue:** No timeout on materialize() calls
- **Fix:** Wrap in Promise.race() with configurable timeout
- **Impact:** Prevent hanging deployments

**Circular Dependency Deduplication**
- **File:** `core/Reconciler.ts`
- **Issue:** Reports same cycle multiple times from different starting points
- **Fix:** Normalize and deduplicate cycles before throwing
- **Impact:** Cleaner error output

### 6.5 Operational Polish (NICE TO HAVE)

**Module Cache Clearing**
- **File:** `cli/index.ts`
- **Issue:** Only clears entry file, not dependency tree
- **Fix:** Clear all modules in config directory tree
- **Impact:** Stale code in dev/hot reload

**Backend Retry Configuration**
- **Files:** `providers/IBackendProvider.ts`, `core/StateMachine.ts`
- **Issue:** Hardcoded retry settings
- **Fix:** Add BackendRetryConfig interface with jitter
- **Impact:** Better reliability tuning

**Concurrent Deployment Detection**
- **File:** `core/StateMachine.ts`
- **Issue:** Lock is only protection mechanism
- **Fix:** Add unique deploymentId to state for verification
- **Impact:** Defense in depth

### 6.6 Fix Priority Order

**🚨 Phase 1: Critical Safety (Must Fix Before Production)**
1. Hook Context - Async Safety (prevents state corruption)
2. Memory Leak - Context Stacks (prevents memory exhaustion)  
3. Lock Auto-Renewal (prevents deployment race conditions)

**⚡ Phase 2: Performance & Reliability (Should Fix Soon)**
4. Deep Copy Actually Deep (prevents mutation bugs)
5. Hash Function Robustness (prevents wrong change detection)
6. Better Error Messages (improves developer experience)

**✨ Phase 3: Polish (Nice to Have)**
7. Replace any Types (better compile-time safety)
8. Module Cache Clearing (better hot reload)
9. Deployment Timeout (prevents hanging deployments)

---

## 8. Future Enhancements (Not MVP)

These advanced features can be built as CReact components or extensions later:

### Multi-Provider Routing
Route different resource types to different providers in one CloudDOM tree. (The current ProviderRouter implementation will be removed for MVP simplicity, but can be re-added later.)

### State Sync Server  
Expose CloudDOM state to React/Vue apps via WebSocket/HTTP for real-time updates.

### Nested App Deployment
CReact apps deploying other CReact apps recursively (apps deploying apps).

### External IaC Adapters
Wrap Terraform, Helm, Pulumi modules as CReact components with deterministic output.

### Advanced Backend Features
- Secrets management with encrypted storage (removed from MVP backend interface)
- Advanced locking strategies beyond basic file/database locks
- Distributed state synchronization

### Advanced CLI Features
- Audit logs with tamper-evident JSONL
- RBAC with role-based permissions
- Advanced retry policies and error handling

### Advanced Error Handling
- Exponential backoff with jitter
- Circuit breaker patterns
- Structured telemetry and metrics

---

## 9. Testing Strategy

### MVP Testing Focus

**Unit Tests** - Individual components in isolation:
- Reconciler diff algorithm
- State machine transitions  
- Hook implementations
- Validation logic

**Integration Tests** - Component interactions:
- Full JSX → CloudDOM → Deploy pipeline
- Hot reload functionality
- Error handling and recovery

**Mock Providers** - For deterministic testing:
- DummyCloudProvider for resource simulation
- FileBackendProvider for local state testing

---

## 10. Key Design Decisions

### Why JSX for Infrastructure?
- **Familiar** - React developers already know the patterns
- **Composable** - Easy to build reusable infrastructure components
- **Type-safe** - Full TypeScript support with inference
- **Declarative** - Describe what you want, not how to build it

### Why Non-Reactive Hooks?
- **Infrastructure-appropriate** - Matches deploy cycles, not render cycles
- **Cost control** - Prevents accidental resource churn
- **Predictable** - Changes only apply when explicitly deployed
- **Persistent** - State survives across build/deploy cycles

### Why Hot Reload?
- **Fast feedback** - See changes in seconds, not minutes
- **Developer experience** - Matches modern frontend tooling expectations
- **Incremental updates** - Only deploy what changed

### Why Provider Pattern?
- **Extensible** - Easy to add new cloud platforms
- **Testable** - Mock providers for deterministic testing
- **Separation of concerns** - Orchestration vs materialization

---

## 11. Document History

| Version | Date       | Changes                                    |
| ------- | ---------- | ------------------------------------------ |
| 1.0     | 2025-10-06 | MVP design - lean and focused              |

---

**End of Design Document**