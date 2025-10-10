# CReact

**Infrastructure-as-Code with React patterns.**

Write infrastructure using JSX components. Dependencies flow through context and props. Deployments orchestrate themselves through reactive reconciliation.

---

## Why CReact Exists

Infrastructure deployment has the same problems as UI rendering: managing state, resolving dependencies, coordinating lifecycles, and recovering from failures. React solved these problems for UI. CReact applies the same patterns to infrastructure.

The key insight: **infrastructure is just another render target**. Instead of rendering to DOM, we render to CloudDOM - an intermediate representation that providers materialize into actual cloud resources.

---

## Core Architecture

CReact separates three concerns that traditional IaC tools mix together:

### 1. Infrastructure Definition (Your Code)

Write components that declare what infrastructure you want:

```tsx
function App() {
  const vpc = useInstance(VPC, { cidr: '10.0.0.0/16' });
  const db = useInstance(Database, { vpcId: vpc.outputs?.vpcId });
  return <></>;
}
```

### 2. State Storage (Backend Provider)

State lives in a shared backend, independent of where you run deployments:

```typescript
interface IBackendProvider {
  getState(stackName: string): Promise<CloudDOMState | null>;
  saveState(stackName: string, state: CloudDOMState): Promise<void>;
}
```

### 3. Resource Execution (Cloud Provider)

Providers materialize CloudDOM nodes into actual resources:

```typescript
interface ICloudProvider {
  materialize(nodes: CloudDOMNode[]): Promise<void>;
}
```

**The separation is what makes CReact powerful:**

```
Your Laptop          CI/CD Server        Teammate's Machine
     │                    │                      │
     └────────────────────┼──────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Backend Provider    │
              │  (Shared State: S3,   │
              │   PostgreSQL, etc.)   │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Cloud Provider      │
              │  (AWS, GCP, K8s,      │
              │   Terraform, etc.)    │
              └───────────────────────┘
```

**Every deployment, from anywhere:**
1. Load state from backend
2. Render components to CloudDOM
3. Diff old vs new CloudDOM
4. Deploy only changes via provider
5. Save updated state to backend

**This means:**
- Start deployment on laptop, continue from CI/CD
- No state files to commit or sync
- Team members see each other's changes automatically
- Process crashes don't lose state
- Test with mock providers, deploy with real ones

---

## Quick Start

```tsx
import { CReact, createContext, useContext, useInstance } from '@creact-labs/creact';

// Define infrastructure as components
const NetworkContext = createContext<{ vpcId?: string }>({});

function NetworkStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc', cidr: '10.0.0.0/16' });
  
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

function DatabaseStack() {
  const { vpcId } = useContext(NetworkContext);
  
  const db = useInstance(Database, {
    name: 'db',
    vpcId, // Reactive: re-renders when VPC deploys
  });
  
  return <></>;
}

function App() {
  return (
    <NetworkStack>
      <DatabaseStack />
    </NetworkStack>
  );
}

// Configure providers
CReact.cloudProvider = new AWSProvider();
CReact.backendProvider = new S3BackendProvider({ bucket: 'my-state' });

// Deploy
export default async function () {
  return CReact.renderCloudDOM(<App />, 'my-stack');
}
```

**Deploy:**
```bash
creact deploy --entry app.tsx
```

**What happens:**
```
Cycle 1: Initial render
  → VPC has no outputs yet
  → VPC scheduled for deployment

Cycle 2: VPC deployed
  → VPC outputs: { vpcId: "vpc-123" }
  → NetworkContext updated
  → DatabaseStack re-renders (context changed)
  → Database scheduled with vpcId

Cycle 3: Database deployed
  → Database outputs: { endpoint: "db.rds.aws.com" }
  → No more context changes
  → Deployment complete
```

---

## Reactivity: How Dependencies Work

CReact has three reactive mechanisms. All work the same way: **when outputs change, components re-render**.

### Context-Based Reactivity

Share outputs across components. Consumers re-render when context values change.

```tsx
const NetworkContext = createContext<{ vpcId?: string }>({});

function NetworkStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc' });
  
  // Provide outputs via context
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

function DatabaseStack() {
  const { vpcId } = useContext(NetworkContext);
  
  // Re-renders when vpcId becomes available
  const db = useInstance(Database, { vpcId });
  return <></>;
}
```

**Use for:** Shared dependencies, deep component trees, cross-layer dependencies.

### Props-Based Reactivity

Pass outputs as props. Children re-render when props change.

```tsx
function Parent() {
  const db = useInstance(Database, { name: 'db' });
  
  // Child re-renders when db.outputs.endpoint changes
  return <Child dbUrl={db.outputs?.endpoint} />;
}

function Child({ dbUrl }: { dbUrl?: string }) {
  // Re-renders when dbUrl prop changes
  const api = useInstance(ApiGateway, { dbUrl });
  return <></>;
}
```

**Use for:** Parent-child relationships, explicit dependencies, reusable components.

### State-Based Reactivity

Bind state to outputs. Components using that state re-render when it changes.

```tsx
function MonitoringStack() {
  const [endpoints, setEndpoints] = useState<string[]>([]);
  
  const api1 = useInstance(ApiGateway, { name: 'api-1' });
  const api2 = useInstance(ApiGateway, { name: 'api-2' });
  
  // Bind state to outputs
  setEndpoints([
    api1.outputs?.endpoint,
    api2.outputs?.endpoint,
  ].filter(Boolean));
  
  // Re-renders when endpoints changes
  const monitor = useInstance(Monitoring, { targets: endpoints });
  return <></>;
}
```

**Use for:** Aggregating outputs, transforming outputs, persistent metadata.

---

## Multi-Layer Architecture

Real infrastructure has complex dependencies. CReact handles them automatically:

```tsx
function App() {
  return (
    <NetworkStack>      {/* Layer 1: Foundation */}
      <DataStack>       {/* Layer 2: Depends on Network */}
        <StorageStack>  {/* Layer 3: Depends on Network */}
          <ApiStack>    {/* Layer 4: Depends on all above */}
            <ObservabilityStack /> {/* Layer 5: Depends on API */}
          </ApiStack>
        </StorageStack>
      </DataStack>
    </NetworkStack>
  );
}
```

**Deployment sequence:**
```
Cycle 1: Network deploys
  → VPC, Subnets, Security Groups
  → NetworkContext updated

Cycle 2: Data & Storage deploy (parallel)
  → Database, Cache (use NetworkContext)
  → S3, CloudFront (use NetworkContext)
  → DataContext and StorageContext updated

Cycle 3: API deploys
  → Lambda, API Gateway (use all contexts)
  → ApiContext updated

Cycle 4: Observability deploys
  → Monitoring, Backup (use ApiContext)

Cycle 5: Complete
  → No more output changes
```

**Example with all three reactive patterns:**

```tsx
const NetworkContext = createContext<{ vpcId?: string }>({});
const DataContext = createContext<{ dbUrl?: string }>({});

function NetworkStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc', cidr: '10.0.0.0/16' });
  
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

function DataStack({ children }) {
  const { vpcId } = useContext(NetworkContext); // Context reactivity
  
  const db = useInstance(Database, { name: 'db', vpcId });
  
  return (
    <DataContext.Provider value={{ dbUrl: db.outputs?.endpoint }}>
      {children}
    </DataContext.Provider>
  );
}

function ApiStack({ region }: { region: string }) { // Props reactivity
  const { vpcId } = useContext(NetworkContext); // Context reactivity
  const { dbUrl } = useContext(DataContext); // Context reactivity
  
  const [endpoints, setEndpoints] = useState<string[]>([]); // State reactivity
  
  const api = useInstance(ApiGateway, {
    name: `api-${region}`,
    vpcId,
    dbUrl,
  });
  
  setEndpoints(prev => [...(prev || []), api.outputs?.endpoint].filter(Boolean));
  
  return <></>;
}

function App() {
  const regions = ['us-east-1', 'eu-west-1'];
  
  return (
    <NetworkStack>
      <DataStack>
        {regions.map(region => (
          <ApiStack key={region} region={region} />
        ))}
      </DataStack>
    </NetworkStack>
  );
}
```

---

## Provider System

CReact is provider-agnostic. The same infrastructure code works with any provider.

### Backend Provider: Where State Lives

```typescript
// S3 backend
CReact.backendProvider = new S3BackendProvider({ 
  bucket: 'my-state',
  region: 'us-east-1'
});

// PostgreSQL backend
CReact.backendProvider = new PostgreSQLBackendProvider({
  connectionString: 'postgresql://...'
});

// SQLite backend (local development)
CReact.backendProvider = new SQLiteBackendProvider({
  path: './state.db'
});

// In-memory backend (testing)
CReact.backendProvider = new InMemoryBackendProvider();
```

**State structure:**
```typescript
interface CloudDOMState {
  stackName: string;
  lastDeployed: string;
  nodes: CloudDOMNode[]; // Full infrastructure tree with outputs
}

interface CloudDOMNode {
  id: string;
  type: string;
  props: Record<string, any>;
  outputs?: Record<string, any>; // Populated by CloudProvider
  children: CloudDOMNode[];
}
```

### Cloud Provider: How Resources Deploy

```typescript
// AWS provider
CReact.cloudProvider = new AWSProvider();

// Kubernetes provider
CReact.cloudProvider = new KubernetesProvider();

// Terraform provider (wrap existing Terraform modules)
CReact.cloudProvider = new TerraformProvider();

// Docker provider
CReact.cloudProvider = new DockerProvider();

// Mock provider (testing)
CReact.cloudProvider = new MockCloudProvider();
```

**Implementing a provider:**

```typescript
import { ICloudProvider, CloudDOMNode } from '@creact-labs/creact';

export class CustomProvider implements ICloudProvider {
  async materialize(nodes: CloudDOMNode[]): Promise<void> {
    for (const node of nodes) {
      // 1. Create the resource
      const resource = await this.createResource(node.type, node.props);
      
      // 2. Populate outputs (this triggers reactivity)
      node.outputs = {
        id: resource.id,
        endpoint: resource.endpoint,
        // ... other outputs
      };
    }
  }
  
  private async createResource(type: string, props: any): Promise<any> {
    // Your deployment logic here
    // Call cloud APIs, run Terraform, deploy to K8s, etc.
  }
}
```

**Mix and match:**

```typescript
// Deploy to AWS, store state in PostgreSQL
CReact.cloudProvider = new AWSProvider();
CReact.backendProvider = new PostgreSQLBackendProvider({ ... });

// Deploy with Terraform, store state in S3
CReact.cloudProvider = new TerraformProvider();
CReact.backendProvider = new S3BackendProvider({ ... });

// Test with mocks, no persistence
CReact.cloudProvider = new MockCloudProvider();
CReact.backendProvider = new InMemoryBackendProvider();
```

---

## API Reference

### useInstance(Construct, props)

Creates an infrastructure resource. Returns a node with `outputs` populated after deployment.

```tsx
const vpc = useInstance(VPC, {
  name: 'app-vpc',
  cidr: '10.0.0.0/16',
});

// Before deployment: vpc.outputs === undefined
// After deployment: vpc.outputs === { vpcId: "vpc-123", ... }
```

### useState(initialValue)

Persistent state that survives deployments. Reactive when bound to outputs.

```tsx
const [count, setCount] = useState(0);
const [endpoints, setEndpoints] = useState<string[]>([]);

// Not reactive (just metadata)
setCount(prev => (prev || 0) + 1);

// Reactive (bound to outputs)
const api = useInstance(ApiGateway, { name: 'api' });
setEndpoints([api.outputs?.endpoint].filter(Boolean));
```

### useContext(Context)

Read values from context. Reactive when context contains outputs.

```tsx
const NetworkContext = createContext<{ vpcId?: string }>({});

function Component() {
  const { vpcId } = useContext(NetworkContext);
  // Re-renders when vpcId changes
  return <></>;
}
```

### createContext(defaultValue)

Creates a context for sharing values across components.

```tsx
interface NetworkOutputs {
  vpcId?: string;
  subnetIds?: string[];
}

const NetworkContext = createContext<NetworkOutputs>({});
```

---

## CLI Commands

```bash
# Build CloudDOM without deploying
creact build --entry app.tsx

# Preview changes (like terraform plan)
creact plan --entry app.tsx

# Deploy infrastructure
creact deploy --entry app.tsx

# Hot reload development mode
creact dev --entry app.tsx --auto-approve

# Resume failed deployment
creact deploy --entry app.tsx
# Automatically resumes from checkpoint
```

---

## Development Workflow

### Local Development

```bash
# Use SQLite backend for local state
creact dev --entry app.tsx --auto-approve
```

File changes trigger incremental updates. Only modified resources redeploy.

### Team Collaboration

```typescript
// Shared S3 backend
CReact.backendProvider = new S3BackendProvider({ 
  bucket: 'team-state',
  region: 'us-east-1'
});
```

All team members deploy to the same state. Changes are visible immediately.

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: creact deploy --entry app.tsx
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

State automatically loads from backend. No state files to manage.

### Testing

```typescript
import { CReact, MockCloudProvider, InMemoryBackendProvider } from '@creact-labs/creact';

describe('Infrastructure', () => {
  beforeEach(() => {
    CReact.cloudProvider = new MockCloudProvider();
    CReact.backendProvider = new InMemoryBackendProvider();
  });

  it('should create VPC and Database', async () => {
    const cloudDOM = await CReact.renderCloudDOM(<App />, 'test-stack');
    
    expect(cloudDOM.nodes).toHaveLength(2);
    expect(cloudDOM.nodes[0].type).toBe('VPC');
    expect(cloudDOM.nodes[1].type).toBe('Database');
  });
});
```

---

## Key Differences from React

| Aspect | React | CReact |
|--------|-------|--------|
| **Render target** | DOM elements | Cloud resources |
| **Render frequency** | Milliseconds | Minutes |
| **Render cost** | Free (memory) | Expensive (cloud ops) |
| **State persistence** | Session (memory) | Deployment (backend) |
| **Re-render trigger** | State/props change | Output change |
| **Reconciliation** | Virtual DOM diff | CloudDOM diff |
| **Side effects** | useEffect | Provider lifecycle hooks |

---

## Key Differences from Traditional IaC

| Aspect | Terraform/Pulumi | CReact |
|--------|------------------|--------|
| **Dependencies** | Manual `depends_on` | Automatic (reactive) |
| **State location** | Local or remote config | Always remote (backend) |
| **Execution model** | Stateful process | Stateless process |
| **Resumability** | Limited | Full (deploy from anywhere) |
| **Component model** | Modules/functions | React components |
| **Type safety** | HCL/YAML or runtime | Compile-time TypeScript |

---

## Why CReact?

**For React developers:** Use familiar patterns for infrastructure. Context, props, hooks - everything works like React.

**For infrastructure teams:** Automatic dependency resolution. No more debugging `depends_on` chains.

**For platform teams:** Provider-agnostic. Wrap Terraform, Kubernetes, or any tool. Same interface.

**For everyone:** Deploy from anywhere. Start on laptop, continue from CI/CD. State is always consistent.

---

## Installation

```bash
npm install @creact-labs/creact
```

---

## Examples

See [examples/](./examples) for complete working examples:
- Basic app with reactive context
- Multi-region deployment
- Multi-layer architecture
- Custom providers

---

## License

Apache License 2.0

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Learn More

- [Documentation](https://creact.dev/docs)
- [API Reference](https://creact.dev/api)
- [Architecture Guide](https://creact.dev/architecture)
