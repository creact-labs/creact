# CReact Requirements

## What is CReact?

CReact renders JSX to cloud infrastructure. Like React renders to DOM, CReact renders to CloudDOM. Component nesting expresses deployment order.

**Core Idea:** Infrastructure is React without the runtime loop. You render once, review the diff, approve, deploy.

## Document Version

**Version:** v0.9 (POC Baseline)  
**Date:** October 2025  
**Status:** Draft / POC in progress

## Requirement Categories

- **Core:** Essential for POC and MVP
- **Enhancement:** Improves DX and robustness
- **Future:** Nice-to-have for production readiness

## Traceability Matrix

| Requirement ID | Title / Goal | Design Element / Component | Verification / Evidence |
|----------------|--------------|----------------------------|-------------------------|
| REQ-01 | JSX → CloudDOM rendering | Renderer.ts, CloudDOMBuilder.ts, CLI build | Unit tests: JSX → Fiber → CloudDOM, CloudDOM JSON persisted |
| REQ-02 | Stack Context (state & outputs) | useState.ts, useStackContext.ts, StackContext.ts | Integration test: parent/child output sharing, depth-first resolution |
| REQ-03 | Resource creation via hooks | useInstance.ts, CloudDOM schema | Unit test: useInstance creates CloudDOM node with hierarchical ID |
| REQ-04 | Providers (injection & async init) | ICloudProvider.ts, IBackendProvider.ts, DI in CReact.ts | Mock provider test: injected at runtime, async init lifecycle |
| REQ-05 | Deployment orchestration | CReact.deploy(), Reconciler.ts, CLI deploy.ts | Integration test: parent-before-child order, idempotent re-deploy |
| REQ-06 | Universal output access | (Future) CLI output.ts, backend provider | Functional test: retrieve outputs by key from backend |
| REQ-07 | Error handling & validation | Validator.ts, error reporting in CLI | Unit tests: missing props, duplicate IDs, invalid context |
| REQ-08 | Migration hooks | Reconciler.ts, migrationMap in config | Scenario test: refactor ID mapping preserved, no recreate |
| REQ-09 | Provider lifecycle hooks | ICloudProvider optional methods | E2E test: hooks triggered in order, logs structured JSON |
| REQ-10 | Async resource handling | CReact.deploy(), provider materialization | Async test: waits for parent outputs, enforces timeout |
| REQ-NF-01 | Performance | CLI benchmarks, profiling | Benchmark: <10 resources build <2s, compare <1s |
| REQ-NF-02 | Security | BackendProvider encryption, CLI redaction | Security test: redact secrets, encrypted state file |
| REQ-NF-03 | Usability | CLI UX, error formatting, progress bars | CLI test: rich errors with file paths, progress indicators |

## Functional Requirements

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

### REQ-02: Stack Context (State & Outputs)

**Priority:** Core  
**Category:** State Management

**User Story:** As a developer, I want to use Stack Context with state to share outputs between components, similar to React Context.

**Preconditions:** Given a component tree with StackContext.Provider ancestors

#### Acceptance Criteria

1. WHEN I call `useState(initialValue)` THEN the library SHALL create local state for the component
2. WHEN I use `<StackContext.Provider value={state}>` THEN the library SHALL make state/outputs available to child components
3. WHEN I call `useStackContext()` THEN the library SHALL return state from the nearest StackContext.Provider using depth-first traversal
4. WHEN multiple providers exist THEN the library SHALL use the nearest ancestor provider
5. WHEN state is provided THEN it SHALL automatically become available as remote state for other stacks
6. WHEN I access context THEN it SHALL work for both local state (same stack) and remote state (other stacks)

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

## Non-Functional Requirements

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

1. WHEN the CLI outputs logs THEN it SHALL redact secrets and sensitive values
2. WHEN state is stored THEN it SHALL support encryption at rest
3. WHEN providers connect to remote services THEN they SHALL use secure protocols (HTTPS, TLS)

### REQ-NF-03: Usability

**Priority:** Enhancement  
**Category:** Developer Experience

#### Acceptance Criteria

1. WHEN validation fails THEN error messages SHALL include file paths and line numbers
2. WHEN I run CLI commands THEN they SHALL provide progress indicators for long operations
3. WHEN deployment fails THEN the CLI SHALL suggest remediation steps

## Usage Example

```tsx
// Registry stack - creates state and provides via StackContext
function RegistryStack({ children }) {
  const repo = useInstance(EcrRepository, { name: 'my-app' });
  
  // Create state (like React useState)
  const [state, setState] = useState({
    repositoryUrl: repo.repositoryUrl,
    repositoryArn: repo.arn
  });
  
  return (
    <StackContext.Provider value={state}>
      {children}
    </StackContext.Provider>
  );
}

// Service - consumes state via useStackContext
function Service({ name }) {
  const { repositoryUrl } = useStackContext(); // Access parent's state
  
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
- `RegistryStack` creates ECR repo and state with `useState`
- State is provided to children via `<StackContext.Provider value={state}>`
- `Service` components access state via `useStackContext()`
- State is automatically available as remote state for other stacks
- Deployment order: Registry → API → Worker (automatic from nesting)

## CLI

```bash
creact build    # Render JSX → CloudDOM
creact compare  # Diff CloudDOM, show changes
creact deploy   # Deploy in dependency order
creact output repositoryUrl  # Get output value
```
