
NOTE: !!! THIS IS A EXPERIMENT OF THOUGHT NOT A PRODUCTION READY PRODUCT !!!

# CReact 

![creact](https://i.postimg.cc/8P66GnT3/banner.jpg)


Think of it as React's rendering model — but instead of a DOM, you render to the cloud.

Write your cloud architecture in JSX. CReact figures out the dependencies, orchestrates the deployment, and keeps everything in sync.

```tsx
function App() {
  return (
    <VPC name="prod-vpc">
      <Database name="users-db">
        <API name="users-api">
          <Monitoring />
        </API>
      </Database>
    </VPC>
  );
}
```

That's it. No dependency graphs, no explicit ordering, no YAML. Just components that render to actual infrastructure.

## The Problem

Terraform and Pulumi are great, but they're static. You write a plan, run it, and hope nothing breaks. If you need dynamic orchestration - like deploying a database, waiting for its endpoint, then using that endpoint in your API config - you're writing bash scripts or custom tooling.

CReact treats infrastructure like React treats UI. Components re-render when their dependencies change. Outputs flow naturally through context. The Reconciler figures out what actually needs to deploy.

## What Makes It Different

**It's reactive** - when a database finishes deploying and outputs its endpoint, components that depend on it automatically re-render and deploy. No manual dependency chains.

**It's a compiler** - your JSX compiles to CloudDOM (basically an AST for infrastructure). You can diff it, version it, test it without cloud credentials. Only when you're ready does it materialize to real resources.

**It's resilient** - every deployment is checkpointed and resumable. Crash halfway through? Resume from where you left off. The Reconciler only deploys what changed, like React's virtual DOM but for cloud resources.

**It works with existing tools** - CReact doesn't replace Terraform or CDK. It orchestrates them. Wrap your Terraform modules as CReact components and compose them together.

## Watch It Work

Here's a real deployment - 22 resources across 3 regions, 6 reactive cycles, fully automatic:

```bash
$ creact dev --entry reactive-app.tsx --auto-approve

Starting CReact development mode...
Building initial state...
Changes detected: 2 changes

Planning changes for stack: optimized-reactive-app-stack
──────────────────────────────────────────────────
+ 2 to create
  + Analytics (Kinesis stream for API analytics)
  + VPC (Network foundation)

Plan: 2 to add, 0 to change, 0 to destroy
Auto-approving changes...

Applying changes...
[MockCloud] ✅ All resources materialized
Apply complete! Resources: 2 added, 0 changed, 0 destroyed
Duration: 0.3s

Reactive changes detected
+ 6 to create
  + S3Bucket (Asset storage)
  + SecurityGroup (Network security)
  + Subnet × 4 (Multi-AZ subnets)

Plan: 6 to add, 0 to change, 0 to destroy
Reactive deployment cycle #2
Apply complete! Resources: 6 added, 0 changed, 0 destroyed
Duration: 0.1s

Reactive changes detected
+ 4 to create
  + ElastiCache (Redis cluster)
  + CloudFront (CDN distribution)
  + LoadBalancer (Application load balancer)
  + RDSInstance (PostgreSQL database)

Reactive deployment cycle #3
Apply complete! Resources: 4 added, 0 changed, 0 destroyed
Duration: 0.5s

Reactive changes detected
+ 4 to create
  + Lambda × 3 (Regional API handlers: us-east-1, eu-west-1, ap-southeast-1)
  + Backup (Database backup vault)

Reactive deployment cycle #4
Apply complete! Resources: 4 added, 0 changed, 0 destroyed
Duration: 0.5s

Reactive changes detected
+ 3 to create
  + ApiGateway × 3 (Regional API endpoints)

Reactive deployment cycle #5
Apply complete! Resources: 3 added, 0 changed, 0 destroyed
Duration: 0.4s

Reactive changes detected
+ 3 to create
  + CloudWatch × 3 (Regional monitoring dashboards)

Reactive deployment cycle #6
Apply complete! Resources: 3 added, 0 changed, 0 destroyed
Duration: 0.4s

✅ Deployment complete: 22 resources across 6 reactive cycles
Watching for changes... (Press Ctrl+C to stop)
```

**What happened:**

VPC deployed first. When its outputs became available, subnets and security groups deployed in parallel. When those finished, database and cache deployed. When the database endpoint was ready, Lambdas deployed. When Lambdas got function ARNs, API Gateways deployed. When APIs were live, monitoring deployed.

You didn't orchestrate anything manually. You just wrote JSX components that reference each other's outputs. CReact figured out the rest.

## How It Works

### JSX Compiles to CloudDOM

```tsx
<VPC name="app-vpc" cidr="10.0.0.0/16" />
```

becomes:

```json
{
  "id": "app-vpc",
  "construct": "VPC",
  "props": { "cidr": "10.0.0.0/16" },
  "outputs": {}
}
```

CloudDOM is just a JSON tree. You can diff it like Git, version it, test it without touching AWS. It's the intermediate representation between your code and actual cloud resources.

### The Reconciler Figures Out What Changed

Before deploying anything, CReact diffs the previous CloudDOM against the new one. Creates, updates, deletes, replacements - all computed ahead of time. You get a Terraform-style plan but it's just comparing two data structures.

### Deployment Is Checkpointed

After each resource deploys, CReact saves a checkpoint. Crash halfway through? Run it again and it resumes from where it left off. No manual cleanup, no orphaned resources.

### Outputs Trigger Re-renders

When a resource finishes deploying, its outputs (endpoint, ARN, ID) become available. Any component that depends on those outputs automatically re-renders and creates new resources. It's like useEffect but for infrastructure.



## Hooks

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

