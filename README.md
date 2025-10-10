# CReact: Infrastructure as React Components

CReact brings React's component model to infrastructure deployment. Write infrastructure using JSX components that compile to cloud resources through a sophisticated reconciliation engine.

## The Paradigm Shift

### What is a CReact App?

A CReact application is a React component tree that renders to cloud infrastructure instead of DOM elements.

```tsx
function InfrastructureApp() {
  return (
    <Database name="users-db">
      <API name="users-api">
        <Monitoring />
      </API>
    </Database>
  );
}
```

### What Does Running a CReact App Mean?

Running a CReact app means deploying and maintaining cloud infrastructure through a continuous reactive process:

1. **Initial Render**: Components create resource references
2. **Deployment Waves**: Resources deploy as dependencies become available
3. **Reactive Updates**: Components re-render when dependencies change
4. **State Persistence**: Application state survives across deployments
5. **Continuous Sync**: Infrastructure stays in sync with code changes

## Core Architecture

### Provider System

CReact works with any infrastructure platform through two provider interfaces:

```tsx
// Deploy resources to any cloud platform
interface ICloudProvider {
  materialize(resources: CloudDOMNode[]): Promise<void>;
}

// Persist state across deployments
interface IBackendProvider {
  getState(stackName: string): Promise<any>;
  saveState(stackName: string, state: any): Promise<void>;
}
```

### JSX to CloudDOM Compilation

CReact compiles JSX to an intermediate representation called CloudDOM:

```tsx
// JSX Input
<VPC name="app-vpc" cidr="10.0.0.0/16" />

// Compiles to CloudDOM
{
  id: "app-vpc",
  construct: VPC,
  props: { name: "app-vpc", cidr: "10.0.0.0/16" },
  outputs: {}, // Populated after deployment
  children: []
}
```

## Hooks API

### useInstance - Create Resources

Creates cloud resources and provides access to their outputs:

```tsx
function DatabaseComponent() {
  // Create database resource
  const database = useInstance(Database, {
    name: 'my-db',
    engine: 'postgres'
  });

  // Access outputs after deployment
  console.log(database.outputs?.endpoint); // "db.example.com:5432"

  return <></>;
}
```

**Key Behavior**: If any prop value is `undefined`, creates a placeholder node that doesn't deploy. When dependencies become available, component re-renders and creates the real resource.

### useState - Persistent State

Manages state that persists across deployments:

```tsx
function App() {
  // State survives deployments (stored in backend)
  const [deployCount, setDeployCount] = useState(0);
  const [appVersion] = useState('1.0.0');

  // Update state (takes effect next deployment)
  setDeployCount(prev => (prev || 0) + 1);

  return <></>;
}
```

**Advanced**: Can bind to provider outputs for reactivity:

```tsx
function DatabaseComponent() {
  const db = useInstance(Database, { name: 'my-db' });

  // This triggers re-renders when db.outputs.endpoint changes
  const [endpoint, setEndpoint] = useState(db.outputs?.endpoint);

  return <></>;
}
```

### useContext - Share Dependencies

Shares data between components with reactivity when containing outputs:

```tsx
const DatabaseContext = createContext<{ endpoint?: string }>({});

function DatabaseProvider({ children }) {
  const db = useInstance(Database, { name: 'my-db' });

  return (
    <DatabaseContext.Provider value={{
      endpoint: db.outputs?.endpoint  // Makes context reactive
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}

function ApiConsumer() {
  const { endpoint } = useContext(DatabaseContext); // Re-renders when endpoint available

  const api = useInstance(ApiGateway, {
    dbUrl: endpoint  // Triggers re-render when endpoint changes
  });

  return <></>;
}
```

## Reactivity Mechanisms

CReact implements multiple interconnected reactivity systems:

1. **useState Binding**: `useState` can bind to provider outputs, triggering re-renders when outputs change
2. **Context Dependency Tracking**: Contexts containing outputs trigger re-renders in consuming components
3. **Output Change Detection**: Post-deployment effect system detects when provider outputs change
4. **Selective Re-rendering**: Only components affected by changes re-render

## Deployment Orchestration

### Reactive Deployment Cycles

```tsx
function MultiLayerApp() {
  return (
    <NetworkStack>        {/* Layer 1: Deploy VPC first */}
      <DatabaseStack>     {/* Layer 2: Deploy DB/cache when VPC ready */}
        <StorageStack>    {/* Layer 3: Deploy S3/CDN when network ready */}
          <ApiStack>      {/* Layer 4: Deploy APIs when all deps ready */}
            <MonitoringStack /> {/* Layer 5: Deploy monitoring last */}
          </ApiStack>
        </StorageStack>
      </DatabaseStack>
    </NetworkStack>
  );
}
```

**Deployment Flow**:
1. **Initial Render**: All components create resource references
2. **Wave 1**: Network resources deploy (no dependencies)
3. **Wave 2**: Data resources deploy (depend on network outputs)
4. **Wave 3**: Storage resources deploy (depend on network outputs)
5. **Wave 4**: API resources deploy (depend on data + storage outputs)
6. **Wave 5**: Monitoring resources deploy (depend on API outputs)

## Provider Implementation

### Cloud Provider Example

```tsx
class AWSProvider implements ICloudProvider {
  async materialize(resources: CloudDOMNode[]): Promise<void> {
    for (const resource of resources) {
      if (resource.construct?.name === 'Database') {
        const db = await this.createRDSInstance(resource.props);
        resource.outputs = {
          endpoint: db.endpoint,
          connectionUrl: db.connectionString
        };
      }
      // Handle other resource types...
    }
  }
}
```

### Backend Provider Example

```tsx
class S3BackendProvider implements IBackendProvider {
  async getState(stackName: string): Promise<any> {
    const state = await this.s3.getObject({
      Bucket: 'my-state-bucket',
      Key: `${stackName}.json`
    }).promise();

    return JSON.parse(state.Body.toString());
  }

  async saveState(stackName: string, state: any): Promise<void> {
    await this.s3.putObject({
      Bucket: 'my-state-bucket',
      Key: `${stackName}.json`,
      Body: JSON.stringify(state)
    }).promise();
  }
}
```

## Real-World Example

Here's how the 5-layer enterprise application from the examples works:

```tsx
function EnterpriseApp() {
  return (
    <NetworkProvider>     {/* VPC, subnets, security groups */}
      <DatabaseProvider>  {/* Database + cache */}
        <StorageProvider> {/* S3 + CDN */}
          <ApiProvider>   {/* APIs + load balancer */}
            <MonitoringProvider /> {/* Analytics + backups */}
          </ApiProvider>
        </StorageProvider>
      </DatabaseProvider>
    </NetworkProvider>
  );
}

// Each provider component:
function NetworkProvider({ children }) {
  const vpc = useInstance(VPC, { cidr: '10.0.0.0/16' });

  return (
    <NetworkContext.Provider value={{ vpcId: vpc.outputs?.vpcId }}>
      {children}
    </NetworkContext.Provider>
  );
}

function DatabaseProvider({ children }) {
  const { vpcId } = useContext(NetworkContext);

  const db = useInstance(Database, { vpcId });
  const cache = useInstance(Redis, { vpcId });

  return (
    <DatabaseContext.Provider value={{
      dbUrl: db.outputs?.endpoint,
      cacheUrl: cache.outputs?.endpoint
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}
```

## Installation & Usage

```bash
# Deploy your infrastructure
creact deploy --entry my-app.tsx

# Development mode with hot reload
creact dev --entry my-app.tsx --auto-approve

# Preview changes
creact plan --entry my-app.tsx
```

