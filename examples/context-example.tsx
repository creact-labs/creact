// Example: Using createContext and useContext for sharing outputs
// This demonstrates the React-like context API for infrastructure

/** @jsxRuntime classic */
/** @jsx CReact.createElement */

import { CReact } from '../src/jsx';
import { createContext } from '../src/context/createContext';
import { useContext } from '../src/hooks/useContext';
import { useInstance } from '../src/hooks/useInstance';
import { useState } from '../src/hooks/useState';
import { Renderer } from '../src/core/Renderer';

// Mock constructs for demonstration
class EcrRepository {
  constructor(public props: any) {}
}

class AppRunnerService {
  constructor(public props: any) {}
}

// Define typed context for registry outputs
interface RegistryOutputs {
  repositoryUrl?: string;
  repositoryArn?: string;
}

// Create context (like React.createContext)
const RegistryContext = createContext<RegistryOutputs>({});

// Registry stack - declares outputs and provides via context
function RegistryStack({ children }: { children: any }) {
  const repo = useInstance(EcrRepository, { 
    key: 'repo', 
    name: 'my-app' 
  });
  
  // Declare outputs using useState (NOT reactive state)
  const [repositoryUrl, setRepositoryUrl] = useState<string>();
  const [repositoryArn, setRepositoryArn] = useState<string>();
  
  // Simulate setting outputs (would happen during deployment)
  setRepositoryUrl('https://123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app');
  setRepositoryArn('arn:aws:ecr:us-east-1:123456789012:repository/my-app');
  
  // Aggregate outputs for context
  const outputs = { repositoryUrl, repositoryArn };
  
  return (
    <RegistryContext.Provider value={outputs}>
      {children}
    </RegistryContext.Provider>
  );
}

// Service - consumes outputs via useContext
function Service({ name }: { name: string }) {
  // Access parent's outputs via context (no prop drilling!)
  const { repositoryUrl } = useContext(RegistryContext);
  
  const service = useInstance(AppRunnerService, {
    key: `service-${name}`,
    name,
    imageRepository: {
      imageIdentifier: `${repositoryUrl}:latest`
    }
  });
  
  return null;
}

// Infrastructure tree
function Infrastructure() {
  return (
    <RegistryStack>
      <Service name="api" />
      <Service name="worker" />
    </RegistryStack>
  );
}

// Render the infrastructure
console.log('=== Context Example ===\n');

const renderer = new Renderer();
const fiber = renderer.render(<Infrastructure />);

console.log('✓ Infrastructure rendered successfully');
console.log('✓ Context propagated from RegistryStack to Service components');
console.log('✓ Multiple services share the same registry outputs');
console.log('\nFiber tree structure:');
console.log(JSON.stringify(fiber, null, 2));
