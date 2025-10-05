# CReact Functional & Non-Functional Requirements Specification

**Product:** CReact – Declarative Cloud Renderer  
**Version:** 0.9 (POC Baseline)  
**Date:** 2025-10-05  
**Status:** Draft / Proof of Concept

---

## 1. Overview

CReact renders JSX to CloudDOM, where component nesting expresses deployment order. Like React reconciles the DOM, CReact reconciles cloud infrastructure.

**Core Idea:** *Infrastructure is React without the runtime loop.* Developers render once, review the diff, approve, and deploy.

---

## 2. Glossary

| Term | Definition |
|------|------------|
| **JSX** | JavaScript XML syntax extension used to declaratively define component trees |
| **CloudDOM** | Immutable tree structure representing cloud resources to be deployed |
| **Fiber** | Intermediate representation of JSX tree before deployment (internal) |
| **Stack Context** | React-like context mechanism for sharing outputs between components |
| **Provider** | Component that makes outputs available to descendants via Stack Context |
| **useState** | Hook that declares component outputs (NOT reactive state like React) |
| **setState** | Function that updates persisted outputs (NOT a render trigger) |
| **useInstance** | Hook that creates a CloudDOM node representing an infrastructure resource |
| **Migration Map** | Mapping of old → new resource IDs to preserve identity during refactoring |
| **Backend Provider** | Storage mechanism for persisted state (e.g., S3, DynamoDB, local file) |
| **Cloud Provider** | Deployment mechanism that materializes CloudDOM to real infrastructure |

---

## 3. Requirement Categories

| Category | Description |
|----------|-------------|
| **Core** | Essential for POC / MVP |
| **Enhancement** | Improves DX and robustness |
| **Future** | Nice-to-have for production |

---

## 4. Version Control Policy

Requirements are versioned alongside CReact using semantic versioning (semver). Each requirement change triggers a version bump:
- **Major:** Breaking changes to core requirements
- **Minor:** New requirements or enhancements
- **Patch:** Clarifications or corrections

Requirement changes are tracked in version control with traceability to design and implementation changes.

---

## 5. State Persistence

CReact persists state to ensure reproducibility across build/deploy cycles:
- **File:** `.creact/state.json` (local backend) or remote backend (S3, DynamoDB)
- **Format:** JSON containing CloudDOM tree and outputs
- **Purpose:** Reconciliation on next build, output sharing between stacks
- **Verification:** Tests SHALL assert existence and structure of persisted state file

---

## 6. Traceability Matrix

| Requirement ID | Title / Goal | Design Element / Component | Verification / Evidence | Test ID |
|----------------|--------------|----------------------------|-------------------------|---------|
| REQ-01 | JSX → CloudDOM rendering | Renderer.ts, CloudDOMBuilder.ts, CLI build | Unit tests: JSX → Fiber → CloudDOM, CloudDOM JSON persisted to `.creact/clouddom.json` | T-01-A, T-01-B |
| REQ-02 | Stack Context (declarative outputs) | useState.ts, useStackContext.ts, StackContext.ts | Integration test using dummy backend provider: parent/child output sharing, depth-first resolution, state persisted to `.creact/state.json` | T-02-A, T-02-B |
| REQ-03 | Resource creation via hooks | useInstance.ts, CloudDOM schema | Unit test: useInstance creates CloudDOM node with hierarchical ID | T-03-A |
| REQ-04 | Providers (injection & async init) | ICloudProvider.ts, IBackendProvider.ts, DI in CReact.ts | Mock provider test: injected at runtime, async init lifecycle verified | T-04-A, T-04-B |
| REQ-05 | Deployment orchestration | CReact.deploy(), Reconciler.ts, CLI deploy.ts | Integration test: parent-before-child order, idempotent re-deploy with dummy provider | T-05-A, T-05-B |
| REQ-06 | Universal output access | (Future) CLI output.ts, backend provider | Functional test: retrieve outputs by key from backend storage | T-06-A |
| REQ-07 | Error handling & validation | Validator.ts, error reporting in CLI | Unit tests: missing props, duplicate IDs, invalid context, component stack traces | T-07-A, T-07-B, T-07-C |
| REQ-08 | Migration hooks | Reconciler.ts, migrationMap in config | Scenario test: refactor ID mapping preserved, no recreate, versioned in state | T-08-A, T-08-B |
| REQ-09 | Provider lifecycle hooks | ICloudProvider optional methods | E2E test: hooks triggered in order (preDeploy → materialize → postDeploy), logs structured JSON | T-09-A, T-09-B |
| REQ-10 | Async resource handling | CReact.deploy(), provider materialization | Async test: waits for parent outputs, enforces timeout, handles failures | T-10-A, T-10-B |
| REQ-11 | Component lifecycle callbacks | Component onDeploy, onStage hooks | Integration test: callbacks invoked at correct lifecycle stages with outputs | T-11-A, T-11-B |
| REQ-12 | useEffect hook | useEffect.ts, component lifecycle | Integration test: effect runs at mount, cleanup runs at unmount | T-12-A, T-12-B |
| REQ-NF-01 | Performance | CLI benchmarks, profiling | Benchmark: <10 resources build <2s, compare <1s | T-NF-01-A |
| REQ-NF-02 | Security | BackendProvider encryption, CLI redaction, KMS integration | Security test: redact secrets in logs, encrypted state file, environment isolation | T-NF-02-A, T-NF-02-B |
| REQ-NF-03 | Usability | CLI UX, error formatting, progress bars | CLI test: rich errors with file paths and line numbers, progress indicators for long operations | T-NF-03-A |

---

## 7. Functional Requirements

### REQ-01: JSX to CloudDOM

**Priority:** Core  
**Category:** Rendering

**User Story:** As a developer, I want to write infrastructure as JSX that renders to an immutable CloudDOM tree.

**Preconditions:** Given a valid JSX component tree with proper TypeScript types

#### Acceptance Criteria

1. WHEN I write JSX THEN the library SHALL render it to a CloudDOM tree at build-time
2. WHEN a component calls `useInstance(Construct, props)` THEN the library SHALL create a CloudDOM node
3. WHEN a resource component returns children THEN those children SHALL deploy after the parent
4. WHEN the component hierarchy changes THEN the library SHALL detect identity changes and fail
5. WHEN I provide a `key` prop THEN the library SHALL use it for stable identity
6. WHEN I run `creact build` THEN the system SHALL persist the CloudDOM tree to disk as JSON for debugging and determinism

### REQ-02: Stack Context (Declarative Outputs)

**Priority:** Core  
**Category:** State Management

**User Story:** As a developer, I want to declare component outputs that persist across build/deploy cycles and share them between components via Stack Context.

**Preconditions:** Given a component tree with StackContext.Provider ancestors

#### Acceptance Criteria

1. WHEN I call `useState(initialOutputs)` THEN the library SHALL declare the outputs this component will publish to the next render cycle
2. WHEN I call `setState(updates)` during build THEN the library SHALL update the output map for build-time enrichment
3. WHEN I call `setState(updates)` during deploy THEN the library SHALL update persisted outputs after provider materialization (e.g., queue URLs, ARNs)
4. WHEN I use `<StackContext.Provider value={state}>` THEN the library SHALL make outputs available to child components
5. WHEN I call `useStackContext()` THEN the library SHALL return outputs from the nearest StackContext.Provider using depth-first traversal
6. WHEN multiple providers exist THEN the library SHALL use the nearest ancestor provider
7. WHEN outputs are persisted THEN they SHALL be stored in `.creact/state.json` (local backend) or remote backend for reconciliation on the next build
8. WHEN I access context THEN it SHALL work for both local outputs (same stack) and remote outputs (other stacks)

**Verification:** Test ID T-02-A (context propagation), T-02-B (state persistence to `.creact/state.json`)

### REQ-03: Resource Creation

**Priority:** Core  
**Category:** Hooks

**User Story:** As a developer, I want to create infrastructure resources using hooks.

**Preconditions:** Given valid construct types and props

#### Acceptance Criteria

1. WHEN I call `useInstance(Construct, props)` THEN the library SHALL create a CloudDOM node and return a reference
2. WHEN I call `useInstance` THEN the library SHALL use the component hierarchy path as the resource ID
3. WHEN I create custom hooks THEN the library SHALL support composition of `useInstance` and `useStackContext`

### REQ-04: Providers

**Priority:** Core  
**Category:** Extensibility

**User Story:** As a cloud architect, I want pluggable providers so I can extend CReact to new platforms.

**Preconditions:** Given valid provider implementations that conform to interfaces

#### Acceptance Criteria

1. WHEN the library initializes THEN it SHALL use CDKTF + S3/DynamoDB by default
2. WHEN I implement `ICloudProvider` THEN the library SHALL accept it via dependency injection
3. WHEN I implement `IBackendProvider` THEN the library SHALL accept it via dependency injection
4. WHEN providers require initialization THEN they SHALL support async initialization for remote connections (AWS, Vault, etc.)

### REQ-05: Deployment

**Priority:** Core  
**Category:** Deployment

**User Story:** As a DevOps engineer, I want to deploy entire infrastructure as one app.

**Preconditions:** Given a valid CloudDOM tree and approved changes

#### Acceptance Criteria

1. WHEN I run `creact build` THEN the library SHALL render all JSX to CloudDOM
2. WHEN I run `creact compare` THEN the library SHALL diff CloudDOM and show changes
3. WHEN I run `creact deploy` THEN the library SHALL deploy in dependency order (parents before children)
4. WHEN I run `creact deploy` multiple times without changes THEN deployment SHALL be idempotent with no side effects

### REQ-06: Universal Output Access

**Priority:** Enhancement  
**Category:** Developer Experience

**User Story:** As a DevOps engineer, I want universal output access from any tool.

**Preconditions:** Given deployed infrastructure with outputs

#### Acceptance Criteria

1. WHEN I run `creact output <name>` THEN the library SHALL find the output across all stacks
2. WHEN external tools query outputs THEN they SHALL access via standard protocols (HTTP, AWS SDK)
3. WHEN I access outputs in TypeScript THEN they SHALL be type-safe to prevent stringly-typed usage

### REQ-07: Error Handling & Validation

**Priority:** Enhancement  
**Category:** Reliability

**User Story:** As a developer, I want early validation to catch errors before deployment.

**Preconditions:** Given a rendered Fiber tree

#### Acceptance Criteria

1. WHEN I build infrastructure THEN the library SHALL validate the Fiber tree before committing to CloudDOM
2. WHEN required props are missing THEN the library SHALL fail with a clear error message
3. WHEN useStackContext is called without a provider THEN the library SHALL fail with a clear error message
4. WHEN resource IDs are not unique THEN the library SHALL fail with a clear error message
5. WHEN validation fails THEN the library SHALL show the component stack trace
6. WHEN I run `creact compare` or `creact deploy` THEN validation SHALL occur automatically to prevent skipping

### REQ-08: Migration Hooks

**Priority:** Enhancement  
**Category:** Refactoring

**User Story:** As a developer, I want to refactor component hierarchy without recreating resources.

**Preconditions:** Given a CloudDOM tree with changed resource IDs

#### Acceptance Criteria

1. WHEN I provide a migration map THEN the library SHALL treat ID changes as updates instead of recreations
2. WHEN a resource ID changes THEN the library SHALL check the migration map before failing
3. WHEN a migration is applied THEN the library SHALL preserve resource state
4. WHEN I refactor without a migration map THEN the library SHALL fail with a clear error about ID changes
5. WHEN migration maps are used THEN they SHALL be versioned and stored in backend state for reproducibility

### REQ-09: Provider Lifecycle Hooks

**Priority:** Enhancement  
**Category:** Observability

**User Story:** As a platform engineer, I want lifecycle hooks for auditing, metrics, and error handling.

**Preconditions:** Given a provider with optional lifecycle hook implementations

#### Acceptance Criteria

1. WHEN a provider implements preDeploy THEN the library SHALL call it before deployment
2. WHEN a provider implements postDeploy THEN the library SHALL call it after deployment with outputs
3. WHEN a provider implements onError THEN the library SHALL call it when deployment fails
4. WHEN lifecycle hooks fail THEN the library SHALL halt deployment and report the error
5. WHEN lifecycle hooks execute THEN they SHALL log structured events (JSON) for auditing and external integration

### REQ-10: Async Resource Handling

**Priority:** Core  
**Category:** Deployment

**User Story:** As a developer, I want async resource resolution during deployment.

**Preconditions:** Given resources with async dependencies

#### Acceptance Criteria

1. WHEN I use useInstance THEN the library SHALL support async prop resolution
2. WHEN resources have dependencies THEN the library SHALL resolve them in deployment order
3. WHEN a parent deploys THEN the library SHALL wait for outputs before deploying children
4. WHEN async resolution fails THEN the library SHALL fail with a clear error message
5. WHEN async resources are deployed THEN each SHALL have a configurable timeout (default 5 minutes) to prevent indefinite hangs

### REQ-11: Component Lifecycle Callbacks

**Priority:** Enhancement  
**Category:** Observability

**User Story:** As a developer, I want lifecycle callbacks on components to run custom logic during deployment stages.

**Preconditions:** Given a component with lifecycle callback props

#### Acceptance Criteria

1. WHEN a component defines `onDeploy` callback THEN the library SHALL invoke it after the resource is deployed with outputs
2. WHEN a component defines `onStage` callback THEN the library SHALL invoke it during the staging phase before deployment
3. WHEN a component defines `onDestroy` callback THEN the library SHALL invoke it before the resource is destroyed
4. WHEN lifecycle callbacks fail THEN the library SHALL halt deployment and report the error with component context
5. WHEN lifecycle callbacks execute THEN they SHALL receive the resource outputs and CloudDOM node as parameters
6. WHEN lifecycle callbacks are async THEN the library SHALL await their completion before proceeding

**Example:**
```tsx
function Database() {
  const db = useInstance(RDSInstance, {
    name: 'app-db',
    onDeploy: async (outputs) => {
      console.log(`Database deployed: ${outputs.endpoint}`);
      await runMigrations(outputs.endpoint);
    },
    onStage: async (node) => {
      console.log(`Staging database: ${node.id}`);
      await validateSchema();
    },
    onDestroy: async (outputs) => {
      console.log(`Backing up database before destroy`);
      await backupDatabase(outputs.endpoint);
    }
  });
  return null;
}
```

**Verification:** Test ID T-11-A (callback invocation), T-11-B (callback error handling)

### REQ-12: useEffect Hook

**Priority:** Enhancement  
**Category:** Hooks

**User Story:** As a developer, I want to run setup and teardown logic when components are mounted and unmounted.

**Preconditions:** Given a component using useEffect

#### Acceptance Criteria

1. WHEN a component calls `useEffect(fn)` THEN the library SHALL execute the function once at first render
2. WHEN the effect function returns a cleanup function THEN the library SHALL execute it when the component is unmounted
3. WHEN a component is removed from the tree THEN the library SHALL invoke all cleanup functions before removal
4. WHEN effect functions are async THEN the library SHALL await their completion before proceeding
5. WHEN effect functions fail THEN the library SHALL halt deployment and report the error with component context
6. WHEN I provide a dependency array THEN the library SHALL only re-run effects when dependencies change (future enhancement)

**Example:**
```tsx
function QueueStack() {
  const queue = useInstance(SQSQueue, { name: 'messages' });
  const [state, setState] = useState({});
  
  // Setup: runs once at first render
  useEffect(() => {
    console.log('Component mounted, setting up...');
    
    // Async enrichment after deployment
    const enrichOutputs = async () => {
      const queueUrl = await queue.getUrl();
      setState(prev => ({ ...prev, queueUrl }));
    };
    enrichOutputs();
    
    // Cleanup: runs when component unmounts
    return () => {
      console.log('Component unmounting, cleaning up...');
    };
  });
  
  return <StackContext.Provider value={state} />;
}
```

**Verification:** Test ID T-12-A (effect execution), T-12-B (cleanup execution)

---

## 8. Non-Functional Requirements

### REQ-NF-01: Performance

**Priority:** Enhancement  
**Category:** Performance

#### Acceptance Criteria

1. WHEN I run `creact build` on a small stack (< 10 resources) THEN it SHALL complete under 2 seconds
2. WHEN I run `creact compare` THEN it SHALL complete under 1 second for typical diffs

### REQ-NF-02: Security

**Priority:** Core  
**Category:** Security

#### Acceptance Criteria

1. WHEN the CLI outputs logs THEN it SHALL redact secrets and sensitive values (passwords, tokens, keys, credentials)
2. WHEN state is stored THEN it SHALL support encryption at rest using KMS or equivalent key management
3. WHEN providers connect to remote services THEN they SHALL use secure protocols (HTTPS, TLS)
4. WHEN multiple environments exist THEN the library SHALL enforce environment isolation (dev/staging/prod)
5. WHEN secrets are managed THEN they SHALL integrate with secret management services (AWS Secrets Manager, Vault, etc.)

**Verification:** Test ID T-NF-02-A (secret redaction), T-NF-02-B (state encryption with KMS)

### REQ-NF-03: Usability

**Priority:** Enhancement  
**Category:** Developer Experience

#### Acceptance Criteria

1. WHEN validation fails THEN error messages SHALL include file paths and line numbers
2. WHEN I run CLI commands THEN they SHALL provide progress indicators for long operations
3. WHEN deployment fails THEN the CLI SHALL suggest remediation steps

---

## 9. Usage Example

```tsx
// Registry stack - declares outputs and provides via StackContext
function RegistryStack({ children }) {
  const repo = useInstance(EcrRepository, { name: 'my-app' });
  
  // Declare outputs (NOT reactive state - this is declarative binding)
  const [state, setState] = useState({
    repositoryUrl: repo.repositoryUrl,
    repositoryArn: repo.arn
  });
  
  // Optional: Enrich outputs after async materialization
  useEffect(async () => {
    // After deploy, provider may resolve actual URLs/ARNs
    const actualUrl = await repo.getUrl();
    setState(prev => ({ ...prev, repositoryUrl: actualUrl }));
  }, [repo]);
  
  return (
    <StackContext.Provider value={state}>
      {children}
    </StackContext.Provider>
  );
}

// Service - consumes outputs via useStackContext
function Service({ name }) {
  const { repositoryUrl } = useStackContext(); // Access parent's outputs
  
  const service = useInstance(AppRunnerService, {
    name,
    imageRepository: {
      imageIdentifier: `${repositoryUrl}:latest`
    }
  });
  
  return null;
}

// Infrastructure tree
export default function Infrastructure() {
  return (
    <CReact environment="production">
      <RegistryStack>
        <Service name="api" />
        <Service name="worker" />
      </RegistryStack>
    </CReact>
  );
}
```

**How it works:**
- `useState()` declares outputs (NOT reactive state like React)
- `setState()` updates the output map persisted after build/deploy (NOT a render trigger)
- Outputs are persisted to backend (S3, DynamoDB, etc.) for reproducibility
- On next build, CReact merges persisted outputs into state context
- `setState()` during deploy patches in async resources (queue URLs, ARNs)
- Outputs are provided to children via `<StackContext.Provider value={state}>`
- `Service` components access outputs via `useStackContext()`
- Outputs are automatically available as remote state for other stacks
- Deployment order: Registry → API → Worker (automatic from nesting)

**Key Difference from React:**
- React: `setState()` → triggers re-render in memory
- CReact: `setState()` → updates persisted outputs for next cycle
- React: Data flow = Parent → Child reactivity
- CReact: Data flow = Stack → Provider → State snapshot
- React: Goal = sync UI with user interaction
- CReact: Goal = sync declared infra with real world

---

## 10. CLI Commands

```bash
creact validate  # Validate JSX → Fiber tree without committing
creact build     # Render JSX → CloudDOM (with validation)
creact compare   # Diff CloudDOM, show changes
creact deploy    # Deploy in dependency order (requires approval)
creact output repositoryUrl  # Get output value from backend
```

---

## 11. Verification Deliverables

| Test ID | Requirement | Test Type | Description | Expected Outcome |
|---------|-------------|-----------|-------------|------------------|
| T-01-A | REQ-01 | Unit | JSX → Fiber → CloudDOM transformation | CloudDOM tree matches expected structure |
| T-01-B | REQ-01 | Integration | CloudDOM persistence to `.creact/clouddom.json` | File exists with valid JSON |
| T-02-A | REQ-02 | Integration | Context propagation depth-first | Child receives parent outputs |
| T-02-B | REQ-02 | Integration | State persistence to `.creact/state.json` | File exists with outputs |
| T-03-A | REQ-03 | Unit | useInstance creates CloudDOM node | Node has correct ID and props |
| T-04-A | REQ-04 | Unit | Provider dependency injection | Providers injected via constructor |
| T-04-B | REQ-04 | Integration | Async provider initialization | initialize() called before use |
| T-05-A | REQ-05 | Integration | Deployment order (parent-before-child) | Parents deploy first |
| T-05-B | REQ-05 | Integration | Idempotent deployment | No changes = no side effects |
| T-06-A | REQ-06 | Functional | Output retrieval from backend | Correct value returned |
| T-07-A | REQ-07 | Unit | Validation: missing props | Clear error with component stack |
| T-07-B | REQ-07 | Unit | Validation: duplicate IDs | Error identifies duplicates |
| T-07-C | REQ-07 | Unit | Validation: invalid context | Error shows missing provider |
| T-08-A | REQ-08 | Scenario | Migration map preserves identity | ID change = UPDATE not DELETE+CREATE |
| T-08-B | REQ-08 | Integration | Migration map versioning | Version stored in state |
| T-09-A | REQ-09 | E2E | Lifecycle hook sequence | preDeploy → materialize → postDeploy |
| T-09-B | REQ-09 | E2E | Structured JSON logging | Logs contain timestamp, event, status |
| T-10-A | REQ-10 | Async | Parent output resolution | Child waits for parent |
| T-10-B | REQ-10 | Async | Timeout enforcement | Fails after configured timeout |
| T-11-A | REQ-11 | Integration | Component callback invocation | onDeploy/onStage called with outputs |
| T-11-B | REQ-11 | Integration | Component callback error handling | Deployment halts on callback failure |
| T-12-A | REQ-12 | Integration | useEffect execution at mount | Effect function runs once at first render |
| T-12-B | REQ-12 | Integration | useEffect cleanup at unmount | Cleanup function runs when component unmounts |
| T-NF-01-A | REQ-NF-01 | Performance | Build/compare benchmarks | <2s build, <1s compare for <10 resources |
| T-NF-02-A | REQ-NF-02 | Security | Secret redaction in logs | Secrets replaced with ***REDACTED*** |
| T-NF-02-B | REQ-NF-02 | Security | State encryption with KMS | State file encrypted at rest |
| T-NF-03-A | REQ-NF-03 | Usability | Error messages with file paths | Errors show file:line:column |

---

## 12. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.9 | 2025-10-05 | CReact Team | Initial POC baseline with declarative output semantics |

---

**End of Requirements Specification**
