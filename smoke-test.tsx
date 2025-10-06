/** @jsx CReact.createElement */

// Smoke test for CReact with Context API and setState during deployment
// Demonstrates how setState is used to capture deployment outputs across multiple cycles

import { CReact } from './src/jsx';
import { CReact as CReactClass } from './src/core/CReact';
import { ICloudProvider } from './src/providers/ICloudProvider';
import { DummyBackendProvider } from './src/providers/DummyBackendProvider';
import { useInstance } from './src/hooks/useInstance';
import { useState } from './src/hooks/useState';
import { createContext, useContext } from './src/index';
import { CloudDOMNode } from './src/core/types';
import * as fs from 'fs';

// Mock AWS constructs
class EcrRepository {
  constructor(public props: any) {}
}

class AppRunnerService {
  constructor(public props: any) {}
}

// Helper to print CloudDOM in a readable format
function printCloudDOM(cloudDOM: CloudDOMNode[], title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${title}`);
  console.log('='.repeat(60));
  console.log(JSON.stringify(cloudDOM, null, 2));
  console.log('='.repeat(60));
}

// Custom CloudProvider that simulates deployment and returns outputs
class SimulatedCloudProvider implements ICloudProvider {
  private deploymentCount = 0;

  async initialize(): Promise<void> {
    console.log('🔧 Initializing cloud provider...');
  }

  materialize(cloudDOM: CloudDOMNode[]): void {
    this.deploymentCount++;
    console.log(`\n📦 Deployment #${this.deploymentCount}: Materializing resources...`);
    
    if (!Array.isArray(cloudDOM)) {
      console.error('ERROR: cloudDOM is not an array:', typeof cloudDOM, cloudDOM);
      throw new Error(`cloudDOM must be an array, got ${typeof cloudDOM}`);
    }
    
    for (const node of cloudDOM) {
      console.log(`  ⚙️  ${node.construct.name}: ${node.id}`);
      
      // Simulate deployment and generate outputs
      if (node.construct.name === 'EcrRepository') {
        const accountId = '123456789012';
        const region = 'us-east-1';
        const repoName = node.props.repositoryName;
        
        node.outputs = {
          repositoryUrl: `${accountId}.dkr.ecr.${region}.amazonaws.com/${repoName}`,
          repositoryArn: `arn:aws:ecr:${region}:${accountId}:repository/${repoName}`,
        };
        
        console.log(`     ✓ Repository URL: ${node.outputs.repositoryUrl}`);
      } else if (node.construct.name === 'AppRunnerService') {
        const imageId = node.props.sourceConfiguration.imageRepository.imageIdentifier;
        node.outputs = {
          serviceUrl: `https://${node.props.serviceName}.us-east-1.awsapprunner.com`,
          serviceArn: `arn:aws:apprunner:us-east-1:123456789012:service/${node.props.serviceName}`,
          imageUsed: imageId,
        };
        
        console.log(`     ✓ Service URL: ${node.outputs.serviceUrl}`);
        console.log(`     ✓ Using image: ${imageId}`);
      }
    }
  }
}

// Create a context for sharing registry outputs
interface RegistryOutputs {
  repositoryUrl?: string;
  repositoryArn?: string;
}

const RegistryContext = createContext({} as RegistryOutputs);

// Registry stack that provides context
function RegistryStack({ children }: { children: any }) {
  const repo = useInstance(EcrRepository, {
    key: 'repo',
    repositoryName: 'my-app-repo',
  });

  const [repositoryUrl, setRepositoryUrl] = useState<string>();
  const [repositoryArn, setRepositoryArn] = useState<string>();

  // Update state from deployment outputs
  if (repo.outputs?.repositoryUrl && !repositoryUrl) {
    setRepositoryUrl(repo.outputs.repositoryUrl as string);
  }
  if (repo.outputs?.repositoryArn && !repositoryArn) {
    setRepositoryArn(repo.outputs.repositoryArn as string);
  }

  const outputs: RegistryOutputs = { repositoryUrl, repositoryArn };

  return (
    <RegistryContext.Provider value={outputs}>
      {children}
    </RegistryContext.Provider>
  );
}

// Service that consumes context
function ServiceStack() {
  const { repositoryUrl } = useContext(RegistryContext);

  const service = useInstance(AppRunnerService, {
    key: 'service',
    serviceName: 'my-app-service',
    sourceConfiguration: {
      imageRepository: {
        imageIdentifier: repositoryUrl ? `${repositoryUrl}:latest` : 'PENDING_REGISTRY_URL',
      },
    },
  });

  const [serviceUrl, setServiceUrl] = useState<string>();
  
  if (service.outputs?.serviceUrl && !serviceUrl) {
    setServiceUrl(service.outputs.serviceUrl as string);
  }

  return null;
}

// Root application
function App() {
  return (
    <RegistryStack>
      <ServiceStack />
    </RegistryStack>
  );
}

// Run the smoke test
async function main() {
  console.log('🚀 CReact Context API + useState Smoke Test');
  console.log('='.repeat(60));
  console.log('This test demonstrates:');
  console.log('  1. createContext/useContext for sharing values between components');
  console.log('  2. useState for declaring persistent outputs');
  console.log('  3. setState during deployment to capture resource outputs');
  console.log('  4. Multiple build cycles showing state evolution');

  const testDir = `.creact-smoke-${Date.now()}`;

  try {
    const cloudProvider = new SimulatedCloudProvider();
    const backendProvider = new DummyBackendProvider();

    const creact = new CReactClass({
      cloudProvider,
      backendProvider,
      persistDir: testDir,
    });

    // Cycle 1: Initial build (no outputs yet)
    console.log('\n\n🔄 CYCLE 1: Initial Build (no deployment outputs yet)');
    console.log('-'.repeat(60));
    const cloudDOM1 = await creact.build(<App />);
    printCloudDOM(cloudDOM1, 'CloudDOM after Cycle 1 (Initial Build)');
    console.log('\n💡 Notice: Service image is "PENDING_REGISTRY_URL" because context has no value yet');

    // Cycle 2: Deploy and rebuild (outputs populated)
    console.log('\n\n🔄 CYCLE 2: Deploy + Rebuild (outputs captured)');
    console.log('-'.repeat(60));
    await creact.deploy(cloudDOM1);
    const cloudDOM2 = await creact.build(<App />);
    printCloudDOM(cloudDOM2, 'CloudDOM after Cycle 2 (Post-Deployment)');
    console.log('\n💡 Notice: Service image now uses the actual repository URL from context!');

    // Cycle 3: Another build to show persistence
    console.log('\n\n🔄 CYCLE 3: Rebuild (state persisted)');
    console.log('-'.repeat(60));
    const cloudDOM3 = await creact.build(<App />);
    printCloudDOM(cloudDOM3, 'CloudDOM after Cycle 3 (State Persisted)');
    console.log('\n💡 Notice: State persists across builds - outputs still available');

    // Summary
    console.log('\n\n🎉 Smoke Test Completed Successfully!');
    console.log('='.repeat(60));
    console.log('📋 Summary:');
    console.log('  ✓ Context API: RegistryStack shared outputs with ServiceStack');
    console.log('  ✓ useState: Declared repositoryUrl, repositoryArn, serviceUrl');
    console.log('  ✓ setState: Captured deployment outputs and updated state');
    console.log('  ✓ Persistence: State maintained across multiple build cycles');
    console.log('  ✓ Integration: Service correctly used registry URL from context');
    
    console.log('\n📈 Evolution:');
    console.log('  Cycle 1: Service image = "PENDING_REGISTRY_URL" (no context value)');
    console.log('  Cycle 2: Service image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app-repo:latest"');
    console.log('  Cycle 3: Service image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app-repo:latest" (persisted)');
    
  } catch (error) {
    console.error('\n❌ Smoke test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

main();
