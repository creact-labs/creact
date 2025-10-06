# CReact Design Document

**Version:** 2.0 (Interoperability Milestone)  
**Date:** 2025-10-05  
**Status:** Active Development

> **"If React made UI declarative, CReact makes reality declarative."**

---

## 1. Overview

CReact is a universal declarative runtime that bridges infrastructure tools (Terraform, Helm, Docker) and application frameworks (React, Vue, Python). This design focuses on implementing the interoperability and operational features needed for production readiness.

**What is a CReact App?**

A CReact app is any JSX-based declarative program that builds and deploys a CloudDOM tree — similar to how a React app builds a Virtual DOM tree.

**CloudDOM: Reality as a Graph**

CloudDOM generalizes beyond infrastructure — any system that can reconcile state belongs in this graph. Infrastructure, applications, AI agents, data pipelines, and even nested CReact apps are all nodes in a unified reactive system. If it has state and can be declared, it belongs in CloudDOM.

**Hello World Example:**

```tsx
function Infrastructure() {
  return (
    <>
      <AwsLambda key="api" handler="index.handler" />
      <DockerContainer key="db" image="postgres:14" />
    </>
  );
}

// Build and deploy
$ creact build
$ creact deploy
```

### What's Already Built (Milestone 1 ✅)

The foundation is complete and production-ready:
- JSX → Fiber → CloudDOM rendering pipeline
- Hooks: useInstance, useState, useContext
- Provider interfaces: ICloudProvider, IBackendProvider
- Validation and error handling
- CloudDOM persistence

### What We're Building (Milestone 2 & 3)

This design covers:
1. **Reconciler** - Diff algorithm for incremental updates
2. **State Machine** - Transactional deployment with crash recovery
3. **External IaC Adapters** - Wrap Terraform, Helm, Pulumi
4. **State Bridge** - Sync CloudDOM to React/Vue/Python apps
5. **Provider Router** - Multi-provider support in one tree
6. **Nested Apps** - Apps deploying apps (recursive composition)
7. **CLI** - Developer-friendly commands
8. **Hot Reload** - React Fast Refresh for infrastructure
9. **Security** - Locking, secrets, audit logs

### Developer Experience Goals

**"If you know React, you know CReact."**

CReact isn't just infrastructure-as-code — it's infrastructure-as-React. The developer experience should feel familiar to any React developer.

**CReact reduces infrastructure deploy feedback from minutes to seconds — the same order-of-magnitude leap React gave UI development.**

- **Hooks everywhere** - useState for outputs, useContext for sharing, useEffect for side effects
- **Live context** - Changes propagate through the tree like React context
- **Hot reload** - Edit code, see changes in seconds (not minutes)
- **Component composition** - Build infrastructure from reusable components
- **Declarative** - Describe what you want, not how to build it
- **Type-safe** - Full TypeScript support with inference

**Not like Terraform or AWS CDK:**
- No imperative scripts
- No manual state management
- No waiting 10 minutes for deployments
- No context switching between tools

**Like React:**
- Familiar hooks API
- Component-based architecture
- Fast feedback loops
- Predictable state updates

---

## 2. Architecture

### Current Architecture (Milestone 1)
```
JSX → Renderer → Validator → CloudDOMBuilder → CloudDOM → Provider
                                                              ↓
                                                        BackendProvider
```

### Target Architecture (Milestone 2 & 3)
```
JSX → Renderer → Validator → CloudDOMBuilder → CloudDOM
                                                    ↓
                                                Reconciler (diff)
                                                    ↓
                                              StateMachine (track state)
                                                    ↓
                                              ProviderRouter
                                                    ↓
                        ┌───────────────────────────┼───────────────────────────┐
                        ↓                           ↓                           ↓
                  CloudProvider                 Adapter1                    Adapter2
                  (AWS/Docker)              (Terraform)                    (Helm)
                        ↓                           ↓                           ↓
                        └───────────────────────────┴───────────────────────────┘
                                                    ↓
                                          BackendProvider
                                    (with locking + secrets)
                                                    ↓
                                            StateSyncServer
                                                    ↓
                                      React/Vue/Python Apps
```

### Nested App Architecture

CReact apps can deploy other CReact apps recursively. This enables **apps deploying apps** — a killer differentiator:
- Monorepos that deploy themselves
- Self-hosting demos
- Modular infrastructure stacks
- Apps creating their own infrastructure

```
Root CReact App
  ├─ Backend Infrastructure (CReact App)
  │   ├─ Database
  │   ├─ API Gateway
  │   └─ Lambda Functions
  ├─ Frontend Infrastructure (CReact App)
  │   ├─ S3 Bucket
  │   ├─ CloudFront
  │   └─ Deploy Script (another CReact App!)
  └─ Monitoring (CReact App)
      ├─ CloudWatch
      └─ Grafana
```

Each nested app is a CloudDOM node that runs its own CReact instance, with outputs flowing back to the parent. This recursive capability means every deployed system can declare and manage its own dependencies — completing the vision of apps that deploy apps.

---

## 3. Dependency Injection and Extensions

CReact's runtime acts as a dependency injection (DI) container. All providers, adapters, and extensions are registered through this container at runtime.

### Goals
- **Unified extensibility** – No separate plugin system; everything is a dependency-injected provider
- **Composable** – Contexts and providers can be nested or replaced dynamically
- **Declarative** – Extensions can declare lifecycle hooks and contexts
- **Isolated** – Providers operate in their own execution context, ensuring deterministic builds

### Key Types
- `ICloudProvider` – Manages resource creation and state reconciliation
- `IBackendProvider` – Manages state, locks, and secrets
- `IIaCAdapter` – Bridges external tools (Terraform, Helm, Pulumi)
- `ICReactExtension` – Optional lifecycle hooks and custom hooks/components

### Example
```typescript
const runtime = new CReactRuntime();

runtime.registerProvider(new TerraformCloudProvider());
runtime.registerBackend(new FileBackendProvider());

runtime.registerExtension({
  name: "Telemetry",
  hooks: [useTelemetry],
  onDeploy: (ctx) => console.log("Deploying:", ctx.stack),
});

const app = <Infrastructure />;
await runtime.build(app);
await runtime.deploy();
```

**Note:** Providers are injected into the runtime at startup through the unified dependency container (REQ-O09). CReact initializes a dependency container before building the CloudDOM, resolving all registered providers and extensions.

---

## 4. Core Components

This section defines the core components needed for Milestone 2: the Reconciler (diff engine for incremental updates), State Machine (crash recovery), Adapters (external IaC integration), Provider Router (multi-provider support), State Sync (React/app integration), Nested Apps (recursive composition), and extended Backend Provider (locking + secrets).

### 4.1 Reconciler: Incremental CloudDOM Diff Engine

**Purpose:** Compute minimal change sets between CloudDOM states (like React Fiber's diff algorithm).

The Reconciler is CReact's Fiber — it computes the minimal, dependency-aware set of operations to bring infrastructure reality in sync with declarative intent. **The Reconciler acts as the single source of truth for provider execution order, removing orchestration responsibility from providers.**

**Location:** `src/core/Reconciler.ts`

**Interface:**
```typescript
interface ChangeSet {
  creates: CloudDOMNode[];
  updates: CloudDOMNode[];
  deletes: CloudDOMNode[];
  moves: Array<{ from: string; to: string }>;
  deploymentOrder: string[];
  parallelBatches: string[][];
}

class Reconciler {
  /**
   * Compute diff between previous and current CloudDOM
   * Returns minimal change set with dependency-aware ordering
   */
  reconcile(previous: CloudDOMNode[], current: CloudDOMNode[]): ChangeSet;
  
  /**
   * Build dependency graph from CloudDOM nodes
   */
  private buildDependencyGraph(nodes: CloudDOMNode[]): DependencyGraph;
  
  /**
   * Compute parallel deployment batches
   * Resources in same batch have no dependencies (safe to parallelize)
   */
  private computeParallelBatches(order: string[], graph: DependencyGraph): string[][];
}
```

**Algorithm:**
1. Build maps of previous and current nodes by ID
2. Detect creates (in current, not in previous)
3. Detect updates (in both, but props changed)
4. Detect deletes (in previous, not in current)
5. Build dependency graph from current nodes
6. Compute topological sort for deployment order
7. Group independent resources into parallel batches

**Key Design Decision:** Use content-based IDs (hashes) for deterministic diffing. Same input always produces same CloudDOM structure.

---

### 4.2 State Machine

**Purpose:** Track deployment lifecycle with crash recovery and transactional guarantees.

**Location:** `src/core/StateMachine.ts`

**States:**
- `PENDING` - Initial state, not yet deployed
- `APPLYING` - Deployment in progress
- `DEPLOYED` - Successfully deployed
- `FAILED` - Deployment failed
- `ROLLED_BACK` - Rolled back to previous state

**Interface:**
```typescript
interface DeploymentState {
  status: 'PENDING' | 'APPLYING' | 'DEPLOYED' | 'FAILED' | 'ROLLED_BACK';
  cloudDOM: CloudDOMNode[];
  changeSet?: ChangeSet;
  checkpoint?: number; // Index of last successfully deployed resource
  error?: Error;
  timestamp: number;
  user: string;
}

class StateMachine {
  /**
   * Start deployment transaction
   */
  async startDeployment(stackName: string, changeSet: ChangeSet): Promise<void>;
  
  /**
   * Update checkpoint after each resource deploys
   */
  async updateCheckpoint(stackName: string, checkpoint: number): Promise<void>;
  
  /**
   * Mark deployment as complete
   */
  async completeDeployment(stackName: string): Promise<void>;
  
  /**
   * Mark deployment as failed
   */
  async failDeployment(stackName: string, error: Error): Promise<void>;
  
  /**
   * Resume interrupted deployment from checkpoint
   */
  async resumeDeployment(stackName: string): Promise<ChangeSet>;
  
  /**
   * Rollback to previous state
   */
  async rollback(stackName: string): Promise<void>;
}
```

**Crash Recovery Flow:**
1. On startup, check for APPLYING state
2. If found, offer to resume or rollback
3. Resume: Continue from last checkpoint
4. Rollback: Apply reverse change set (deletes → creates, creates → deletes)

---

### 4.3 Provider-Orchestration Boundary

**Core Architectural Insight:** In CReact, safety and determinism are not the responsibility of providers. Providers (AWS, Terraform, Helm, etc.) are **pure executors**: they translate a resource spec into physical infrastructure.

The CReact orchestration layer—composed of the CloudDOM Reconciler, StateMachine, and ProviderRouter—handles all global logic:

- **Diffing** - Computes minimal, deterministic change sets
- **Transaction control** - Checkpoints, crash recovery, rollback
- **Safety validation** - Ensures no unsafe mutations (e.g., destructive updates)
- **Scheduling** - Orders and parallelizes execution across providers

This separation guarantees that all providers automatically inherit transactional safety, deterministic behavior, and reproducibility—without needing custom logic.

**Control Flow:**
```
JSX → CloudDOM → Reconciler → StateMachine → ProviderRouter → Providers
                               ↑
                               | Safety + Rollback
```

**Key Principle:** Each provider receives a fully ordered, validated ChangeSet from the StateMachine and executes it atomically within its namespace. Providers never implement their own concurrency, retry, or state logic.

---

### 4.4 External IaC Adapters

**Purpose:** Wrap Terraform, Helm, Pulumi modules as CReact components with deterministic output.

**Location:** `src/adapters/`

**Design Pattern:** Adapters are **ICloudProvider implementations** injected via dependency injection, following the existing CReact pattern.

**Base Interface:**
```typescript
interface ProviderCapabilities {
  constructs: string[];        // Supported construct names
  features: string[];          // Supported features (e.g., 'hot-reload', 'parallel-deploy')
  version: string;             // Provider version
  apiVersion: string;          // CReact API version compatibility
}

interface IIaCAdapter extends ICloudProvider {
  readonly metadata: {
    name: string;           // 'terraform', 'helm', 'pulumi'
    version: string;
    supportedFormats: string[];
  };
  
  /**
   * Describe provider capabilities for discovery
   */
  describeCapabilities(): ProviderCapabilities;
  
  /**
   * Load external definition and convert to CloudDOM
   * MUST be deterministic - same inputs produce same CloudDOM
   */
  load(source: string, options?: Record<string, any>): Promise<CloudDOMNode[]>;
  
  /**
   * Map external outputs to node.outputs
   */
  mapOutputs(externalOutputs: any): Record<string, any>;
}
```

**Determinism Requirements (REQ-I05):**
- Use content-based hashing for IDs, not UUIDs or timestamps
- Sort object keys for consistent serialization
- Defer randomness to deploy phase, not build phase
- No timestamps in CloudDOM (only in materialization)

**Example: Terraform Adapter as ICloudProvider**
```typescript
class TerraformCloudProvider implements IIaCAdapter {
  readonly metadata = {
    name: 'terraform',
    version: '1.0.0',
    supportedFormats: ['hcl', 'json']
  };
  
  async initialize(): Promise<void> {
    // Initialize Terraform CLI
  }
  
  materialize(cloudDOM: CloudDOMNode[]): void {
    // For each TerraformModule node, run terraform apply
    for (const node of cloudDOM) {
      if (node.construct.name === 'TerraformModule') {
        const result = this.runTerraform('apply', node);
        // Populate node.outputs with Terraform outputs
        node.outputs = this.mapOutputs(result.outputs);
      }
    }
  }
  
  async load(source: string, options?: { inputs?: Record<string, any> }) {
    // Parse Terraform module and convert to CloudDOM nodes
    const module = await this.parseTerraformModule(source);
    
    const nodes: CloudDOMNode[] = module.resources.map(resource => {
      const id = this.generateDeterministicId(source, resource);
      return {
        id,
        path: [source, resource.name],
        construct: TerraformModule,
        props: {
          type: resource.type,
          config: this.normalizeConfig(resource.config),
          inputs: options?.inputs
        },
        children: [],
        outputs: {}
      };
    });
    
    return nodes;
  }
  
  mapOutputs(externalOutputs: any): Record<string, any> {
    return Object.entries(externalOutputs).reduce((acc, [key, value]) => {
      acc[key] = (value as any).value;
      return acc;
    }, {} as Record<string, any>);
  }
  
  private generateDeterministicId(source: string, resource: any): string {
    const content = JSON.stringify({ source, resource: resource.name });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
  
  private normalizeConfig(config: any): any {
    // Sort keys for determinism
    if (typeof config !== 'object' || config === null) return config;
    const sorted: any = {};
    Object.keys(config).sort().forEach(key => {
      sorted[key] = this.normalizeConfig(config[key]);
    });
    return sorted;
  }
}
```

**Usage with Dependency Injection:**
```tsx
// Construct for Terraform modules
class TerraformModule {
  constructor(public props: {
    source: string;
    version: string;
    inputs: Record<string, any>;
  }) {}
}

// Component using Terraform
function Infrastructure() {
  const vpc = useInstance(TerraformModule, {
    key: 'vpc',
    source: 'terraform-aws-modules/vpc/aws',
    version: '5.0.0',
    inputs: {
      cidr: '10.0.0.0/16',
      azs: ['us-east-1a', 'us-east-1b']
    }
  });
  
  const [vpcId, setVpcId] = useState<string>();
  
  // Capture outputs from deployment
  if (vpc.outputs?.vpcId && !vpcId) {
    setVpcId(vpc.outputs.vpcId as string);
  }
  
  return <InfraContext.Provider value={{ vpcId }} />;
}

// Inject Terraform provider
const creact = new CReact({
  cloudProvider: new TerraformCloudProvider(),
  backendProvider: new DummyBackendProvider()
});

const cloudDOM = await creact.build(<Infrastructure />);
await creact.deploy(cloudDOM);
```

---

### 4.5 Provider Router

**Purpose:** Route CloudDOM nodes to multiple providers based on construct type (enables mixing AWS, Docker, Kubernetes in one tree).

**Location:** `src/core/ProviderRouter.ts`

**Design Pattern:** ProviderRouter implements ICloudProvider and delegates to registered providers. **ProviderRouter only handles routing and ordering; execution safety remains in StateMachine.**

**Interface:**
```typescript
class ProviderRouter implements ICloudProvider {
  private providers: Map<RegExp, ICloudProvider> = new Map();
  
  /**
   * Register provider for specific construct patterns
   */
  register(pattern: RegExp, provider: ICloudProvider): void {
    this.providers.set(pattern, provider);
  }
  
  async initialize(): Promise<void> {
    // Initialize all registered providers
    await Promise.all(
      Array.from(this.providers.values()).map(p => p.initialize?.())
    );
  }
  
  materialize(cloudDOM: CloudDOMNode[]): void {
    // Group nodes by provider
    const nodesByProvider = this.groupByProvider(cloudDOM);
    
    // Materialize each group
    for (const [provider, nodes] of nodesByProvider) {
      provider.materialize(nodes);
    }
  }
  
  private groupByProvider(nodes: CloudDOMNode[]): Map<ICloudProvider, CloudDOMNode[]> {
    const groups = new Map<ICloudProvider, CloudDOMNode[]>();
    
    for (const node of nodes) {
      const provider = this.findProvider(node);
      if (!groups.has(provider)) {
        groups.set(provider, []);
      }
      groups.get(provider)!.push(node);
    }
    
    return groups;
  }
  
  private findProvider(node: CloudDOMNode): ICloudProvider {
    const constructName = node.construct.name;
    
    for (const [pattern, provider] of this.providers) {
      if (pattern.test(constructName)) {
        return provider;
      }
    }
    
    throw new Error(`No provider registered for construct: ${constructName}`);
  }
}
```

**Usage:**
```tsx
// Register multiple providers
const router = new ProviderRouter();
router.register(/^Aws.*/, new AwsCloudProvider());
router.register(/^Docker.*/, new DockerCloudProvider());
router.register(/^Kubernetes.*/, new K8sCloudProvider());
router.register(/^Terraform.*/, new TerraformCloudProvider());

// Inject router as cloud provider
const creact = new CReact({
  cloudProvider: router,
  backendProvider: new S3BackendProvider()
});

// Now mix resources from different providers
function Infrastructure() {
  return (
    <>
      <AwsLambda key="api" handler="index.handler" />
      <DockerContainer key="worker" image="worker:latest" />
      <KubernetesDeployment key="frontend" replicas={3} />
      <TerraformModule key="vpc" source="terraform-aws-modules/vpc/aws" />
    </>
  );
}
```

---

### 4.6 State Sync Server

**Purpose:** Expose CloudDOM state to React/Vue/Python apps via WebSocket/HTTP.

**Location:** `src/interop/StateSyncServer.ts`

**Interop Schema (JSON Protocol):**

The State Sync protocol uses a minimal JSON schema for cross-runtime compatibility:

```typescript
// Message types for WebSocket/HTTP communication
type StateSyncMessage =
  | { type: 'subscribe'; stackName: string }
  | { type: 'unsubscribe'; stackName: string }
  | { type: 'state_update'; stackName: string; state: CloudDOMState; timestamp: number }
  | { type: 'error'; error: string; code: string };

// CloudDOM state shape (language-agnostic)
interface CloudDOMState {
  resources: Record<string, any>;  // Resource ID → resource data
  outputs: Record<string, any>;    // Output key → output value
  deploymentStatus: 'pending' | 'deploying' | 'deployed' | 'failed';
  version: string;                 // CloudDOM schema version
}
```

This schema enables SDKs in any language (Python, Rust, Go) to consume CloudDOM state.

**Interface:**
```typescript
class StateSyncServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket[]> = new Map();
  
  constructor(port: number = 3001) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', this.handleConnection.bind(this));
  }
  
  /**
   * Publish CloudDOM state update to subscribed clients
   */
  publish(stackName: string, state: CloudDOMState): void {
    const clients = this.clients.get(stackName) || [];
    const message = JSON.stringify({
      type: 'state_update',
      stackName,
      state,
      timestamp: Date.now()
    });
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  private handleConnection(ws: WebSocket): void {
    ws.on('message', (data) => {
      const { type, stackName } = JSON.parse(data.toString());
      if (type === 'subscribe') {
        if (!this.clients.has(stackName)) {
          this.clients.set(stackName, []);
        }
        this.clients.get(stackName)!.push(ws);
      }
    });
  }
}
```

**React Hook (creact-react-interop package):**
```typescript
interface CloudDOMState {
  resources: Record<string, any>;
  outputs: Record<string, any>;
  deploymentStatus: 'pending' | 'deploying' | 'deployed' | 'failed';
}

export function useCReactContext<T = Record<string, any>>(
  stackName: string = 'default'
): CloudDOMState & { outputs: T } {
  const [state, setState] = useState<CloudDOMState & { outputs: T }>({
    resources: {},
    outputs: {} as T,
    deploymentStatus: 'pending'
  });
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', stackName }));
    };
    
    ws.onmessage = (event) => {
      const { type, state: newState } = JSON.parse(event.data);
      if (type === 'state_update') {
        setState(newState);
      }
    };
    
    return () => ws.close();
  }, [stackName]);
  
  return state;
}
```

**Usage in React App:**
```tsx
import { useCReactContext } from 'creact-react-interop';

function Dashboard() {
  const { outputs, deploymentStatus } = useCReactContext('production');
  
  if (deploymentStatus === 'deploying') {
    return <Spinner>Deploying infrastructure...</Spinner>;
  }
  
  return (
    <div>
      <h1>Production Dashboard</h1>
      <p>API URL: {outputs.apiUrl}</p>
      <p>Database: {outputs.databaseUrl}</p>
      <p>Status: {deploymentStatus}</p>
    </div>
  );
}
```

---

### 4.7 Nested App Deployment

**Purpose:** Enable CReact apps to deploy other CReact apps recursively.

**Location:** `src/core/CReactAppNode.ts`

**Design Pattern:** CReactAppNode is a special construct that runs a nested CReact instance.

**App Manifest (Optional):**

Nested apps can include a manifest for dependency declaration and versioning:

```typescript
interface CReactAppManifest {
  name: string;
  version: string;
  apiVersion: string;          // CReact API version required
  dependencies?: {
    [key: string]: string;     // Dependency name → version
  };
  exports?: string[];          // Output keys this app exports
  requires?: string[];         // Context keys this app requires
}
```

**Interface:**
```typescript
class CReactApp {
  constructor(public props: {
    source: string;           // Path to child app
    context?: Record<string, any>; // Inherited context (parent → child)
    onDeploy?: (outputs: Record<string, any>) => void;
    onSignal?: (signal: string, data: any) => void; // Bidirectional: child → parent signals
  }) {}
}

class CReactAppProvider implements ICloudProvider {
  async initialize(): Promise<void> {}
  
  materialize(cloudDOM: CloudDOMNode[]): void {
    for (const node of cloudDOM) {
      if (node.construct.name === 'CReactApp') {
        this.deployNestedApp(node);
      }
    }
  }
  
  private async deployNestedApp(node: CloudDOMNode): Promise<void> {
    const { source, context, onDeploy } = node.props;
    
    // 1. Load child app from source
    const childApp = await this.loadApp(source);
    
    // 2. Create nested CReact instance
    const childCReact = new CReact({
      cloudProvider: this.cloudProvider,
      backendProvider: this.backendProvider
    });
    
    // 3. Inject parent context
    const childContext = {
      ...context,
      parent: this.getCurrentContext()
    };
    
    // 4. Build and deploy child app
    const childCloudDOM = await childCReact.build(childApp, childContext);
    await childCReact.deploy(childCloudDOM, source);
    
    // 5. Extract outputs and propagate to parent
    const outputs = this.extractOutputs(childCloudDOM);
    node.outputs = outputs;
    onDeploy?.(outputs);
    
    // 6. Set up bidirectional signal channel (child → parent)
    if (node.props.onSignal) {
      childCReact.onSignal((signal, data) => {
        node.props.onSignal?.(signal, data);
      });
    }
  }
}
```

**Usage:**
```tsx
function MonorepoRoot() {
  const [backendUrl, setBackendUrl] = useState<string>();
  
  return (
    <>
      {/* Deploy backend first */}
      <CReactApp 
        key="backend"
        source="./apps/backend"
        onDeploy={(outputs) => setBackendUrl(outputs.apiUrl)}
      />
      
      {/* Deploy frontend with backend URL */}
      <CReactApp 
        key="frontend"
        source="./apps/frontend"
        context={{ backendUrl }}
      />
      
      {/* Deploy worker */}
      <CReactApp 
        key="worker"
        source="./apps/worker"
      />
    </>
  );
}
```

**Recursive Composition Example:**
```tsx
// Root app deploys infrastructure
function RootApp() {
  return (
    <>
      <CReactApp source="./infra/database" />
      <CReactApp source="./infra/api" />
      {/* This app itself deploys another app! */}
      <CReactApp source="./infra/deployment-pipeline" />
    </>
  );
}

// deployment-pipeline/app.tsx
function DeploymentPipeline() {
  return (
    <>
      <CReactApp source="./staging" />
      <CReactApp source="./production" />
    </>
  );
}
```

---

### 4.8 Extended IBackendProvider

**Purpose:** Add locking and secrets management to existing IBackendProvider interface.

**Location:** `src/providers/IBackendProvider.ts`

**Extended Interface:**
```typescript
interface LockInfo {
  holder: string;      // Process/user holding the lock
  acquiredAt: number;  // Timestamp
  ttl: number;         // Time-to-live in seconds
}

interface IBackendProvider<TState = any> {
  // Existing methods
  initialize?(): Promise<void>;
  getState(stackName: string): Promise<TState | undefined>;
  saveState(stackName: string, state: TState): Promise<void>;
  
  // NEW: State locking (REQ-O02)
  acquireLock(stackName: string, holder: string, ttl: number): Promise<void>;
  releaseLock(stackName: string): Promise<void>;
  checkLock(stackName: string): Promise<LockInfo | null>;
  
  // NEW: Secrets management (REQ-O06)
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  listSecrets(): Promise<string[]>;
}
```

**Implementation Example: File Backend with Locking**
```typescript
class FileBackendProvider implements IBackendProvider {
  private lockFile: string;
  
  async acquireLock(stackName: string, holder: string, ttl: number): Promise<void> {
    this.lockFile = path.join(this.persistDir, `${stackName}.lock`);
    
    // Check if lock exists
    if (fs.existsSync(this.lockFile)) {
      const lockInfo: LockInfo = JSON.parse(fs.readFileSync(this.lockFile, 'utf-8'));
      
      // Check if lock expired
      const now = Date.now();
      if (now - lockInfo.acquiredAt < lockInfo.ttl * 1000) {
        throw new Error(
          `Stack "${stackName}" is locked by ${lockInfo.holder} ` +
          `(acquired ${new Date(lockInfo.acquiredAt).toISOString()})`
        );
      }
    }
    
    // Acquire lock
    const lockInfo: LockInfo = {
      holder,
      acquiredAt: Date.now(),
      ttl
    };
    fs.writeFileSync(this.lockFile, JSON.stringify(lockInfo, null, 2));
  }
  
  async releaseLock(stackName: string): Promise<void> {
    const lockFile = path.join(this.persistDir, `${stackName}.lock`);
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  }
  
  async checkLock(stackName: string): Promise<LockInfo | null> {
    const lockFile = path.join(this.persistDir, `${stackName}.lock`);
    if (!fs.existsSync(lockFile)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
  }
  
  async getSecret(key: string): Promise<string | undefined> {
    const secretsFile = path.join(this.persistDir, 'secrets.enc.json');
    if (!fs.existsSync(secretsFile)) {
      return undefined;
    }
    
    const encrypted = fs.readFileSync(secretsFile, 'utf-8');
    const secrets = this.decrypt(encrypted);
    return secrets[key];
  }
  
  async setSecret(key: string, value: string): Promise<void> {
    const secretsFile = path.join(this.persistDir, 'secrets.enc.json');
    
    let secrets: Record<string, string> = {};
    if (fs.existsSync(secretsFile)) {
      const encrypted = fs.readFileSync(secretsFile, 'utf-8');
      secrets = this.decrypt(encrypted);
    }
    
    secrets[key] = value;
    const encrypted = this.encrypt(secrets);
    fs.writeFileSync(secretsFile, encrypted);
  }
  
  async listSecrets(): Promise<string[]> {
    const secretsFile = path.join(this.persistDir, 'secrets.enc.json');
    if (!fs.existsSync(secretsFile)) {
      return [];
    }
    
    const encrypted = fs.readFileSync(secretsFile, 'utf-8');
    const secrets = this.decrypt(encrypted);
    return Object.keys(secrets);
  }
  
  private encrypt(data: any): string {
    // Use AES-256-GCM encryption
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    });
  }
  
  private decrypt(encrypted: string): any {
    const { iv, authTag, data } = JSON.parse(encrypted);
    const key = this.getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
  
  private getEncryptionKey(): Buffer {
    // Get key from environment or generate
    const keyHex = process.env.CREACT_ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error('CREACT_ENCRYPTION_KEY environment variable not set');
    }
    return Buffer.from(keyHex, 'hex');
  }
}
```

---

## 5. Data Models

### 5.1 DeploymentState

```typescript
interface DeploymentState {
  status: 'PENDING' | 'APPLYING' | 'DEPLOYED' | 'FAILED' | 'ROLLED_BACK';
  cloudDOM: CloudDOMNode[];
  changeSet?: ChangeSet;
  checkpoint?: number;
  error?: Error;
  timestamp: number;
  user: string;
  stackName: string;
}
```

### 5.2 ChangeSet

```typescript
interface ChangeSet {
  creates: CloudDOMNode[];
  updates: CloudDOMNode[];
  deletes: CloudDOMNode[];
  moves: Array<{ from: string; to: string }>;
  deploymentOrder: string[];
  parallelBatches: string[][];
}
```

### 5.3 AuditLogEntry

```typescript
interface AuditLogEntry {
  timestamp: number;
  user: string;
  action: 'build' | 'deploy' | 'rollback' | 'resume';
  stackName: string;
  changeSet?: ChangeSet;
  status: 'started' | 'completed' | 'failed';
  error?: string;
  signature?: string; // HMAC signature for tamper detection
}
```

### 5.4 LockInfo

```typescript
interface LockInfo {
  holder: string;      // Process/user holding the lock
  acquiredAt: number;  // Timestamp
  ttl: number;         // Time-to-live in seconds
}
```

---

## 6. Error Handling

### 6.1 Error Taxonomy

```typescript
class CReactError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'CReactError';
  }
}

class AdapterError extends CReactError {
  constructor(message: string, public adapter: string, context?: Record<string, any>) {
    super(message, 'ADAPTER_ERROR', { adapter, ...context });
    this.name = 'AdapterError';
  }
}

class ProviderTimeoutError extends CReactError {
  constructor(message: string, public provider: string, context?: Record<string, any>) {
    super(message, 'PROVIDER_TIMEOUT', { provider, ...context });
    this.name = 'ProviderTimeoutError';
  }
}

class LockError extends CReactError {
  constructor(message: string, public lockInfo: LockInfo) {
    super(message, 'LOCK_ERROR', { lockInfo });
    this.name = 'LockError';
  }
}

class ValidationError extends CReactError {
  constructor(message: string, public node: CloudDOMNode) {
    super(message, 'VALIDATION_ERROR', { nodeId: node.id });
    this.name = 'ValidationError';
  }
}
```

### 6.2 Retry Logic

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;  // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  isTransient: (error: Error) => boolean
): Promise<T> {
  let lastError: Error;
  let delay = config.initialDelay;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry permanent errors
      if (!isTransient(lastError)) {
        throw lastError;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }
  
  throw new CReactError(
    `Operation failed after ${config.maxAttempts} attempts`,
    'MAX_RETRIES_EXCEEDED',
    { lastError: lastError.message }
  );
}

// Determine if error is transient
function isTransientError(error: Error): boolean {
  const transientPatterns = [
    /timeout/i,
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /rate limit/i,
    /throttl/i,
    /503/,
    /502/
  ];
  
  return transientPatterns.some(pattern => pattern.test(error.message));
}
```

### 6.3 Retry Policy Configuration

Each provider can define a retry policy via configuration or CLI overrides.

**Example:**

```typescript
// creact.config.ts
export default {
  retryPolicy: {
    defaultBackoff: "exponential",
    maxRetries: 5,
    providerOverrides: {
      AwsCloudProvider: { maxRetries: 10, baseDelayMs: 500 },
      DockerCloudProvider: { maxRetries: 3 }
    }
  }
};
```

At runtime, the CReact StateMachine integrates with these settings during deployment operations.

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Focus:** Individual components in isolation

**Coverage:**
- Reconciler diff algorithm
- State machine transitions
- Deterministic ID generation
- Error handling and retry logic
- Provider router routing logic

**Example:**
```typescript
describe('Reconciler', () => {
  it('should detect creates', () => {
    const prev: CloudDOMNode[] = [];
    const curr: CloudDOMNode[] = [{ id: 'node1', ... }];
    
    const changeSet = reconciler.reconcile(prev, curr);
    
    expect(changeSet.creates).toHaveLength(1);
    expect(changeSet.creates[0].id).toBe('node1');
  });
  
  it('should detect updates', () => {
    const prev: CloudDOMNode[] = [{ id: 'node1', props: { a: 1 } }];
    const curr: CloudDOMNode[] = [{ id: 'node1', props: { a: 2 } }];
    
    const changeSet = reconciler.reconcile(prev, curr);
    
    expect(changeSet.updates).toHaveLength(1);
  });
});
```

### 7.2 Integration Tests

**Focus:** Component interactions

**Coverage:**
- CReact orchestrator with Reconciler and StateMachine
- Provider router with multiple providers
- State sync server with WebSocket clients
- Adapter integration with external tools (mocked)

**Example:**
```typescript
describe('CReact with StateMachine', () => {
  it('should resume deployment after crash', async () => {
    const creact = new CReact({ cloudProvider, backendProvider });
    
    // Start deployment
    const cloudDOM = await creact.build(<App />);
    await creact.deploy(cloudDOM);
    
    // Simulate crash by creating new instance
    const creact2 = new CReact({ cloudProvider, backendProvider });
    
    // Should detect incomplete deployment
    const state = await backendProvider.getState('default');
    expect(state.status).toBe('APPLYING');
    
    // Resume
    await creact2.resume('default');
    
    // Should complete
    const finalState = await backendProvider.getState('default');
    expect(finalState.status).toBe('DEPLOYED');
  });
});
```

### 7.3 Mock Providers and Fake Backend

A MockCloudProvider and FakeBackendProvider will be implemented for deterministic end-to-end testing. These simulate resource creation and persistence locally without cloud dependencies.

- Used in CI and integration tests
- Enables snapshot-based verification of CloudDOM diffs
- Ensures deterministic behavior for regression testing

**Example:**
```typescript
class MockCloudProvider implements ICloudProvider {
  private resources: Map<string, any> = new Map();
  
  async initialize(): Promise<void> {}
  
  materialize(cloudDOM: CloudDOMNode[]): void {
    for (const node of cloudDOM) {
      this.resources.set(node.id, node.props);
      node.outputs = { mockOutput: `mock-${node.id}` };
    }
  }
}

class FakeBackendProvider implements IBackendProvider {
  private state: Map<string, any> = new Map();
  
  async getState(stackName: string): Promise<any> {
    return this.state.get(stackName);
  }
  
  async saveState(stackName: string, state: any): Promise<void> {
    this.state.set(stackName, state);
  }
}
```

### 7.4 End-to-End Tests

**Focus:** Full workflows

**Coverage:**
- Build → Plan → Deploy workflow
- Hot reload with file watching
- Multi-provider deployment
- State sync to React app
- Crash recovery

**Example:**
```typescript
describe('E2E: Hot Reload', () => {
  it('should apply incremental updates', async () => {
    // Start dev mode
    const devServer = await startDevMode('./infra');
    
    // Initial deployment
    await waitForDeployment();
    
    // Modify file
    fs.writeFileSync('./infra/app.tsx', updatedCode);
    
    // Wait for hot reload
    await waitForHotReload();
    
    // Verify only changed resources were updated
    const logs = devServer.getLogs();
    expect(logs).toContain('Δ 1 resource changed');
    expect(logs).toContain('✅ Hot reload applied');
  });
});
```

### 7.5 Interop Conformance Tests

**Focus:** Cross-runtime compatibility

**Coverage:**
- State sync protocol conformance (WebSocket/HTTP)
- Provider capability discovery
- Bidirectional context propagation
- Multi-language SDK compatibility (React, Python, Rust)

**Example:**
```typescript
describe('Interop: State Sync Protocol', () => {
  it('should conform to JSON schema', async () => {
    const server = new StateSyncServer();
    const client = new WebSocket('ws://localhost:3001');
    
    // Subscribe
    client.send(JSON.stringify({
      type: 'subscribe',
      stackName: 'test'
    }));
    
    // Publish state update
    server.publish('test', {
      resources: {},
      outputs: { apiUrl: 'https://api.example.com' },
      deploymentStatus: 'deployed',
      version: '1.0.0'
    });
    
    // Verify message conforms to schema
    const message = await waitForMessage(client);
    expect(message).toMatchSchema(StateSyncMessageSchema);
    expect(message.type).toBe('state_update');
    expect(message.state.outputs.apiUrl).toBe('https://api.example.com');
  });
  
  it('should support Python SDK', async () => {
    // Test Python SDK can consume CloudDOM state
    const pythonClient = await spawnPythonProcess(`
      from creact_python import useCReactContext
      
      state = useCReactContext('test')
      print(state['outputs']['apiUrl'])
    `);
    
    const output = await pythonClient.waitForOutput();
    expect(output).toBe('https://api.example.com');
  });
});

describe('Interop: Provider Capabilities', () => {
  it('should discover provider capabilities', () => {
    const provider = new TerraformCloudProvider();
    const capabilities = provider.describeCapabilities();
    
    expect(capabilities.constructs).toContain('TerraformModule');
    expect(capabilities.features).toContain('deterministic-ids');
    expect(capabilities.apiVersion).toBe('1.0.0');
  });
});
```

---

## 8. CLI Design

The CLI is designed to mirror Git or Terraform — short, composable commands with human-readable output and CI/CD automation hooks.

### 8.1 Command Structure

```bash
creact <command> [options]

Commands:
  build       Compile JSX to CloudDOM
  plan        Show diff preview without applying
  deploy      Apply changes to infrastructure
  resume      Resume interrupted deployment
  dev         Hot reload infrastructure (watch mode)
  logs        Stream CloudDOM event logs
  secrets     Manage encrypted configuration
  audit       View audit log entries

Options:
  --stack <name>    Stack name (default: "default")
  --json            Output JSON for CI/CD
  --help            Show help
```

**CLI Terminology Alignment:**

CReact CLI terminology mirrors Terraform's convention:
- `creact plan` → "Shows execution plan"
- `creact apply` (alias of `creact deploy`) → "Applies infrastructure changes"
- `creact destroy` → "Deletes resources"

This ensures developer familiarity and a gentle onboarding curve for teams already using IaC tools.

### 8.2 Command Implementations

**Location:** `src/cli/`

**Structure:**
```
src/cli/
  ├── index.ts          # CLI entry point
  ├── build.ts          # creact build
  ├── plan.ts           # creact plan
  ├── deploy.ts         # creact deploy
  ├── resume.ts         # creact resume
  ├── dev.ts            # creact dev
  ├── logs.ts           # creact logs
  ├── secrets.ts        # creact secrets
  └── audit.ts          # creact audit
```

**Example: creact plan**
```typescript
// src/cli/plan.ts
export async function planCommand(options: {
  stack: string;
  json: boolean;
}) {
  const creact = new CReact({
    cloudProvider: loadCloudProvider(),
    backendProvider: loadBackendProvider()
  });
  
  // Build current CloudDOM
  const current = await creact.build(loadApp());
  
  // Get previous CloudDOM from backend
  const previous = await creact.backendProvider.getState(options.stack);
  
  // Compute diff
  const reconciler = new Reconciler();
  const changeSet = reconciler.reconcile(
    previous?.cloudDOM || [],
    current
  );
  
  // Output
  if (options.json) {
    console.log(JSON.stringify(changeSet, null, 2));
  } else {
    printColoredDiff(changeSet);
  }
}

function printColoredDiff(changeSet: ChangeSet) {
  console.log('\n📋 Plan:');
  
  if (changeSet.creates.length > 0) {
    console.log(chalk.green(`\n+ Creates (${changeSet.creates.length}):`));
    changeSet.creates.forEach(node => {
      console.log(chalk.green(`  + ${node.construct.name}: ${node.id}`));
    });
  }
  
  if (changeSet.updates.length > 0) {
    console.log(chalk.yellow(`\n~ Updates (${changeSet.updates.length}):`));
    changeSet.updates.forEach(node => {
      console.log(chalk.yellow(`  ~ ${node.construct.name}: ${node.id}`));
    });
  }
  
  if (changeSet.deletes.length > 0) {
    console.log(chalk.red(`\n- Deletes (${changeSet.deletes.length}):`));
    changeSet.deletes.forEach(node => {
      console.log(chalk.red(`  - ${node.construct.name}: ${node.id}`));
    });
  }
}
```

---

## 9. Hot Reload Design

### 9.1 Architecture

```
File Watcher → Detect Changes → Incremental Build → Reconcile → Apply Delta
                                                                      ↓
                                                              Rollback on Failure
```

### 9.2 Implementation

**Location:** `src/cli/dev.ts`

```typescript
export async function devCommand(options: {
  stack: string;
  step: boolean;  // Manual approval mode
}) {
  const creact = new CReact({
    cloudProvider: loadCloudProvider(),
    backendProvider: loadBackendProvider()
  });
  
  const reconciler = new Reconciler();
  let previousCloudDOM: CloudDOMNode[] = [];
  
  // Initial build and deploy
  console.log('🚀 Starting dev mode...');
  previousCloudDOM = await creact.build(loadApp());
  await creact.deploy(previousCloudDOM);
  console.log('✅ Initial deployment complete');
  
  // Watch for file changes
  const watcher = chokidar.watch('./infra', {
    ignored: /node_modules/,
    persistent: true
  });
  
  watcher.on('change', async (path) => {
    console.log(`\n📝 File changed: ${path}`);
    
    try {
      // Rebuild
      const currentCloudDOM = await creact.build(loadApp());
      
      // Compute diff
      const changeSet = reconciler.reconcile(previousCloudDOM, currentCloudDOM);
      
      // Check if there are changes
      const totalChanges = 
        changeSet.creates.length + 
        changeSet.updates.length + 
        changeSet.deletes.length;
      
      if (totalChanges === 0) {
        console.log('ℹ️  No changes detected');
        return;
      }
      
      console.log(`Δ ${totalChanges} resource(s) changed`);
      
      // Step mode: wait for approval
      if (options.step) {
        const answer = await prompt('Apply changes? [y/N] ');
        if (answer.toLowerCase() !== 'y') {
          console.log('⏭️  Skipped');
          return;
        }
      }
      
      // Apply changes
      const startTime = Date.now();
      await creact.deployChangeSet(changeSet);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log(`✅ Hot reload applied in ${duration}s`);
      
      // Update previous state
      previousCloudDOM = currentCloudDOM;
      
    } catch (error) {
      console.error('❌ Hot reload failed:', error);
      console.log('🔄 Rolling back...');
      
      // Rollback to previous state
      await creact.deploy(previousCloudDOM);
      console.log('✅ Rolled back to previous state');
    }
  });
  
  console.log('\n👀 Watching for changes... (Press Ctrl+C to stop)');
}
```

### 9.3 Safety Checks

Not all changes are safe to hot reload. The system should detect unsafe changes and fall back to full deployment.

```typescript
interface ChangeSetSafety {
  safe: boolean;
  reason?: string;
  requiresFullDeploy?: boolean;
}

function validateChangeSetSafety(changeSet: ChangeSet): ChangeSetSafety {
  // Creates and deletes always require full deployment
  if (changeSet.creates.length > 0 || changeSet.deletes.length > 0) {
    return {
      safe: false,
      reason: 'Creates/deletes require full deployment',
      requiresFullDeploy: true
    };
  }
  
  // Check if updates are safe
  for (const node of changeSet.updates) {
    const constructName = node.construct.name;
    
    // Database changes are never safe (data loss risk)
    if (constructName.includes('Database') || constructName.includes('RDS')) {
      return {
        safe: false,
        reason: 'Database changes require full deployment',
        requiresFullDeploy: true
      };
    }
    
    // VPC/networking changes are never safe
    if (constructName.includes('Vpc') || constructName.includes('Subnet')) {
      return {
        safe: false,
        reason: 'Networking changes require full deployment',
        requiresFullDeploy: true
      };
    }
  }
  
  return { safe: true };
}
```

---

## 10. Key Design Decisions

### 10.1 Why Dependency Injection?

**Decision:** Use dependency injection for providers instead of class inheritance.

**Rationale:**
- Follows existing CReact pattern (see smoke-test.tsx)
- Enables runtime provider swapping
- Simplifies testing with mock providers
- Avoids tight coupling

### 10.2 Why Content-Based IDs?

**Decision:** Use content hashing for CloudDOM node IDs instead of UUIDs.

**Rationale:**
- Enables deterministic builds (same input = same output)
- Simplifies diffing (IDs stable across builds)
- Enables reproducible deployments
- Critical for CI/CD pipelines

### 10.3 Why WebSocket for State Sync?

**Decision:** Use WebSocket instead of polling or SSE.

**Rationale:**
- Bidirectional communication (React can send commands)
- Low latency (<100ms)
- Efficient for real-time updates
- Standard protocol with good library support

### 10.4 Why Provider Router?

**Decision:** Route CloudDOM nodes to multiple providers instead of single provider.

**Rationale:**
- Real-world systems use multiple tools (AWS + Docker + Kubernetes)
- Enables gradual migration between providers
- Each provider optimizes for its domain
- Avoids "one size fits all" complexity

### 10.5 Why State Machine?

**Decision:** Track deployment lifecycle with explicit state machine.

**Rationale:**
- Enables crash recovery (resume from checkpoint)
- Provides transactional guarantees
- Simplifies error handling
- Enables audit logging

---

## 11. Implementation Phases

### Phase 1: Reconciler & State Machine (Foundation)
- Implement Reconciler with diff algorithm
- Extend IBackendProvider with locking
- Implement StateMachine
- Update CReact to use Reconciler

### Phase 2: CLI & Plan Command
- Create CLI structure
- Implement `creact plan`
- Implement `creact deploy` with approval
- Implement `creact build`

### Phase 3: Adapters & Provider Router
- Create IIaCAdapter interface
- Implement TerraformCloudProvider
- Implement ProviderRouter
- Add deterministic ID utilities

### Phase 4: State Bridge & Hot Reload
- Implement StateSyncServer
- Create creact-react-interop package
- Implement `creact dev` with hot reload
- Add file watcher

### Phase 5: Security & Observability
- Extend IBackendProvider with secrets
- Implement audit logging
- Add retry logic with exponential backoff
- Implement telemetry

---

## 12. Appendix A: The Next Layer of Reality (Vision Roadmap)

### 12.1 AI-Generated Infrastructure

**Vision:** CloudDOM nodes generated by AI agents based on natural language requirements.

```tsx
function AIGeneratedInfra() {
  const infra = useAI({
    prompt: "Create a scalable API with PostgreSQL database and Redis cache",
    constraints: {
      budget: 100, // USD per month
      region: 'us-east-1',
      compliance: ['SOC2', 'HIPAA']
    }
  });
  
  return <>{infra.nodes}</>;
}
```

**How it works:**
1. AI agent analyzes requirements
2. Generates CloudDOM nodes
3. CReact validates and deploys
4. AI monitors and optimizes based on metrics

### 12.2 Self-Healing CloudDOM

**Vision:** CloudDOM that detects and repairs drift automatically.

```tsx
function SelfHealingInfra() {
  useEffect(() => {
    // Watch for drift
    const unsubscribe = watchDrift((drift) => {
      if (drift.severity === 'critical') {
        // Auto-repair
        reconcile(drift);
      }
    });
    
    return unsubscribe;
  });
  
  return <Database replicas={3} />;
}
```

**Capabilities:**
- Detect configuration drift
- Auto-repair based on policies
- Rollback on anomalies
- Learn from incidents

### 12.3 Universal CloudDOM (Beyond Infrastructure)

**Vision:** CloudDOM as a universal state graph for any system.

**Examples:**
- **Data Pipelines** - ETL jobs as CloudDOM nodes
- **AI Agents** - LLM workflows as reactive components
- **IoT Devices** - Physical devices in CloudDOM
- **Business Processes** - Workflows as declarative graphs

```tsx
function UniversalSystem() {
  return (
    <>
      {/* Infrastructure */}
      <AwsLambda key="api" />
      
      {/* Data Pipeline */}
      <DataPipeline key="etl" source="s3://data" />
      
      {/* AI Agent */}
      <AIAgent key="support" model="gpt-4" />
      
      {/* IoT Device */}
      <IoTDevice key="sensor" type="temperature" />
      
      {/* Business Process */}
      <Workflow key="onboarding" steps={[...]} />
    </>
  );
}
```

### 12.4 Collaborative CloudDOM

**Vision:** Multiple developers editing CloudDOM in real-time (like Figma for infrastructure).

**Features:**
- Live cursors showing who's editing what
- Conflict resolution with CRDTs
- Branch previews (deploy to ephemeral environments)
- Comments and annotations on nodes

### 12.5 Time-Travel Debugging

**Vision:** Replay CloudDOM state changes like Redux DevTools.

```bash
$ creact time-travel --to 2025-10-01T10:00:00Z
# Replay all state changes from that point
# See exactly what changed and why
```

**Capabilities:**
- Replay deployments
- Inspect state at any point in time
- Debug production issues
- Audit compliance

---

## 13. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-05 | CReact Team | Initial design based on requirements |
| 2.0 | 2025-10-05 | CReact Team | Streamlined design following dependency injection pattern |
| 2.1 | 2025-10-05 | CReact Team | Added recursive composition, DevEx goals, universal CloudDOM vision, and future appendix |

---

**End of Design Document**
