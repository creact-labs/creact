// Smoke test for CloudDOM persistence feature
// This tests the real file I/O with actual filesystem operations

import { CReact } from './src/core/CReact';
import { DummyCloudProvider } from './src/providers/DummyCloudProvider';
import { DummyBackendProvider } from './src/providers/DummyBackendProvider';
import { useInstance } from './src/hooks/useInstance';
import * as fs from 'fs';
import * as path from 'path';

async function smokeTest() {
  console.log('🧪 Starting CloudDOM Persistence Smoke Test...\n');

  // Clean up any existing .creact directory
  if (fs.existsSync('.creact')) {
    fs.rmSync('.creact', { recursive: true, force: true });
    console.log('✓ Cleaned up existing .creact directory');
  }

  // Create CReact instance
  const cloudProvider = new DummyCloudProvider();
  const backendProvider = new DummyBackendProvider();
  const creact = new CReact({
    cloudProvider,
    backendProvider,
  });

  console.log('✓ Created CReact instance\n');

  // Create a realistic web application infrastructure stack
  // This simulates a typical serverless web app with S3, CloudFront, and API Gateway
  
  // Mock infrastructure construct classes (these would be real AWS CDK constructs in production)
  class S3Bucket {
    constructor(public props: any) {}
  }
  class CloudFrontDistribution {
    constructor(public props: any) {}
  }
  class ApiGateway {
    constructor(public props: any) {}
  }
  class LambdaFunction {
    constructor(public props: any) {}
  }
  
  // Define infrastructure components using the useInstance hook
  function WebAppStack({ children }: any) {
    return children;
  }
  
  function StaticAssets() {
    const bucket = useInstance('web-assets-bucket', S3Bucket, {
      bucketName: 'my-app-assets',
      publicReadAccess: true,
      websiteIndexDocument: 'index.html',
    });
    
    const cdn = useInstance('cdn-distribution', CloudFrontDistribution, {
      originBucket: 'web-assets-bucket',
      priceClass: 'PriceClass_100',
      defaultCacheBehavior: {
        viewerProtocolPolicy: 'redirect-to-https',
      },
    });
    
    return null;
  }
  
  function ApiBackend() {
    const lambda = useInstance('api-handler', LambdaFunction, {
      functionName: 'api-handler',
      runtime: 'nodejs20.x',
      handler: 'index.handler',
      memorySize: 512,
    });
    
    const api = useInstance('api-gateway', ApiGateway, {
      apiName: 'my-app-api',
      stageName: 'prod',
      lambdaIntegration: 'api-handler',
    });
    
    return null;
  }
  
  // Create the JSX structure
  const jsx = {
    type: WebAppStack,
    props: {
      children: [
        {
          type: StaticAssets,
          props: {},
          key: 'static-assets',
        },
        {
          type: ApiBackend,
          props: {},
          key: 'api-backend',
        },
      ],
    },
    key: undefined,
  };

  console.log('📦 Building CloudDOM from JSX (Web App Stack)...');
  console.log('   - S3 Bucket for static assets');
  console.log('   - CloudFront CDN distribution');
  console.log('   - Lambda function for API');
  console.log('   - API Gateway REST API\n');
  
  const cloudDOM = await creact.build(jsx);
  console.log(`✓ Built CloudDOM with ${cloudDOM.length} nodes`);
  
  if (cloudDOM.length === 0) {
    console.log('  ⚠️  CloudDOM is empty - no infrastructure nodes registered');
    console.log('  ℹ️  This means useInstance was not called or nodes were filtered out\n');
  } else {
    console.log(`  📊 Infrastructure nodes created:`);
    cloudDOM.forEach((node: any) => {
      console.log(`     - ${node.id} (${node.construct.name})`);
    });
    console.log();
  }

  // Verify .creact directory was created
  if (!fs.existsSync('.creact')) {
    throw new Error('❌ .creact directory was not created!');
  }
  console.log('✓ .creact directory created');

  // Verify clouddom.json exists
  const cloudDOMPath = path.join('.creact', 'clouddom.json');
  if (!fs.existsSync(cloudDOMPath)) {
    throw new Error('❌ clouddom.json was not created!');
  }
  console.log('✓ clouddom.json file created');

  // Verify clouddom.sha256 exists
  const checksumPath = path.join('.creact', 'clouddom.sha256');
  if (!fs.existsSync(checksumPath)) {
    throw new Error('❌ clouddom.sha256 was not created!');
  }
  console.log('✓ clouddom.sha256 checksum file created');

  // Read and verify the CloudDOM file
  const fileContent = fs.readFileSync(cloudDOMPath, 'utf-8');
  const parsedCloudDOM = JSON.parse(fileContent);
  
  if (JSON.stringify(parsedCloudDOM) !== JSON.stringify(cloudDOM)) {
    throw new Error('❌ Persisted CloudDOM does not match in-memory CloudDOM!');
  }
  console.log('✓ Persisted CloudDOM matches in-memory CloudDOM');

  // Verify JSON is formatted (has newlines for readability)
  if (parsedCloudDOM.length > 0 && !fileContent.includes('\n')) {
    throw new Error('❌ CloudDOM JSON is not formatted!');
  }
  console.log('✓ CloudDOM JSON is properly formatted');

  // Read and verify checksum
  const checksum = fs.readFileSync(checksumPath, 'utf-8');
  if (checksum.length !== 64) { // SHA-256 produces 64 hex characters
    throw new Error('❌ Checksum is not a valid SHA-256 hash!');
  }
  console.log(`✓ Valid SHA-256 checksum: ${checksum.substring(0, 16)}...`);

  // Verify no lock files remain
  const lockPath = path.join('.creact', '.clouddom.lock');
  if (fs.existsSync(lockPath)) {
    throw new Error('❌ Lock file was not cleaned up!');
  }
  console.log('✓ Lock file properly cleaned up');

  // Test building again (should overwrite)
  console.log('\n📦 Building CloudDOM again (testing overwrite)...');
  const cloudDOM2 = await creact.build(jsx);
  console.log('✓ Second build completed successfully');

  // Verify file still exists and is valid
  const fileContent2 = fs.readFileSync(cloudDOMPath, 'utf-8');
  const parsedCloudDOM2 = JSON.parse(fileContent2);
  
  if (JSON.stringify(parsedCloudDOM2) !== JSON.stringify(cloudDOM2)) {
    throw new Error('❌ Second persisted CloudDOM does not match!');
  }
  console.log('✓ Overwrite successful, CloudDOM still valid');

  console.log('\n✅ All smoke tests passed! CloudDOM persistence is working correctly.');
  console.log('📁 CloudDOM persisted to .creact/clouddom.json (not deleted for inspection)\n');
}

// Run the smoke test
smokeTest().catch((error) => {
  console.error('\n❌ Smoke test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
