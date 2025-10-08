# CReact Vision: React for Infrastructure

## The Story

Infrastructure deployment is stuck in the imperative world. We write scripts that say "create this database, then create that API server, then update the load balancer." When something breaks, we manually figure out what went wrong and how to fix it.

React solved this problem for UIs by making them declarative. You describe what the UI should look like, React figures out how to make it happen. CReact brings that same revolution to infrastructure.

## What CReact IS

**CReact is React for infrastructure.** It's a framework that lets you describe your infrastructure using JSX and React patterns, then handles all the complex orchestration of deploying it.

The key insight: infrastructure has the same fundamental challenges as UI rendering - state management, reconciliation, lifecycle management, error handling. CReact solves these using proven React patterns.

## What CReact IS NOT

**CReact is not a cloud provider.** It doesn't know how to deploy anything. You write providers that do the actual deployment.

**CReact is not Terraform or Kubernetes.** It's a framework that can work with any deployment target through providers.

**CReact is not opinionated about your infrastructure.** It provides the orchestration framework, you provide the implementation.

## How It Works

### 1. You Write Components That Create Resources

```tsx
function Database({ name, size = 'small' }) {
  const db = useInstance(PostgresDB, {
    name,
    size,
    backup: true
  });

  return <></>;
}

function WebServer({ dbUrl }) {
  const server = useInstance(DockerContainer, {
    image: 'my-app:latest',
    env: { DATABASE_URL: dbUrl },
    ports: [3000]
  });

  return <></>;
}
```

### 2. You Compose Them Into Applications

```tsx
function MyApp() {
  const db = useInstance(PostgresDB, { name: 'app-db' });
  
  return (
    <>
      <WebServer dbUrl={db.outputs.connectionString} />
      <WebServer dbUrl={db.outputs.connectionString} />
      <WebServer dbUrl={db.outputs.connectionString} />
    </>
  );
}
```

### 3. You Share Resources Using Context

When multiple components need the same resource (like dev/qa/prod all using the same shared bucket):

```tsx
const StorageContext = createContext();

function SharedStorage({ children }) {
  const bucket = useInstance(S3Bucket, {
    name: 'shared-assets',
    publicRead: true
  });

  return (
    <StorageContext.Provider value={{ bucketUrl: bucket.outputs.url }}>
      {children}
    </StorageContext.Provider>
  );
}

function DevEnvironment() {
  const { bucketUrl } = useContext(StorageContext);
  
  const app = useInstance(DockerContainer, {
    image: 'my-app:dev',
    env: { STORAGE_URL: bucketUrl }
  });

  return <></>;
}

function QAEnvironment() {
  const { bucketUrl } = useContext(StorageContext);
  
  const app = useInstance(DockerContainer, {
    image: 'my-app:qa',
    env: { STORAGE_URL: bucketUrl }
  });

  return <></>;
}

// All environments share the same bucket
function Infrastructure() {
  return (
    <SharedStorage>
      <DevEnvironment />
      <QAEnvironment />
      <ProdEnvironment />
    </SharedStorage>
  );
}
```

### 4. You Handle Lifecycle Events

```tsx
function Database({ name, onReady }) {
  const db = useInstance(PostgresDB, {
    name,
    onDeploy: (resource) => {
      console.log(`Database ${name} is ready!`);
      onReady?.(resource.outputs.connectionString);
    },
    onError: (error) => {
      console.error(`Database ${name} failed:`, error);
    }
  });

  return <></>;
}
```

### 5. You Implement Providers

```tsx
class DockerProvider implements ICloudProvider {
  materialize(cloudDOM: CloudDOMNode[]) {
    for (const node of cloudDOM) {
      if (node.construct === DockerContainer) {
        // Actually deploy the container
        const container = docker.run(node.props.image, node.props);
        node.outputs = { 
          containerId: container.id,
          url: `http://localhost:${node.props.ports[0]}`
        };
      }
    }
  }
}
```

### 6. CReact Handles Everything Else

- **Reconciliation**: Only deploys what changed
- **State Management**: Tracks what's deployed, recovers from crashes
- **Dependency Ordering**: Deploys resources in the right order
- **Error Handling**: Provides context and recovery options
- **Hot Reload**: Updates infrastructure as you code

## Real World Examples

### Example 1: Microservices with Shared Database

```tsx
const DatabaseContext = createContext();

function SharedDatabase({ children }) {
  const db = useInstance(PostgresDB, {
    name: 'shared-db',
    size: 'large'
  });

  return (
    <DatabaseContext.Provider value={{ dbUrl: db.outputs.connectionString }}>
      {children}
    </DatabaseContext.Provider>
  );
}

function UserService() {
  const { dbUrl } = useContext(DatabaseContext);
  
  const service = useInstance(DockerContainer, {
    image: 'user-service:latest',
    env: { DATABASE_URL: dbUrl },
    ports: [3001]
  });

  return <></>;
}

function OrderService() {
  const { dbUrl } = useContext(DatabaseContext);
  
  const service = useInstance(DockerContainer, {
    image: 'order-service:latest',
    env: { DATABASE_URL: dbUrl },
    ports: [3002]
  });

  return <></>;
}

function MicroservicesApp() {
  return (
    <SharedDatabase>
      <UserService />
      <OrderService />
      <PaymentService />
    </SharedDatabase>
  );
}
```

### Example 2: Multi-Environment with Shared Resources

```tsx
const SharedResourcesContext = createContext();

function SharedInfrastructure({ children }) {
  // Resources shared across all environments
  const cdn = useInstance(CloudFront, {
    name: 'global-cdn'
  });
  
  const monitoring = useInstance(DatadogDashboard, {
    name: 'app-monitoring'
  });

  return (
    <SharedResourcesContext.Provider value={{ 
      cdnUrl: cdn.outputs.url,
      monitoringKey: monitoring.outputs.apiKey 
    }}>
      {children}
    </SharedResourcesContext.Provider>
  );
}

function Environment({ name, replicas }) {
  const { cdnUrl, monitoringKey } = useContext(SharedResourcesContext);
  
  const app = useInstance(KubernetesDeployment, {
    name: `app-${name}`,
    replicas,
    env: {
      CDN_URL: cdnUrl,
      MONITORING_KEY: monitoringKey
    }
  });

  return <></>;
}

function MultiEnvironmentApp() {
  return (
    <SharedInfrastructure>
      <Environment name="dev" replicas={1} />
      <Environment name="staging" replicas={2} />
      <Environment name="prod" replicas={5} />
    </SharedInfrastructure>
  );
}
```

### Example 3: Development Workflow

```tsx
function DevStack({ branch }) {
  const db = useInstance(LocalPostgres, {
    name: `dev-db-${branch}`,
    onDeploy: (resource) => {
      console.log(`Dev database ready for branch ${branch}`);
    }
  });

  const app = useInstance(DockerContainer, {
    image: `my-app:${branch}`,
    env: { DATABASE_URL: db.outputs.connectionString },
    ports: [3000],
    onDeploy: (resource) => {
      console.log(`App running at ${resource.outputs.url}`);
    }
  });

  return <></>;
}

// Hot reload: change code, infrastructure updates in seconds
```

## The Power of Separation

CReact separates **what** you want from **how** it gets deployed:

- **What**: Described in JSX components with props and relationships
- **How**: Implemented in providers that can do anything

This means:
- Same components work with different providers (Docker locally, Kubernetes in prod)
- Easy testing with mock providers
- Gradual migration between deployment methods
- Teams can share components while using different backends

## Why Context Matters

Context in CReact solves the "shared resource" problem. In traditional infrastructure:

```bash
# Traditional: Create shared resources manually
terraform apply -target=shared_bucket
terraform apply -target=dev_app
terraform apply -target=qa_app
# Hope they all use the same bucket URL...
```

With CReact:

```tsx
// Declarative: Shared resources are explicit in the component tree
<SharedStorage>
  <DevApp />
  <QAApp />
  <ProdApp />
</SharedStorage>
```

The shared resource is created once, all children automatically get access to its outputs. No manual coordination needed.

## Why This Matters

Infrastructure deployment is still stuck in the imperative world. CReact brings the declarative revolution that made React successful.

Just like React made UI development predictable and composable, CReact makes infrastructure deployment predictable and composable.

The future of infrastructure is declarative, component-based, and developer-friendly. CReact is that future.