  # CReact Design (POC)

  ## Core Analogy

  CReact is React for infrastructure. Same concepts, different target.

  | React | CReact | Purpose |
  |-------|--------|---------|
  | JSX → DOM | JSX → CloudDOM | Declarative definition |
  | `useState()` | `useState()` | Manage component state/outputs |
  | `useContext()` | `useStackContext()` | Share stack state |
  | `ReactDOM.render()` | `creact build` | Build phase |
  | Reconciler diff | `creact compare` | Show changes |
  | Auto-apply | `creact deploy` (manual) | User approval required |

  **Key difference:** Infrastructure changes are high-risk, require approval.

  ## Design Principles

  ### 1. Dependency Injection (CORE PATTERN)

  **All provider implementations are injected, not inherited.**

  ```typescript
  // ✅ CORRECT: Dependency injection
  const cloudProvider = new DummyCloudProvider();
  const creact = new CReact({ cloudProvider, backendProvider });

  // ❌ WRONG: Inheritance
  class MyCReact extends CReact {}
  ```

  **Why?**
  - Swappable implementations (dummy for testing, real for production)
  - No tight coupling
  - Testable (inject mocks)
  - Follows SOLID principles

  ### 2. Interface-Based Design

  ```typescript
  interface ICloudProvider {
    materialize(cloudDOM: CloudDOMNode[], scope: any): void;
  }

  // Multiple implementations
  class DummyCloudProvider implements ICloudProvider { /* logs CloudDOM */ }
  class CDKTFProvider implements ICloudProvider { /* generates Terraform */ }
  ```

  ### 3. Composition Over Inheritance

  ```typescript
  class CReact {
    constructor(private config: {
      cloudProvider: ICloudProvider;
      backendProvider: IBackendProvider;
    }) {}
  }
  ```

  ## Core Components Overview

  | Component | Responsibility | Input | Output | Implements |
  |-----------|---------------|-------|--------|------------|
  | **Renderer** | Build Fiber tree | JSX | Fiber | REQ-01 |
  | **Validator** | Enforce schema & uniqueness | Fiber | Valid Fiber | REQ-07 |
  | **CloudDOMBuilder** | Build deployment tree | Fiber | CloudDOM | REQ-01, REQ-05 |
  | **Reconciler** | Diff state changes | Prev + New CloudDOM | Diff | REQ-05, REQ-08 |
  | **CReact** | Orchestrates pipeline | Config + JSX | Deploys infra | REQ-01 → REQ-10 |

  ## Component ↔ Requirement Mapping

  | Design Component | Implements / Supports |
  |------------------|----------------------|
  | **Renderer.ts** | REQ-01 |
  | **CloudDOMBuilder.ts** | REQ-01, REQ-05 |
  | **Validator.ts** | REQ-07 |
  | **Reconciler.ts** | REQ-05, REQ-08 |
  | **useState.ts** | REQ-02 |
  | **useStackContext.ts** | REQ-02 |
  | **useInstance.ts** | REQ-03 |
  | **ICloudProvider.ts** | REQ-04, REQ-09 |
  | **IBackendProvider.ts** | REQ-04, REQ-05, REQ-06 |
  | **CReact.ts** | REQ-01 → REQ-10 (orchestrates all) |
  | **DummyCloudProvider.ts** | REQ-04 (test), REQ-09 |
  | **DummyBackendProvider.ts** | REQ-04, REQ-06 (test) |
  | **CLI (build, compare, deploy)** | REQ-01, REQ-05, REQ-07, REQ-NF-03 |
  | **Logging subsystem** | REQ-09.5 |

  ## Architecture

  ```mermaid
  graph TD
      JSX[JSX Components] -->|creact build| Render[Render Phase]
      Render --> ValidateCommit[Validate & Commit]
      ValidateCommit --> CloudDOM[CloudDOM Tree]
      CloudDOM -->|creact compare| Reconcile[Reconciliation]
      Reconcile --> Diff[Diff]
      Diff -->|User Reviews| Approve{Approve?}
      Approve -->|Yes - creact deploy| Deploy[Deploy to Cloud]
      Approve -->|No| Stop[Stop]
  ```

  ## CReact Lifecycle

  ### Phase 1 — Render (JSX → Fiber)

  **Input:** JSX components  
  **Output:** Fiber tree (includes ALL components)

  ```typescript
  // Fiber Node structure
  {
    type: RegistryStack,
    props: { children: [...] },
    path: ['registry'],
    children: [
      {
        type: Service,
        props: { name: 'api' },
        path: ['registry', 'service'],
        children: []
      }
    ]
  }
  ```

  **Key:** Fiber includes containers + resources

  ### Phase 2 — Commit (Fiber → CloudDOM)

  **Input:** Fiber tree  
  **Output:** CloudDOM tree (only `useInstance` calls)

  ```typescript
  // CloudDOM Node structure
  {
    id: 'registry.service',
    path: ['registry', 'service'],
    construct: AppRunnerService,
    props: { name: 'api', image: '...' },
    children: [],
    outputs: { endpoint: '...' }
  }
  ```

  **Key:** Container components (no `useInstance`) are filtered out

  **Validation (REQ-07):** Before commit, validate:
  - Required props present
  - Context available when `useStackContext` called
  - Resource IDs unique
  - No circular dependencies

  ### Phase 3 — Reconciliation (Diff CloudDOM)

  **Input:** Previous + Current CloudDOM  
  **Output:** Diff (creates, updates, deletes)

  ```mermaid
  graph TD
      Compare[Compare by ID] --> NewID{ID in current only?}
      NewID -->|Yes| Create[CREATE]
      Compare --> OldID{ID in previous only?}
      OldID -->|Yes| Delete[DELETE]
      Compare --> BothID{ID in both?}
      BothID -->|Props changed| Update[UPDATE]
      BothID -->|Props same| NoChange[No Change]
      Compare --> MovedID{Same resource, different ID?}
      MovedID -->|Yes| CheckMigration{Migration map?}
      CheckMigration -->|Yes| Update
      CheckMigration -->|No| Error[ERROR]
  ```

  **Scenarios:**
  - Add child: CREATE
  - Remove child: DELETE
  - Update props: UPDATE
  - Move child (no migration map): ERROR
  - Move child (with migration map): UPDATE

  ## Migration Hooks (REQ-08)

  **Problem:** Refactoring changes resource IDs → recreation

  **Solution:** Migration map

  ```typescript
  const migrationMap = {
    'storage.service': 'registry.service'  // Old ID → New ID
  };

  const creact = new CReact({
    cloudProvider,
    backendProvider,
    migrationMap  // Treats ID change as UPDATE, not DELETE+CREATE
  });
  ```

  **Versioning (REQ-08.5):** Migration maps are versioned and stored in backend state for reproducibility.

  ## Hooks

  ### useState

  ```typescript
  function RegistryStack({ children }) {
    const repo = useInstance(EcrRepository, { name: 'app' });
    
    const [state] = useState({
      repositoryUrl: repo.repositoryUrl
    });
    
    return <StackContext.Provider value={state}>{children}</StackContext.Provider>;
  }
  ```

  **Purpose:** Manage component state (outputs)  
  **Key difference:** Build-time only (no reactivity)

  ### useStackContext

  ```typescript
  function Service() {
    const { repositoryUrl } = useStackContext();  // Access parent's state
    
    const service = useInstance(AppRunnerService, {
      image: `${repositoryUrl}:latest`
    });
    
    return null;
  }
  ```

  **Purpose:** Access parent's state (avoid prop drilling)  
  **Resolution:** Depth-first traversal to nearest Provider (REQ-02.3)

  ### useInstance

  ```typescript
  function Registry() {
    const repo = useInstance(EcrRepository, { name: 'app' });  // Creates CloudDOM node
    return null;
  }
  ```

  **Purpose:** Create infrastructure resource  
  **ID generation:** Uses component hierarchy path (e.g., `['registry', 'service']` → `'registry.service'`)

  ### Custom Hooks

  ```typescript
  function useDatabase() {
    const { vpcId } = useStackContext();
    return useInstance(Database, { vpcId });
  }
  ```

  **Purpose:** Reusable infrastructure logic with best practices

  ## Deployment Order

  **Rule:** Parents deploy before children

  ```
  Registry
  ├── ServiceA
  └── ServiceB

  Deployment Order:
  1. Registry (no parent)
  2. ServiceA (parent: Registry)
  3. ServiceB (parent: Registry)
  ```

  ## Providers (Dependency Injection)

  ### ICloudProvider

  ```typescript
  interface ICloudProvider {
    initialize?(): Promise<void>;  // Optional async init (REQ-04.4)
    materialize(cloudDOM: CloudDOMNode[], scope: any): void;
    
    // Lifecycle hooks (optional) (REQ-09)
    preDeploy?(cloudDOM: CloudDOMNode[]): Promise<void>;
    postDeploy?(cloudDOM: CloudDOMNode[], outputs: any): Promise<void>;
    onError?(error: Error, cloudDOM: CloudDOMNode[]): Promise<void>;
  }
  ```

  **Implementations:**
  - `DummyCloudProvider` - Logs CloudDOM (POC/testing)
  - `CDKTFProvider` - Generates Terraform (production)

  ### IBackendProvider

  ```typescript
  interface IBackendProvider {
    initialize?(): Promise<void>;  // Optional async init (REQ-04.4)
    getState(stackName: string): Promise<any>;
    saveState(stackName: string, state: any): Promise<void>;
  }
  ```

  **Implementations:**
  - `DummyBackendProvider` - In-memory storage (POC/testing)
  - `S3BackendProvider` - S3 + DynamoDB (production)

  ### Injection Flow

  ```typescript
  // Step 1: Instantiate providers
  const cloudProvider = new DummyCloudProvider();
  const backendProvider = new DummyBackendProvider();

  // Step 2: Initialize if needed (async)
  await cloudProvider.initialize?.();
  await backendProvider.initialize?.();

  // Step 3: Inject into CReact
  const creact = new CReact({
    cloudProvider,
    backendProvider
  });

  // Step 4: Use orchestrator
  await creact.build(<App />);
  await creact.deploy(cloudDOM);
  ```

  ## Package Structure

  ```
  lib/creact/
  ├── core/
  │   ├── Renderer.ts           # JSX → Fiber
  │   ├── Validator.ts          # Validate Fiber (REQ-07)
  │   ├── CloudDOMBuilder.ts    # Fiber → CloudDOM (receives ICloudProvider)
  │   ├── Reconciler.ts         # Diff CloudDOM
  │   └── CReact.ts             # Main orchestrator (receives providers)
  ├── providers/
  │   ├── ICloudProvider.ts     # Interface
  │   ├── IBackendProvider.ts   # Interface
  │   ├── DummyCloudProvider.ts # POC implementation
  │   └── DummyBackendProvider.ts # POC implementation
  ├── hooks/
  │   ├── useState.ts
  │   ├── useStackContext.ts
  │   └── useInstance.ts
  ├── context/
  │   └── StackContext.ts
  └── cli/
      ├── build.ts
      ├── compare.ts
      └── deploy.ts
  ```

  ## CReact Orchestrator

  ```typescript
  interface CReactConfig {
    cloudProvider: ICloudProvider;
    backendProvider: IBackendProvider;
    migrationMap?: Record<string, string>;  // Optional (REQ-08)
    asyncTimeout?: number;  // Default 5 minutes (REQ-10.5)
  }

  class CReact {
    private renderer: Renderer;
    private validator: Validator;
    private cloudDOMBuilder: CloudDOMBuilder;
    private reconciler: Reconciler;
    
    constructor(private config: CReactConfig) {
      this.renderer = new Renderer();
      this.validator = new Validator();
      this.cloudDOMBuilder = new CloudDOMBuilder(config.cloudProvider);
      this.reconciler = new Reconciler(config.migrationMap);
    }
    
    async build(jsx: JSX.Element): Promise<CloudDOMNode[]> {
      // 1. Render JSX → Fiber
      const fiber = this.renderer.render(jsx);
      
      // 2. Validate Fiber (REQ-07)
      this.validator.validate(fiber);
      
      // 3. Commit Fiber → CloudDOM
      const cloudDOM = this.cloudDOMBuilder.build(fiber);
      
      // 4. Persist CloudDOM (REQ-01.6)
      await this.persistCloudDOM(cloudDOM);
      
      return cloudDOM;
    }
    
    async compare(previous: CloudDOMNode[], current: CloudDOMNode[]) {
      // Validate before comparing (REQ-07.6)
      this.validator.validate(this.renderer.getCurrentFiber());
      
      return this.reconciler.diff(previous, current);
    }
    
    async deploy(cloudDOM: CloudDOMNode[]) {
      // Validate before deploying (REQ-07.6)
      this.validator.validate(this.renderer.getCurrentFiber());
      
      // Check for changes (idempotent) (REQ-05.4)
      const previousState = await this.config.backendProvider.getState('stack');
      const diff = this.reconciler.diff(previousState?.cloudDOM || [], cloudDOM);
      
      if (diff.creates.length === 0 && diff.updates.length === 0 && diff.deletes.length === 0) {
        console.log('No changes detected. Deployment skipped.');
        return;
      }
      
      // Lifecycle: preDeploy (REQ-09.1)
      if (this.config.cloudProvider.preDeploy) {
        await this.config.cloudProvider.preDeploy(cloudDOM);
      }
      
      // Materialize
      this.config.cloudProvider.materialize(cloudDOM);
      
      // Collect outputs from materialization
      const outputs = {};  // TODO: collect from provider materialization
      
      // Save state
      await this.config.backendProvider.saveState('stack', { cloudDOM });
      
      // Lifecycle: postDeploy (REQ-09.2)
      if (this.config.cloudProvider.postDeploy) {
        await this.config.cloudProvider.postDeploy(cloudDOM, outputs);
      }
    }
  }
  ```

  ## Async Resource Handling (REQ-10)

  **Problem:** Infrastructure provisioning is async

  **Solution:**
  - Build phase: Synchronous (JSX → CloudDOM)
  - Deploy phase: Async (CloudDOM → Infrastructure)
  - Parent outputs resolved before children deploy (REQ-10.3)
  - Configurable timeout per resource (default 5 minutes) (REQ-10.5)

  ```typescript
  // Timeout configuration
  const creact = new CReact({
    cloudProvider,
    backendProvider,
    asyncTimeout: 300000  // 5 minutes
  });
  ```

  ## CLI Workflow

  ### Commands

  ```bash
  creact validate  # Validate JSX → Fiber tree without committing
  creact build     # Render JSX → CloudDOM (with validation)
  creact compare   # Diff CloudDOM and show changes
  creact deploy    # Deploy infrastructure (requires approval)
  ```

  ### Sequence Diagram

  ```mermaid
  sequenceDiagram
      participant User
      participant CLI
      participant CReact
      participant Provider
      
      User->>CLI: creact build
      CLI->>CReact: build(jsx)
      CReact->>CReact: render → validate → commit
      CReact-->>CLI: CloudDOM
      CLI-->>User: CloudDOM saved
      
      User->>CLI: creact compare
      CLI->>CReact: compare(previous, current)
      CReact-->>CLI: Diff
      CLI-->>User: Show diff for review
      
      User->>CLI: creact deploy
      CLI->>Provider: preDeploy(cloudDOM)
      CLI->>Provider: materialize(cloudDOM)
      CLI->>Provider: postDeploy(cloudDOM, outputs)
      CLI-->>User: Deployment complete
  ```

  ### Example Run

  ```bash
  $ creact build
  ✔ Built CloudDOM (3 resources)

  $ creact compare
  Δ Service.api updated
  + Service.worker added
  Review diff before deploying.

  $ creact deploy
  ✔ Deployment complete (2m 14s)
  ```

  ## Error Handling & Validation (REQ-07)

  **Validation checks:**
  - Required props present
  - Context available when `useStackContext` called
  - Resource IDs unique
  - No circular dependencies

  **Example error (REQ-NF-03.1):**
  ```
  ValidationError: Missing required prop 'name' in Service component
    at infrastructure.tsx:15
    in Service
    in Registry

  Suggestion: Add the 'name' prop to the Service component
  ```

  ## Non-Functional Goals (POC)

  ### Performance (REQ-NF-01)
  - Build small stacks (<10 resources) in <2s
  - Compare operations in <1s

  ### Security (REQ-NF-02)
  - Redact secrets in CLI output
  - Encrypt state at rest
  - Use HTTPS/TLS for remote connections

  ### Usability (REQ-NF-03)
  - Show file paths and line numbers in errors
  - Provide progress indicators for long operations
  - Suggest remediation steps on failure

  ### Logging
  - CLI and providers SHALL emit timestamped logs with levels (info/warn/error)
  - Structured JSON logging for lifecycle hooks (REQ-09.5)
  - Logs help debugging during POC demos

  ## Key Insights

  - 🌳 **Composition:** Infrastructure mirrors UI patterns (parent-child, state sharing, reusable components)
  - ⚙️ **Stack Context:** Enables cross-stack sharing, avoids prop drilling
  - 📦 **useState for outputs:** Component state = infrastructure outputs
  - 🔐 **Approval:** Infrastructure diffs require manual confirmation (high-risk changes)
  - 🔑 **Immutable IDs:** Path-based identity tracking with migration hooks for safe refactoring
  - 💉 **Dependency Injection:** Swappable providers, testable, no tight coupling
  - 📋 **Declarative Reconciliation:** Like Terraform plan/apply or GitOps model

  ## POC Implementation Plan

  | Phase | Deliverable | Status |
  |-------|-------------|--------|
  | 1. Renderer | JSX → Fiber | 🚧 |
  | 2. Validator | Fiber validation | 🚧 |
  | 3. CloudDOM Builder | Fiber → CloudDOM | 🚧 |
  | 4. Hooks | useState, useInstance, useStackContext | 🚧 |
  | 5. Stack Context | Provider + Consumer | 🚧 |
  | 6. Reconciler | Diff logic with migration hooks | 🚧 |
  | 7. Providers | Dummy implementations for POC | 🚧 |
  | 8. CLI | build, validate, compare, deploy commands | 🚧 |

  ## Next Steps Beyond POC

  Once the POC demonstrates core value, these enhancements will make CReact production-ready:

  1. **Production Providers**
     - Replace Dummy providers with CDKTFProvider and S3BackendProvider
     - Add support for multiple cloud platforms (AWS, Azure, GCP)

  2. **CLI UX Polish**
     - Add progress bars and colors
     - Interactive diff review with approval prompts
     - Better error formatting with syntax highlighting

  3. **Security & Compliance**
     - State encryption with KMS
     - Policy enforcement (cost limits, security rules)
     - Audit logging for compliance

  4. **CI/CD Integration**
     - Exit codes for automation
     - JSON output mode for parsing
     - Webhook notifications

  5. **Performance Optimization**
     - Benchmark large-stack performance (100+ resources)
     - Parallel resource deployment where possible
     - Caching and incremental builds

  6. **Developer Experience**
     - VS Code extension with IntelliSense
     - Type-safe output access
     - Component library for common patterns

  ## Glossary

  | Term | Definition |
  |------|------------|
  | **Fiber** | Intermediate representation of JSX tree before deployment |
  | **CloudDOM** | Immutable tree describing actual cloud resources |
  | **Migration Map** | Maps old → new resource IDs to preserve identity during refactoring |
  | **Stack Context** | React-like context for sharing outputs between components |
  | **useInstance** | Hook that creates a CloudDOM node (infrastructure resource) |

  ---

  ## Verification Approach

  | Testing Level | Focus | Example Scenario |
  |---------------|-------|------------------|
  | **Unit Tests** | Renderer, Validator, Hooks | `useInstance` → CloudDOM node creation, prop validation |
  | **Integration Tests** | Provider orchestration, context propagation | Multi-stack JSX tree with StackContext sharing |
  | **E2E Tests (CLI)** | Build → Compare → Deploy lifecycle | Simulate full workflow with Dummy providers |
  | **Performance Tests** | Build speed, diff latency | Measure CLI timing for <10 resources |
  | **Security Tests** | Log redaction, encrypted state | Verify secrets masked in logs, JSON state encrypted |
  | **Usability Tests** | CLI UX and errors | Validate rich error messages and CLI outputs |
  | **Mock Provider Tests** | Lifecycle hooks, async init | Assert correct sequence: preDeploy → materialize → postDeploy |

  ## Implementation Recommendations

  1. **Version the REQ list** — Tag as v0.9 for POC baseline
  2. **Add traceability IDs in code** — Use comments like `// REQ-07` for cross-reference
  3. **Automate REQ coverage** — Script that scans code comments for REQ tags
  4. **Keep Dummy Providers** — Allow CI validation without cloud account
  5. **Code review checklist** — Verify each PR references relevant REQ-XX

  ---

  **Author:** CReact POC Team  
  **Date:** October 2025  
  **Status:** Draft / POC in progress  
  **Version:** v0.9 (POC Baseline)
