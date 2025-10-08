# CReact Vision: React for Infrastructure

## The Problem

Infrastructure deployment is stuck in the imperative world. We write scripts that say "create this, then create that, then update this other thing." When something goes wrong, we manually figure out what state we're in and how to fix it.

Sound familiar? That's exactly where web development was before React.

## The Solution

**CReact is React for infrastructure.** It brings the declarative revolution to infrastructure deployment.

Just like React lets you describe what the UI should look like and figures out how to update the DOM, CReact lets you describe what your infrastructure should look like and figures out how to deploy it.

## Core Concepts

### 1. Components Create Resources

```tsx
function Database({ name, children }) {
  const [dbConfig, setDbConfig] = useState();

  const db = useInstance(PostgresDB, {
    name,
    engine: 'postgres',
    size: 'small'
  });

  useEffect(() => {
    if (db.outputs?.connectionString) {
      setDbConfig({
        connectionString: db.outputs.connectionString,
        endpoint: db.outputs.endpoint
      });
    }
  }, [db.outputs]);

  return (
    <DatabaseContext.Provider value={dbConfig}>
      {children}
    </DatabaseContext.Provider>
  );
}
```

### 2. Context Shares Resources

Components share infrastructure resources through Context, just like React components share UI state.

```tsx
function API({ name }) {
  const dbConfig = useContext(DatabaseContext);
  
  const api = useInstance(DockerService, {
    name,
    image: 'my-api:latest',
    env: {
      DATABASE_URL: dbConfig?.connectionString
    }
  });

  return <></>;
}
```

### 3. CloudDOM Events (Like DOM Events)

Parents can listen to infrastructure events, just like DOM events in React:

```tsx
function App() {
  return (
    <Database 
      name="users-db"
      onDeploy={(resource) => console.log('Database ready!', resource.outputs)}
      onError={(error) => console.error('Database failed:', error)}
    >
      <API name="users-api" />
    </Database>
  );
}
```

The `onDeploy` and `onError` events are handled automatically by CReact, just like `onClick` is handled by the browser.

### 4. You Provide the Implementation

CReact doesn't deploy anything itself. You write providers that implement the actual deployment:

```tsx
class DockerProvider implements ICloudProvider {
  materialize(cloudDOM: CloudDOMNode[]) {
    for (const node of cloudDOM) {
      if (node.construct === PostgresDB) {
        // Start postgres container
        const container = docker.run('postgres', node.props);
        node.outputs = { 
          connectionString: container.getConnectionString(),
          endpoint: container.getEndpoint()
        };
      }
    }
  }
}
```

## What CReact IS

- **A framework** for describing infrastructure using React patterns
- **An orchestration engine** that handles deployment, state management, and reconciliation
- **A provider system** that lets you implement deployment however you want
- **React for infrastructure** - same patterns, different domain

## What CReact IS NOT

- **A cloud provider** - it doesn't deploy anything itself
- **Terraform** - it's a programming model, not a specific tool
- **A replacement for existing tools** - it works with your existing tools through providers

## Real World Examples

### Startup MVP

```tsx
function StartupStack() {
  return (
    <Database name="app-db">
      <Storage name="user-uploads">
        <API name="backend-api">
          <Frontend name="web-app" />
        </API>
      </Storage>
    </Database>
  );
}

function Database({ name, children }) {
  const [dbConfig, setDbConfig] = useState();

  const db = useInstance(PostgresDB, { name });

  useEffect(() => {
    if (db.outputs?.connectionString) {
      setDbConfig({
        connectionString: db.outputs.connectionString,
        host: db.outputs.host,
        port: db.outputs.port
      });
    }
  }, [db.outputs]);

  return (
    <DatabaseContext.Provider value={dbConfig}>
      {children}
    </DatabaseContext.Provider>
  );
}

function Storage({ name, children }) {
  const [storageConfig, setStorageConfig] = useState();

  const bucket = useInstance(S3Bucket, { 
    name,
    cors: true 
  });

  useEffect(() => {
    if (bucket.outputs?.bucketName) {
      setStorageConfig({
        bucketName: bucket.outputs.bucketName,
        uploadUrl: bucket.outputs.uploadUrl
      });
    }
  }, [bucket.outputs]);

  return (
    <StorageContext.Provider value={storageConfig}>
      {children}
    </StorageContext.Provider>
  );
}

function API({ name, children }) {
  const dbConfig = useContext(DatabaseContext);
  const storageConfig = useContext(StorageContext);

  const api = useInstance(DockerService, {
    name,
    image: 'my-api:latest',
    env: {
      DATABASE_URL: dbConfig?.connectionString,
      STORAGE_BUCKET: storageConfig?.bucketName
    }
  });

  return <>{children}</>;
}

function Frontend({ name }) {
  const api = useInstance(StaticSite, {
    name,
    buildCommand: 'npm run build',
    outputDir: 'dist'
  });

  return <></>;
}
```

### Enterprise Multi-Environment

```tsx
function EnterpriseApp({ environment }) {
  return (
    <Environment name={environment}>
      <Database 
        name={`app-db-${environment}`}
        size={environment === 'prod' ? 'large' : 'small'}
        onDeploy={(resource) => {
          console.log(`${environment} database deployed:`, resource.outputs.endpoint);
        }}
        onError={(error) => {
          console.error(`${environment} database failed:`, error);
          // Send alert to monitoring system
        }}
      >
        <Cache name={`app-cache-${environment}`}>
          <API 
            name={`app-api-${environment}`}
            replicas={environment === 'prod' ? 3 : 1}
          />
        </Cache>
      </Database>
    </Environment>
  );
}
```

### Development Workflow

```tsx
function DevEnvironment({ branch }) {
  return (
    <LocalInfra 
      branch={branch}
      onDeploy={() => console.log(`Dev environment ready: http://localhost:3000`)}
    >
      <Database name={`dev-db-${branch}`}>
        <API name={`dev-api-${branch}`} />
      </Database>
    </LocalInfra>
  );
}

// Hot reload: change code, infrastructure updates in <5 seconds
// Just like React hot reload, but for infrastructure
```

## The Power of Separation

CReact separates **what** you want from **how** it gets deployed:

- **What**: Described in JSX components with props and relationships
- **How**: Implemented in providers that can do anything

This means:
- Same components work with different providers (Docker, AWS, Kubernetes, etc.)
- Easy testing with mock providers
- Gradual migration between deployment methods
- Complex orchestration handled once, in CReact

## Why This Matters

Infrastructure deployment needs the same revolution that React brought to UI development:

- **Declarative**: Describe what you want, not how to get there
- **Composable**: Build complex systems from simple, reusable components
- **Predictable**: Same input always produces same output
- **Developer-friendly**: Familiar patterns, great tooling, fast feedback

CReact makes infrastructure deployment as enjoyable as React made UI development.

The future of infrastructure is declarative, composable, and developer-friendly. CReact is that future.