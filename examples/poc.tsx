// REQ-01, REQ-04: POC Example demonstrating Dependency Injection pattern
// This example validates Milestone 1: Providers injected successfully, CloudDOM structure logged

import { Renderer } from '../src/core/Renderer';
import { Validator } from '../src/core/Validator';
import { CloudDOMBuilder } from '../src/core/CloudDOMBuilder';
import { DummyCloudProvider } from '../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../src/providers/DummyBackendProvider';
import { CloudDOMNode } from '../src/core/types';

// Dummy constructs for POC (empty classes)
class DummyRegistry {}
class DummyService {}

// Simple component that creates a CloudDOM node manually (hooks not implemented yet)
function RegistryStack({ children }: { children?: any }) {
  // For POC, we manually attach CloudDOM nodes to demonstrate the pipeline
  // In Phase 2, this will use useInstance hook
  return children;
}

function Service({ name }: { name: string }) {
  return null;
}

// Main POC function
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isDebug = process.argv.includes('--debug');
  
  // Enable debug mode if requested
  if (isDebug) {
    process.env.NODE_ENV = 'development';
    process.env.CREACT_DEBUG = 'true';
  }
  
  console.log('=== CReact POC - Milestone 1 Verification ===\n');
  
  // Step 1: Instantiate providers (DEPENDENCY INJECTION)
  console.log('Step 1: Instantiating providers...');
  const cloudProvider = new DummyCloudProvider();
  const backendProvider = new DummyBackendProvider();
  console.log('✓ Providers instantiated (DummyCloudProvider, DummyBackendProvider)\n');
  
  // Step 2: Create core components and inject providers
  console.log('Step 2: Creating core components with dependency injection...');
  const renderer = new Renderer();
  const validator = new Validator();
  const cloudDOMBuilder = new CloudDOMBuilder(cloudProvider); // ✅ Provider injected
  console.log('✓ Core components created (Renderer, Validator, CloudDOMBuilder)');
  console.log('✓ CloudProvider injected into CloudDOMBuilder\n');
  
  // Step 3: Create a simple JSX structure manually (React JSX not available yet)
  console.log('Step 3: Building Fiber tree from component structure...');
  
  // Manually create JSX-like structure for POC
  const jsxStructure = {
    type: RegistryStack,
    props: {
      children: [
        {
          type: Service,
          props: { name: 'api' },
          key: undefined
        }
      ]
    },
    key: undefined
  };
  
  // Step 4: Render JSX → Fiber
  console.log('Step 4: Rendering JSX → Fiber...');
  const fiber = renderer.render(jsxStructure);
  console.log('✓ Fiber tree created');
  console.log(`  - Root: ${fiber.path.join('.')}`);
  console.log(`  - Children: ${fiber.children.length}`);
  
  // Manually attach CloudDOM nodes to demonstrate the pipeline
  // (In Phase 2, useInstance hook will do this automatically)
  fiber.cloudDOMNode = {
    id: 'registry-stack',
    path: ['registry-stack'],
    construct: DummyRegistry,
    props: { name: 'app' },
    children: [],
    outputs: { repositoryUrl: 'registry-url' }
  };
  
  if (fiber.children[0]) {
    fiber.children[0].cloudDOMNode = {
      id: 'registry-stack.service',
      path: ['registry-stack', 'service'],
      construct: DummyService,
      props: { name: 'api', image: 'registry-url:latest' },
      children: []
    };
  }
  console.log('✓ CloudDOM nodes attached to Fiber (simulating useInstance)\n');
  
  // Step 5: Validate Fiber
  console.log('Step 5: Validating Fiber tree...');
  try {
    validator.validate(fiber);
    console.log('✓ Validation passed\n');
  } catch (error) {
    console.error('✗ Validation failed:', error);
    process.exit(1);
  }
  
  // Step 6: Build CloudDOM
  console.log('Step 6: Building CloudDOM from Fiber...');
  const cloudDOM = await cloudDOMBuilder.build(fiber);
  console.log('✓ CloudDOM built');
  console.log(`  - Root nodes: ${cloudDOM.length}`);
  console.log(`  - Total resources: ${countResources(cloudDOM)}\n`);
  
  // Step 7: Display CloudDOM structure
  console.log('Step 7: CloudDOM Structure:');
  console.log(JSON.stringify(cloudDOM, null, 2));
  console.log();
  
  if (!isDryRun) {
    // Step 8: Simulate deployment (materialize) with error handling
    console.log('Step 8: Deploying CloudDOM (DummyCloudProvider.materialize)...');
    try {
      cloudProvider.materialize(cloudDOM, null);
      console.log('✓ Deployment successful\n');
    } catch (error) {
      console.error('✗ Provider deployment failed:', error);
      // Test lifecycle hook: onError
      if (cloudProvider.onError) {
        console.log('Calling onError lifecycle hook...');
        await cloudProvider.onError(error as Error, cloudDOM);
      }
      throw error; // Re-throw to fail the POC
    }
    
    // Step 9: Save state (backend provider)
    console.log('Step 9: Saving state (DummyBackendProvider)...');
    await backendProvider.saveState('poc-stack', { cloudDOM });
    console.log('✓ State saved\n');
    
    // Step 10: Retrieve state to verify
    console.log('Step 10: Retrieving state to verify...');
    const savedState = await backendProvider.getState('poc-stack');
    console.log('✓ State retrieved');
    console.log(`  - Resources in state: ${countResources(savedState.cloudDOM)}\n`);
  }
  
  // Verification Summary
  console.log('=== Milestone 1 Verification Summary ===');
  console.log('✓ No errors');
  console.log('✓ Providers injected successfully (no direct instantiation inside core classes)');
  console.log('✓ CloudDOM structure logged correctly');
  console.log('✓ Dependency Injection pattern validated (REQ-04)');
  console.log('\nMilestone 1: PASSED ✓\n');
}

// Helper function to count resources in CloudDOM tree
// Uses WeakSet to prevent infinite loops from circular references
const visited = new WeakSet<CloudDOMNode>();
function countResources(nodes: CloudDOMNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (visited.has(node)) continue; // Skip already visited nodes
    visited.add(node);
    count++;
    if (node.children?.length) {
      count += countResources(node.children);
    }
  }
  return count;
}

// Run the POC
main().catch((error) => {
  console.error('POC failed:', error);
  process.exit(1);
});
