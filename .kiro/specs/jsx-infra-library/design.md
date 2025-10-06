  # CReact Design (POC)

  ## Core Analogy

  CReact is React for infrastructure. Same concepts, different semantics.

  | Concept | React | CReact | Purpose |
  |---------|-------|--------|---------|
  | JSX | JSX → DOM | JSX → CloudDOM | Declarative definition |
  | `useState()` | Initialize local state | Declare initial outputs | State vs Output declaration |
  | `setState()` | Triggers re-render | Updates output map persisted after build/deploy | Reactivity vs Persistence |
  | `useContext()` | Share state | `useStackContext()` - Share outputs | Context sharing |
  | Runtime model | Continuous loop | One-shot render (build, diff, deploy) | Execution model |
  | Persistence | In memory | To backend (S3, DynamoDB, etc.) | State storage |
  | `ReactDOM.render()` | Render to DOM | `creact build` | Build phase |
  | Reconciler diff | Virtual DOM diff | `creact compare` | Show changes |
  | Auto-apply | Immediate | `creact deploy` (manual) | User approval required |

  **Key differences:**
  - Infrastructure changes are high-risk, require approval
  - `useState()` does NOT mean "update state at runtime" - it means "declare the outputs this component will publish to the next render cycle"
  - `setState()` is NOT a reactive updater like React - it's a declarative binder that tells CReact what to persist in the state snapshot
  - State is persisted to backend for reproducibility, not kept in memory

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
  | **Renderer.ts** | REQ-01 (JSX → CloudDOM rendering) |
  | **CloudDOMBuilder.ts** | REQ-01 (CloudDOM building), REQ-05 (Deployment orchestration) |
  | **Validator.ts** | REQ-07 (Error handling & validation) |
  | **Reconciler.ts** | REQ-05 (Deployment orchestration), REQ-08 (Migration hooks) |
  | **useState.ts** | REQ-02 (Stack Context - declarative outputs) |
  | **createContext.ts** | REQ-02 (Stack Context - context creation) |
  | **useContext.ts** | REQ-02 (Stack Context - context consumption) |
  | **useInstance.ts** | REQ-03 (Resource creation via hooks) |
  | **useEffect.ts** | REQ-12 (useEffect hook - setup/teardown) |
  | **ICloudProvider.ts** | REQ-04 (Providers), REQ-09 (Provider lifecycle hooks), REQ-11 (Component lifecycle callbacks) |
  | **IBackendProvider.ts** | REQ-04 (Providers), REQ-05 (Deployment), REQ-06 (Universal output access) |
  | **CReact.ts** | REQ-01 → REQ-12 (orchestrates all functional requirements) |
  | **DummyCloudProvider.ts** | REQ-04 (Providers - test impl), REQ-09 (Lifecycle hooks - test impl) |
  | **DummyBackendProvider.ts** | REQ-04 (Providers - test impl), REQ-06 (Output access - test impl) |
  | **CLI (build, compare, deploy)** | REQ-01 (Build), REQ-05 (Deploy), REQ-07 (Validation), REQ-NF-03 (Usability) |
  | **SecretRedactor.ts** | REQ-NF-02 (Security - secret redaction) |
  | **Logging subsystem** | REQ-09 (Structured JSON logging), REQ-NF-03 (Usability) |
  | **Component callbacks** | REQ-11 (onDeploy, onStage, onDestroy callbacks) |

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

  ### Phase 1 — Render (JSX → Fiber) [REQ-01]

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

  ### Phase 2 — Commit (Fiber → CloudDOM) [REQ-01]

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

  ### Phase 3 — Reconciliation (Diff CloudDOM) [REQ-05, REQ-08]

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

  ## JSX Support [REQ-03]

  ### Overview

  CReact uses JSX syntax for declaring infrastructure, just like React uses JSX for UI. TypeScript transforms JSX into function calls that create element objects.

  ### JSX Transformation

  **TypeScript Configuration:**

  ```json
  // tsconfig.json
  {
    "compilerOptions": {
      "jsx": "react",
      "jsxFactory": "CReact.createElement",
      "jsxFragmentFactory": "CReact.Fragment"
    }
  }
  ```

  **JSX Syntax:**
  ```tsx
  // What you write
  <Database name="app-db" />
  
  // What TypeScript generates
  CReact.createElement(Database, { name: "app-db" })
  ```

  **With Children:**
  ```tsx
  // What you write
  <RegistryStack>
    <Service name="api" />
  </RegistryStack>
  
  // What TypeScript generates
  CReact.createElement(
    RegistryStack,
    null,
    CReact.createElement(Service, { name: "api" })
  )
  ```

  ### createElement Implementation

  ```typescript
  // src/jsx.ts
  export namespace CReact {
    /**
     * JSX factory function
     * Called by TypeScript when transforming JSX
     */
    export function createElement(
      type: any,
      props: Record<string, any> | null,
      ...children: any[]
    ): JSXElement {
      // Normalize props
      const normalizedProps = props || {};
      
      // Add children to props if present
      if (children.length > 0) {
        normalizedProps.children = children.length === 1 ? children[0] : children;
      }
      
      // Extract key if present
      const key = normalizedProps.key;
      delete normalizedProps.key;
      
      return {
        type,
        props: normalizedProps,
        key,
      };
    }
    
    /**
     * Fragment support (for <>...</> syntax)
     */
    export const Fragment = Symbol('Fragment');
  }
  ```

  ### Type Definitions

  ```typescript
  // src/jsx.d.ts
  declare namespace JSX {
    interface Element {
      type: any;
      props: any;
      key?: string;
    }
    
    interface IntrinsicElements {
      // Empty - we don't support HTML elements
    }
    
    interface ElementChildrenAttribute {
      children: {};
    }
  }
  ```

  ### Usage Examples

  **Basic Component:**
  ```tsx
  function Database() {
    const db = useInstance(RDSInstance, { key: 'db', name: 'app-db' });
    return null;
  }
  
  // Use with JSX
  <Database />
  ```

  **With Props:**
  ```tsx
  function Service({ name }: { name: string }) {
    const service = useInstance(AppRunnerService, { key: 'service', name });
    return null;
  }
  
  // Use with JSX
  <Service name="api" />
  ```

  **With Children and Context:**
  ```tsx
  // Create context
  const RegistryContext = createContext<{ repositoryUrl?: string }>({});
  
  function RegistryStack({ children }: { children: any }) {
    const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
    const [repositoryUrl, setRepositoryUrl] = useState<string>();
    
    const outputs = { repositoryUrl };
    return <RegistryContext.Provider value={outputs}>{children}</RegistryContext.Provider>;
  }
  
  // Use with JSX
  <RegistryStack>
    <Service name="api" />
    <Service name="worker" />
  </RegistryStack>
  ```

  **Fragments:**
  ```tsx
  function MultiService() {
    return (
      <>
        <Service name="api" />
        <Service name="worker" />
      </>
    );
  }
  ```

  ### Type Safety

  **Component Props:**
  ```tsx
  interface DatabaseProps {
    name: string;
    size?: 'small' | 'medium' | 'large';
    onDeploy?: (outputs: any) => Promise<void>;
  }
  
  function Database({ name, size = 'medium', onDeploy }: DatabaseProps) {
    const db = useInstance(RDSInstance, { 
      key: 'db',
      name,
      instanceClass: size === 'small' ? 'db.t3.micro' : 'db.t3.medium'
    });
    return null;
  }
  
  // TypeScript validates props
  <Database name="app-db" size="large" />  // ✅ Valid
  <Database />  // ❌ Error: missing required prop 'name'
  <Database name="app-db" size="huge" />  // ❌ Error: invalid size value
  ```

  ### Integration with Renderer

  The Renderer receives JSX elements (created by `createElement`) and transforms them into Fiber nodes:

  ```typescript
  // JSX element structure
  const element = {
    type: Database,
    props: { name: 'app-db' },
    key: undefined
  };
  
  // Renderer processes it
  const fiber = renderer.render(element);
  ```

  ## Hooks

  ### useState - Declarative Output Binding [REQ-02]

  ```typescript
  // Create typed context
  interface CDNOutputs {
    distributionId?: string;
    distributionDomain?: string;
    distributionArn?: string;
  }
  const CDNContext = createContext<CDNOutputs>({});
  
  function CDNStack({ children }) {
    // Use key prop for explicit ID (React-like)
    const distribution = useInstance(CloudFrontDistribution, { 
      key: 'cdn',
      ...otherProps 
    });
    
    // Multiple useState calls (like React) - use explicit types for empty initial values
    const [distributionId, setDistributionId] = useState<string>();
    const [distributionDomain, setDistributionDomain] = useState<string>();
    const [distributionArn, setDistributionArn] = useState<string>();
    
    // Optional: Enrich outputs after async materialization
    useEffect(async () => {
      const actualDomain = await distribution.getDomain();
      setDistributionDomain(actualDomain);
    }, [distribution]);
    
    // Aggregate outputs for context
    const outputs = {
      distributionId,
      distributionDomain,
      distributionArn,
    };
    
    return <CDNContext.Provider value={outputs}>{children}</CDNContext.Provider>;
  }
  ```

  **Purpose:** Declare component outputs (NOT reactive state)
  **Implements:** REQ-02 (Stack Context - declarative outputs)
  
  **Semantics:**
  - `useState(initialValue)` - Declares a single output value (like React)
  - `setState(value)` during build - Updates the output value for build-time enrichment
  - `setState(value)` during deploy - Updates persisted output after provider materialization
  - NOT a render trigger - it's a persistent output update mechanism
  - Supports multiple useState calls per component (like React)
  - Uses hooks array pattern for tracking multiple calls
  
  **Key difference from React:**
  - React: `setState()` causes re-render in memory
  - CReact: `setState()` updates persisted outputs
  - React: Data flow = Parent → Child reactivity
  - CReact: Data flow = Stack → Provider → State snapshot
  - React: Goal = sync UI with user interaction
  - CReact: Goal = sync declared infra with real world
  
  **What actually happens:**
  1. During build, `setState()` collects values known at build-time
  2. During deploy, async resources (queue URLs, ARNs) can be patched in and persisted via backend provider
  3. On next build, CReact merges persisted outputs into state context
  4. `setState()` acts like a persistent output update mechanism, not a render trigger
  5. Multiple useState calls are tracked via hooks array (index-based like React)

  ### createContext & useContext [REQ-02]

  ```typescript
  // Create a typed context (like React.createContext)
  interface RegistryOutputs {
    repositoryUrl?: string;
    repositoryArn?: string;
  }
  
  const RegistryContext = createContext<RegistryOutputs>({});
  
  // Provider component
  function RegistryStack({ children }) {
    const repo = useInstance(EcrRepository, { key: 'repo', name: 'my-app' });
    const [repositoryUrl, setRepositoryUrl] = useState<string>();
    const [repositoryArn, setRepositoryArn] = useState<string>();
    
    const outputs = { repositoryUrl, repositoryArn };
    return <RegistryContext.Provider value={outputs}>{children}</RegistryContext.Provider>;
  }
  
  // Consumer component
  function Service() {
    const { repositoryUrl } = useContext(RegistryContext);  // Access parent's state
    
    const service = useInstance(AppRunnerService, {
      image: `${repositoryUrl}:latest`
    });
    
    return null;
  }
  ```

  **Purpose:** Share outputs between components (avoid prop drilling)  
  **API:** `createContext<T>(defaultValue?)` creates context, `useContext(MyContext)` consumes it
  **Resolution:** Depth-first traversal to nearest Provider of that specific context
  **Type Safety:** Full TypeScript support with typed contexts
  **Implements:** REQ-02 (Stack Context - declarative outputs)

  ### useInstance [REQ-03]

  ```typescript
  function Registry() {
    // ID auto-generated from construct type: 'ecrrepository'
    const repo = useInstance(EcrRepository, { name: 'app' });
    
    // Or use explicit key (like React's key prop)
    const repo = useInstance(EcrRepository, { key: 'repo', name: 'app' });
    
    return null;
  }
  
  // Multiple constructs of same type
  function MultiDatabase() {
    const primary = useInstance(RDSInstance, { key: 'primary', name: 'db-primary' });
    const replica = useInstance(RDSInstance, { key: 'replica', name: 'db-replica' });
    return null;
  }
  ```

  **Purpose:** Create infrastructure resource  
  **API:** `useInstance(Construct, props)` - React-like, no manual ID parameter
  **ID generation:** 
  - If `key` prop provided: uses `key` value
  - If no `key`: auto-generates from construct type name (lowercased)
  - Multiple calls: appends index (`-0`, `-1`, etc.)
  - Full path: component hierarchy + construct key (e.g., `['registry', 'repo']` → `'registry.repo'`)
  **Implements:** REQ-03 (Resource creation via hooks)

  ### useEffect - Setup and Teardown [REQ-12]

  ```typescript
  // Create typed context
  const QueueContext = createContext<{ queueUrl?: string; queueArn?: string }>({});
  
  function QueueStack({ children }) {
    const queue = useInstance(SQSQueue, { key: 'queue', name: 'messages' });
    const [queueUrl, setQueueUrl] = useState<string>();
    const [queueArn, setQueueArn] = useState<string>();
    
    // Setup: runs once at first render
    useEffect(() => {
      console.log('Component mounted, setting up...');
      
      // Async enrichment after deployment
      const enrichOutputs = async () => {
        const actualUrl = await queue.getUrl();
        setQueueUrl(actualUrl);
      };
      enrichOutputs();
      
      // Cleanup: runs when component unmounts
      return () => {
        console.log('Component unmounting, cleaning up...');
      };
    });
    
    const outputs = { queueUrl, queueArn };
    return <QueueContext.Provider value={outputs}>{children}</QueueContext.Provider>;
  }
  ```

  **Purpose:** Run setup logic at mount, cleanup at unmount
  **Implements:** REQ-12 (useEffect hook)
  
  **Semantics:**
  - Effect function runs once at first render (component mount)
  - Cleanup function (if returned) runs when component unmounts
  - Useful for async output enrichment after deployment
  - Useful for resource cleanup before destruction
  - NOT reactive like React - runs once per lifecycle, not on every render
  
  **Key difference from React:**
  - React: Effects run after every render (unless deps array prevents it)
  - CReact: Effects run once at mount, cleanup once at unmount
  - React: Multiple re-renders trigger multiple effect runs
  - CReact: One-shot render = one effect execution
  - React: Dependency array controls re-execution
  - CReact: No re-renders, so dependency array is optional (future enhancement)

  ### Custom Hooks [REQ-03]

  ```typescript
  // Assume VPCContext is created elsewhere
  const VPCContext = createContext<{ vpcId?: string }>({});
  
  function useDatabase() {
    const { vpcId } = useContext(VPCContext);
    return useInstance(Database, { vpcId });
  }
  ```

  **Purpose:** Reusable infrastructure logic with best practices
  **Implements:** REQ-03.3 (Custom hooks composition)

  ## Deployment Order [REQ-05]

  **Rule:** Parents deploy before children (REQ-05.3)

  ```
  Registry
  ├── ServiceA
  └── ServiceB

  Deployment Order:
  1. Registry (no parent)
  2. ServiceA (parent: Registry)
  3. ServiceB (parent: Registry)
  ```

  ## Providers (Dependency Injection) [REQ-04, REQ-09]

  ### ICloudProvider [REQ-04, REQ-09]

  ```typescript
  interface ICloudProvider {
    initialize?(): Promise<void>;  // Optional async init (REQ-04.4)
    materialize(cloudDOM: CloudDOMNode[], scope: any): void;
    
    // Lifecycle hooks (optional) (REQ-09)
    preDeploy?(cloudDOM: CloudDOMNode[]): Promise<void>;  // REQ-09.1
    postDeploy?(cloudDOM: CloudDOMNode[], outputs: any): Promise<void>;  // REQ-09.2
    onError?(error: Error, cloudDOM: CloudDOMNode[]): Promise<void>;  // REQ-09.3
  }
  ```

  **Implementations:**
  - `DummyCloudProvider` - Logs CloudDOM (POC/testing) [REQ-04]
  - `CDKTFProvider` - Generates Terraform (production) [REQ-04]
  
  **Implements:** REQ-04 (Providers), REQ-09 (Provider lifecycle hooks)

  ### IBackendProvider [REQ-04, REQ-06]

  ```typescript
  interface IBackendProvider {
    initialize?(): Promise<void>;  // Optional async init (REQ-04.4)
    getState(stackName: string): Promise<any>;  // REQ-06
    saveState(stackName: string, state: any): Promise<void>;  // REQ-02, REQ-06
  }
  ```

  **Implementations:**
  - `DummyBackendProvider` - In-memory storage (POC/testing) [REQ-04]
  - `S3BackendProvider` - S3 + DynamoDB (production) [REQ-04, REQ-NF-02]
  
  **Implements:** REQ-04 (Providers), REQ-06 (Universal output access)

  ### Injection Flow [REQ-04]

  ```typescript
  // Step 1: Instantiate providers
  const cloudProvider = new DummyCloudProvider();  // REQ-04.2
  const backendProvider = new DummyBackendProvider();  // REQ-04.3

  // Step 2: Initialize if needed (async)
  await cloudProvider.initialize?.();  // REQ-04.4
  await backendProvider.initialize?.();  // REQ-04.4

  // Step 3: Inject into CReact (Dependency Injection)
  const creact = new CReact({
    cloudProvider,  // REQ-04.2
    backendProvider  // REQ-04.3
  });

  // Step 4: Use orchestrator
  await creact.build(<App />);  // REQ-01
  await creact.deploy(cloudDOM);  // REQ-05
  ```
  
  **Implements:** REQ-04 (Providers with dependency injection)

  ## Package Structure

  ```
  creact/                        # Root directory (standalone repository)
  ├── src/
  │   ├── core/
  │   │   ├── Renderer.ts           # JSX → Fiber
  │   │   ├── Validator.ts          # Validate Fiber (REQ-07)
  │   │   ├── CloudDOMBuilder.ts    # Fiber → CloudDOM (receives ICloudProvider)
  │   │   ├── Reconciler.ts         # Diff CloudDOM
  │   │   └── CReact.ts             # Main orchestrator (receives providers)
  │   ├── providers/
  │   │   ├── ICloudProvider.ts     # Interface
  │   │   ├── IBackendProvider.ts   # Interface
  │   │   ├── DummyCloudProvider.ts # POC implementation
  │   │   └── DummyBackendProvider.ts # POC implementation
  │   ├── hooks/
  │   │   ├── useState.ts
  │   │   ├── useContext.ts
  │   │   └── useInstance.ts
  │   ├── context/
  │   │   └── createContext.ts
  │   └── cli/
  │       ├── build.ts
  │       ├── compare.ts
  │       └── deploy.ts
  ├── tests/                        # Test suite (organized by type)
  │   ├── unit/
  │   ├── integration/
  │   ├── edge-cases/
  │   ├── performance/
  │   └── helpers/
  ├── examples/
  │   ├── poc.tsx                   # POC verification script
  │   └── custom-hooks.tsx          # Custom hook examples
  ├── package.json
  ├── tsconfig.json
  └── vitest.config.ts
  ```

  ## CReact Orchestrator [REQ-01, REQ-04, REQ-05, REQ-07, REQ-08, REQ-09, REQ-10]

  ```typescript
  interface CReactConfig {
    cloudProvider: ICloudProvider;  // REQ-04
    backendProvider: IBackendProvider;  // REQ-04
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

  ## CLI Workflow [REQ-01, REQ-05, REQ-07, REQ-NF-03]

  ### Commands

  ```bash
  creact validate  # Validate JSX → Fiber tree without committing [REQ-07]
  creact build     # Render JSX → CloudDOM (with validation) [REQ-01, REQ-07]
  creact compare   # Diff CloudDOM and show changes [REQ-05, REQ-08]
  creact deploy    # Deploy infrastructure (requires approval) [REQ-05, REQ-09, REQ-10]
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

  ## Error Handling & Validation [REQ-07, REQ-NF-03]

  **Validation checks (REQ-07):**
  - Required props present (REQ-07.2)
  - Context available when `useStackContext` called (REQ-07.3)
  - Resource IDs unique (REQ-07.4)
  - No circular dependencies (REQ-07.1)

  **Example error (REQ-NF-03.1):**
  ```
  ValidationError: Missing required prop 'name' in Service component
    at infrastructure.tsx:15
    in Service
    in Registry

  Suggestion: Add the 'name' prop to the Service component
  ```

  ## Non-Functional Goals (POC)

  ### Performance [REQ-NF-01]
  - Build small stacks (<10 resources) in <2s (REQ-NF-01.1)
  - Compare operations in <1s (REQ-NF-01.2)

  ### Security [REQ-NF-02]
  - Redact secrets in CLI output (REQ-NF-02.1)
  - Encrypt state at rest using KMS (REQ-NF-02.2)
  - Use HTTPS/TLS for remote connections (REQ-NF-02.3)
  - Enforce environment isolation (REQ-NF-02.4)
  - Integrate with secret management services (REQ-NF-02.5)

  ### Usability [REQ-NF-03]
  - Show file paths and line numbers in errors (REQ-NF-03.1)
  - Provide progress indicators for long operations (REQ-NF-03.2)
  - Suggest remediation steps on failure (REQ-NF-03.3)

  ### Logging [REQ-09, REQ-NF-03]
  - CLI and providers SHALL emit timestamped logs with levels (info/warn/error)
  - Structured JSON logging for lifecycle hooks (REQ-09.5)
  - Logs help debugging during POC demos

  ## Component Lifecycle Callbacks [REQ-11]

  Components can define lifecycle callbacks for custom logic during deployment stages:

  ```typescript
  // Lifecycle callbacks are component props, not useInstance props
  function Database({ onDeploy, onStage, onDestroy }) {
    const db = useInstance(RDSInstance, {
      key: 'db',
      name: 'app-db',
    });
    
    return null;
  }

  // Usage: Pass callbacks as props
  function Infrastructure() {
    return (
      <Database
        onDeploy={async (outputs) => {  // REQ-11.1
          console.log(`Database deployed: ${outputs.endpoint}`);
          await runMigrations(outputs.endpoint);
        }}
        onStage={async (node) => {  // REQ-11.2
          console.log(`Staging database: ${node.id}`);
          await validateSchema();
        }}
        onDestroy={async (outputs) => {  // REQ-11.3
          console.log(`Backing up database before destroy`);
          await backupDatabase(outputs.endpoint);
        }}
      />
    );
  }
  ```

  **How it works:**
  - Lifecycle callbacks are passed as **component props** (like React event handlers)
  - CReact automatically links callbacks to the component's CloudDOM node
  - If a component has a CloudDOM node (via `useInstance`), callbacks are invoked at the appropriate lifecycle stages
  - If a component has no CloudDOM node (container component), callbacks are ignored

  **Lifecycle stages:**
  - `onStage` - Runs during staging phase before deployment (REQ-11.2)
  - `onDeploy` - Runs after resource is deployed with outputs (REQ-11.1)
  - `onDestroy` - Runs before resource is destroyed (REQ-11.3)

  **Error handling:** Callbacks that fail will halt deployment (REQ-11.4)

  ## Key Insights

  - 🌳 **Composition [REQ-01, REQ-03]:** Infrastructure mirrors UI patterns (parent-child, state sharing, reusable components)
  - ⚙️ **Stack Context [REQ-02]:** Enables cross-stack sharing, avoids prop drilling
  - 📦 **useState for outputs [REQ-02]:** Component state = infrastructure outputs
  - 🔐 **Approval [REQ-05]:** Infrastructure diffs require manual confirmation (high-risk changes)
  - 🔑 **Immutable IDs [REQ-01, REQ-08]:** Path-based identity tracking with migration hooks for safe refactoring
  - 💉 **Dependency Injection [REQ-04]:** Swappable providers, testable, no tight coupling
  - 📋 **Declarative Reconciliation [REQ-05, REQ-08]:** Like Terraform plan/apply or GitOps model
  - 🔄 **Lifecycle Hooks [REQ-09, REQ-11, REQ-12]:** Provider hooks, component callbacks, and useEffect for observability

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
