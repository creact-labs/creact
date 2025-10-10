# CReact

**Infrastructure-as-Code with React patterns.**

CReact brings React's component model to infrastructure deployment. Define cloud resources using JSX, manage dependencies through context and props, and let a reactive reconciliation engine handle deployment orchestration automatically.

---

## Core Insights

CReact is built on three fundamental insights that make reactive infrastructure feasible and provider-agnostic:

### 1. Infrastructure is a Render Target, Not a Special Case

React proved that UI rendering is just a function: `UI = f(state)`. CReact extends this to infrastructure: `Infrastructure = f(state)`.

The key insight: **any system with dependencies, lifecycle, and state can use React's reconciliation model**. Infrastructure resources are nodes in a tree, just like DOM elements. Dependencies flow through the tree via context and props, just like UI components.

```tsx
// UI rendering
<div className={theme}>
  <Button onClick={handler} />
</div>

// Infrastructure rendering
<NetworkStack cidr="10.0.0.0/16">
  <Database vpcId={vpc.outputs?.vpcId} />
</NetworkStack>
```

Both are component trees. Both have dependencies. Both need reconciliation. The only difference is the materialization target.

### 2. CloudDOM: The Universal Intermediate Representation

React uses a Virtual DOM to decouple components from browser APIs. CReact uses **CloudDOM** to decouple infrastructure definitions from cloud provider APIs.

```
JSX Components → Fiber Tree → CloudDOM → Provider → Cloud Resources
```

CloudDOM is a provider-agnostic representation of infrastructure intent. It contains:
- Resource type and configuration
- Dependency relationships
- Output placeholders (populated after deployment)
- Metadata for reconciliation

**This separation is what makes CReact provider-agnostic.** Your infrastructure code never touches AWS, Azure, or GCP APIs directly. Providers implement a simple interface: materialize CloudDOM nodes and populate outputs.

```typescript
interface ICloudProvider {
  materialize(nodes: CloudDOMNode[]): Promise<void>;
}
```

Want to support a new cloud? Implement one interface. Want to wrap Terraform? Implement one interface. Want to deploy to Kubernetes? Same interface.

### 3. Output-Driven Reactivity: The Deployment Loop

Traditional IaC tools require you to manually declare dependencies (`depends_on`). CReact makes dependencies automatic through **output-driven reactivity**.

**The insight:** Infrastructure dependencies are just data dependencies. When a resource deploys, its outputs become available. Components consuming those outputs automatically re-render.

```tsx
function DatabaseStack() {
  const { vpcId } = useContext(NetworkContext); // undefined initially
  
  const db = useInstance(Database, {
    name: 'db',
    vpcId, // Can't deploy until vpcId is available
  });
  
  return <></>;
}
```

**Deployment loop:**
1. Render all components (outputs undefined)
2. Deploy resources with no dependencies
3. Outputs populated → contexts/props/state updated
4. Components with changed dependencies re-render
5. Deploy newly-ready resources
6. Repeat until stable (no output changes)

This creates a **self-orchestrating deployment system**. No dependency graphs to maintain. No topological sorting to debug. Dependencies flow naturally through the component tree.

### 4. State-Execution Separation: Crash Recovery and Resumability

Most IaC tools couple state with execution. If the process crashes mid-deployment, you're left with partial infrastructure and unclear state. CReact **separates state persistence from execution** through two distinct provider interfaces.

**The insight:** State and execution are orthogonal concerns. State should persist independently of the execution process.

```
┌─────────────────────────────────────────────────────────┐
│                    CReact Core Engine                    │
│  (Rendering, Reconciliation, Orchestration)              │
└────────────────┬────────────────────┬────────────────────┘
                 │                    │
                 ▼                    ▼
    ┌────────────────────┐  ┌────────────────────┐
    │  ICloudProvider    │  │ IBackendProvider   │
    │  (Execution)       │  │ (State)            │
    └────────────────────┘  └────────────────────┘
             │                       │
             ▼                       ▼
    ┌────────────────────┐  ┌────────────────────┐
    │  Cloud Resources   │  │  Persistent State  │
    │  (AWS, K8s, etc)   │  │  (S3, SQLite, etc) │
    └────────────────────┘  └────────────────────┘
```

**ICloudProvider: Execution Interface**

Handles resource materialization. Stateless and idempotent.

```typescript
interface ICloudProvider {
  // Deploy resources and populate outputs
  materialize(nodes: CloudDOMNode[]): Promise<void>;
  
  // Optional lifecycle hooks
  preDeploy?(cloudDOM: CloudDOMNode[]): Promise<void>;
  postDeploy?(cloudDOM: CloudDOMNode[], outputs: any): Promise<void>;
  onError?(error: Error, cloudDOM: CloudDOMNode[]): Promise<void>;
}
```

**Key properties:**
- **Stateless:** Provider doesn't track deployment state
- **Idempotent:** Can be called multiple times safely
- **Output-focused:** Only job is to materialize resources and return outputs
- **No orchestration logic:** Doesn't decide what to deploy or when

**IBackendProvider: State Interface**

Handles state persistence. Completely independent of cloud operations.

```typescript
interface IBackendProvider {
  // Save/load CloudDOM state
  saveState(stackName: string, state: CloudDOMState): Promise<void>;
  getState(stackName: string): Promise<CloudDOMState | null>;
  
  // Optional: Distributed locking for concurrent deployments
  acquireLock?(stackName: string, timeout: number): Promise<boolean>;
  releaseLock?(stackName: string): Promise<void>;
}
```

**Key properties:**
- **Cloud-agnostic:** Doesn't know about AWS, Azure, or any cloud
- **Execution-agnostic:** Doesn't know about deployment logic
- **Pure storage:** Just reads/writes CloudDOM state
- **Optional locking:** Prevents concurrent deployments to same stack

**What this separation enables:**

**1. Crash Recovery**
```bash
# Deployment crashes mid-way
$ creact deploy
Deploying VPC... ✓
Deploying Database... ✗ Process killed

# State is persisted, resume from checkpoint
$ creact deploy
Resuming from checkpoint...
VPC already deployed (skipping)
Deploying Database... ✓
```

**2. Mix-and-Match Providers**
```typescript
// Deploy to AWS, store state in S3
CReact.cloudProvider = new AWSProvider();
CReact.backendProvider = new S3BackendProvider({ bucket: 'state' });

// Deploy to Kubernetes, store state in PostgreSQL
CReact.cloudProvider = new KubernetesProvider();
CReact.backendProvider = new PostgreSQLBackendProvider({ connectionString: '...' });

// Wrap Terraform, store state locally
CReact.cloudProvider = new TerraformProvider();
CReact.backendProvider = new SQLiteBackendProvider({ path: './state.db' });
```

**3. State Inspection Without Cloud Access**
```typescript
// Read state without cloud credentials
const backend = new S3BackendProvider({ bucket: 'state' });
const state = await backend.getState('my-stack');
console.log(state.resources); // Inspect deployed resources
```

**4. Multi-Cloud Orchestration**
```typescript
// Deploy to multiple clouds, single state backend
const multiCloudProvider = new MultiCloudProvider({
  aws: new AWSProvider(),
  gcp: new GCPProvider(),
  k8s: new KubernetesProvider(),
});

CReact.cloudProvider = multiCloudProvider;
CReact.backendProvider = new S3BackendProvider({ bucket: 'state' });
```

**5. Testing Without Cloud Resources**
```typescript
// Test infrastructure code without deploying
CReact.cloudProvider = new MockCloudProvider(); // Simulates deployment
CReact.backendProvider = new InMemoryBackendProvider(); // No persistence

const cloudDOM = await CReact.renderCloudDOM(<App />, 'test-stack');
expect(cloudDOM.nodes).toHaveLength(5);
```

**State structure:**
```typescript
interface CloudDOMState {
  stackName: string;
  version: string;
  lastDeployed: string;
  nodes: CloudDOMNode[]; // Full infrastructure tree
  checkpoints: Checkpoint[]; // For crash recovery
}

interface CloudDOMNode {
  id: string;
  type: string;
  props: Record<string, any>;
  outputs?: Record<string, any>; // Populated by CloudProvider
  children: CloudDOMNode[];
}
```

The backend stores the **entire CloudDOM tree** with outputs. On next deployment:
1. Load previous CloudDOM from backend
2. Render new CloudDOM from components
3. Reconciler diffs old vs new
4. CloudProvider deploys only changes
5. Backend saves updated CloudDOM

This architecture means:
- **CReact core** handles orchestration logic (when to deploy, dependency ordering)
- **CloudProvider** handles execution (how to deploy)
- **BackendProvider** handles persistence (where to store state)

Each concern is isolated, testable, and swappable.

---

## Why This Works

These four insights combine to create a system that is:

**Declarative:** Define what you want, not how to deploy it
```tsx
<Database vpcId={vpc.outputs?.vpcId} />
// CReact figures out when and how to deploy
```

**Composable:** Build complex infrastructure from simple components
```tsx
<NetworkStack>
  <DataStack>
    <ApiStack />
  </DataStack>
</NetworkStack>
```

**Provider-Agnostic:** CloudDOM decouples intent from implementation
```typescript
// Same infrastructure code works with any provider
CReact.cloudProvider = new AWSProvider();
// or
CReact.cloudProvider = new TerraformProvider();
// or
CReact.cloudProvider = new KubernetesProvider();
```

**Self-Orchestrating:** Output-driven reactivity handles dependencies automatically
```tsx
// No depends_on needed - reactivity handles it
const vpc = useInstance(VPC, { name: 'vpc' });
const db = useInstance(Database, { vpcId: vpc.outputs?.vpcId });
```

**Resumable:** State-execution separation enables crash recovery
```bash
# Process crashes mid-deployment
$ creact deploy
Deploying... ✗ Killed

# Resume from checkpoint
$ creact deploy
Resuming from checkpoint... ✓
```

**Testable:** Mock providers enable testing without cloud resources
```typescript
CReact.cloudProvider = new MockCloudProvider();
CReact.backendProvider = new InMemoryBackendProvider();
// Test infrastructure logic without deploying
```

**Type-Safe:** TypeScript ensures correctness at compile time
```tsx
// TypeScript catches mismatched outputs
const vpc = useInstance(VPC, { name: 'vpc' });
const db = useInstance(Database, {
  vpcId: vpc.outputs?.vpcId, // ✓ Type-safe
  // vpcId: vpc.outputs?.wrongField, // ✗ Compile error
});
```

---

## Core Concept

Infrastructure deployment shares fundamental challenges with UI rendering: state management, dependency resolution, lifecycle coordination, and error recovery. CReact applies React's proven architectural patterns to solve these problems in infrastructure.

Traditional IaC tools make you think about resources in isolation. CReact makes you think about infrastructure as a component tree where dependencies flow naturally through composition, context, and props.

---

## Quick Start

```tsx
import { CReact, createContext, useContext, useInstance, useState } from '@creact-labs/creact';
import { VPC, Database, ApiGateway } from './constructs';

const NetworkContext = createContext<{ vpcId?: string }>({});

function NetworkStack({ children }) {
  const vpc = useInstance(VPC, {
    name: 'app-vpc',
    cidr: '10.0.0.0/16',
  });

  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

function DatabaseStack({ children }) {
  const { vpcId } = useContext(NetworkContext); // REACTIVE: re-renders when VPC deploys
  
  const db = useInstance(Database, {
    name: 'app-db',
    vpcId, // Dependency flows through context
  });

  return (
    <DatabaseContext.Provider value={{ endpoint: db.outputs?.endpoint }}>
      {children}
    </DatabaseContext.Provider>
  );
}

function ApiStack({ region }: { region: string }) {
  const { endpoint } = useContext(DatabaseContext); // REACTIVE: re-renders when DB deploys
  
  const api = useInstance(ApiGateway, {
    name: `api-${region}`,
    region, // Dependency flows through props
    dbUrl: endpoint, // Dependency flows through context
  });

  return <></>;
}

function App() {
  const regions = ['us-east-1', 'eu-west-1'];

  return (
    <NetworkStack>
      <DatabaseStack>
        {regions.map(region => (
          <ApiStack key={region} region={region} />
        ))}
      </DatabaseStack>
    </NetworkStack>
  );
}
```

**Deployment behavior:**

```
Cycle 1: Initial Render
  → All components execute, outputs undefined
  → VPC scheduled for deployment (no dependencies)

Cycle 2: VPC Deployed
  → VPC outputs populated: vpcId = "vpc-123"
  → NetworkContext updated
  → DatabaseStack re-renders (context changed)
  → Database scheduled for deployment with vpcId

Cycle 3: Database Deployed
  → Database outputs populated: endpoint = "db.rds.amazonaws.com"
  → DatabaseContext updated
  → Both ApiStack components re-render (context changed)
  → APIs scheduled for deployment in parallel

Cycle 4: APIs Deployed
  → API outputs populated
  → No context changes
  → Infrastructure stable
```

---

## Reactivity Model

CReact supports **three types of reactivity** for infrastructure dependencies. All three are first-class reactive mechanisms:

### 1. State-Bound Reactivity

`useState` creates persistent state that survives deployments. **When bound to resource outputs, it becomes reactive** and triggers re-renders in components that depend on it.

```tsx
function MonitoringStack() {
  // State bound to outputs becomes REACTIVE
  const [apiEndpoints, setApiEndpoints] = useState<string[]>([]);
  
  const api1 = useInstance(ApiGateway, { name: 'api-1' });
  const api2 = useInstance(ApiGateway, { name: 'api-2' });
  
  // Bind state to outputs - this makes apiEndpoints reactive
  setApiEndpoints([
    api1.outputs?.endpoint,
    api2.outputs?.endpoint,
  ].filter(Boolean));
  
  // This component re-renders when apiEndpoints changes
  const monitor = useInstance(CloudWatch, {
    name: 'monitor',
    targets: apiEndpoints, // REACTIVE: re-renders when state changes
  });

  return <></>;
}
```

**State reactivity flow:**
```
Cycle 1: APIs have no outputs → apiEndpoints = []
Cycle 2: APIs deploy → outputs populated → apiEndpoints updated → MonitoringStack re-renders
Cycle 3: Monitor deploys with actual endpoints
```

**When to use:** Aggregating multiple outputs, transforming outputs, persistent metadata, cross-component state.

### 2. Context-Bound Reactivity

Components automatically re-render when context values containing resource outputs change.

```tsx
const NetworkContext = createContext<{ vpcId?: string }>({});

function NetworkStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc', cidr: '10.0.0.0/16' });
  
  // Provide outputs via context - makes context reactive
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

function DatabaseStack() {
  const { vpcId } = useContext(NetworkContext); // REACTIVE
  
  // Re-renders automatically when VPC deploys and vpcId becomes available
  const db = useInstance(Database, {
    name: 'db',
    vpcId, // REACTIVE: re-renders when context changes
  });

  return <></>;
}
```

**Context reactivity flow:**
```
Cycle 1: VPC has no outputs → vpcId = undefined
Cycle 2: VPC deploys → vpcId = "vpc-123" → NetworkContext updated → DatabaseStack re-renders
Cycle 3: Database deploys with vpcId
```

**When to use:** Sharing outputs across multiple components, deep component trees, cross-layer dependencies.

### 3. Props-Bound Reactivity

Components re-render when props containing resource outputs change.

```tsx
function RegionalApi({ region, dbEndpoint }: { region: string; dbEndpoint?: string }) {
  // Re-renders when dbEndpoint prop changes
  const api = useInstance(ApiGateway, {
    name: `api-${region}`,
    region,
    dbUrl: dbEndpoint, // REACTIVE: re-renders when prop changes
  });

  return <></>;
}

function App() {
  const db = useInstance(Database, { name: 'db' });
  
  // Children re-render when db.outputs.endpoint changes
  return (
    <>
      <RegionalApi region="us-east-1" dbEndpoint={db.outputs?.endpoint} />
      <RegionalApi region="eu-west-1" dbEndpoint={db.outputs?.endpoint} />
    </>
  );
}
```

**Props reactivity flow:**
```
Cycle 1: Database has no outputs → dbEndpoint = undefined
Cycle 2: Database deploys → dbEndpoint = "db.rds.aws.com" → Props change → RegionalApi re-renders
Cycle 3: APIs deploy with dbEndpoint
```

**When to use:** Parent-child relationships, explicit dependency control, component reusability.

---

## Multi-Layer Architecture Example

Real-world applications have complex dependency graphs. CReact handles multi-layer architectures automatically:

```tsx
// Layer 1: Network Foundation
function NetworkStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc', cidr: '10.0.0.0/16' });
  
  const publicSubnet = useInstance(Subnet, {
    name: 'public-subnet',
    vpcId: vpc.outputs?.vpcId, // Internal dependency
    cidr: '10.0.1.0/24',
  });
  
  const privateSubnet = useInstance(Subnet, {
    name: 'private-subnet',
    vpcId: vpc.outputs?.vpcId, // Internal dependency
    cidr: '10.0.10.0/24',
  });

  return (
    <NetworkContext.Provider value={{
      vpcId: vpc.outputs?.vpcId,
      publicSubnetIds: [publicSubnet.outputs?.subnetId],
      privateSubnetIds: [privateSubnet.outputs?.subnetId],
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

// Layer 2: Data Layer (depends on Network)
function DataStack({ children }) {
  const { vpcId, privateSubnetIds } = useContext(NetworkContext); // REACTIVE
  
  const database = useInstance(Database, {
    name: 'db',
    vpcId,
    subnetIds: privateSubnetIds,
  });
  
  const cache = useInstance(Cache, {
    name: 'cache',
    vpcId,
    subnetIds: privateSubnetIds,
  });

  return (
    <DataContext.Provider value={{
      dbEndpoint: database.outputs?.endpoint,
      cacheEndpoint: cache.outputs?.endpoint,
    }}>
      {children}
    </DataContext.Provider>
  );
}

// Layer 3: Storage Layer (depends on Network)
function StorageStack({ children }) {
  const { vpcId } = useContext(NetworkContext); // REACTIVE
  
  const bucket = useInstance(S3Bucket, {
    name: 'assets',
    vpcEndpoint: vpcId,
  });
  
  const cdn = useInstance(CloudFront, {
    name: 'cdn',
    origins: [{ domainName: bucket.outputs?.domainName }],
  });

  return (
    <StorageContext.Provider value={{
      bucketName: bucket.outputs?.bucketName,
      cdnUrl: cdn.outputs?.domainName,
    }}>
      {children}
    </StorageContext.Provider>
  );
}

// Layer 4: API Layer (depends on Network, Data, Storage)
function ApiStack({ children }) {
  const { privateSubnetIds } = useContext(NetworkContext); // REACTIVE
  const { dbEndpoint, cacheEndpoint } = useContext(DataContext); // REACTIVE
  const { bucketName } = useContext(StorageContext); // REACTIVE
  
  const lambda = useInstance(Lambda, {
    name: 'api-handler',
    environment: {
      DB_URL: dbEndpoint,
      CACHE_URL: cacheEndpoint,
      BUCKET: bucketName,
    },
    vpcConfig: { subnetIds: privateSubnetIds },
  });
  
  const api = useInstance(ApiGateway, {
    name: 'api',
    lambdaArn: lambda.outputs?.functionArn,
  });

  return (
    <ApiContext.Provider value={{
      apiEndpoint: api.outputs?.endpoint,
    }}>
      {children}
    </ApiContext.Provider>
  );
}

// Layer 5: Observability (depends on API, Data)
function ObservabilityStack() {
  const { apiEndpoint } = useContext(ApiContext); // REACTIVE
  const { dbEndpoint } = useContext(DataContext); // REACTIVE
  
  useInstance(Monitoring, {
    name: 'monitoring',
    targets: [apiEndpoint, dbEndpoint],
  });
  
  useInstance(Backup, {
    name: 'backup',
    resources: [dbEndpoint],
    schedule: 'daily',
  });

  return <></>;
}

// Root: Compose all layers
function App() {
  return (
    <NetworkStack>
      <DataStack>
        <StorageStack>
          <ApiStack>
            <ObservabilityStack />
          </ApiStack>
        </StorageStack>
      </DataStack>
    </NetworkStack>
  );
}
```

**Deployment sequence:**

```
Cycle 1: Network Layer
  → VPC, Subnets deploy
  → NetworkContext updated

Cycle 2: Data & Storage Layers (parallel)
  → Database, Cache deploy (depend on Network)
  → S3, CloudFront deploy (depend on Network)
  → DataContext and StorageContext updated

Cycle 3: API Layer
  → Lambda, API Gateway deploy (depend on Network, Data, Storage)
  → ApiContext updated

Cycle 4: Observability Layer
  → Monitoring, Backup deploy (depend on API, Data)

Cycle 5: Complete
  → No further changes
```

---

## Choosing the Right Reactivity Pattern

All three patterns are reactive when bound to outputs. Choose based on your use case:

### Use State When:

```tsx
// ✅ Aggregating multiple outputs
function MonitoringStack() {
  const [allEndpoints, setAllEndpoints] = useState<string[]>([]);
  
  const api1 = useInstance(ApiGateway, { name: 'api-1' });
  const api2 = useInstance(ApiGateway, { name: 'api-2' });
  const api3 = useInstance(ApiGateway, { name: 'api-3' });
  
  // Aggregate outputs into state - REACTIVE
  setAllEndpoints([
    api1.outputs?.endpoint,
    api2.outputs?.endpoint,
    api3.outputs?.endpoint,
  ].filter(Boolean));
  
  const monitor = useInstance(Monitoring, { targets: allEndpoints });
  return <></>;
}

// ✅ Transforming outputs
function TransformStack() {
  const [config, setConfig] = useState<Config>();
  
  const db = useInstance(Database, { name: 'db' });
  
  // Transform output - REACTIVE
  setConfig({
    connectionString: `postgres://${db.outputs?.endpoint}:5432/mydb`,
    poolSize: 10,
  });
  
  const app = useInstance(Application, { config });
  return <></>;
}

// ✅ Persistent metadata across deployments
function AppStack() {
  const [deployCount, setDeployCount] = useState(0);
  const [lastDeployTime, setLastDeployTime] = useState<string>();
  
  setDeployCount(prev => (prev || 0) + 1);
  setLastDeployTime(new Date().toISOString());
  
  // Metadata persists across deployments
  return <></>;
}
```

### Use Context When:

```tsx
// ✅ Deep component trees (avoid prop drilling)
<NetworkStack>
  <DataStack>
    <ApiStack>
      <MonitoringStack /> {/* Needs network config - REACTIVE via context */}
    </ApiStack>
  </DataStack>
</NetworkStack>

// ✅ Shared dependencies across multiple components
const NetworkContext = createContext<{ vpcId?: string }>({});

function Component1() {
  const { vpcId } = useContext(NetworkContext); // REACTIVE
  const resource1 = useInstance(Resource1, { vpcId });
  return <></>;
}

function Component2() {
  const { vpcId } = useContext(NetworkContext); // REACTIVE
  const resource2 = useInstance(Resource2, { vpcId });
  return <></>;
}

// ✅ Cross-layer dependencies
function ObservabilityStack() {
  const { apiEndpoint } = useContext(ApiContext); // REACTIVE - from layer 4
  const { dbEndpoint } = useContext(DataContext); // REACTIVE - from layer 2
  
  const monitor = useInstance(Monitoring, {
    targets: [apiEndpoint, dbEndpoint],
  });
  return <></>;
}
```

### Use Props When:

```tsx
// ✅ Parent-child relationships
function Parent() {
  const db = useInstance(Database, { name: 'db' });
  // Child re-renders when db.outputs.endpoint changes - REACTIVE
  return <Child dbUrl={db.outputs?.endpoint} />;
}

// ✅ Explicit dependencies
function RegionalApi({ region, dbUrl }: { region: string; dbUrl?: string }) {
  // Re-renders when dbUrl prop changes - REACTIVE
  const api = useInstance(ApiGateway, { name: `api-${region}`, dbUrl });
  return <></>;
}

// ✅ Component reusability
function ReusableStack({ name, size }: { name: string; size: string }) {
  const resource = useInstance(Resource, { name, size });
  return <></>;
}
```

### Combining Patterns

You can combine all three for complex scenarios:

```tsx
function ComplexStack({ region }: { region: string }) {
  // Props: region (REACTIVE if parent changes it)
  
  // Context: shared network config (REACTIVE)
  const { vpcId, subnetIds } = useContext(NetworkContext);
  
  // State: aggregate multiple outputs (REACTIVE)
  const [endpoints, setEndpoints] = useState<string[]>([]);
  
  const api1 = useInstance(ApiGateway, {
    name: `api1-${region}`,
    vpcId, // From context
  });
  
  const api2 = useInstance(ApiGateway, {
    name: `api2-${region}`,
    vpcId, // From context
  });
  
  // Aggregate into state
  setEndpoints([api1.outputs?.endpoint, api2.outputs?.endpoint].filter(Boolean));
  
  // Use aggregated state
  const monitor = useInstance(Monitoring, {
    region, // From props
    targets: endpoints, // From state
    vpcId, // From context
  });
  
  return <></>;
}
```

---

## API Reference

### useInstance(Construct, props)

Creates an infrastructure resource. Returns a node with `outputs` that populate after deployment.

```tsx
const vpc = useInstance(VPC, {
  name: 'app-vpc',
  cidr: '10.0.0.0/16',
});

// Before deployment:
vpc.outputs === undefined

// After deployment:
vpc.outputs === {
  vpcId: "vpc-123",
  cidrBlock: "10.0.0.0/16",
  defaultSecurityGroupId: "sg-456"
}
```

**Reactivity:** Components re-render when outputs of resources they depend on change.

### useState(initialValue)

Persistent state that survives across deployments. **When bound to resource outputs, it becomes reactive** and triggers re-renders.

```tsx
const [deployCount, setDeployCount] = useState(0);
const [apiUrls, setApiUrls] = useState<string[]>([]);

// Track metadata (persistent, not reactive - no output binding)
setDeployCount(prev => (prev || 0) + 1);

// Bind to resource outputs (persistent AND REACTIVE)
const api1 = useInstance(ApiGateway, { name: 'api-1' });
const api2 = useInstance(ApiGateway, { name: 'api-2' });
setApiUrls([api1.outputs?.endpoint, api2.outputs?.endpoint].filter(Boolean));

// This component re-renders when apiUrls changes (reactive binding)
const monitor = useInstance(Monitoring, { targets: apiUrls });
```

**Reactivity:** State bound to outputs triggers re-renders when outputs change. State not bound to outputs is persistent but not reactive.

**Key distinction:** Updates persist to backend storage, not in-memory like React. Changes take effect in the next deployment cycle.

### useContext(Context)

Read values from context. Reactive when context contains resource outputs.

```tsx
const NetworkContext = createContext<{ vpcId?: string }>({});

function DatabaseStack() {
  const { vpcId } = useContext(NetworkContext); // REACTIVE
  
  // Re-renders when VPC deploys and vpcId becomes available
  const db = useInstance(Database, { vpcId });
  return <></>;
}
```

**Reactive behavior:** Components re-render when context values bound to provider outputs change.

### createContext(defaultValue)

Creates a context for sharing values across components.

```tsx
interface NetworkOutputs {
  vpcId?: string;
  subnetIds?: string[];
}

const NetworkContext = createContext<NetworkOutputs>({});

function NetworkStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc' });
  
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}
```

---

## How It Works

### Render Pipeline

```
JSX Components
    ↓
Fiber Tree (React-inspired reconciliation structure)
    ↓
CloudDOM (Infrastructure representation)
    ↓
Reconciler (Computes minimal change set)
    ↓
State Machine (Orchestrates deployment with rollback)
    ↓
Provider (Materializes resources to cloud)
```

### Deployment Phases

**Phase 1: Render**
- Components execute and call hooks
- useInstance creates CloudDOM nodes (outputs empty)
- useContext reads current context values
- useState reads persisted state
- Dependencies tracked automatically

**Phase 2: Reconciliation**
- Compare previous CloudDOM with current
- Compute minimal change set (creates, updates, deletes)
- Topologically sort by dependencies
- Generate deployment plan

**Phase 3: Deployment**
- Provider materializes resources
- Outputs populated from cloud APIs
- State persisted to backend
- Deployment checkpointed for crash recovery

**Phase 4: Output Sync**
- New outputs synced to CloudDOM nodes
- Context values updated
- Bound state updated
- Change detection for next cycle

**Phase 5: Reactive Re-render**
- Components with changed dependencies re-render
- New CloudDOM generated
- Reconciliation repeats if changes detected
- Process continues until stable (no output changes)

### Dependency Tracking

CReact automatically tracks three types of reactive dependencies:

1. **State-bound dependencies:** Components re-render when state bound to outputs changes
2. **Context-bound dependencies:** Components re-render when context values containing outputs change
3. **Props-bound dependencies:** Components re-render when props containing outputs change

```tsx
function ExampleStack({ region, dbUrl }: { region: string; dbUrl?: string }) {
  // Props dependency (REACTIVE if bound to output)
  // Re-renders when dbUrl changes
  
  // Context dependency (REACTIVE if bound to output)
  const { vpcId } = useContext(NetworkContext);
  // Re-renders when vpcId changes
  
  // State dependency (REACTIVE if bound to output)
  const [endpoints, setEndpoints] = useState<string[]>([]);
  
  const api = useInstance(ApiGateway, {
    name: `api-${region}`,
    vpcId, // Uses context dependency
    dbUrl, // Uses props dependency
  });
  
  // Bind state to output (makes endpoints reactive)
  setEndpoints(prev => [...(prev || []), api.outputs?.endpoint].filter(Boolean));
  
  // This component re-renders when:
  // 1. dbUrl prop changes (props-bound reactivity)
  // 2. vpcId in NetworkContext changes (context-bound reactivity)
  // 3. endpoints state changes (state-bound reactivity)
  
  return <></>;
}
```

**Key insight:** All three patterns are reactive when bound to resource outputs. The binding creates the reactive dependency.

---

## Provider System

CReact separates infrastructure definition from deployment implementation through providers.

### Cloud Provider

Implements resource materialization:

```typescript
import { ICloudProvider, CloudDOMNode } from '@creact-labs/creact';

export class AWSProvider implements ICloudProvider {
  async materialize(nodes: CloudDOMNode[]): Promise<void> {
    for (const node of nodes) {
      // Deploy to AWS
      const resource = await this.createAWSResource(node);
      
      // Populate outputs (triggers reactivity)
      node.outputs = {
        arn: resource.Arn,
        id: resource.ResourceId,
        endpoint: resource.Endpoint
      };
    }
  }
}
```

### Backend Provider

Implements state persistence:

```typescript
import { IBackendProvider } from '@creact-labs/creact';

export class S3BackendProvider implements IBackendProvider {
  async saveState(stackName: string, state: any): Promise<void> {
    await this.s3.putObject({
      Bucket: this.bucket,
      Key: `${stackName}.json`,
      Body: JSON.stringify(state)
    });
  }

  async getState(stackName: string): Promise<any> {
    const object = await this.s3.getObject({
      Bucket: this.bucket,
      Key: `${stackName}.json`
    });
    return JSON.parse(object.Body.toString());
  }
}
```

### Configuration

```typescript
import { CReact } from '@creact-labs/creact';
import { AWSProvider, S3BackendProvider } from './providers';

CReact.cloudProvider = new AWSProvider();
CReact.backendProvider = new S3BackendProvider({ bucket: 'my-state-bucket' });

export default async function () {
  return CReact.renderCloudDOM(<App />, 'my-app');
}
```

---

## Development Workflow

### Hot Reload

Watch mode detects file changes and triggers incremental updates:

```bash
creact dev --entry app.tsx --auto-approve
```

**Behavior:**
- File change detected
- Component tree re-rendered
- Reconciler computes diff against deployed state
- Only changed resources redeployed
- State preserved across reloads

### Manual Deployment

Explicit deployment control:

```bash
creact build --entry app.tsx  # Generate CloudDOM
creact plan                    # Preview changes
creact deploy                  # Apply changes
```

---

## Key Differences from React

| Aspect | React | CReact |
|--------|-------|--------|
| **Render target** | DOM elements | Cloud resources |
| **Render frequency** | Milliseconds (continuous) | Minutes (deliberate cycles) |
| **Render cost** | Free (memory updates) | Expensive (cloud operations) |
| **State persistence** | Session (memory) | Deployment (backend) |
| **useState behavior** | Reactive (immediate) | Reactive when bound to outputs (next cycle) |
| **useContext behavior** | Reactive (immediate) | Reactive when bound to outputs (next cycle) |
| **Props behavior** | Reactive (immediate) | Reactive when bound to outputs (next cycle) |
| **Re-render trigger** | State/props change | Output change |
| **Reconciliation** | Virtual DOM diff | CloudDOM diff |
| **Side effects** | useEffect | Provider lifecycle hooks |

---

## Best Practices

### Component Design

```tsx
// ✅ Good: One resource per component
function VPCStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc', cidr: '10.0.0.0/16' });
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

// ❌ Avoid: Multiple unrelated resources
function NetworkStack() {
  const vpc = useInstance(VPC, { name: 'vpc' });
  const db = useInstance(Database, { name: 'db' }); // Unrelated to network
  const api = useInstance(ApiGateway, { name: 'api' }); // Unrelated to network
  return <></>;
}
```

### Dependency Management

```tsx
// ✅ Good: Context for shared dependencies
const NetworkContext = createContext<{ vpcId?: string }>({});

function NetworkStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc' });
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

// ✅ Good: Props for explicit dependencies
function RegionalApi({ region, dbUrl }: { region: string; dbUrl?: string }) {
  const api = useInstance(ApiGateway, { name: `api-${region}`, dbUrl });
  return <></>;
}

// ❌ Avoid: Passing outputs directly without reactivity
function BadExample() {
  const vpc = useInstance(VPC, { name: 'vpc' });
  const vpcId = vpc.outputs?.vpcId; // Not reactive
  
  // This won't re-render when VPC deploys
  return <DatabaseStack vpcId={vpcId} />;
}
```

### State Management

```tsx
// ✅ Good: useState bound to outputs (REACTIVE + persistent)
function MonitoringStack() {
  const [endpoints, setEndpoints] = useState<string[]>([]);
  
  const api1 = useInstance(ApiGateway, { name: 'api-1' });
  const api2 = useInstance(ApiGateway, { name: 'api-2' });
  
  // Bind state to outputs - makes it REACTIVE
  setEndpoints([api1.outputs?.endpoint, api2.outputs?.endpoint].filter(Boolean));
  
  // Monitor re-renders when endpoints changes (reactive binding)
  const monitor = useInstance(Monitoring, { targets: endpoints });
  return <></>;
}

// ✅ Good: useState for metadata (persistent, not reactive)
function AppStack() {
  const [deployCount, setDeployCount] = useState(0);
  const [lastDeploy, setLastDeploy] = useState<string>();
  
  // Not bound to outputs - persistent but not reactive
  setDeployCount(prev => (prev || 0) + 1);
  setLastDeploy(new Date().toISOString());
  
  return <></>;
}

// ❌ Avoid: Local variables for outputs (not persistent, not reactive)
function BadExample() {
  const api = useInstance(ApiGateway, { name: 'api' });
  const endpoint = api.outputs?.endpoint; // Lost on re-render, not reactive
  
  // endpoint is neither persisted nor reactive
  return <></>;
}
```

## License

Apache License 2.0
