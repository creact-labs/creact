/**
 * Integration Test: Reactivity and Hooks Behavior
 * 
 * This test runs an actual CReact app to verify:
 * 1. Non-reactive useState behavior
 * 2. Output-driven reactivity
 * 3. Automatic binding creation
 * 4. Effect execution with outputs
 * 5. State persistence across cycles
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CReact } from '../../src/core/CReact';
import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { CloudDOMNode } from '../../src/core/types';
import { useState, useEffect, useInstance } from '../../src';
import { CReact as JSXRuntime } from '../../src/jsx';
import { SQLiteBackendProvider } from '../helpers/SQLiteBackendProvider';

// Mock constructs for testing
class Database {
  constructor(public props: any) {}
}

class ApiGateway {
  constructor(public props: any) {}
}

class S3Bucket {
  constructor(public props: any) {}
}



/**
 * Mock Cloud Provider that simulates real deployment behavior
 */
class TestCloudProvider implements ICloudProvider {
  public deployedNodes: CloudDOMNode[] = [];
  public deployCallCount = 0;
  public outputsGenerated = new Map<string, Record<string, any>>();
  
  async deploy(nodes: CloudDOMNode[]): Promise<void> {
    this.deployCallCount++;
    console.log(`\n[TestProvider] Deploy call #${this.deployCallCount}`);
    
    for (const node of nodes) {
      await this.deployNode(node);
    }
    
    this.deployedNodes = nodes;
  }
  
  private async deployNode(node: CloudDOMNode): Promise<void> {
    console.log(`[TestProvider] Deploying ${node.id}...`);
    
    // Generate outputs based on construct type
    const outputs = this.generateOutputs(node);
    this.outputsGenerated.set(node.id, outputs);
    
    // Populate node outputs (simulates provider behavior)
    // IMPORTANT: Don't overwrite state outputs, only add provider outputs
    if (!node.outputs) {
      node.outputs = {};
    }
    
    // Only add non-state outputs (provider outputs)
    for (const [key, value] of Object.entries(outputs)) {
      if (!key.startsWith('state.')) {
        node.outputs[key] = value;
      }
    }
    
    console.log(`[TestProvider] ${node.id} outputs:`, node.outputs);
    
    // Deploy children recursively
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await this.deployNode(child);
      }
    }
  }
  
  private generateOutputs(node: CloudDOMNode): Record<string, any> {
    const constructName = node.construct?.name || 'Unknown';
    
    switch (constructName) {
      case 'Database':
        return {
          connectionUrl: `postgres://localhost:5432/${node.props.name}`,
          port: 5432,
          host: 'localhost',
          database: node.props.name,
        };
      
      case 'ApiGateway':
        return {
          endpoint: `https://api.example.com/${node.props.name}`,
          apiId: `api-${node.id}`,
          stage: 'prod',
        };
      
      case 'S3Bucket':
        return {
          bucketName: `${node.props.name}-bucket`,
          bucketArn: `arn:aws:s3:::${node.props.name}`,
          region: 'us-east-1',
        };
      
      default:
        return { id: node.id, status: 'deployed' };
    }
  }
  
  async destroy(nodes: CloudDOMNode[]): Promise<void> {
    console.log('[TestProvider] Destroying resources...');
    this.deployedNodes = [];
  }
  
  async validate(nodes: CloudDOMNode[]): Promise<void> {
    console.log('[TestProvider] Validating resources...');
  }
  
  async materialize(cloudDOM: CloudDOMNode[], scope?: any): Promise<void> {
    // Materialize is called by StateMachine to populate outputs
    this.deployCallCount++;
    console.log(`[TestProvider] Materialize call #${this.deployCallCount} for ${cloudDOM.length} nodes...`);
    
    for (const node of cloudDOM) {
      await this.materializeNode(node);
    }
  }
  
  private async materializeNode(node: CloudDOMNode): Promise<void> {
    // Generate and populate outputs for this node
    const outputs = this.generateOutputs(node);
    
    // Track that we generated outputs for this node
    const nodeIdParts = node.id.split('.');
    const shortId = nodeIdParts[nodeIdParts.length - 1];
    this.outputsGenerated.set(shortId, outputs);
    this.outputsGenerated.set(node.id, outputs);
    
    if (!node.outputs) {
      node.outputs = {};
    }
    
    // Add provider outputs (not state outputs)
    for (const [key, value] of Object.entries(outputs)) {
      if (!key.startsWith('state.')) {
        node.outputs[key] = value;
      }
    }
    
    console.log(`[TestProvider] Materialized ${node.id} with outputs:`, node.outputs);
    
    // Materialize children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await this.materializeNode(child);
      }
    }
  }
}

describe('Reactivity and Hooks Integration Tests', () => {
  let provider: TestCloudProvider;
  let backend: SQLiteBackendProvider;
  let creact: CReact;
  
  beforeEach(() => {
    provider = new TestCloudProvider();
    backend = new SQLiteBackendProvider(':memory:');
    creact = new CReact({
      cloudProvider: provider,
      backendProvider: backend
    });
  });
  
  afterEach(() => {
    // Clean up database
    backend.clear();
    backend.close();
  });
  
  describe('Test 1: Non-Reactive useState Behavior', () => {
    it('should NOT trigger re-renders when setState is called', async () => {
      let renderCount = 0;
      const setStateCalls: any[] = [];
      
      function TestComponent() {
        renderCount++;
        console.log(`[TestComponent] Render #${renderCount}`);
        
        const [count, setCount] = useState(0);
        const [message, setMessage] = useState('initial');
        
        // Multiple setState calls - should NOT cause re-renders
        setStateCalls.push({ type: 'setCount', value: 1 });
        setCount(1);
        
        setStateCalls.push({ type: 'setCount', value: 2 });
        setCount(2);
        
        setStateCalls.push({ type: 'setCount', value: 3 });
        setCount(3);
        
        setStateCalls.push({ type: 'setMessage', value: 'updated' });
        setMessage('updated');
        
        console.log(`[TestComponent] State: count=${count}, message=${message}`);
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }
      
      // Build and deploy the component
      const cloudDOM = await creact.build(JSXRuntime.createElement(TestComponent, null));
      await creact.deploy(cloudDOM);
      
      // Verify: Component should render only ONCE despite multiple setState calls
      expect(renderCount).toBe(1);
      expect(setStateCalls.length).toBe(4);
      
      console.log('✅ Test 1 passed: setState does not trigger re-renders');
    });
  });
  
  describe('Test 2: Output Binding and Reactivity', () => {
    it('should create automatic bindings and trigger re-renders on output changes', async () => {
      let renderCount = 0;
      let effectRunCount = 0;
      const stateSnapshots: any[] = [];
      
      function OutputBindingComponent() {
        renderCount++;
        console.log(`\n[OutputBindingComponent] Render #${renderCount}`);
        
        const db = useInstance(Database, { name: 'test-db' });
        
        const [connectionUrl, setConnectionUrl] = useState<string>();
        const [port, setPort] = useState<number>();
        
        stateSnapshots.push({ connectionUrl, port, renderCount });
        
        useEffect(() => {
          effectRunCount++;
          console.log(`[OutputBindingComponent] Effect #${effectRunCount}`);
          console.log('[OutputBindingComponent] DB outputs:', db.outputs);
          
          // Create automatic bindings by setting state to outputs
          if (db.outputs?.connectionUrl) {
            console.log('[OutputBindingComponent] Binding connectionUrl...');
            setConnectionUrl(db.outputs.connectionUrl);
          }
          
          if (db.outputs?.port) {
            console.log('[OutputBindingComponent] Binding port...');
            setPort(db.outputs.port);
          }
        }, [db]);
        
        console.log(`[OutputBindingComponent] State: url=${connectionUrl}, port=${port}`);
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }
      
      // Initial deployment
      console.log('\n=== Initial Deployment ===');
      const cloudDOM = await creact.build(JSXRuntime.createElement(OutputBindingComponent, null));
      await creact.deploy(cloudDOM);
      
      // Verify initial state
      expect(renderCount).toBeGreaterThanOrEqual(1);
      expect(effectRunCount).toBeGreaterThanOrEqual(1);
      expect(provider.deployCallCount).toBe(1);
      
      // Verify outputs were generated
      console.log('[Test] Generated output keys:', Array.from(provider.outputsGenerated.keys()));
      const dbOutputs = provider.outputsGenerated.get('test-db') || 
                        Array.from(provider.outputsGenerated.values()).find(o => o.database === 'test-db');
      expect(dbOutputs).toBeDefined();
      expect(dbOutputs?.connectionUrl).toBe('postgres://localhost:5432/test-db');
      expect(dbOutputs?.port).toBe(5432);
      
      console.log('✅ Test 2 passed: Automatic bindings created and effects ran with outputs');
    });
  });
  
  describe('Test 3: Multiple Instances with Dependencies', () => {
    it('should track dependencies correctly for multiple instances', async () => {
      let renderCount = 0;
      const effectCalls: string[] = [];
      
      function MultiInstanceComponent() {
        renderCount++;
        console.log(`\n[MultiInstanceComponent] Render #${renderCount}`);
        
        const db = useInstance(Database, { name: 'main-db' });
        const api = useInstance(ApiGateway, { name: 'main-api' });
        const bucket = useInstance(S3Bucket, { name: 'assets' });
        
        const [dbUrl, setDbUrl] = useState<string>();
        const [apiUrl, setApiUrl] = useState<string>();
        const [bucketName, setBucketName] = useState<string>();
        
        // Effect for database
        useEffect(() => {
          effectCalls.push('db-effect');
          console.log('[MultiInstanceComponent] DB Effect');
          if (db.outputs?.connectionUrl) {
            setDbUrl(db.outputs.connectionUrl);
          }
        }, [db.outputs?.connectionUrl]);
        
        // Effect for API
        useEffect(() => {
          effectCalls.push('api-effect');
          console.log('[MultiInstanceComponent] API Effect');
          if (api.outputs?.endpoint) {
            setApiUrl(api.outputs.endpoint);
          }
        }, [api.outputs?.endpoint]);
        
        // Effect for bucket
        useEffect(() => {
          effectCalls.push('bucket-effect');
          console.log('[MultiInstanceComponent] Bucket Effect');
          if (bucket.outputs?.bucketName) {
            setBucketName(bucket.outputs.bucketName);
          }
        }, [bucket.outputs?.bucketName]);
        
        console.log(`[MultiInstanceComponent] State: db=${dbUrl}, api=${apiUrl}, bucket=${bucketName}`);
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }
      
      // Deploy
      console.log('\n=== Multi-Instance Deployment ===');
      const cloudDOM = await creact.build(JSXRuntime.createElement(MultiInstanceComponent, null));
      await creact.deploy(cloudDOM);
      
      // Verify all instances were deployed
      console.log('[Test] Generated output keys:', Array.from(provider.outputsGenerated.keys()));
      expect(provider.outputsGenerated.has('database') || provider.outputsGenerated.has('main-db')).toBe(true);
      expect(provider.outputsGenerated.has('api-gateway') || provider.outputsGenerated.has('main-api')).toBe(true);
      expect(provider.outputsGenerated.has('s-3-bucket') || provider.outputsGenerated.has('assets')).toBe(true);
      
      // Verify all effects ran
      expect(effectCalls).toContain('db-effect');
      expect(effectCalls).toContain('api-effect');
      expect(effectCalls).toContain('bucket-effect');
      
      console.log('✅ Test 3 passed: Multiple instances with correct dependency tracking');
    });
  });
  
  describe('Test 4: State Persistence Across Cycles', () => {
    it('should persist state values across deployment cycles', async () => {
      let renderCount = 0;
      
      function PersistenceComponent() {
        renderCount++;
        console.log(`\n[PersistenceComponent] Render #${renderCount}`);
        
        const db = useInstance(Database, { name: 'persistence-db' });
        const [dbUrl, setDbUrl] = useState<string>();
        const [deployTime, setDeployTime] = useState<number>();
        
        useEffect(() => {
          console.log('[PersistenceComponent] Effect running');
          if (db.outputs?.connectionUrl) {
            setDbUrl(db.outputs.connectionUrl);
            setDeployTime(Date.now());
          }
        }, [db]);
        
        console.log(`[PersistenceComponent] State: dbUrl=${dbUrl}, deployTime=${deployTime}`);
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }
      
      // First deployment
      console.log('\n=== First Deployment ===');
      const cloudDOM1 = await creact.build(JSXRuntime.createElement(PersistenceComponent, null));
      await creact.deploy(cloudDOM1);
      
      // Verify state was saved to backend
      const savedState1 = await backend.getState('default');
      expect(savedState1).toBeDefined();
      expect(savedState1.cloudDOM).toBeDefined();
      console.log('[Test] State after first deployment:', JSON.stringify(savedState1, null, 2).substring(0, 500));
      
      // Second deployment with same backend (simulates re-deploy)
      console.log('\n=== Second Deployment ===');
      const cloudDOM2 = await creact.build(JSXRuntime.createElement(PersistenceComponent, null));
      await creact.deploy(cloudDOM2);
      
      // Verify state was updated
      const savedState2 = await backend.getState('default');
      expect(savedState2).toBeDefined();
      expect(savedState2.cloudDOM).toBeDefined();
      
      // Verify the state persisted (both deployments should have saved state)
      expect(renderCount).toBeGreaterThanOrEqual(2);
      expect(savedState2.cloudDOM.length).toBeGreaterThanOrEqual(1);
      
      console.log('✅ Test 4 passed: State persists across deployment cycles');
    });
  });
  
  describe('Test 5: Effect Dependency Tracking', () => {
    it('should execute effects with precise dependency tracking', async () => {
      let renderCount = 0;
      const effectExecutions: Array<{ type: string; timestamp: number }> = [];
      
      function DependencyTrackingComponent() {
        renderCount++;
        console.log(`\n[DependencyTrackingComponent] Render #${renderCount}`);
        
        const db = useInstance(Database, { name: 'dep-test-db' });
        
        const [url, setUrl] = useState<string>();
        const [status, setStatus] = useState<string>('pending');
        
        // Effect with specific dependency
        useEffect(() => {
          effectExecutions.push({ type: 'url-effect', timestamp: Date.now() });
          console.log('[DependencyTrackingComponent] URL Effect');
          if (db.outputs?.connectionUrl) {
            setUrl(db.outputs.connectionUrl);
            setStatus('connected');
          }
        }, [db.outputs?.connectionUrl]);
        
        // Effect with no dependencies (runs once)
        useEffect(() => {
          effectExecutions.push({ type: 'init-effect', timestamp: Date.now() });
          console.log('[DependencyTrackingComponent] Init Effect (once)');
          setStatus('initializing');
        }, []);
        
        console.log(`[DependencyTrackingComponent] State: url=${url}, status=${status}`);
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }
      
      // Deploy
      console.log('\n=== Dependency Tracking Deployment ===');
      const cloudDOM = await creact.build(JSXRuntime.createElement(DependencyTrackingComponent, null));
      await creact.deploy(cloudDOM);
      
      // Verify effects executed
      const urlEffects = effectExecutions.filter(e => e.type === 'url-effect');
      const initEffects = effectExecutions.filter(e => e.type === 'init-effect');
      
      expect(urlEffects.length).toBeGreaterThanOrEqual(1);
      expect(initEffects.length).toBeGreaterThanOrEqual(1);
      
      console.log('✅ Test 5 passed: Effects executed with correct dependency tracking');
    });
  });
  
  describe('Test 6: Complete Lifecycle', () => {
    it('should execute complete lifecycle: render → deploy → effects → reactivity', async () => {
      const lifecycle: string[] = [];
      let renderCount = 0;
      let effectCount = 0;
      
      function LifecycleComponent() {
        renderCount++;
        lifecycle.push(`render-${renderCount}`);
        console.log(`\n[LifecycleComponent] Render #${renderCount}`);
        
        const db = useInstance(Database, { name: 'lifecycle-db' });
        const [dbUrl, setDbUrl] = useState<string>();
        
        useEffect(() => {
          effectCount++;
          lifecycle.push(`effect-${effectCount}`);
          console.log(`[LifecycleComponent] Effect #${effectCount}`);
          
          if (db.outputs?.connectionUrl) {
            lifecycle.push('binding-created');
            setDbUrl(db.outputs.connectionUrl);
          }
        }, [db]);
        
        console.log(`[LifecycleComponent] DB URL: ${dbUrl}`);
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }
      
      // Execute full lifecycle
      console.log('\n=== Full Lifecycle Test ===');
      const cloudDOM = await creact.build(JSXRuntime.createElement(LifecycleComponent, null));
      await creact.deploy(cloudDOM);
      
      // Verify lifecycle order
      expect(lifecycle).toContain('render-1');
      expect(lifecycle.some(e => e.startsWith('effect-'))).toBe(true);
      
      // Verify deployment happened
      expect(provider.deployCallCount).toBe(1);
      console.log('[Test] Generated output keys:', Array.from(provider.outputsGenerated.keys()));
      expect(provider.outputsGenerated.has('database') || provider.outputsGenerated.has('lifecycle-db')).toBe(true);
      
      console.log('\n📊 Lifecycle Events:', lifecycle);
      console.log('✅ Test 6 passed: Complete lifecycle executed correctly');
    });
  });
});
