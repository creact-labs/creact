# CReact

**Infrastructure-as-Code with React patterns.**

CReact is a framework that brings React's component model to infrastructure deployment. Define cloud resources using JSX, manage dependencies through context, and let a reactive reconciliation engine handle deployment orchestration automatically.

---

## Core Concept

Infrastructure deployment shares fundamental challenges with UI rendering: state management, dependency resolution, lifecycle coordination, and error recovery. CReact applies React's proven architectural patterns to solve these problems in infrastructure.

Traditional IaC tools make you think about resources in isolation. CReact makes you think about infrastructure as a component tree where dependencies flow naturally through composition and context.

---

## Quick Start

```tsx
import { CReact, createContext, useContext, useInstance } from '@creact-labs/creact';
import { VPC, Database, ApiGateway } from './constructs';

const NetworkContext = createContext<{ vpcId?: string }>({});
const DatabaseContext = createContext<{ endpoint?: string }>({});

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
  const { vpcId } = useContext(NetworkContext);
  
  const db = useInstance(Database, {
    name: 'app-db',
    vpcId,
  });

  return (
    <DatabaseContext.Provider value={{ endpoint: db.outputs?.endpoint }}>
      {children}
    </DatabaseContext.Provider>
  );
}

function ApiStack() {
  const { endpoint } = useContext(DatabaseContext);
  
  const api = useInstance(ApiGateway, {
    name: 'app-api',
    dbUrl: endpoint,
  });

  return <></>;
}

function App() {
  return (
    <NetworkStack>
      <DatabaseStack>
        <ApiStack />
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
  → NetworkContext updated: vpcId = "vpc-123"
  → DatabaseStack re-renders (context changed)
  → Database scheduled for deployment

Cycle 3: Database Deployed
  → DatabaseContext updated: endpoint = "db.rds.amazonaws.com"
  → ApiStack re-renders (context changed)
  → ApiGateway scheduled for deployment

Cycle 4: Complete
  → No further output changes
  → Infrastructure stable
```

---

## Architecture

### Component Model

**One resource per component (preferred)** - Each component encapsulates infrastructure resources using `useInstance`. This creates clear boundaries and explicit dependencies.

```tsx
// Clean: Single responsibility
function VPCStack({ children }) {
  const vpc = useInstance(VPC, { name: 'vpc', cidr: '10.0.0.0/16' });
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

// Avoid: Multiple resources blur boundaries
function NetworkStack() {
  const vpc = useInstance(VPC, { name: 'vpc' });
  const subnet = useInstance(Subnet, { vpcId: vpc.outputs?.vpcId });
  const sg = useInstance(SecurityGroup, { vpcId: vpc.outputs?.vpcId });
  return <></>;
}
```

### Context-Driven Dependencies

Dependencies flow through React context, enabling reactive updates when upstream resources complete deployment.

```tsx
const NetworkContext = createContext<{ vpcId?: string }>({});

function SubnetStack() {
  const { vpcId } = useContext(NetworkContext);
  
  const subnet = useInstance(Subnet, {
    vpcId, // Re-renders when VPC deploys
    cidr: '10.0.1.0/24',
  });

  return <></>;
}
```

**Why context over props?**
- Automatic re-rendering when values change
- Deep component trees without prop drilling
- Infrastructure resources as shared dependencies
- Natural composition of nested stacks

### Reactive Reconciliation

The reconciliation engine detects output changes and triggers selective re-renders of dependent components. Only affected resources are redeployed.

```
Provider deploys resource
    ↓
Outputs populated (e.g., connectionUrl)
    ↓
Context values updated
    ↓
Consuming components re-render
    ↓
New resources scheduled for deployment
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

**Best practice:** One `useInstance` per component for clear boundaries.

### useState(initialValue)

Persistent state that survives across deployments. Reactive when bound to resource outputs.

```tsx
const [deployCount, setDeployCount] = useState(0);
const [apiUrl, setApiUrl] = useState<string>();

// Track metadata (non-reactive)
setDeployCount(prev => (prev || 0) + 1);

// Store resource output (reactive)
const api = useInstance(ApiGateway, { name: 'api' });
setApiUrl(api.outputs?.endpoint); // Re-renders when API deploys
```

**Key distinction:** Updates persist to backend storage, not in-memory like React.

### useContext(Context)

Read values from context. Reactive when context contains resource outputs.

```tsx
const NetworkContext = createContext<{ vpcId?: string }>({});

function DatabaseStack() {
  const { vpcId } = useContext(NetworkContext); // Re-renders when VPC deploys
  
  const db = useInstance(Database, { vpcId });
  return <></>;
}
```

**Reactive behavior:** Components re-render when context values bound to provider outputs change.

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
- Process continues until stable

### Example: Three-Layer Application

```tsx
function App() {
  const regions = ['us-east-1', 'eu-west-1'];

  return (
    <NetworkStack cidr="10.0.0.0/16">
      <DatabaseStack engine="postgres">
        {regions.map(region => (
          <ApiStack key={region} region={region} />
        ))}
      </DatabaseStack>
    </NetworkStack>
  );
}
```

**Deployment sequence:**

```
Cycle 1: Initial
  → VPC deploys
  Output: vpcId = "vpc-123"

Cycle 2: Database Layer
  → Database re-renders (VPC output available)
  → Database deploys using vpcId
  Output: connectionUrl = "postgres://..."

Cycle 3: API Layer
  → us-east-1 API re-renders (DB output available)
  → eu-west-1 API re-renders (DB output available)
  → Both APIs deploy in parallel using connectionUrl
  Output: endpoints = ["https://...", "https://..."]

Cycle 4: Complete
  → No further changes
```

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
      
      // Populate outputs
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
