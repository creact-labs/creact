/**
 * Basic CReact Setup Example
 * 
 * Demonstrates how to configure CReact with providers and render a simple infrastructure stack.
 * This example uses dummy providers for development/testing without requiring cloud credentials.
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact, CReactCore } from '../../src/index';
import { DummyCloudProvider, DummyBackendProvider } from '../providers';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';

// Mock constructs for demonstration
class S3Bucket {
  constructor(public props: { name: string; versioning?: boolean }) {}
}

class Database {
  constructor(public props: { name: string; engine: string; size: string }) {}
}

class WebServer {
  constructor(public props: { name: string; image: string; port: number }) {}
}

/**
 * Simple S3 Bucket component
 */
function MyBucket({ name, versioning = false }: { name: string; versioning?: boolean }) {
  const bucket = useInstance(S3Bucket, {
    name,
    versioning
  });
  
  const [bucketUrl, setBucketUrl] = useState<string>();
  
  // Simulate setting bucket URL output
  setBucketUrl(`https://${name}.s3.amazonaws.com`);
  
  return <></>;
}

/**
 * Database component with event callbacks
 */
function MyDatabase({ 
  name, 
  engine, 
  size,
  onDeploy,
  onError 
}: { 
  name: string; 
  engine: string; 
  size: string;
  onDeploy?: (ctx: any) => void;
  onError?: (ctx: any, error: Error) => void;
}) {
  const db = useInstance(Database, {
    name,
    engine,
    size
  });
  
  const [connectionString, setConnectionString] = useState<string>();
  
  // Simulate setting connection string output
  setConnectionString(`${engine}://localhost:5432/${name}`);
  
  return <></>;
}

/**
 * Web server component
 */
function MyWebServer({ name, image, port }: { name: string; image: string; port: number }) {
  const server = useInstance(WebServer, {
    name,
    image,
    port
  });
  
  const [endpoint, setEndpoint] = useState<string>();
  
  // Simulate setting endpoint output
  setEndpoint(`http://localhost:${port}`);
  
  return <></>;
}

/**
 * Main application stack
 */
function MyApp() {
  return (
    <>
      <MyBucket 
        name="my-app-assets" 
        versioning={true} 
      />
      
      <MyDatabase
        name="my-app-db"
        engine="postgres"
        size="100GB"
        onDeploy={(ctx) => {
          console.log(`✅ Database deployed: ${ctx.resourceId}`);
          console.log(`   Connection: ${ctx.outputs?.state0}`);
        }}
        onError={(ctx, error) => {
          console.error(`❌ Database deployment failed: ${error.message}`);
        }}
      />
      
      <MyWebServer
        name="my-app-server"
        image="nginx:latest"
        port={8080}
      />
    </>
  );
}

/**
 * Configure and run CReact
 */
async function main() {
  console.log('🚀 Starting CReact Basic Setup Example...\n');
  
  try {
    // Initialize providers
    const cloudProvider = new DummyCloudProvider();
    const backendProvider = new DummyBackendProvider();
    
    await cloudProvider.initialize();
    await backendProvider.initialize();
    
    // Configure CReact with providers
    CReactCore.cloudProvider = cloudProvider;
    CReactCore.backendProvider = backendProvider;
    
    console.log('✅ CReact providers configured\n');
    
    // Render and deploy the application
    console.log('📦 Rendering CloudDOM...\n');
    await CReactCore.renderCloudDOM(<MyApp />, 'my-app-stack');
    
    console.log('\n🎉 Deployment completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main, MyApp };