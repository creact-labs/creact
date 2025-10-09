import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Reconciler, getTotalChanges } from '../../src/core/Reconciler';
import { CloudDOMNode } from '../../src/core/types';
import { CReact } from '../../src/core/CReact';
import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { SQLiteBackendProvider } from '../helpers/SQLiteBackendProvider';
import { CReact as JSXRuntime } from '../../src/jsx';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';
import { useEffect } from '../../src/hooks/useEffect';
import { useContext } from '../../src/hooks/useContext';
import { createContext } from '../../src/context/createContext';

// Mock constructs
class Database {
  constructor(public props: any) {}
}

class ApiGateway {
  constructor(public props: any) {}
}

class S3Bucket {
  constructor(public props: any) {}
}

class CDN {
  constructor(public props: any) {}
}

class Monitoring {
  constructor(public props: any) {}
}

/**
 * Mock Cloud Provider
 */
class TestCloudProvider implements ICloudProvider {
  public deployedNodes: CloudDOMNode[] = [];
  public deployCallCount = 0;
  
  async deploy(nodes: CloudDOMNode[]): Promise<void> {
    this.deployCallCount++;
    this.deployedNodes = nodes;
  }
  
  async destroy(nodes: CloudDOMNode[]): Promise<void> {
    this.deployedNodes = [];
  }
  
  async validate(nodes: CloudDOMNode[]): Promise<void> {
    // No-op
  }
  
  async materialize(cloudDOM: CloudDOMNode[], scope?: any): Promise<void> {
    for (const node of cloudDOM) {
      await this.materializeNode(node);
    }
  }
  
  private async materializeNode(node: CloudDOMNode): Promise<void> {
    const constructName = node.construct?.name || 'Unknown';
    
    if (!node.outputs) {
      node.outputs = {};
    }
    
    switch (constructName) {
      case 'Database':
        node.outputs.connectionUrl = `postgres://localhost:5432/${node.props.name}`;
        node.outputs.port = 5432;
        break;
      case 'ApiGateway':
        node.outputs.endpoint = `https://api.example.com/${node.props.name}`;
        break;
      case 'S3Bucket':
        node.outputs.bucketName = `${node.props.name}-bucket`;
        break;
      case 'CDN':
        node.outputs.domain = `cdn-${node.props.name}.global`;
        break;
      case 'Monitoring':
        node.outputs.dashboardUrl = `https://monitor-${node.props.name}.local`;
        break;
    }
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await this.materializeNode(child);
      }
    }
  }
}

describe('Reconciliation False Positive Fix - Real World Usage', () => {
  let reconciler: Reconciler;
  let provider: TestCloudProvider;
  let backend: SQLiteBackendProvider;
  let creact: CReact;

  beforeEach(() => {
    reconciler = new Reconciler();
    provider = new TestCloudProvider();
    backend = new SQLiteBackendProvider(':memory:');
    creact = new CReact({
      cloudProvider: provider,
      backendProvider: backend,
    });
    // Clear any static hydration data from previous tests
    (creact as any).clearHydration();
  });

  afterEach(() => {
    backend.clear();
    backend.close();
  });

  describe('Complex Multi-Region App with Conditional Rendering', () => {
    it('should reconcile complex nested app with 0 changes on rebuild', async () => {
      // Create context
      const RegionContext = createContext<{ region: string }>({ region: 'us-east-1' });
      const ConfigContext = createContext<{ enableMonitoring: boolean }>({ enableMonitoring: true });

      // Nested component with conditional rendering
      function MonitoringStack({ targets }: { targets: string[] }) {
        const { region } = useContext(RegionContext);
        const monitoring = useInstance(Monitoring, { 
          name: `monitor-${region}`, 
          targets 
        });
        
        const [dashboardUrl, setDashboardUrl] = useState<string>();
        
        useEffect(() => {
          if (monitoring.outputs?.dashboardUrl) {
            setDashboardUrl(monitoring.outputs.dashboardUrl);
          }
        }, [monitoring.outputs?.dashboardUrl]);
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }

      // Regional stack with props
      function RegionStack({ region, enableCDN }: { region: string; enableCDN: boolean }) {
        const db = useInstance(Database, { name: `db-${region}`, region });
        const api = useInstance(ApiGateway, { 
          name: `api-${region}`, 
          region,
          dbUrl: db.outputs?.connectionUrl 
        });
        const bucket = useInstance(S3Bucket, { name: `assets-${region}`, region });
        
        const [apiUrl, setApiUrl] = useState<string>();
        const [bucketName, setBucketName] = useState<string>();
        
        useEffect(() => {
          if (api.outputs?.endpoint) {
            setApiUrl(api.outputs.endpoint);
          }
        }, [api.outputs?.endpoint]);
        
        useEffect(() => {
          if (bucket.outputs?.bucketName) {
            setBucketName(bucket.outputs.bucketName);
          }
        }, [bucket.outputs?.bucketName]);
        
        const { enableMonitoring } = useContext(ConfigContext);
        
        return JSXRuntime.createElement(
          RegionContext.Provider,
          { value: { region } },
          enableMonitoring && apiUrl
            ? JSXRuntime.createElement(MonitoringStack, { targets: [apiUrl] })
            : null,
          enableCDN && bucketName
            ? JSXRuntime.createElement(CDN, { name: `cdn-${region}`, origins: [bucketName] })
            : null
        );
      }

      // Root app with multiple regions
      function MultiRegionApp() {
        const [enableMonitoring] = useState(true);
        const [regions] = useState(['us-east-1', 'eu-west-1']);
        
        const regionStacks = regions.map((region, idx) =>
          JSXRuntime.createElement(RegionStack, {
            key: region,
            region,
            enableCDN: idx === 0, // Only first region gets CDN
          })
        );
        
        return JSXRuntime.createElement(
          ConfigContext.Provider,
          { value: { enableMonitoring } },
          ...regionStacks
        );
      }

      // First build and deploy
      const cloudDOM1 = await creact.build(
        JSXRuntime.createElement(MultiRegionApp, null)
      );
      await creact.deploy(cloudDOM1);

      // Get backend state
      const savedState = await backend.getState('default');
      expect(savedState).toBeDefined();
      expect(savedState.cloudDOM).toBeDefined();

      // Rebuild with same component (simulates dev mode hot reload)
      const cloudDOM2 = await creact.build(
        JSXRuntime.createElement(MultiRegionApp, null)
      );

      // Reconcile - CRITICAL: Should have 0 changes
      const changeSet = reconciler.reconcile(savedState.cloudDOM, cloudDOM2);

      // Debug output
      if (getTotalChanges(changeSet) !== 0) {
        console.log('\n=== UNEXPECTED CHANGES DETECTED ===');
        console.log('Total changes:', getTotalChanges(changeSet));
        console.log('Updates:', changeSet.updates.length);
        
        // Show detailed comparison for first update
        if (changeSet.updates.length > 0) {
          const updateId = changeSet.updates[0].id;
          const prevNode = savedState.cloudDOM.find((n: any) => n.id === updateId);
          const currNode = cloudDOM2.find((n: any) => n.id === updateId);
          
          console.log('\nFirst Update Comparison:');
          console.log('Node ID:', updateId);
          console.log('Previous props:', JSON.stringify(prevNode?.props, null, 2));
          console.log('Current props:', JSON.stringify(currNode?.props, null, 2));
          console.log('Previous outputs:', JSON.stringify(prevNode?.outputs, null, 2));
          console.log('Current outputs:', JSON.stringify(currNode?.outputs, null, 2));
        }
        console.log('===================================\n');
      }

      expect(getTotalChanges(changeSet)).toBe(0);
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(0);
      expect(changeSet.moves).toHaveLength(0);
    });

    it('should detect actual changes when props change', async () => {
      const RegionContext = createContext<{ region: string }>({ region: 'us-east-1' });

      function DatabaseStack({ size }: { size: string }) {
        const { region } = useContext(RegionContext);
        const db = useInstance(Database, { 
          name: `db-${region}`, 
          region,
          size // This prop will change
        });
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }

      function TestApp({ size }: { size: string }) {
        return JSXRuntime.createElement(
          RegionContext.Provider,
          { value: { region: 'us-east-1' } },
          JSXRuntime.createElement(DatabaseStack, { size })
        );
      }

      // Deploy with size='small'
      const cloudDOM1 = await creact.build(
        JSXRuntime.createElement(TestApp, { size: 'small' })
      );
      await creact.deploy(cloudDOM1);

      const savedState = await backend.getState('default');

      // Build with size='large' (changed prop)
      const cloudDOM2 = await creact.build(
        JSXRuntime.createElement(TestApp, { size: 'large' })
      );

      // Reconcile - should detect 1 update
      const changeSet = reconciler.reconcile(savedState.cloudDOM, cloudDOM2);

      // Debug output
      if (changeSet.updates.length !== 1) {
        console.log('\n=== EXPECTED UPDATE NOT DETECTED ===');
        console.log('Updates detected:', changeSet.updates.length);
        console.log('Creates:', changeSet.creates.length);
        console.log('Deletes:', changeSet.deletes.length);
        console.log('Replacements:', changeSet.replacements.length);
        console.log('Total changes:', getTotalChanges(changeSet));
        
        const dbNode1 = savedState.cloudDOM.find((n: any) => n.id.includes('database'));
        const dbNode2 = cloudDOM2.find((n: any) => n.id.includes('database'));
        
        console.log('\nDatabase node comparison:');
        console.log('Previous ID:', dbNode1?.id);
        console.log('Current ID:', dbNode2?.id);
        console.log('Previous constructType:', dbNode1?.constructType);
        console.log('Current constructType:', dbNode2?.constructType);
        console.log('Previous props:', JSON.stringify(dbNode1?.props, null, 2));
        console.log('Current props:', JSON.stringify(dbNode2?.props, null, 2));
        console.log('===================================\n');
      }

      expect(changeSet.updates).toHaveLength(1);
      expect(getTotalChanges(changeSet)).toBe(1);
    });

    it('should detect changes when conditional rendering adds resources', async () => {
      function ConditionalApp({ enableAPI }: { enableAPI: boolean }) {
        const db = useInstance(Database, { name: 'main-db' });
        
        if (enableAPI) {
          const api = useInstance(ApiGateway, { 
            name: 'main-api',
            dbUrl: db.outputs?.connectionUrl 
          });
        }
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }

      // Deploy without API
      const cloudDOM1 = await creact.build(
        JSXRuntime.createElement(ConditionalApp, { enableAPI: false })
      );
      await creact.deploy(cloudDOM1);

      const savedState = await backend.getState('default');

      // Build with API enabled
      const cloudDOM2 = await creact.build(
        JSXRuntime.createElement(ConditionalApp, { enableAPI: true })
      );

      // Reconcile - should detect 1 create
      const changeSet = reconciler.reconcile(savedState.cloudDOM, cloudDOM2);

      expect(changeSet.creates).toHaveLength(1);
      expect(getTotalChanges(changeSet)).toBe(1);
    });

    it('should handle deeply nested components with multiple contexts', async () => {
      const EnvContext = createContext<{ env: string }>({ env: 'prod' });
      const RegionContext = createContext<{ region: string }>({ region: 'us-east-1' });

      function DeepComponent() {
        const { env } = useContext(EnvContext);
        const { region } = useContext(RegionContext);
        
        const db = useInstance(Database, { 
          name: `${env}-db-${region}`,
          env,
          region 
        });
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }

      function MiddleComponent() {
        return JSXRuntime.createElement(
          RegionContext.Provider,
          { value: { region: 'eu-west-1' } },
          JSXRuntime.createElement(DeepComponent, null)
        );
      }

      function RootApp() {
        return JSXRuntime.createElement(
          EnvContext.Provider,
          { value: { env: 'staging' } },
          JSXRuntime.createElement(MiddleComponent, null)
        );
      }

      // First deploy
      const cloudDOM1 = await creact.build(JSXRuntime.createElement(RootApp, null));
      await creact.deploy(cloudDOM1);

      const savedState = await backend.getState('default');

      // Rebuild
      const cloudDOM2 = await creact.build(JSXRuntime.createElement(RootApp, null));

      // Should have 0 changes
      const changeSet = reconciler.reconcile(savedState.cloudDOM, cloudDOM2);
      
      expect(getTotalChanges(changeSet)).toBe(0);
    });

    it('should handle arrays with keys correctly', async () => {
      function MultiDatabaseApp() {
        const regions = ['us-east-1', 'eu-west-1', 'ap-south-1'];
        
        regions.forEach(region => {
          useInstance(Database, { 
            key: `db-${region}`,
            name: `database-${region}`,
            region 
          });
        });
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }

      // First deploy
      const cloudDOM1 = await creact.build(
        JSXRuntime.createElement(MultiDatabaseApp, null)
      );
      await creact.deploy(cloudDOM1);

      const savedState = await backend.getState('default');

      // Rebuild
      const cloudDOM2 = await creact.build(
        JSXRuntime.createElement(MultiDatabaseApp, null)
      );

      // Should have 0 changes
      const changeSet = reconciler.reconcile(savedState.cloudDOM, cloudDOM2);

      expect(getTotalChanges(changeSet)).toBe(0);
    });

    it('should handle useState and useEffect with outputs', async () => {
      function StatefulApp() {
        const db = useInstance(Database, { name: 'stateful-db' });
        const api = useInstance(ApiGateway, { name: 'stateful-api' });
        
        const [dbUrl, setDbUrl] = useState<string>();
        const [apiEndpoint, setApiEndpoint] = useState<string>();
        const [isReady, setIsReady] = useState(false);
        
        useEffect(() => {
          if (db.outputs?.connectionUrl) {
            setDbUrl(db.outputs.connectionUrl);
          }
        }, [db.outputs?.connectionUrl]);
        
        useEffect(() => {
          if (api.outputs?.endpoint) {
            setApiEndpoint(api.outputs.endpoint);
          }
        }, [api.outputs?.endpoint]);
        
        useEffect(() => {
          if (dbUrl && apiEndpoint) {
            setIsReady(true);
          }
        }, [dbUrl, apiEndpoint]);
        
        return JSXRuntime.createElement(JSXRuntime.Fragment, null);
      }

      // First deploy
      const cloudDOM1 = await creact.build(
        JSXRuntime.createElement(StatefulApp, null)
      );
      await creact.deploy(cloudDOM1);

      const savedState = await backend.getState('default');

      // Rebuild
      const cloudDOM2 = await creact.build(
        JSXRuntime.createElement(StatefulApp, null)
      );

      // Should have 0 changes
      const changeSet = reconciler.reconcile(savedState.cloudDOM, cloudDOM2);

      expect(getTotalChanges(changeSet)).toBe(0);
    });
  });

  describe('Edge Cases from Requirements', () => {
    it('should treat empty outputs {} as equal to undefined', () => {
      const previous: CloudDOMNode = {
        id: 'node1',
        construct: { name: 'Resource' },
        constructType: 'Resource',
        props: {},
        path: ['node1'],
        children: [],
        outputs: {},
      };

      const current: CloudDOMNode = {
        id: 'node1',
        construct: { name: 'Resource' },
        constructType: 'Resource',
        props: {},
        path: ['node1'],
        children: [],
        outputs: undefined,
      };

      const changeSet = reconciler.reconcile([previous], [current]);

      expect(getTotalChanges(changeSet)).toBe(0);
    });

    it('should NOT trigger moves for root nodes', () => {
      const previous: CloudDOMNode = {
        id: 'app',
        construct: { name: 'App' },
        constructType: 'App',
        props: {},
        path: ['app'],
        children: [],
      };

      const current: CloudDOMNode = {
        id: 'app',
        construct: { name: 'App' },
        constructType: 'App',
        props: {},
        path: ['app'],
        children: [],
      };

      const changeSet = reconciler.reconcile([previous], [current]);

      expect(changeSet.moves).toHaveLength(0);
      expect(getTotalChanges(changeSet)).toBe(0);
    });

    it('should exclude metadata props from change detection', () => {
      const previous: CloudDOMNode = {
        id: 'node1',
        construct: { name: 'Resource' },
        constructType: 'Resource',
        props: { _propHash: 'hash1', name: 'test' },
        path: ['node1'],
        children: [],
      };

      const current: CloudDOMNode = {
        id: 'node1',
        construct: { name: 'Resource' },
        constructType: 'Resource',
        props: { _propHash: 'hash2', name: 'test' },
        path: ['node1'],
        children: [],
      };

      const changeSet = reconciler.reconcile([previous], [current]);

      expect(changeSet.updates).toHaveLength(0);
      expect(getTotalChanges(changeSet)).toBe(0);
    });

    it('should detect actual moves when parent changes', () => {
      const previous: CloudDOMNode = {
        id: 'app.stack1.resource',
        construct: { name: 'Resource' },
        constructType: 'Resource',
        props: {},
        path: ['app', 'stack1', 'resource'],
        children: [],
      };

      const current: CloudDOMNode = {
        id: 'app.stack1.resource',
        construct: { name: 'Resource' },
        constructType: 'Resource',
        props: {},
        path: ['app', 'stack2', 'resource'],
        children: [],
      };

      const changeSet = reconciler.reconcile([previous], [current]);

      expect(changeSet.moves).toHaveLength(1);
      expect(changeSet.moves[0]).toEqual({
        nodeId: 'app.stack1.resource',
        from: 'app.stack1',
        to: 'app.stack2',
      });
    });
  });
});
