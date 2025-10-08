# CReact Basic Setup Example

This example demonstrates how to configure CReact with providers and deploy a simple infrastructure stack using dummy providers.

## What This Example Shows

- **Provider Configuration**: How to set up CReact with cloud and backend providers
- **Component Definition**: Creating infrastructure components with `useInstance` and `useState`
- **Event Callbacks**: Using `onDeploy` and `onError` callbacks for monitoring
- **Basic Deployment**: Rendering and deploying a CloudDOM tree

## Components

- **MyBucket**: S3 bucket with versioning
- **MyDatabase**: PostgreSQL database with event callbacks
- **MyWebServer**: Nginx web server
- **MyApp**: Main application stack combining all components

## Running the Example

```bash
# From the basic-setup directory
npm install
npm start

# Or with watch mode for development
npm run dev
```

## Expected Output

```
🚀 Starting CReact Basic Setup Example...

[DummyCloudProvider] Initializing...
[DummyBackendProvider] Initializing...
✅ CReact providers configured

📦 Rendering CloudDOM...

=== DummyCloudProvider: Materializing CloudDOM ===

Deploying: my-app-assets (S3Bucket)
  Props: {
    "name": "my-app-assets",
    "versioning": true
  }
  Outputs:
    my-app-assets.state0 = "https://my-app-assets.s3.amazonaws.com"

Deploying: my-app-db (Database)
  Props: {
    "name": "my-app-db",
    "engine": "postgres",
    "size": "100GB"
  }
  Outputs:
    my-app-db.state0 = "postgres://localhost:5432/my-app-db"

✅ Database deployed: my-app-db
   Connection: postgres://localhost:5432/my-app-db

Deploying: my-app-server (WebServer)
  Props: {
    "name": "my-app-server",
    "image": "nginx:latest",
    "port": 8080
  }
  Outputs:
    my-app-server.state0 = "http://localhost:8080"

=== Materialization Complete ===

🎉 Deployment completed successfully!
```

## Key Features Demonstrated

### 1. Provider Configuration
```typescript
// Initialize providers
const cloudProvider = new DummyCloudProvider();
const backendProvider = new DummyBackendProvider();

// Configure CReact
CReact.cloudProvider = cloudProvider;
CReact.backendProvider = backendProvider;
```

### 2. Infrastructure Components
```typescript
function MyDatabase({ name, engine, size, onDeploy, onError }) {
  const db = useInstance(Database, { name, engine, size });
  const [connectionString, setConnectionString] = useState<string>();
  
  setConnectionString(`${engine}://localhost:5432/${name}`);
  return <></>;
}
```

### 3. Event Callbacks
```typescript
<MyDatabase
  name="my-app-db"
  engine="postgres"
  size="100GB"
  onDeploy={(ctx) => console.log(`✅ Database deployed: ${ctx.resourceId}`)}
  onError={(ctx, error) => console.error(`❌ Failed: ${error.message}`)}
/>
```

### 4. Deployment
```typescript
await renderCloudDOM(<MyApp />, 'my-app-stack');
```

## Next Steps

- Try modifying the components and see how the CloudDOM changes
- Add more components with different event callbacks
- Experiment with nested component hierarchies
- Check out the monitoring integration example for more advanced patterns