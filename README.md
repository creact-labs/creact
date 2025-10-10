# CReact

**Universal Creation Runtime**

React for Infrastructure. Write cloud resources using JSX.

## What is CReact?

CReact lets you define infrastructure using React patterns - JSX components, hooks, and context. It renders your components into a CloudDOM (Cloud Document Object Model), computes what changed, and deploys only the differences.

Think Terraform or Pulumi, but with React's component model.

## Installation

```bash
npm install @creact-labs/creact
```

## Quick Example

```tsx
import { CReact, useInstance, useState } from '@creact-labs/creact';
import { VPC, Database, ApiGateway } from './constructs';

function MyApp() {
  // Create a VPC
  const vpc = useInstance(VPC, {
    name: 'app-vpc',
    cidr: '10.0.0.0/16',
  });

  // Create a database in the VPC
  const db = useInstance(Database, {
    name: 'app-db',
    vpcId: vpc.outputs?.vpcId, // Use VPC output
  });

  // Create an API that connects to the database
  const api = useInstance(ApiGateway, {
    name: 'app-api',
    dbUrl: db.outputs?.endpoint, // Use database output
  });

  // Save API URL for later
  const [apiUrl, setApiUrl] = useState<string>();
  setApiUrl(api.outputs?.endpoint);

  return <></>;
}

// Configure providers
CReact.cloudProvider = new MyCloudProvider();
CReact.backendProvider = new MyBackendProvider();

// Deploy
export default async function () {
  return CReact.renderCloudDOM(<MyApp />, 'my-app');
}
```

## How It Works

### 1. You write JSX components

```tsx
function NetworkStack() {
  const vpc = useInstance(VPC, { name: 'app-vpc', cidr: '10.0.0.0/16' });
  return <></>;
}
```

### 2. CReact renders to CloudDOM

Your components are rendered into a tree structure called CloudDOM - a JSON representation of your infrastructure:

```json
{
  "id": "app-vpc",
  "type": "VPC",
  "props": { "name": "app-vpc", "cidr": "10.0.0.0/16" },
  "outputs": {}
}
```

### 3. Resources are deployed

CReact compares the new CloudDOM with the previous state, computes a diff, and deploys only what changed:

```
First deployment:
  → VPC created
  → VPC outputs populated: { vpcId: "vpc-123" }

Second deployment (if you change nothing):
  → No changes, nothing deployed
```

### 4. Outputs trigger re-renders

When a resource is deployed and gets outputs, components that depend on those outputs automatically re-render:

```tsx
function DatabaseStack() {
  const vpc = useInstance(VPC, { name: 'vpc' });

  // First render: vpc.outputs is undefined
  // After VPC deploys: vpc.outputs = { vpcId: "vpc-123" }
  // Component re-renders with the new output

  const db = useInstance(Database, {
    name: 'db',
    vpcId: vpc.outputs?.vpcId, // Now has the actual VPC ID
  });

  return <></>;
}
```

## Providers

You need two providers: one for deploying resources, one for storing state.

### Cloud Provider

Implements `ICloudProvider` - handles creating/updating/deleting resources:

```tsx
import { ICloudProvider, CloudDOMNode } from '@creact-labs/creact';

export class MyCloudProvider implements ICloudProvider {
  async materialize(nodes: CloudDOMNode[]): Promise<void> {
    for (const node of nodes) {
      console.log('Deploying:', node.type, node.props);

      // Deploy the resource to your cloud
      // Then populate node.outputs with the results
      node.outputs = {
        id: 'resource-123',
        endpoint: 'https://api.example.com',
      };
    }
  }
}
```

```tsx
export class MockCloudProvider implements ICloudProvider {
  async materialize(cloudDOM: CloudDOMNode[]): Promise<void> {
    for (const node of cloudDOM) {
      // Simulate deployment
      await this.sleep(100);

      // Generate outputs based on resource type
      const outputs = this.generateOutputs(node);
      node.outputs = { ...node.outputs, ...outputs };

      // Emit event for reactive updates
      this.emit('outputsChanged', {
        nodeId: node.id,
        outputs,
        timestamp: Date.now(),
      });
    }
  }

  private generateOutputs(node: CloudDOMNode): Record<string, any> {
    const constructName = node.constructType || node.construct?.name;

    switch (constructName) {
      case 'VPC':
        return {
          vpcId: `vpc-${this.generateId(node.id)}`,
          cidrBlock: node.props.cidr,
        };

      case 'Database':
        return {
          endpoint: `${node.props.name}.rds.amazonaws.com`,
          port: 5432,
          connectionUrl: `postgres://admin:****@${node.props.name}.rds.amazonaws.com:5432`,
        };

      case 'ApiGateway':
        return {
          endpoint: `https://${this.generateId(node.id)}.execute-api.us-east-1.amazonaws.com`,
          apiId: this.generateId(node.id),
        };

      default:
        return { id: node.id, status: 'deployed' };
    }
  }
}
```

### Backend Provider

Implements `IBackendProvider` - handles state storage:

```tsx
import { IBackendProvider } from '@creact-labs/creact';

export class MyBackendProvider implements IBackendProvider {
  async saveState(stackName: string, state: any): Promise<void> {
    // Save state to S3, database, file, etc.
    console.log('Saving state for:', stackName);
  }

  async getState(stackName: string): Promise<any> {
    // Load previous state
    return null; // null if no previous state
  }
}
```

```tsx
export class SQLiteBackendProvider implements IBackendProvider {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS state (
        stack_name TEXT PRIMARY KEY,
        state_data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  async getState(stackName: string): Promise<any | undefined> {
    const row = this.db
      .prepare('SELECT state_data FROM state WHERE stack_name = ?')
      .get(stackName);

    return row ? JSON.parse(row.state_data) : undefined;
  }

  async saveState(stackName: string, state: any): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO state (stack_name, state_data, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(stack_name) DO UPDATE SET state_data = excluded.state_data`
      )
      .run(stackName, JSON.stringify(state), Date.now());
  }
}
```

## Hooks

### useInstance - Create Resources

Creates infrastructure resources. Returns an object with `outputs` that get populated after deployment.

```tsx
const vpc = useInstance(VPC, {
  name: 'app-vpc',
  cidr: '10.0.0.0/16',
});

// First render: vpc.outputs is undefined
// After deployment: vpc.outputs = { vpcId: "vpc-123", cidrBlock: "10.0.0.0/16" }
```

### useState - Persistent State

Stores values that persist across deployments. **NOT reactive** - changes take effect in the next deployment.

```tsx
const [apiUrl, setApiUrl] = useState<string>();
const [deployCount, setDeployCount] = useState<number>(0);

// Update state (saved to backend, available next deployment)
setApiUrl('https://api.example.com');
setDeployCount((prev) => (prev || 0) + 1);
```

### useContext - Share Data

Share configuration and outputs between components. **CAN be reactive** when it contains resource outputs.

```tsx
// Create contexts
const ConfigContext = createContext({ region: 'us-east-1' });
const NetworkContext = createContext<{ vpcId?: string }>({});

function NetworkStack() {
  const vpc = useInstance(VPC, { name: 'vpc', cidr: '10.0.0.0/16' });

  // Provide VPC outputs to children - THIS IS REACTIVE
  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      <DatabaseStack />
    </NetworkContext.Provider>
  );
}

function DatabaseStack() {
  const network = useContext(NetworkContext); // Re-renders when VPC deploys

  const db = useInstance(Database, {
    name: 'db',
    vpcId: network.vpcId, // Uses VPC output
  });

  return <></>;
}
```

## Complete Example

A multi-layer application with reactive context dependencies:

```tsx
import { CReact, createContext, useContext, useInstance, useState } from '@creact-labs/creact';
import { VPC, Subnet, SecurityGroup, RDSInstance, ApiGateway } from './constructs';

// Static config (not reactive)
const ConfigContext = createContext({ region: 'us-east-1', env: 'prod' });

// Network outputs (reactive)
const NetworkContext = createContext<{ vpcId?: string; subnetIds?: string[] }>({});

// Database outputs (reactive)
const DbContext = createContext<{ endpoint?: string }>({});

// Layer 1: Network (no dependencies)
function NetworkStack() {
  const config = useContext(ConfigContext);

  const vpc = useInstance(VPC, {
    name: 'app-vpc',
    region: config.region,
    cidr: '10.0.0.0/16',
  });

  const subnet = useInstance(Subnet, {
    name: 'app-subnet',
    region: config.region,
    vpcId: vpc.outputs?.vpcId,
    cidr: '10.0.1.0/24',
  });

  const sg = useInstance(SecurityGroup, {
    name: 'app-sg',
    region: config.region,
    vpcId: vpc.outputs?.vpcId,
  });

  // Provide network outputs to children
  return (
    <NetworkContext.Provider
      value={{
        vpcId: vpc.outputs?.vpcId,
        subnetIds: [subnet.outputs?.subnetId],
      }}
    >
      <DatabaseStack />
    </NetworkContext.Provider>
  );
}

// Layer 2: Database (depends on network)
function DatabaseStack() {
  const config = useContext(ConfigContext);
  const network = useContext(NetworkContext); // REACTIVE

  const db = useInstance(RDSInstance, {
    name: 'app-db',
    region: config.region,
    engine: 'postgres',
    vpcId: network.vpcId, // Uses network output
    subnetIds: network.subnetIds,
  });

  // Provide database outputs to children
  return (
    <DbContext.Provider value={{ endpoint: db.outputs?.endpoint }}>
      <ApiStack />
    </DbContext.Provider>
  );
}

// Layer 3: API (depends on database)
function ApiStack() {
  const config = useContext(ConfigContext);
  const db = useContext(DbContext); // REACTIVE

  const [apiUrl, setApiUrl] = useState<string>();

  const api = useInstance(ApiGateway, {
    name: 'app-api',
    region: config.region,
    dbUrl: db.endpoint, // Uses database output
  });

  setApiUrl(api.outputs?.endpoint);

  return <></>;
}

// Root
function MyApp() {
  return (
    <ConfigContext.Provider value={{ region: 'us-east-1', env: 'prod' }}>
      <NetworkStack />
    </ConfigContext.Provider>
  );
}

// Configure and deploy
CReact.cloudProvider = new MockCloudProvider();
CReact.backendProvider = new SQLiteBackendProvider('./state.db');

export default async function () {
  return CReact.renderCloudDOM(<MyApp />, 'my-app');
}
```

**Deployment flow:**

1. **First render**: All components execute, but resources have no outputs yet
2. **Deploy network**: VPC, Subnet, SecurityGroup created → outputs populated
3. **Re-render**: `DatabaseStack` re-renders because `NetworkContext` changed
4. **Deploy database**: RDSInstance created → outputs populated
5. **Re-render**: `ApiStack` re-renders because `DbContext` changed
6. **Deploy API**: ApiGateway created → outputs populated
7. **Done**: No more output changes

## Key Differences from React

| Aspect            | React                       | CReact                                |
| ----------------- | --------------------------- | ------------------------------------- |
| **useState**      | Reactive (causes re-render) | Persistent (updates next deployment)  |
| **useContext**    | Reactive                    | Reactive only when bound to outputs   |
| **Render speed**  | Milliseconds                | Minutes (actual cloud deployments)    |
| **State storage** | Memory (session)            | Backend (permanent)                   |
| **Output**        | HTML/DOM                    | CloudDOM → Cloud resources            |
| **Change cost**   | Free                        | Expensive (cloud resources cost $$$)  |

## CLI Commands

```bash
creact build    # Build CloudDOM from JSX
creact plan     # Preview changes without deploying
creact deploy   # Deploy infrastructure
creact dev      # Development mode with hot reload
```

## License

Apache-2.0
