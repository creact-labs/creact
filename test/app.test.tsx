/**
 * CReact Integration Tests - Comprehensive App
 *
 * Infrastructure app that:
 * 1. Creates a database
 * 2. Creates a cache that depends on database URL
 * 3. Creates an API that depends on cache
 * 4. Reads "environments" from database output
 * 5. Creates a Site for each environment (dynamic children)
 * 6. Optionally creates monitoring based on a flag
 *
 * KEY CONSTRAINT: One useInstance per component!
 * Each resource is its own component, composition via JSX children.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInstance, resetRuntime, type OutputAccessors } from '../src/index.js';
import { MockProvider } from './utils/mock-provider.js';
import { TestRuntime } from './utils/test-runtime.js';

// Construct classes (just markers)
class DatabaseConstruct {}
class CacheConstruct {}
class APIConstruct {}
class SiteConstruct {}
class MonitoringConstruct {}

// Types
type DatabaseOutputs = { url: string; environments: any[] };
type CacheOutputs = { endpoint: string };
type APIOutputs = { url: string };

// Resource Components - each has ONE useInstance
function Database({ name, children }: {
  name: string;
  children: (outputs: OutputAccessors<DatabaseOutputs>) => any;
}) {
  const outputs = useInstance<DatabaseOutputs>(DatabaseConstruct, { name });
  return children(outputs);
}

function Cache({ name, connectionString, children }: {
  name: string;
  connectionString: string | undefined;
  children: (outputs: OutputAccessors<CacheOutputs>) => any;
}) {
  const outputs = useInstance<CacheOutputs>(CacheConstruct, { name, connectionString });
  return children(outputs);
}

function API({ name, cacheEndpoint, children }: {
  name: string;
  cacheEndpoint: string | undefined;
  children: (outputs: OutputAccessors<APIOutputs>) => any;
}) {
  const outputs = useInstance<APIOutputs>(APIConstruct, { name, cacheEndpoint });
  return children(outputs);
}

function Site({ name, color }: { name: string; color: string }) {
  useInstance(SiteConstruct, { name, color });
  return null;
}

function Monitoring({ name, apiUrl }: { name: string; apiUrl: string }) {
  useInstance(MonitoringConstruct, { name, apiUrl });
  return null;
}

// App composes resources via JSX
function App({ enableMonitoring = false }: { enableMonitoring?: boolean }) {
  return (
    <Database name="main">
      {(db) => (
        <>
          <Cache name="redis" connectionString={db.url()}>
            {(cache) => (
              <API name="backend" cacheEndpoint={cache.endpoint()}>
                {(api) => (
                  enableMonitoring && api.url() ? (
                    <Monitoring name="metrics" apiUrl={api.url()!} />
                  ) : null
                )}
              </API>
            )}
          </Cache>
          {(db.environments() || []).map((env: { name: string; color: string }) => (
            <Site key={env.name} name={`site-${env.name}`} color={env.color} />
          ))}
        </>
      )}
    </Database>
  );
}

describe('CReact Infrastructure App', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);
  });

  describe('Dependency Chain Convergence', () => {
    it('creates resources in correct order: DB -> Cache -> API', async () => {
      provider
        .setOutputs('DatabaseConstruct', { url: 'postgres://localhost', environments: [] })
        .setOutputs('CacheConstruct', { endpoint: 'redis://localhost' })
        .setOutputs('APIConstruct', { url: 'http://api.local' });

      await runtime.run(<App />);

      expect(runtime.nodes).toHaveLength(3);

      // All resources should be applied - the order may include skipped attempts
      // followed by successful attempts once dependencies resolve
      const appliedTypes = provider.getAppliedTypes();
      expect(appliedTypes).toContain('DatabaseConstruct');
      expect(appliedTypes).toContain('CacheConstruct');
      expect(appliedTypes).toContain('APIConstruct');

      // Database should be applied first (no dependencies)
      expect(appliedTypes[0]).toBe('DatabaseConstruct');
    });

    it('skips resources with undefined props until dependencies resolve', async () => {
      // When DB returns undefined URL, Cache and API should be skipped initially
      // but still exist in the node tree. They get applied once DB fills outputs.
      const skippedCalls: string[] = [];
      const successfulCalls: string[] = [];

      provider.setOutputsFn((node) => {
        const hasUndefined = Object.values(node.props).some(v => v === undefined);
        if (hasUndefined) {
          skippedCalls.push(node.constructType);
          return {}; // Skip - return empty outputs
        }

        successfulCalls.push(node.constructType);
        if (node.constructType === 'DatabaseConstruct') {
          return { url: 'postgres://localhost', environments: [] };
        }
        if (node.constructType === 'CacheConstruct') {
          return { endpoint: 'redis://localhost' };
        }
        if (node.constructType === 'APIConstruct') {
          return { url: 'http://api.local' };
        }
        return {};
      });

      await runtime.run(<App />);

      // All 3 nodes should exist
      expect(runtime.nodes).toHaveLength(3);

      // All resources should eventually be successfully applied
      expect(successfulCalls).toContain('DatabaseConstruct');
      expect(successfulCalls).toContain('CacheConstruct');
      expect(successfulCalls).toContain('APIConstruct');
    });
  });

  describe('Dynamic Children', () => {
    it('creates Site for each environment', async () => {
      provider
        .setOutputs('DatabaseConstruct', {
          url: 'postgres://localhost',
          environments: [
            { name: 'prod', color: 'green' },
            { name: 'staging', color: 'yellow' }
          ]
        })
        .setOutputs('CacheConstruct', { endpoint: 'redis://localhost' })
        .setOutputs('APIConstruct', { url: 'http://api.local' })
        .setOutputs('SiteConstruct', {});

      await runtime.run(<App />);

      expect(runtime.nodes).toHaveLength(5); // DB + Cache + API + 2 Sites
      expect(provider.wasApplied('SiteConstruct', 'site-prod')).toBe(true);
      expect(provider.wasApplied('SiteConstruct', 'site-staging')).toBe(true);
    });

    it('creates no Sites when environments empty', async () => {
      provider
        .setOutputs('DatabaseConstruct', { url: 'postgres://localhost', environments: [] })
        .setOutputs('CacheConstruct', { endpoint: 'redis://localhost' })
        .setOutputs('APIConstruct', { url: 'http://api.local' });

      await runtime.run(<App />);

      expect(runtime.nodes).toHaveLength(3);
      expect(provider.wasApplied('SiteConstruct')).toBe(false);
    });
  });

  describe('Event-Driven Reactivity', () => {
    it('creates new Site when environment added via event', async () => {
      provider
        .setOutputs('DatabaseConstruct', { url: 'postgres://localhost', environments: [] })
        .setOutputs('CacheConstruct', { endpoint: 'redis://localhost' })
        .setOutputs('APIConstruct', { url: 'http://api.local' })
        .setOutputs('SiteConstruct', {});

      // Initial: no environments
      await runtime.run(<App />);
      expect(runtime.nodes).toHaveLength(3);

      // Get the database node from the actual nodes
      const dbNode = runtime.nodes.find(n => n.constructType === 'DatabaseConstruct')!;

      // Simulate: new environment added to database (use props.name - constructs use name as cloud resource identifier)
      await runtime.simulateAndWait(dbNode.props.name, {
        url: 'postgres://localhost',
        environments: [{ name: 'dev', color: 'blue' }]
      });

      // Should now have the Site
      expect(runtime.nodes).toHaveLength(4);
      expect(provider.wasApplied('SiteConstruct', 'site-dev')).toBe(true);
    });
  });

  describe('Path-Based Reconciliation', () => {
    // This test ensures multiple instances of the same type don't collide
    // Previously used reconcileKey (constructType:name) which lost nodes
    // Now uses path-based id which is unique per position in tree

    class PolicyConstruct {}

    function Policy({ role, policyArn }: { role: string; policyArn: string }) {
      useInstance(PolicyConstruct, { role, policyArn });
      return null;
    }

    function RoleWithPolicies({ policies }: { policies: string[] }) {
      return (
        <>
          {policies.map((policyArn, i) => (
            <Policy key={policyArn} role="my-role" policyArn={policyArn} />
          ))}
        </>
      );
    }

    it('creates all instances of same type with different paths', async () => {
      provider.setOutputs('PolicyConstruct', {});

      const policies = [
        'arn:aws:iam::aws:policy/Policy1',
        'arn:aws:iam::aws:policy/Policy2',
        'arn:aws:iam::aws:policy/Policy3',
      ];

      await runtime.run(<RoleWithPolicies policies={policies} />);

      // All 3 policies should be created, not just 1
      expect(runtime.nodes).toHaveLength(3);
      expect(provider.applyCalls.filter(c => c.node.constructType === 'PolicyConstruct')).toHaveLength(3);
    });

    it('preserves instances on re-render when paths unchanged', async () => {
      provider.setOutputs('PolicyConstruct', {});

      const policies = ['arn:aws:iam::aws:policy/Policy1', 'arn:aws:iam::aws:policy/Policy2'];

      await runtime.run(<RoleWithPolicies policies={policies} />);
      const nodes1 = runtime.nodes;
      expect(nodes1).toHaveLength(2);

      // Re-run with same policies - should not create new instances
      provider.reset();
      await runtime.run(<RoleWithPolicies policies={policies} />, nodes1);

      // No new creates (props unchanged)
      expect(provider.applyCalls).toHaveLength(0);
    });
  });

  describe('Conditional Instances', () => {
    it('creates Monitoring when flag enabled', async () => {
      provider
        .setOutputs('DatabaseConstruct', { url: 'postgres://localhost', environments: [] })
        .setOutputs('CacheConstruct', { endpoint: 'redis://localhost' })
        .setOutputs('APIConstruct', { url: 'http://api.local' })
        .setOutputs('MonitoringConstruct', {});

      await runtime.run(<App enableMonitoring={true} />);

      expect(provider.wasApplied('MonitoringConstruct')).toBe(true);
    });

    it('skips Monitoring when flag disabled', async () => {
      provider
        .setOutputs('DatabaseConstruct', { url: 'postgres://localhost', environments: [] })
        .setOutputs('CacheConstruct', { endpoint: 'redis://localhost' })
        .setOutputs('APIConstruct', { url: 'http://api.local' });

      await runtime.run(<App enableMonitoring={false} />);

      expect(provider.wasApplied('MonitoringConstruct')).toBe(false);
    });

    it('destroys Monitoring when flag toggled off', async () => {
      provider
        .setOutputs('DatabaseConstruct', { url: 'postgres://localhost', environments: [] })
        .setOutputs('CacheConstruct', { endpoint: 'redis://localhost' })
        .setOutputs('APIConstruct', { url: 'http://api.local' })
        .setOutputs('MonitoringConstruct', {});

      // First run with monitoring
      await runtime.run(<App enableMonitoring={true} />);
      expect(provider.wasApplied('MonitoringConstruct')).toBe(true);
      const nodes1 = runtime.nodes;

      // Second run without monitoring
      provider.reset();
      await runtime.run(<App enableMonitoring={false} />, nodes1);

      expect(provider.wasDestroyed('MonitoringConstruct')).toBe(true);
    });
  });

  describe('Wrapper Transparency', () => {
    // Wrapper components (without useInstance) should be transparent -
    // they should NOT affect the resource path/ID of child resources.
    // This allows refactoring with wrappers without triggering delete+recreate.

    class StorageConstruct {}

    function Storage({ name }: { name: string }) {
      useInstance(StorageConstruct, { name });
      return null;
    }

    // Wrapper component - does NOT call useInstance
    function Wrapper({ children }: { children: any }) {
      // Just passes children through, no useInstance
      return children;
    }

    // Another wrapper for testing nested wrappers
    function AnotherWrapper({ children }: { children: any }) {
      return <>{children}</>;
    }

    function DirectApp() {
      return <Storage name="bucket" />;
    }

    function WrappedApp() {
      return (
        <Wrapper>
          <Storage name="bucket" />
        </Wrapper>
      );
    }

    function DoubleWrappedApp() {
      return (
        <Wrapper>
          <AnotherWrapper>
            <Storage name="bucket" />
          </AnotherWrapper>
        </Wrapper>
      );
    }

    it('wrapper component does not change resource ID', async () => {
      provider.setOutputs('StorageConstruct', { arn: 'arn:aws:s3:::bucket' });

      // Run without wrapper
      await runtime.run(<DirectApp />);
      const directNodes = runtime.nodes;
      expect(directNodes).toHaveLength(1);
      const directId = directNodes[0].id;

      // Reset and run with wrapper
      resetRuntime();
      provider.reset();
      runtime = new TestRuntime(provider);

      await runtime.run(<WrappedApp />);
      const wrappedNodes = runtime.nodes;
      expect(wrappedNodes).toHaveLength(1);
      const wrappedId = wrappedNodes[0].id;

      // IDs should be identical - wrapper is transparent
      expect(wrappedId).toBe(directId);
    });

    it('multiple nested wrappers do not change resource ID', async () => {
      provider.setOutputs('StorageConstruct', { arn: 'arn:aws:s3:::bucket' });

      // Run without wrapper
      await runtime.run(<DirectApp />);
      const directId = runtime.nodes[0].id;

      // Reset and run with double wrapper
      resetRuntime();
      provider.reset();
      runtime = new TestRuntime(provider);

      await runtime.run(<DoubleWrappedApp />);
      const doubleWrappedId = runtime.nodes[0].id;

      // IDs should be identical - wrappers are transparent
      expect(doubleWrappedId).toBe(directId);
    });

    it('adding wrapper does not cause delete+recreate', async () => {
      provider.setOutputs('StorageConstruct', { arn: 'arn:aws:s3:::bucket' });

      // Initial run without wrapper
      await runtime.run(<DirectApp />);
      const nodes1 = runtime.nodes;
      expect(provider.applyCalls).toHaveLength(1);

      // Re-run WITH wrapper, passing previous nodes
      provider.reset();
      await runtime.run(<WrappedApp />, nodes1);

      // No new applies (same resource), no destroys
      expect(provider.applyCalls).toHaveLength(0);
      expect(provider.destroyCalls).toHaveLength(0);
    });

    it('removing wrapper does not cause delete+recreate', async () => {
      provider.setOutputs('StorageConstruct', { arn: 'arn:aws:s3:::bucket' });

      // Initial run WITH wrapper
      await runtime.run(<WrappedApp />);
      const nodes1 = runtime.nodes;
      expect(provider.applyCalls).toHaveLength(1);

      // Re-run without wrapper, passing previous nodes
      provider.reset();
      await runtime.run(<DirectApp />, nodes1);

      // No new applies (same resource), no destroys
      expect(provider.applyCalls).toHaveLength(0);
      expect(provider.destroyCalls).toHaveLength(0);
    });

    it('child resources still have correct dependency path', async () => {
      // Ensure that children of useInstance components still get correct paths
      // even when there are wrappers in between

      class VPCConstruct {}
      class SubnetConstruct {}

      function VPC({ name, children }: { name: string; children?: any }) {
        useInstance<{ id: string }>(VPCConstruct, { name });
        return children;
      }

      function Subnet({ name, vpcId }: { name: string; vpcId?: string }) {
        useInstance(SubnetConstruct, { name, vpcId });
        return null;
      }

      function WrappedInfra() {
        return (
          <VPC name="main">
            <Wrapper>
              <Subnet name="private" vpcId="vpc-123" />
            </Wrapper>
          </VPC>
        );
      }

      function DirectInfra() {
        return (
          <VPC name="main">
            <Subnet name="private" vpcId="vpc-123" />
          </VPC>
        );
      }

      provider
        .setOutputs('VPCConstruct', { id: 'vpc-123' })
        .setOutputs('SubnetConstruct', { id: 'subnet-456' });

      // Run with wrapper
      await runtime.run(<WrappedInfra />);
      const wrappedNodes = runtime.nodes;
      expect(wrappedNodes).toHaveLength(2);

      const subnetWrapped = wrappedNodes.find(n => n.constructType === 'SubnetConstruct')!;

      // Reset and run without wrapper
      resetRuntime();
      provider.reset();
      runtime = new TestRuntime(provider);

      await runtime.run(<DirectInfra />);
      const directNodes = runtime.nodes;
      const subnetDirect = directNodes.find(n => n.constructType === 'SubnetConstruct')!;

      // Subnet should have same ID regardless of wrapper
      expect(subnetWrapped.id).toBe(subnetDirect.id);
      // And the path should show it's under VPC (wrapper transparent)
      // Note: PascalCase is converted to lowercase kebab, so VPCConstruct -> vpcconstruct
      expect(subnetWrapped.path).toContain('vpcconstruct');
    });
  });
});
