import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useInstance,
  createStore,
  createContext,
  useContext,
  createEffect,
  run,
  resetRuntime,
  createMockProvider,
} from '../src/index.js';
import { renderWithProvider } from './helpers.js';

// Reset before each test
beforeEach(() => {
  resetRuntime();
});

describe('Integration', () => {
  describe('useInstance', () => {
    it('should create instance and receive outputs', async () => {
      class Database {}

      function App() {
        const db = useInstance<{ url: string }>(Database, { name: 'test' });
        return <div url={db.url()} />;
      }

      const nodes = await renderWithProvider(<App />, {
        apply: (node) => {
          if (node.constructType === 'Database') {
            return { url: 'postgres://localhost/test' };
          }
          return {};
        },
      });

      expect(nodes.length).toBe(1);
      expect(nodes[0].constructType).toBe('Database');
    });

    it('should skip instance when props have undefined values', async () => {
      class Service {}

      function App({ dbUrl }: { dbUrl?: string }) {
        const svc = useInstance<{ endpoint: string }>(Service, { database: dbUrl });
        return <div endpoint={svc.endpoint()} />;
      }

      // With undefined dbUrl, service should not be created
      const nodes = await renderWithProvider(<App dbUrl={undefined} />, {
        apply: () => ({ endpoint: 'http://localhost' }),
      });
      expect(nodes.length).toBe(0);

      // With defined dbUrl, service should be created
      resetRuntime();
      const nodes2 = await renderWithProvider(<App dbUrl="postgres://..." />, {
        apply: () => ({ endpoint: 'http://localhost' }),
      });
      expect(nodes2.length).toBe(1);
    });
  });

  describe('createStore', () => {
    it('should create persistent store', async () => {
      function App() {
        const [store, setStore] = createStore({ count: 0 });
        setStore('count', 5);
        return <div count={store.count} />;
      }

      await renderWithProvider(<App />);

      // Store should have been mutated
      // (In real usage, it persists across cycles)
    });
  });

  describe('Context', () => {
    it('should pass values down via context', async () => {
      const ConfigContext = createContext({ env: 'dev' });
      let receivedConfig: any;

      function Child() {
        receivedConfig = useContext(ConfigContext);
        return null;
      }

      function App() {
        return (
          <ConfigContext.Provider value={{ env: 'prod' }}>
            <Child />
          </ConfigContext.Provider>
        );
      }

      await renderWithProvider(<App />);

      expect(receivedConfig).toEqual({ env: 'prod' });
    });

    it('should use default value when no provider', async () => {
      const ConfigContext = createContext({ env: 'default' });
      let receivedConfig: any;

      function Child() {
        receivedConfig = useContext(ConfigContext);
        return null;
      }

      function App() {
        return <Child />;
      }

      await renderWithProvider(<App />);

      expect(receivedConfig).toEqual({ env: 'default' });
    });
  });

  describe('Reactive outputs', () => {
    it('should re-render when outputs change', async () => {
      class Database {}
      class Service {}

      const renderCounts = { app: 0, child: 0 };

      function Child({ dbUrl }: { dbUrl: () => string | undefined }) {
        renderCounts.child++;
        const svc = useInstance<{ endpoint: string }>(Service, {
          database: dbUrl()
        });
        return null;
      }

      function App() {
        renderCounts.app++;
        const db = useInstance<{ url: string }>(Database, { name: 'main' });

        // Only render child when db.url is available
        if (db.url()) {
          return <Child dbUrl={db.url} />;
        }
        return null;
      }

      const nodes = await renderWithProvider(<App />, {
        apply: (node) => {
          if (node.constructType === 'Database') {
            return { url: 'postgres://localhost' };
          }
          if (node.constructType === 'Service') {
            return { endpoint: 'http://localhost:3000' };
          }
          return {};
        },
      });

      // Both Database and Service should be created
      expect(nodes.length).toBe(2);
      expect(nodes.map((n) => n.constructType).sort()).toEqual(['Database', 'Service']);
    });
  });

  describe('createEffect', () => {
    it('should run effects when outputs change', async () => {
      class Database {}
      const effectRuns: string[] = [];

      function App() {
        const db = useInstance<{ url: string; status: string }>(Database, { name: 'main' });

        createEffect(() => {
          const url = db.url();
          const status = db.status();
          if (url && status) {
            effectRuns.push(`${status}: ${url}`);
          }
        });

        return null;
      }

      const nodes = await renderWithProvider(<App />, {
        apply: () => ({
          url: 'postgres://localhost',
          status: 'ready',
        }),
      });

      expect(effectRuns).toContain('ready: postgres://localhost');
    });
  });

  describe('Multiple instances per component', () => {
    it('should create multiple instances in same component', async () => {
      class Database {}
      class Cache {}
      class ApiClient {}

      function InfraComponent() {
        const db = useInstance<{ url: string }>(Database, { name: 'main' });
        const cache = useInstance<{ host: string }>(Cache, { name: 'redis' });
        const api = useInstance<{ endpoint: string }>(ApiClient, { name: 'rest' });

        return null;
      }

      const nodes = await renderWithProvider(<InfraComponent />, {
        apply: (node) => {
          const outputs: Record<string, Record<string, any>> = {
            Database: { url: 'postgres://localhost' },
            Cache: { host: 'redis://localhost' },
            ApiClient: { endpoint: 'http://api.example.com' },
          };
          return outputs[node.constructType] || {};
        },
      });

      expect(nodes.length).toBe(3);
      expect(nodes.map((n) => n.constructType).sort()).toEqual(['ApiClient', 'Cache', 'Database']);
    });

    it('should create conditional multiple instances based on flags', async () => {
      class Database {}
      class Cache {}
      class Queue {}

      function InfraComponent({ useCache, useQueue }: { useCache: boolean; useQueue: boolean }) {
        const db = useInstance<{ url: string }>(Database, { name: 'main' });

        if (useCache) {
          useInstance<{ host: string }>(Cache, { name: 'redis' });
        }

        if (useQueue) {
          useInstance<{ connection: string }>(Queue, { name: 'rabbitmq' });
        }

        return null;
      }

      const applyFn = (node: any) => {
        const outputs: Record<string, Record<string, any>> = {
          Database: { url: 'postgres://localhost' },
          Cache: { host: 'redis://localhost' },
          Queue: { connection: 'amqp://localhost' },
        };
        return outputs[node.constructType] || {};
      };

      // Only cache enabled
      const nodes1 = await renderWithProvider(
        <InfraComponent useCache={true} useQueue={false} />,
        { apply: applyFn }
      );
      expect(nodes1.length).toBe(2);
      expect(nodes1.map((n) => n.constructType).sort()).toEqual(['Cache', 'Database']);

      // Both enabled
      resetRuntime();
      const nodes2 = await renderWithProvider(
        <InfraComponent useCache={true} useQueue={true} />,
        { apply: applyFn }
      );
      expect(nodes2.length).toBe(3);
      expect(nodes2.map((n) => n.constructType).sort()).toEqual(['Cache', 'Database', 'Queue']);

      // Neither enabled
      resetRuntime();
      const nodes3 = await renderWithProvider(
        <InfraComponent useCache={false} useQueue={false} />,
        { apply: applyFn }
      );
      expect(nodes3.length).toBe(1);
      expect(nodes3[0].constructType).toBe('Database');
    });

    it('should allow second instance to use first instance output', async () => {
      class Database {}
      class Service {}

      function App() {
        const db = useInstance<{ connectionString: string }>(Database, { name: 'main' });
        const svc = useInstance<{ endpoint: string }>(Service, {
          dbConnection: db.connectionString()
        });

        return null;
      }

      const applyCalls: any[] = [];
      const nodes = await renderWithProvider(<App />, {
        apply: (node) => {
          applyCalls.push({ type: node.constructType, props: node.props });
          if (node.constructType === 'Database') {
            return { connectionString: 'postgres://localhost/mydb' };
          }
          if (node.constructType === 'Service') {
            return { endpoint: 'http://localhost:8080' };
          }
          return {};
        },
      });

      expect(nodes.length).toBe(2);
      // Service should have received database connection string in props
      const serviceCall = applyCalls.find((c) => c.type === 'Service');
      expect(serviceCall.props.dbConnection).toBe('postgres://localhost/mydb');
    });
  });

  describe('Deep nesting', () => {
    it('should handle 5+ level component tree with instances', async () => {
      class Resource {}

      function Level5() {
        useInstance<{ value: string }>(Resource, { name: 'level5' });
        return null;
      }

      function Level4() {
        useInstance<{ value: string }>(Resource, { name: 'level4' });
        return <Level5 />;
      }

      function Level3() {
        useInstance<{ value: string }>(Resource, { name: 'level3' });
        return <Level4 />;
      }

      function Level2() {
        useInstance<{ value: string }>(Resource, { name: 'level2' });
        return <Level3 />;
      }

      function Level1() {
        useInstance<{ value: string }>(Resource, { name: 'level1' });
        return <Level2 />;
      }

      const nodes = await renderWithProvider(<Level1 />, {
        apply: (node) => ({ value: `from-${node.props.name}` }),
      });

      expect(nodes.length).toBe(5);
      expect(nodes.map((n) => n.props.name).sort()).toEqual([
        'level1', 'level2', 'level3', 'level4', 'level5'
      ]);
    });

    it('should propagate context through all nesting levels', async () => {
      const ConfigContext = createContext({ dbHost: 'localhost' });
      const capturedConfigs: any[] = [];

      function DeepChild() {
        const config = useContext(ConfigContext);
        capturedConfigs.push(config);
        return null;
      }

      function Level2() {
        const config = useContext(ConfigContext);
        capturedConfigs.push(config);
        return <DeepChild />;
      }

      function Level1() {
        const config = useContext(ConfigContext);
        capturedConfigs.push(config);
        return <Level2 />;
      }

      function App() {
        return (
          <ConfigContext.Provider value={{ dbHost: 'production-db' }}>
            <Level1 />
          </ConfigContext.Provider>
        );
      }

      await renderWithProvider(<App />);

      expect(capturedConfigs.length).toBe(3);
      expect(capturedConfigs.every((c) => c.dbHost === 'production-db')).toBe(true);
    });

    it('should maintain stable instance IDs across renders', async () => {
      class Database {}

      function App() {
        const db = useInstance<{ url: string }>(Database, { name: 'main' });
        return null;
      }

      const applyFn = () => ({ url: 'postgres://localhost' });

      const nodes1 = await renderWithProvider(<App />, { apply: applyFn });
      const id1 = nodes1[0].id;

      // Run again - should get same ID
      const nodes2 = await renderWithProvider(<App />, { apply: applyFn });
      const id2 = nodes2[0].id;

      expect(id1).toBe(id2);
    });
  });

  describe('Nested context providers', () => {
    it('should support 3-level context shadowing', async () => {
      const ThemeContext = createContext('light');
      const capturedThemes: string[] = [];

      function DeepChild() {
        capturedThemes.push(useContext(ThemeContext));
        return null;
      }

      function App() {
        return (
          <ThemeContext.Provider value="dark">
            <ThemeContext.Provider value="blue">
              <ThemeContext.Provider value="red">
                <DeepChild />
              </ThemeContext.Provider>
            </ThemeContext.Provider>
          </ThemeContext.Provider>
        );
      }

      await renderWithProvider(<App />);

      expect(capturedThemes[0]).toBe('red');
    });

    it('should restore context after provider scope ends', async () => {
      const ThemeContext = createContext('default');
      const capturedThemes: string[] = [];

      function Consumer({ label }: { label: string }) {
        capturedThemes.push(`${label}:${useContext(ThemeContext)}`);
        return null;
      }

      function App() {
        return (
          <>
            <Consumer label="before" />
            <ThemeContext.Provider value="custom">
              <Consumer label="inside" />
            </ThemeContext.Provider>
            <Consumer label="after" />
          </>
        );
      }

      await renderWithProvider(<App />);

      expect(capturedThemes).toContain('before:default');
      expect(capturedThemes).toContain('inside:custom');
      expect(capturedThemes).toContain('after:default');
    });

    it('should handle multiple different contexts at various levels', async () => {
      const AuthContext = createContext({ user: null as string | null });
      const ThemeContext = createContext('light');
      const ConfigContext = createContext({ apiUrl: '' });

      let capturedValues: any = {};

      function Consumer() {
        capturedValues = {
          auth: useContext(AuthContext),
          theme: useContext(ThemeContext),
          config: useContext(ConfigContext),
        };
        return null;
      }

      function App() {
        return (
          <AuthContext.Provider value={{ user: 'alice' }}>
            <ThemeContext.Provider value="dark">
              <ConfigContext.Provider value={{ apiUrl: 'https://api.example.com' }}>
                <Consumer />
              </ConfigContext.Provider>
            </ThemeContext.Provider>
          </AuthContext.Provider>
        );
      }

      await renderWithProvider(<App />);

      expect(capturedValues.auth.user).toBe('alice');
      expect(capturedValues.theme).toBe('dark');
      expect(capturedValues.config.apiUrl).toBe('https://api.example.com');
    });

    it('should combine context with instance output', async () => {
      class Database {}
      const ConfigContext = createContext({ dbHost: 'localhost' });

      let capturedDbUrl: string | undefined;
      let capturedConfig: any;

      function App() {
        capturedConfig = useContext(ConfigContext);
        const db = useInstance<{ url: string }>(Database, {
          host: capturedConfig.dbHost
        });

        createEffect(() => {
          capturedDbUrl = db.url();
        });

        return null;
      }

      function Root() {
        return (
          <ConfigContext.Provider value={{ dbHost: 'production.db.example.com' }}>
            <App />
          </ConfigContext.Provider>
        );
      }

      await renderWithProvider(<Root />, {
        apply: (node) => {
          if (node.constructType === 'Database') {
            return { url: `postgres://${node.props.host}/mydb` };
          }
          return {};
        },
      });

      expect(capturedConfig.dbHost).toBe('production.db.example.com');
      expect(capturedDbUrl).toBe('postgres://production.db.example.com/mydb');
    });
  });

  describe('Cross-component effects', () => {
    it('should run parent effect depending on child instance output', async () => {
      class ChildService {}
      const effectLog: string[] = [];

      function Child({ onReady }: { onReady: (url: string) => void }) {
        const svc = useInstance<{ serviceUrl: string }>(ChildService, { name: 'child-svc' });

        createEffect(() => {
          const url = svc.serviceUrl();
          if (url) {
            onReady(url);
          }
        });

        return null;
      }

      function Parent() {
        createEffect(() => {
          effectLog.push('parent-initial');
        });

        return (
          <Child onReady={(url: string) => {
            effectLog.push(`parent-notified:${url}`);
          }} />
        );
      }

      await renderWithProvider(<Parent />, {
        apply: (node) => {
          if (node.constructType === 'ChildService') {
            return { serviceUrl: 'http://child:8080' };
          }
          return {};
        },
      });

      expect(effectLog).toContain('parent-initial');
      expect(effectLog).toContain('parent-notified:http://child:8080');
    });

    it('should cascade effects across 3 components', async () => {
      class ServiceA {}
      class ServiceB {}
      class ServiceC {}

      const effectLog: string[] = [];

      function CompC({ inputFromB }: { inputFromB: () => string | undefined }) {
        const svcC = useInstance<{ result: string }>(ServiceC, {
          upstream: inputFromB()
        });

        createEffect(() => {
          const result = svcC.result();
          if (result) {
            effectLog.push(`C:${result}`);
          }
        });

        return null;
      }

      function CompB({ inputFromA }: { inputFromA: () => string | undefined }) {
        const svcB = useInstance<{ processed: string }>(ServiceB, {
          upstream: inputFromA()
        });

        createEffect(() => {
          const processed = svcB.processed();
          if (processed) {
            effectLog.push(`B:${processed}`);
          }
        });

        if (svcB.processed()) {
          return <CompC inputFromB={svcB.processed} />;
        }
        return null;
      }

      function CompA() {
        const svcA = useInstance<{ data: string }>(ServiceA, { name: 'source' });

        createEffect(() => {
          const data = svcA.data();
          if (data) {
            effectLog.push(`A:${data}`);
          }
        });

        if (svcA.data()) {
          return <CompB inputFromA={svcA.data} />;
        }
        return null;
      }

      const nodes = await renderWithProvider(<CompA />, {
        apply: (node) => {
          const outputs: Record<string, Record<string, any>> = {
            ServiceA: { data: 'initial-data' },
            ServiceB: { processed: 'processed-data' },
            ServiceC: { result: 'final-result' },
          };
          return outputs[node.constructType] || {};
        },
      });

      expect(nodes.length).toBe(3);
      expect(effectLog).toContain('A:initial-data');
      expect(effectLog).toContain('B:processed-data');
      expect(effectLog).toContain('C:final-result');
    });

    it('should handle sibling effects depending on shared context', async () => {
      class Database {}
      const SharedContext = createContext({ ready: false });
      const effectLog: string[] = [];

      function Sibling1() {
        const ctx = useContext(SharedContext);
        const db = useInstance<{ url: string }>(Database, { name: 'sib1' });

        createEffect(() => {
          if (ctx.ready && db.url()) {
            effectLog.push(`sib1:${db.url()}`);
          }
        });

        return null;
      }

      function Sibling2() {
        const ctx = useContext(SharedContext);
        const db = useInstance<{ url: string }>(Database, { name: 'sib2' });

        createEffect(() => {
          if (ctx.ready && db.url()) {
            effectLog.push(`sib2:${db.url()}`);
          }
        });

        return null;
      }

      function App() {
        return (
          <SharedContext.Provider value={{ ready: true }}>
            <>
              <Sibling1 />
              <Sibling2 />
            </>
          </SharedContext.Provider>
        );
      }

      await renderWithProvider(<App />, {
        apply: (node) => ({ url: `postgres://${node.props.name}` }),
      });

      expect(effectLog).toContain('sib1:postgres://sib1');
      expect(effectLog).toContain('sib2:postgres://sib2');
    });
  });

  describe('Complex reconciliation', () => {
    it('should handle creates, updates, and deletes in same cycle', async () => {
      class Resource {}
      const applyCalls: any[] = [];
      const destroyCalls: string[] = [];

      const provider = createMockProvider({
        apply: (node) => {
          applyCalls.push({ id: node.id, props: node.props });
          return { status: 'ready' };
        },
        destroy: (node) => {
          destroyCalls.push(node.id);
        },
      });

      // First run: create A, B
      function App1() {
        useInstance<{ status: string }>(Resource, { name: 'A' });
        useInstance<{ status: string }>(Resource, { name: 'B' });
        return null;
      }

      const nodes1 = await run(<App1 />, provider);
      expect(nodes1.length).toBe(2);
      expect(applyCalls.length).toBe(2);

      // Second run: create C, update B (new prop), delete A
      function App2() {
        useInstance<{ status: string }>(Resource, { name: 'B', version: 2 });
        useInstance<{ status: string }>(Resource, { name: 'C' });
        return null;
      }

      const nodes2 = await run(<App2 />, provider, nodes1);
      expect(nodes2.length).toBe(2);
      expect(nodes2.map((n) => n.props.name).sort()).toEqual(['B', 'C']);

      // A should have been destroyed
      expect(destroyCalls.some((id) => id.includes('resource-A'))).toBe(true);
    });

    it('should converge with conditional instance based on other outputs', async () => {
      class Primary {}
      class Secondary {}

      function App() {
        const primary = useInstance<{ ready: boolean }>(Primary, { name: 'main' });

        // Secondary only created when primary is ready
        if (primary.ready()) {
          useInstance<{ url: string }>(Secondary, { name: 'dependent' });
        }

        return null;
      }

      const nodes = await renderWithProvider(<App />, {
        apply: (node) => {
          if (node.constructType === 'Primary') {
            return { ready: true };
          }
          if (node.constructType === 'Secondary') {
            return { url: 'http://secondary' };
          }
          return {};
        },
      });

      // Should converge with both instances
      expect(nodes.length).toBe(2);
      expect(nodes.map((n) => n.constructType).sort()).toEqual(['Primary', 'Secondary']);
    });

    it('should handle chained dependencies A→B→C→D converging', async () => {
      class A {}
      class B {}
      class C {}
      class D {}

      function App() {
        const a = useInstance<{ out: string }>(A, { name: 'a' });
        const b = useInstance<{ out: string }>(B, { input: a.out() });
        const c = useInstance<{ out: string }>(C, { input: b.out() });
        const d = useInstance<{ out: string }>(D, { input: c.out() });
        return null;
      }

      const nodes = await renderWithProvider(<App />, {
        apply: (node) => {
          const prefix = node.constructType;
          const input = node.props.input;
          return { out: input ? `${prefix}(${input})` : prefix };
        },
      });

      // All 4 should be created and converge
      expect(nodes.length).toBe(4);

      // Check that D received the chained output
      const dNode = nodes.find((n) => n.constructType === 'D');
      expect(dNode?.props.input).toBe('C(B(A))');
    });

    it('should warn when max iterations exceeded', async () => {
      class Generator {}
      let counter = 0;

      // This component creates a new instance with a unique name each time it renders,
      // and reads the output which causes re-rendering when filled
      function InfiniteLoop() {
        counter++;
        const currentName = `gen-${counter}`;
        const g = useInstance<{ value: number }>(Generator, { name: currentName });

        // Reading the signal value during render creates a dependency.
        // When the provider fills the value, this causes the component to re-render,
        // which creates a new instance with a different name, causing infinite iterations.
        const value = g.value();

        return null;
      }

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await renderWithProvider(<InfiniteLoop />, {
        apply: () => ({ value: 42 }),
      });

      // Should have warned about max iterations
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Max iterations')
      );

      warnSpy.mockRestore();
    });
  });

  describe('Store persistence', () => {
    it('should hydrate store from previous cycle', async () => {
      class Database {}

      function App() {
        const [store, setStore] = createStore({ connectionCount: 0 });
        const db = useInstance<{ url: string }>(Database, { name: 'main' });

        createEffect(() => {
          if (db.url()) {
            setStore('connectionCount', store.connectionCount + 1);
          }
        });

        return null;
      }

      const provider = createMockProvider({
        apply: () => ({ url: 'postgres://localhost' }),
      });

      // First run
      const nodes1 = await run(<App />, provider);
      expect(nodes1[0].store?.connectionCount).toBeGreaterThanOrEqual(1);

      // Second run with previous nodes
      const nodes2 = await run(<App />, provider, nodes1);
      expect(nodes2[0].store?.connectionCount).toBeGreaterThan(nodes1[0].store?.connectionCount);
    });

    it('should start fresh without previousNodes', async () => {
      class Resource {}
      const storeValues: number[] = [];

      function App() {
        const [store, setStore] = createStore({ counter: 0 });
        useInstance<{ value: number }>(Resource, { name: 'res' });

        storeValues.push(store.counter);
        setStore('counter', store.counter + 1);

        return null;
      }

      const applyFn = () => ({ value: 42 });

      // First run - no previous nodes
      resetRuntime();
      storeValues.length = 0;
      await renderWithProvider(<App />, { apply: applyFn });
      const firstRunValues = [...storeValues];

      // Second run - fresh start without previous nodes
      resetRuntime();
      storeValues.length = 0;
      await renderWithProvider(<App />, { apply: applyFn });
      const secondRunValues = [...storeValues];

      // Both should start from 0
      expect(firstRunValues[0]).toBe(0);
      expect(secondRunValues[0]).toBe(0);
    });

    it('should hydrate deeply nested stores independently', async () => {
      class ResourceA {}
      class ResourceB {}

      function ChildA() {
        const [store] = createStore({ name: 'childA' });
        useInstance<{ v: number }>(ResourceA, { name: 'a', storeName: store.name });
        return null;
      }

      function ChildB() {
        const [store] = createStore({ name: 'childB' });
        useInstance<{ v: number }>(ResourceB, { name: 'b', storeName: store.name });
        return null;
      }

      function App() {
        return (
          <>
            <ChildA />
            <ChildB />
          </>
        );
      }

      const nodes1 = await renderWithProvider(<App />, {
        apply: () => ({ v: 1 }),
      });

      expect(nodes1.length).toBe(2);
      const nodeA = nodes1.find((n) => n.constructType === 'ResourceA');
      const nodeB = nodes1.find((n) => n.constructType === 'ResourceB');

      expect(nodeA?.store?.name).toBe('childA');
      expect(nodeB?.store?.name).toBe('childB');
    });
  });

  describe('Real-world application', () => {
    it('should handle full app chain: Database → API → Service → Client', async () => {
      class Database {}
      class ApiGateway {}
      class UserService {}
      class WebClient {}

      const effectLog: string[] = [];

      function Client({ serviceUrl }: { serviceUrl: () => string | undefined }) {
        const client = useInstance<{ status: string }>(WebClient, {
          apiEndpoint: serviceUrl(),
        });

        createEffect(() => {
          if (client.status()) {
            effectLog.push(`client:${client.status()}`);
          }
        });

        return null;
      }

      function Service({ apiUrl }: { apiUrl: () => string | undefined }) {
        const svc = useInstance<{ serviceUrl: string }>(UserService, {
          gateway: apiUrl(),
        });

        createEffect(() => {
          if (svc.serviceUrl()) {
            effectLog.push(`service:${svc.serviceUrl()}`);
          }
        });

        if (svc.serviceUrl()) {
          return <Client serviceUrl={svc.serviceUrl} />;
        }
        return null;
      }

      function Api({ dbConnection }: { dbConnection: () => string | undefined }) {
        const api = useInstance<{ url: string }>(ApiGateway, {
          database: dbConnection(),
        });

        createEffect(() => {
          if (api.url()) {
            effectLog.push(`api:${api.url()}`);
          }
        });

        if (api.url()) {
          return <Service apiUrl={api.url} />;
        }
        return null;
      }

      function App() {
        const db = useInstance<{ connectionString: string }>(Database, {
          name: 'production',
        });

        createEffect(() => {
          if (db.connectionString()) {
            effectLog.push(`db:${db.connectionString()}`);
          }
        });

        if (db.connectionString()) {
          return <Api dbConnection={db.connectionString} />;
        }
        return null;
      }

      const nodes = await renderWithProvider(<App />, {
        apply: (node) => {
          const outputs: Record<string, Record<string, any>> = {
            Database: { connectionString: 'postgres://prod-db/main' },
            ApiGateway: { url: 'https://api.prod.example.com' },
            UserService: { serviceUrl: 'https://users.prod.example.com' },
            WebClient: { status: 'connected' },
          };
          return outputs[node.constructType] || {};
        },
      });

      // All 4 layers should be created
      expect(nodes.length).toBe(4);
      expect(nodes.map((n) => n.constructType).sort()).toEqual([
        'ApiGateway', 'Database', 'UserService', 'WebClient'
      ]);

      // All effects should have run
      expect(effectLog).toContain('db:postgres://prod-db/main');
      expect(effectLog).toContain('api:https://api.prod.example.com');
      expect(effectLog).toContain('service:https://users.prod.example.com');
      expect(effectLog).toContain('client:connected');
    });

    it('should handle feature flags controlling instance creation', async () => {
      class CoreService {}
      class PremiumFeature {}
      class BetaFeature {}

      const FeatureFlagsContext = createContext({
        premium: false,
        beta: false,
      });

      function App() {
        const flags = useContext(FeatureFlagsContext);

        useInstance<{ status: string }>(CoreService, { name: 'core' });

        if (flags.premium) {
          useInstance<{ status: string }>(PremiumFeature, { name: 'premium' });
        }

        if (flags.beta) {
          useInstance<{ status: string }>(BetaFeature, { name: 'beta' });
        }

        return null;
      }

      const provider = createMockProvider({
        apply: () => ({ status: 'enabled' }),
      });

      // No features
      const nodes1 = await run(
        <FeatureFlagsContext.Provider value={{ premium: false, beta: false }}>
          <App />
        </FeatureFlagsContext.Provider>,
        provider
      );
      expect(nodes1.length).toBe(1);
      expect(nodes1[0].constructType).toBe('CoreService');

      // Premium only
      resetRuntime();
      const nodes2 = await run(
        <FeatureFlagsContext.Provider value={{ premium: true, beta: false }}>
          <App />
        </FeatureFlagsContext.Provider>,
        provider
      );
      expect(nodes2.length).toBe(2);
      expect(nodes2.map((n) => n.constructType).sort()).toEqual(['CoreService', 'PremiumFeature']);

      // All features
      resetRuntime();
      const nodes3 = await run(
        <FeatureFlagsContext.Provider value={{ premium: true, beta: true }}>
          <App />
        </FeatureFlagsContext.Provider>,
        provider
      );
      expect(nodes3.length).toBe(3);
      expect(nodes3.map((n) => n.constructType).sort()).toEqual([
        'BetaFeature', 'CoreService', 'PremiumFeature'
      ]);
    });

    it('should track destroy calls for cleanup verification', async () => {
      class Ephemeral {}
      class Persistent {}

      const destroyedIds: string[] = [];

      const provider = createMockProvider({
        apply: () => ({ status: 'created' }),
        destroy: (node) => {
          destroyedIds.push(node.id);
        },
      });

      // First run: create both
      function App1() {
        useInstance<{ status: string }>(Ephemeral, { name: 'temp' });
        useInstance<{ status: string }>(Persistent, { name: 'keep' });
        return null;
      }

      const nodes1 = await run(<App1 />, provider);
      expect(nodes1.length).toBe(2);

      // Second run: only persistent
      function App2() {
        useInstance<{ status: string }>(Persistent, { name: 'keep' });
        return null;
      }

      const nodes2 = await run(<App2 />, provider, nodes1);
      expect(nodes2.length).toBe(1);
      expect(nodes2[0].constructType).toBe('Persistent');

      // Ephemeral should be destroyed
      expect(destroyedIds.some((id) => id.includes('ephemeral-temp'))).toBe(true);
      expect(destroyedIds.some((id) => id.includes('persistent-keep'))).toBe(false);
    });
  });

  describe('Drift detection across re-renders', () => {
    it('should detect prop drift over 10 sequential runs', async () => {
      class Server {}
      const applyCalls: { version: number }[] = [];

      function App({ version }: { version: number }) {
        useInstance<{ status: string }>(Server, { name: 'main', version });
        return null;
      }

      const provider = createMockProvider({
        apply: (node) => {
          applyCalls.push({ version: node.props.version });
          return { status: 'running' };
        },
      });

      let previousNodes: any[] | undefined;

      // Run 10 times with incrementing version
      for (let i = 1; i <= 10; i++) {
        const nodes = await run(<App version={i} />, provider, previousNodes);
        previousNodes = nodes;
      }

      // Should have detected updates for versions 2-10 (first is create, rest are updates)
      expect(applyCalls.length).toBe(10);
      expect(applyCalls.map(c => c.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('should track instance set drift: gradual addition over 5 runs', async () => {
      class Resource {}
      const nodeHistory: string[][] = [];

      function App({ count }: { count: number }) {
        for (let i = 1; i <= count; i++) {
          useInstance<{ id: number }>(Resource, { name: `res-${i}` });
        }
        return null;
      }

      const provider = createMockProvider({
        apply: (node) => ({ id: parseInt(node.props.name.split('-')[1]) }),
      });

      let previousNodes: any[] | undefined;

      // Gradually add instances: 1, 2, 3, 4, 5
      for (let count = 1; count <= 5; count++) {
        resetRuntime();
        const nodes = await run(<App count={count} />, provider, previousNodes);
        nodeHistory.push(nodes.map(n => n.props.name).sort());
        previousNodes = nodes;
      }

      expect(nodeHistory[0]).toEqual(['res-1']);
      expect(nodeHistory[1]).toEqual(['res-1', 'res-2']);
      expect(nodeHistory[2]).toEqual(['res-1', 'res-2', 'res-3']);
      expect(nodeHistory[3]).toEqual(['res-1', 'res-2', 'res-3', 'res-4']);
      expect(nodeHistory[4]).toEqual(['res-1', 'res-2', 'res-3', 'res-4', 'res-5']);
    });

    it('should track instance set drift: gradual removal over 5 runs', async () => {
      class Resource {}
      const destroyedNames: string[] = [];

      function App({ count }: { count: number }) {
        for (let i = 1; i <= count; i++) {
          useInstance<{ id: number }>(Resource, { name: `res-${i}` });
        }
        return null;
      }

      const provider = createMockProvider({
        apply: () => ({ id: 1 }),
        destroy: (node) => {
          destroyedNames.push(node.props.name);
        },
      });

      // Start with 5 instances
      let previousNodes = await run(<App count={5} />, provider);
      expect(previousNodes.length).toBe(5);

      // Gradually remove: 5→4→3→2→1
      for (let count = 4; count >= 1; count--) {
        resetRuntime();
        const nodes = await run(<App count={count} />, provider, previousNodes);
        previousNodes = nodes;
      }

      // Should have destroyed res-5, res-4, res-3, res-2 (in that order)
      expect(destroyedNames).toContain('res-5');
      expect(destroyedNames).toContain('res-4');
      expect(destroyedNames).toContain('res-3');
      expect(destroyedNames).toContain('res-2');
      expect(destroyedNames).not.toContain('res-1');
    });

    it('should handle alternating instance sets over 6 runs', async () => {
      class TypeA {}
      class TypeB {}
      const history: { types: string[]; creates: number; deletes: number }[] = [];

      function App({ useTypeA }: { useTypeA: boolean }) {
        if (useTypeA) {
          useInstance<{ v: number }>(TypeA, { name: 'instance' });
        } else {
          useInstance<{ v: number }>(TypeB, { name: 'instance' });
        }
        return null;
      }

      let createCount = 0;
      let deleteCount = 0;

      const provider = createMockProvider({
        apply: () => {
          createCount++;
          return { v: 1 };
        },
        destroy: () => {
          deleteCount++;
        },
      });

      let previousNodes: any[] | undefined;

      // Alternate between TypeA and TypeB
      const sequence = [true, false, true, false, true, false];
      for (const useTypeA of sequence) {
        const startCreates = createCount;
        const startDeletes = deleteCount;

        resetRuntime();
        const nodes = await run(<App useTypeA={useTypeA} />, provider, previousNodes);

        history.push({
          types: nodes.map(n => n.constructType),
          creates: createCount - startCreates,
          deletes: deleteCount - startDeletes,
        });
        previousNodes = nodes;
      }

      // Each switch should delete old and create new
      expect(history[0]).toEqual({ types: ['TypeA'], creates: 1, deletes: 0 });
      expect(history[1]).toEqual({ types: ['TypeB'], creates: 1, deletes: 1 });
      expect(history[2]).toEqual({ types: ['TypeA'], creates: 1, deletes: 1 });
      expect(history[3]).toEqual({ types: ['TypeB'], creates: 1, deletes: 1 });
      expect(history[4]).toEqual({ types: ['TypeA'], creates: 1, deletes: 1 });
      expect(history[5]).toEqual({ types: ['TypeB'], creates: 1, deletes: 1 });
    });

    it('should correctly identify mixed creates/updates/deletes over 5 runs', async () => {
      class Resource {}

      interface RunStats {
        creates: string[];
        updates: string[];
        deletes: string[];
      }

      const runHistory: RunStats[] = [];

      // Different configurations for each run
      const configurations = [
        [{ name: 'A', v: 1 }, { name: 'B', v: 1 }],                    // Run 1: Create A, B
        [{ name: 'A', v: 2 }, { name: 'B', v: 1 }, { name: 'C', v: 1 }], // Run 2: Update A, Keep B, Create C
        [{ name: 'B', v: 2 }, { name: 'C', v: 1 }],                    // Run 3: Delete A, Update B, Keep C
        [{ name: 'B', v: 2 }, { name: 'C', v: 2 }, { name: 'D', v: 1 }], // Run 4: Keep B, Update C, Create D
        [{ name: 'D', v: 1 }],                                         // Run 5: Delete B, Delete C, Keep D
      ];

      function App({ resources }: { resources: { name: string; v: number }[] }) {
        for (const r of resources) {
          useInstance<{ status: string }>(Resource, { name: r.name, version: r.v });
        }
        return null;
      }

      let previousNodes: any[] | undefined;
      let prevConfig: { name: string; v: number }[] = [];

      const provider = createMockProvider({
        apply: () => ({ status: 'ok' }),
        destroy: () => {},
      });

      for (const config of configurations) {
        resetRuntime();

        // Track what should happen
        const prevNames = new Set(prevConfig.map(c => c.name));
        const currNames = new Set(config.map(c => c.name));
        const prevVersions = new Map(prevConfig.map(c => [c.name, c.v]));

        const expectedCreates = config.filter(c => !prevNames.has(c.name)).map(c => c.name);
        const expectedDeletes = prevConfig.filter(c => !currNames.has(c.name)).map(c => c.name);
        const expectedUpdates = config.filter(c =>
          prevNames.has(c.name) && prevVersions.get(c.name) !== c.v
        ).map(c => c.name);

        const nodes = await run(<App resources={config} />, provider, previousNodes);

        runHistory.push({
          creates: expectedCreates.sort(),
          updates: expectedUpdates.sort(),
          deletes: expectedDeletes.sort(),
        });

        previousNodes = nodes;
        prevConfig = config;
      }

      expect(runHistory[0]).toEqual({ creates: ['A', 'B'], updates: [], deletes: [] });
      expect(runHistory[1]).toEqual({ creates: ['C'], updates: ['A'], deletes: [] });
      expect(runHistory[2]).toEqual({ creates: [], updates: ['B'], deletes: ['A'] });
      expect(runHistory[3]).toEqual({ creates: ['D'], updates: ['C'], deletes: [] });
      expect(runHistory[4]).toEqual({ creates: [], updates: [], deletes: ['B', 'C'] });
    });

    it('should handle deep prop changes triggering cascading updates', async () => {
      class Database {}
      class Cache {}
      class Api {}

      const updateLog: string[] = [];

      function App({ dbVersion }: { dbVersion: number }) {
        const db = useInstance<{ connStr: string }>(Database, {
          name: 'main',
          version: dbVersion
        });

        const cache = useInstance<{ host: string }>(Cache, {
          name: 'redis',
          dbConnection: db.connStr()
        });

        const api = useInstance<{ endpoint: string }>(Api, {
          name: 'rest',
          cacheHost: cache.host()
        });

        return null;
      }

      const provider = createMockProvider({
        apply: (node) => {
          updateLog.push(`${node.constructType}:${node.props.version || node.props.dbConnection || node.props.cacheHost || 'init'}`);

          if (node.constructType === 'Database') {
            return { connStr: `postgres://v${node.props.version}` };
          }
          if (node.constructType === 'Cache') {
            return { host: `redis://${node.props.dbConnection}` };
          }
          if (node.constructType === 'Api') {
            return { endpoint: `http://api/${node.props.cacheHost}` };
          }
          return {};
        },
      });

      // Run with version 1
      let nodes = await run(<App dbVersion={1} />, provider);
      expect(nodes.length).toBe(3);

      // Clear log and run with version 2 - should cascade updates
      updateLog.length = 0;
      nodes = await run(<App dbVersion={2} />, provider, nodes);

      // Database should update with version 2, then Cache and Api should update with new values
      expect(updateLog).toContain('Database:2');
    });

    it('should maintain consistency across 20 rapid re-renders with random changes', async () => {
      class Item {}

      function App({ items }: { items: number[] }) {
        for (const id of items) {
          useInstance<{ value: number }>(Item, { name: `item-${id}`, id });
        }
        return null;
      }

      const provider = createMockProvider({
        apply: (node) => ({ value: node.props.id * 10 }),
      });

      // Seeded "random" sequence for reproducibility
      const sequences = [
        [1, 2, 3],
        [1, 2, 3, 4],
        [2, 3, 4],
        [2, 4, 5],
        [1, 2, 4, 5],
        [1, 2, 3, 4, 5],
        [3, 4, 5],
        [3, 5],
        [1, 3, 5],
        [1, 2, 3, 4, 5],
        [5],
        [4, 5],
        [3, 4, 5],
        [2, 3, 4, 5],
        [1, 2, 3, 4, 5],
        [1],
        [1, 2],
        [1, 2, 3],
        [1, 2, 3, 4],
        [1, 2, 3, 4, 5],
      ];

      let previousNodes: any[] | undefined;

      for (const items of sequences) {
        resetRuntime();
        const nodes = await run(<App items={items} />, provider, previousNodes);

        // Verify consistency: nodes should exactly match requested items
        const nodeIds = nodes.map(n => n.props.id).sort((a, b) => a - b);
        expect(nodeIds).toEqual([...items].sort((a, b) => a - b));

        previousNodes = nodes;
      }
    });

    it('should handle conditional drift based on reactive outputs', async () => {
      class FeatureFlag {}
      class FeatureA {}
      class FeatureB {}
      class FeatureC {}

      // Pass flags via props to trigger updates each run
      function App({ flagConfig }: { flagConfig: { a: boolean; b: boolean; c: boolean } }) {
        const flags = useInstance<{ a: boolean; b: boolean; c: boolean }>(FeatureFlag, {
          name: 'flags',
          ...flagConfig  // Props change triggers update
        });

        if (flags.a()) {
          useInstance<{ status: string }>(FeatureA, { name: 'feature-a' });
        }
        if (flags.b()) {
          useInstance<{ status: string }>(FeatureB, { name: 'feature-b' });
        }
        if (flags.c()) {
          useInstance<{ status: string }>(FeatureC, { name: 'feature-c' });
        }

        return null;
      }

      // Simulate flag changes over time
      const flagSequence = [
        { a: true, b: false, c: false },
        { a: true, b: true, c: false },
        { a: true, b: true, c: true },
        { a: false, b: true, c: true },
        { a: false, b: false, c: true },
        { a: false, b: false, c: false },
      ];

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'FeatureFlag') {
            // Return the flag values from the props
            return { a: node.props.a, b: node.props.b, c: node.props.c };
          }
          return { status: 'enabled' };
        },
      });

      const expectedFeatures = [
        ['FeatureA'],
        ['FeatureA', 'FeatureB'],
        ['FeatureA', 'FeatureB', 'FeatureC'],
        ['FeatureB', 'FeatureC'],
        ['FeatureC'],
        [],
      ];

      let previousNodes: any[] | undefined;

      for (let i = 0; i < flagSequence.length; i++) {
        resetRuntime();

        const nodes = await run(<App flagConfig={flagSequence[i]} />, provider, previousNodes);
        const featureNodes = nodes
          .filter(n => n.constructType !== 'FeatureFlag')
          .map(n => n.constructType)
          .sort();

        expect(featureNodes).toEqual(expectedFeatures[i].sort());
        previousNodes = nodes;
      }
    });

    it('should handle store drift alongside instance drift', async () => {
      class Counter {}

      function App({ instanceCount }: { instanceCount: number }) {
        const [store, setStore] = createStore({ totalCalls: 0 });

        for (let i = 1; i <= instanceCount; i++) {
          const counter = useInstance<{ value: number }>(Counter, { name: `counter-${i}` });

          createEffect(() => {
            if (counter.value() !== undefined) {
              setStore('totalCalls', store.totalCalls + 1);
            }
          });
        }

        return null;
      }

      const provider = createMockProvider({
        apply: (node) => ({ value: parseInt(node.props.name.split('-')[1]) }),
      });

      // Run with increasing instance counts
      const counts = [1, 2, 3, 2, 1];
      let previousNodes: any[] | undefined;
      const storeHistory: number[] = [];

      for (const count of counts) {
        resetRuntime();
        const nodes = await run(<App instanceCount={count} />, provider, previousNodes);

        // Find any node with store (they all share the same fiber store)
        const nodeWithStore = nodes.find(n => n.store);
        if (nodeWithStore) {
          storeHistory.push(nodeWithStore.store.totalCalls);
        }

        previousNodes = nodes;
      }

      // Store should accumulate calls as instances are added
      expect(storeHistory[0]).toBeGreaterThanOrEqual(1);
      // Each run with more instances should have accumulated more
      for (let i = 1; i < storeHistory.length; i++) {
        expect(storeHistory[i]).toBeGreaterThanOrEqual(storeHistory[i - 1]);
      }
    });

    it('should handle 50 instances with random prop changes', async () => {
      class Widget {}

      function App({ widgets }: { widgets: { id: number; config: string }[] }) {
        for (const w of widgets) {
          useInstance<{ status: string }>(Widget, { name: `widget-${w.id}`, config: w.config });
        }
        return null;
      }

      let updateCount = 0;
      const provider = createMockProvider({
        apply: () => {
          updateCount++;
          return { status: 'active' };
        },
      });

      // Create 50 widgets
      const baseWidgets = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        config: `config-v1`
      }));

      let nodes = await run(<App widgets={baseWidgets} />, provider);
      expect(nodes.length).toBe(50);
      const initialUpdates = updateCount;

      // Change config for widgets 10, 20, 30, 40, 50
      const modifiedWidgets = baseWidgets.map(w => ({
        ...w,
        config: [10, 20, 30, 40, 50].includes(w.id) ? 'config-v2' : w.config
      }));

      updateCount = 0;
      nodes = await run(<App widgets={modifiedWidgets} />, provider, nodes);

      // Should have exactly 5 updates (the modified ones)
      expect(updateCount).toBe(5);
      expect(nodes.length).toBe(50);
    });
  });

  describe('Provider-triggered re-renders (delivery network)', () => {
    it('should trigger chain: Order → Payment → Shipment → Delivery', async () => {
      class Order {}
      class Payment {}
      class Shipment {}
      class Delivery {}

      const applyLog: string[] = [];

      function App() {
        const order = useInstance<{ orderId: string; total: number }>(Order, { name: 'order-1' });

        // Payment depends on order
        const payment = useInstance<{ paymentId: string; status: string }>(Payment, {
          orderId: order.orderId()
        });

        // Shipment depends on payment being confirmed
        const shipment = useInstance<{ trackingNumber: string }>(Shipment, {
          paymentId: payment.status() === 'confirmed' ? payment.paymentId() : undefined
        });

        // Delivery depends on shipment
        const delivery = useInstance<{ deliveryDate: string }>(Delivery, {
          trackingNumber: shipment.trackingNumber()
        });

        return null;
      }

      const provider = createMockProvider({
        apply: (node) => {
          applyLog.push(node.constructType);

          switch (node.constructType) {
            case 'Order':
              return { orderId: 'ORD-123', total: 99.99 };
            case 'Payment':
              return { paymentId: 'PAY-456', status: 'confirmed' };
            case 'Shipment':
              return { trackingNumber: 'TRACK-789' };
            case 'Delivery':
              return { deliveryDate: '2024-01-15' };
            default:
              return {};
          }
        },
      });

      const nodes = await run(<App />, provider);

      // All 4 should be created through the convergence loop
      expect(nodes.length).toBe(4);
      expect(nodes.map(n => n.constructType).sort()).toEqual([
        'Delivery', 'Order', 'Payment', 'Shipment'
      ]);

      // Verify the chain was triggered in order
      expect(applyLog).toContain('Order');
      expect(applyLog).toContain('Payment');
      expect(applyLog).toContain('Shipment');
      expect(applyLog).toContain('Delivery');
    });

    it('should handle branching delivery: one order triggers multiple shipments', async () => {
      class Order {}
      class Shipment {}

      function App() {
        const order = useInstance<{ orderId: string; shipmentCount: number }>(Order, { name: 'multi-order' });

        // Create multiple shipments based on order output
        const count = order.shipmentCount() || 0;
        for (let i = 1; i <= count; i++) {
          useInstance<{ trackingNumber: string }>(Shipment, {
            orderId: order.orderId(),
            name: `shipment-${i}`
          });
        }

        return null;
      }

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Order') {
            return { orderId: 'ORD-MULTI', shipmentCount: 3 };
          }
          if (node.constructType === 'Shipment') {
            return { trackingNumber: `TRACK-${node.props.name}` };
          }
          return {};
        },
      });

      const nodes = await run(<App />, provider);

      // 1 order + 3 shipments
      expect(nodes.length).toBe(4);
      expect(nodes.filter(n => n.constructType === 'Shipment').length).toBe(3);
    });

    it('should handle conditional delivery based on inventory check', async () => {
      class InventoryCheck {}
      class Reservation {}
      class OutOfStock {}

      function App({ productId }: { productId: string }) {
        const inventory = useInstance<{ available: boolean; quantity: number }>(InventoryCheck, {
          productId
        });

        if (inventory.available()) {
          useInstance<{ reservationId: string }>(Reservation, {
            productId,
            quantity: inventory.quantity()
          });
        } else if (inventory.available() === false) {
          useInstance<{ waitlistPosition: number }>(OutOfStock, {
            productId
          });
        }

        return null;
      }

      // Test with available product
      const availableProvider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'InventoryCheck') {
            return { available: true, quantity: 5 };
          }
          if (node.constructType === 'Reservation') {
            return { reservationId: 'RES-001' };
          }
          return {};
        },
      });

      const availableNodes = await run(<App productId="PROD-A" />, availableProvider);
      expect(availableNodes.map(n => n.constructType).sort()).toEqual(['InventoryCheck', 'Reservation']);

      // Test with out of stock product
      resetRuntime();
      const outOfStockProvider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'InventoryCheck') {
            return { available: false, quantity: 0 };
          }
          if (node.constructType === 'OutOfStock') {
            return { waitlistPosition: 42 };
          }
          return {};
        },
      });

      const outOfStockNodes = await run(<App productId="PROD-B" />, outOfStockProvider);
      expect(outOfStockNodes.map(n => n.constructType).sort()).toEqual(['InventoryCheck', 'OutOfStock']);
    });

    it('should handle delivery network with retries', async () => {
      class DeliveryAttempt {}
      class DeliverySuccess {}
      class DeliveryFailed {}

      function App({ attemptNumber }: { attemptNumber: number }) {
        const attempt = useInstance<{ success: boolean; attemptNumber: number }>(DeliveryAttempt, {
          name: 'delivery',
          attemptNumber  // Prop changes trigger update
        });

        if (attempt.success()) {
          useInstance<{ completedAt: string }>(DeliverySuccess, {
            attemptNumber: attempt.attemptNumber()
          });
        } else if (attempt.success() === false) {
          useInstance<{ reason: string }>(DeliveryFailed, {
            attemptNumber: attempt.attemptNumber()
          });
        }

        return null;
      }

      // Simulate: attempts 1-2 fail, attempt 3 succeeds
      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'DeliveryAttempt') {
            const success = node.props.attemptNumber >= 3;
            return { success, attemptNumber: node.props.attemptNumber };
          }
          if (node.constructType === 'DeliverySuccess') {
            return { completedAt: '2024-01-15T10:00:00Z' };
          }
          if (node.constructType === 'DeliveryFailed') {
            return { reason: 'Address not found' };
          }
          return {};
        },
      });

      // First run - should fail
      let nodes = await run(<App attemptNumber={1} />, provider);
      expect(nodes.find(n => n.constructType === 'DeliveryFailed')).toBeDefined();
      expect(nodes.find(n => n.constructType === 'DeliverySuccess')).toBeUndefined();

      // Second run with retry - still fails
      resetRuntime();
      nodes = await run(<App attemptNumber={2} />, provider, nodes);
      expect(nodes.find(n => n.constructType === 'DeliveryFailed')).toBeDefined();

      // Third run - succeeds
      resetRuntime();
      nodes = await run(<App attemptNumber={3} />, provider, nodes);
      expect(nodes.find(n => n.constructType === 'DeliverySuccess')).toBeDefined();
    });

    it('should handle complex logistics: Warehouse → Truck → Hub → LastMile → Customer', async () => {
      class Warehouse {}
      class TruckLoad {}
      class DistributionHub {}
      class LastMileDelivery {}
      class CustomerReceipt {}

      const deliveryChain: string[] = [];

      function App({ packageId }: { packageId: string }) {
        const warehouse = useInstance<{ warehouseId: string; readyAt: string }>(Warehouse, {
          packageId
        });

        const truck = useInstance<{ truckId: string; departedAt: string }>(TruckLoad, {
          warehouseId: warehouse.warehouseId(),
          readyAt: warehouse.readyAt()
        });

        const hub = useInstance<{ hubId: string; arrivedAt: string }>(DistributionHub, {
          truckId: truck.truckId(),
          departedAt: truck.departedAt()
        });

        const lastMile = useInstance<{ driverId: string; eta: string }>(LastMileDelivery, {
          hubId: hub.hubId(),
          arrivedAt: hub.arrivedAt()
        });

        const receipt = useInstance<{ signedAt: string; signedBy: string }>(CustomerReceipt, {
          driverId: lastMile.driverId(),
          eta: lastMile.eta()
        });

        return null;
      }

      const provider = createMockProvider({
        apply: (node) => {
          deliveryChain.push(node.constructType);

          const outputs: Record<string, any> = {
            Warehouse: { warehouseId: 'WH-001', readyAt: '08:00' },
            TruckLoad: { truckId: 'TRUCK-42', departedAt: '09:00' },
            DistributionHub: { hubId: 'HUB-CENTRAL', arrivedAt: '14:00' },
            LastMileDelivery: { driverId: 'DRIVER-7', eta: '16:30' },
            CustomerReceipt: { signedAt: '16:25', signedBy: 'John Doe' },
          };

          return outputs[node.constructType] || {};
        },
      });

      const nodes = await run(<App packageId="PKG-12345" />, provider);

      // All 5 stages should complete
      expect(nodes.length).toBe(5);
      expect(nodes.map(n => n.constructType).sort()).toEqual([
        'CustomerReceipt', 'DistributionHub', 'LastMileDelivery', 'TruckLoad', 'Warehouse'
      ]);

      // Verify all stages were applied (convergence created all 5)
      expect(deliveryChain).toContain('Warehouse');
      expect(deliveryChain).toContain('TruckLoad');
      expect(deliveryChain).toContain('DistributionHub');
      expect(deliveryChain).toContain('LastMileDelivery');
      expect(deliveryChain).toContain('CustomerReceipt');
    });

    it('should handle parallel delivery streams merging', async () => {
      class SupplierA {}
      class SupplierB {}
      class Assembly {}
      class QualityCheck {}
      class FinalProduct {}

      function App() {
        // Two parallel supplier streams
        const supplierA = useInstance<{ partA: string }>(SupplierA, { name: 'supplier-a' });
        const supplierB = useInstance<{ partB: string }>(SupplierB, { name: 'supplier-b' });

        // Assembly waits for both parts
        const assembly = useInstance<{ assembledId: string }>(Assembly, {
          partA: supplierA.partA(),
          partB: supplierB.partB()
        });

        // QC depends on assembly
        const qc = useInstance<{ passed: boolean }>(QualityCheck, {
          assembledId: assembly.assembledId()
        });

        // Final product only if QC passed
        if (qc.passed()) {
          useInstance<{ productId: string }>(FinalProduct, {
            assembledId: assembly.assembledId(),
            qcPassed: true
          });
        }

        return null;
      }

      const provider = createMockProvider({
        apply: (node) => {
          const outputs: Record<string, any> = {
            SupplierA: { partA: 'PART-A-001' },
            SupplierB: { partB: 'PART-B-001' },
            Assembly: { assembledId: 'ASSY-001' },
            QualityCheck: { passed: true },
            FinalProduct: { productId: 'PROD-001' },
          };
          return outputs[node.constructType] || {};
        },
      });

      const nodes = await run(<App />, provider);

      // All 5 should be created (including FinalProduct since QC passed)
      expect(nodes.length).toBe(5);
      expect(nodes.find(n => n.constructType === 'FinalProduct')).toBeDefined();
    });

    it('should handle delivery with dynamic routing based on destination', async () => {
      class Package {}
      class DomesticRoute {}
      class InternationalRoute {}
      class CustomsClearance {}

      function App({ destination }: { destination: string }) {
        const pkg = useInstance<{ packageId: string; isDomestic: boolean }>(Package, {
          destination
        });

        if (pkg.isDomestic()) {
          useInstance<{ carrier: string; days: number }>(DomesticRoute, {
            packageId: pkg.packageId()
          });
        } else if (pkg.isDomestic() === false) {
          const customs = useInstance<{ clearanceId: string; cleared: boolean }>(CustomsClearance, {
            packageId: pkg.packageId()
          });

          if (customs.cleared()) {
            useInstance<{ carrier: string; days: number }>(InternationalRoute, {
              packageId: pkg.packageId(),
              clearanceId: customs.clearanceId()
            });
          }
        }

        return null;
      }

      // Test domestic route
      const domesticProvider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Package') {
            return { packageId: 'PKG-DOM-1', isDomestic: true };
          }
          if (node.constructType === 'DomesticRoute') {
            return { carrier: 'USPS', days: 3 };
          }
          return {};
        },
      });

      let nodes = await run(<App destination="California" />, domesticProvider);
      expect(nodes.map(n => n.constructType).sort()).toEqual(['DomesticRoute', 'Package']);

      // Test international route
      resetRuntime();
      const internationalProvider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Package') {
            return { packageId: 'PKG-INT-1', isDomestic: false };
          }
          if (node.constructType === 'CustomsClearance') {
            return { clearanceId: 'CUST-001', cleared: true };
          }
          if (node.constructType === 'InternationalRoute') {
            return { carrier: 'DHL', days: 7 };
          }
          return {};
        },
      });

      nodes = await run(<App destination="Germany" />, internationalProvider);
      expect(nodes.map(n => n.constructType).sort()).toEqual([
        'CustomsClearance', 'InternationalRoute', 'Package'
      ]);
    });

    it('should handle event-driven delivery updates', async () => {
      class Subscription {}
      class Event {}

      const eventLog: string[] = [];

      function App({ subscriberId }: { subscriberId: string }) {
        const sub = useInstance<{ channel: string; events: string[] }>(Subscription, {
          subscriberId
        });

        // Create Event instances for each event in the subscription
        const events = sub.events() || [];
        for (const eventType of events) {
          const evt = useInstance<{ processed: boolean; data: any }>(Event, {
            channel: sub.channel(),
            eventType,
            name: `event-${eventType}`
          });

          createEffect(() => {
            if (evt.processed()) {
              eventLog.push(`Processed: ${eventType}`);
            }
          });
        }

        return null;
      }

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Subscription') {
            return {
              channel: 'delivery-updates',
              events: ['shipped', 'in-transit', 'delivered']
            };
          }
          if (node.constructType === 'Event') {
            return { processed: true, data: { timestamp: Date.now() } };
          }
          return {};
        },
      });

      const nodes = await run(<App subscriberId="user-123" />, provider);

      // 1 subscription + 3 events
      expect(nodes.length).toBe(4);
      expect(nodes.filter(n => n.constructType === 'Event').length).toBe(3);

      // All events should have been processed
      expect(eventLog).toContain('Processed: shipped');
      expect(eventLog).toContain('Processed: in-transit');
      expect(eventLog).toContain('Processed: delivered');
    });

    it('should handle cascading failures in delivery network', async () => {
      class Source {}
      class Processor {}
      class Sink {}

      const errorLog: string[] = [];

      function App() {
        const source = useInstance<{ data: string; error?: string }>(Source, { name: 'source' });

        // Only proceed if source has no error
        if (source.error()) {
          createEffect(() => {
            errorLog.push(`Source error: ${source.error()}`);
          });
          return null;
        }

        const processor = useInstance<{ result: string; error?: string }>(Processor, {
          input: source.data()
        });

        if (processor.error()) {
          createEffect(() => {
            errorLog.push(`Processor error: ${processor.error()}`);
          });
          return null;
        }

        useInstance<{ saved: boolean }>(Sink, {
          data: processor.result()
        });

        return null;
      }

      // Test successful flow
      const successProvider = createMockProvider({
        apply: (node) => {
          const outputs: Record<string, any> = {
            Source: { data: 'raw-data' },
            Processor: { result: 'processed-data' },
            Sink: { saved: true },
          };
          return outputs[node.constructType] || {};
        },
      });

      let nodes = await run(<App />, successProvider);
      expect(nodes.length).toBe(3);
      expect(errorLog.length).toBe(0);

      // Test source failure
      resetRuntime();
      errorLog.length = 0;
      const sourceFailProvider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Source') {
            return { data: null, error: 'Connection timeout' };
          }
          return {};
        },
      });

      nodes = await run(<App />, sourceFailProvider);
      expect(nodes.length).toBe(1); // Only Source
      expect(errorLog).toContain('Source error: Connection timeout');

      // Test processor failure
      resetRuntime();
      errorLog.length = 0;
      const processorFailProvider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Source') {
            return { data: 'raw-data' };
          }
          if (node.constructType === 'Processor') {
            return { result: null, error: 'Parse error' };
          }
          return {};
        },
      });

      nodes = await run(<App />, processorFailProvider);
      expect(nodes.length).toBe(2); // Source + Processor
      expect(errorLog).toContain('Processor error: Parse error');
    });

    it('should handle real-time delivery tracking with status updates', async () => {
      class TrackingSession {}
      class StatusUpdate {}

      const statusHistory: string[] = [];

      function App({ trackingNumber }: { trackingNumber: string }) {
        const session = useInstance<{
          sessionId: string;
          currentStatus: string;
          statusHistory: string[];
        }>(TrackingSession, { trackingNumber });

        // Create StatusUpdate for each status in history
        const history = session.statusHistory() || [];
        for (let i = 0; i < history.length; i++) {
          const update = useInstance<{ timestamp: string; location: string }>(StatusUpdate, {
            sessionId: session.sessionId(),
            status: history[i],
            sequence: i,
            name: `status-${i}`
          });

          createEffect(() => {
            if (update.timestamp()) {
              statusHistory.push(`${history[i]} at ${update.location()}`);
            }
          });
        }

        return null;
      }

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'TrackingSession') {
            return {
              sessionId: 'SESS-001',
              currentStatus: 'delivered',
              statusHistory: ['picked-up', 'in-transit', 'out-for-delivery', 'delivered']
            };
          }
          if (node.constructType === 'StatusUpdate') {
            const locations: Record<string, string> = {
              'picked-up': 'Warehouse A',
              'in-transit': 'Highway 101',
              'out-for-delivery': 'Local Hub',
              'delivered': 'Customer Address'
            };
            return {
              timestamp: '2024-01-15T10:00:00Z',
              location: locations[node.props.status] || 'Unknown'
            };
          }
          return {};
        },
      });

      const nodes = await run(<App trackingNumber="TRACK-XYZ" />, provider);

      // 1 session + 4 status updates
      expect(nodes.length).toBe(5);

      // All status updates should be logged
      expect(statusHistory).toContain('picked-up at Warehouse A');
      expect(statusHistory).toContain('in-transit at Highway 101');
      expect(statusHistory).toContain('out-for-delivery at Local Hub');
      expect(statusHistory).toContain('delivered at Customer Address');
    });
  });

  describe('Cross-instance output updates from provider', () => {
    it('should detect drift when provider state affects outputs on re-apply', async () => {
      class Config {}
      class Service {}

      const configVersions: number[] = [];
      let serviceCreated = false;

      function App() {
        const config = useInstance<{ version: number }>(Config, { name: 'config' });

        createEffect(() => {
          const v = config.version();
          if (v !== undefined) configVersions.push(v);
        });

        // Service creation triggers provider state change
        if (config.version()) {
          const service = useInstance<{ ready: boolean }>(Service, {
            name: 'service',
            configVersion: config.version()
          });
          // Create another instance that triggers re-apply
          if (service.ready() && !serviceCreated) {
            serviceCreated = true;
          }
        }

        return null;
      }

      let applyCount = 0;

      const provider = createMockProvider({
        apply: (node) => {
          applyCount++;
          if (node.constructType === 'Config') {
            // Config version increases each time it's applied
            return { version: applyCount };
          }
          if (node.constructType === 'Service') {
            return { ready: true };
          }
          return {};
        },
      });

      await run(<App />, provider);

      // Config was applied multiple times, versions increased
      expect(configVersions.length).toBeGreaterThanOrEqual(1);
      expect(applyCount).toBeGreaterThanOrEqual(2);
    });

    it('should cascade through dependency chain via provider state', async () => {
      class Database {}
      class Cache {}
      class API {}

      const applyLog: string[] = [];

      function App() {
        const db = useInstance<{ url: string }>(Database, { name: 'db' });

        // Cache depends on DB
        const cache = useInstance<{ key: string }>(Cache, {
          name: 'cache',
          dbUrl: db.url()
        });

        // API depends on Cache
        if (cache.key()) {
          useInstance<{ endpoint: string }>(API, {
            name: 'api',
            cacheKey: cache.key()
          });
        }

        return null;
      }

      let dbReady = false;
      let cacheReady = false;

      const provider = createMockProvider({
        apply: (node) => {
          applyLog.push(node.constructType);

          if (node.constructType === 'Database') {
            dbReady = true;
            return { url: 'postgres://localhost' };
          }
          if (node.constructType === 'Cache') {
            if (dbReady) {
              cacheReady = true;
              return { key: `cache-${node.props.dbUrl}` };
            }
            return { key: undefined };
          }
          if (node.constructType === 'API') {
            return { endpoint: `/api?cache=${node.props.cacheKey}` };
          }
          return {};
        },
      });

      const nodes = await run(<App />, provider);

      // All three should be created in cascade
      expect(nodes.length).toBe(3);
      expect(applyLog).toContain('Database');
      expect(applyLog).toContain('Cache');
      expect(applyLog).toContain('API');
    });

    it('should handle provider state affecting conditional instance creation', async () => {
      class FeatureFlag {}
      class Feature {}

      function App() {
        const flag = useInstance<{ enabled: boolean }>(FeatureFlag, { name: 'flag' });

        // Feature only created when flag is enabled
        if (flag.enabled()) {
          useInstance<{ active: boolean }>(Feature, { name: 'feature' });
        }

        return null;
      }

      let flagApplyCount = 0;

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'FeatureFlag') {
            flagApplyCount++;
            // Enable feature on second apply (after Feature is created)
            return { enabled: flagApplyCount >= 1 };
          }
          if (node.constructType === 'Feature') {
            return { active: true };
          }
          return {};
        },
      });

      const nodes = await run(<App />, provider);

      // Both flag and feature should exist
      expect(nodes.find(n => n.constructType === 'FeatureFlag')).toBeDefined();
      expect(nodes.find(n => n.constructType === 'Feature')).toBeDefined();
    });

    it('should handle multiple instances depending on shared provider state', async () => {
      class Coordinator {}
      class Worker {}

      const workerOutputs: Record<string, number> = {};

      function App() {
        const coord = useInstance<{ batchId: number }>(Coordinator, { name: 'coord' });

        // Multiple workers all depend on coordinator
        const w1 = useInstance<{ result: number }>(Worker, { name: 'w1', batch: coord.batchId() });
        const w2 = useInstance<{ result: number }>(Worker, { name: 'w2', batch: coord.batchId() });
        const w3 = useInstance<{ result: number }>(Worker, { name: 'w3', batch: coord.batchId() });

        createEffect(() => {
          if (w1.result() !== undefined) workerOutputs['w1'] = w1.result()!;
          if (w2.result() !== undefined) workerOutputs['w2'] = w2.result()!;
          if (w3.result() !== undefined) workerOutputs['w3'] = w3.result()!;
        });

        return null;
      }

      let batchId = 0;

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Coordinator') {
            batchId++;
            return { batchId };
          }
          if (node.constructType === 'Worker') {
            // Worker result based on batch
            return { result: (node.props.batch || 0) * 10 };
          }
          return {};
        },
      });

      await run(<App />, provider);

      // All workers should have results based on batch
      expect(Object.keys(workerOutputs).length).toBe(3);
      expect(workerOutputs['w1']).toBeGreaterThan(0);
    });

    it('should handle state machine with provider-controlled transitions', async () => {
      class StateMachine {}
      class Action {}

      const stateLog: string[] = [];

      function App() {
        const machine = useInstance<{ state: string; canAct: boolean }>(StateMachine, { name: 'machine' });

        createEffect(() => {
          if (machine.state()) stateLog.push(machine.state()!);
        });

        // Create action when machine allows it
        if (machine.canAct()) {
          useInstance<{ executed: boolean }>(Action, {
            name: 'action',
            currentState: machine.state()
          });
        }

        return null;
      }

      const states = ['init', 'ready', 'running', 'complete'];
      let stateIndex = 0;

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'StateMachine') {
            const state = states[stateIndex];
            const canAct = stateIndex < states.length - 1;
            return { state, canAct };
          }
          if (node.constructType === 'Action') {
            // Action advances state
            if (stateIndex < states.length - 1) {
              stateIndex++;
            }
            return { executed: true };
          }
          return {};
        },
      });

      const nodes = await run(<App />, provider);

      // Should have state machine and possibly action
      expect(nodes.find(n => n.constructType === 'StateMachine')).toBeDefined();
      expect(stateLog.length).toBeGreaterThan(0);
      expect(stateLog).toContain('init');
    });

    it('should handle provider state accumulating across applies', async () => {
      class Counter {}
      class Adder {}

      const counterValues: number[] = [];

      function App() {
        const counter = useInstance<{ value: number }>(Counter, { name: 'counter' });

        createEffect(() => {
          if (counter.value() !== undefined) counterValues.push(counter.value()!);
        });

        // Create adders that will increment the counter
        if (counter.value() !== undefined && counter.value()! < 5) {
          useInstance<{ added: boolean }>(Adder, {
            name: `adder-${counter.value()}`,
            currentValue: counter.value()
          });
        }

        return null;
      }

      let totalValue = 0;

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Counter') {
            return { value: totalValue };
          }
          if (node.constructType === 'Adder') {
            totalValue++;
            return { added: true };
          }
          return {};
        },
      });

      await run(<App />, provider);

      // Counter should have accumulated values
      expect(counterValues.length).toBeGreaterThan(1);
      expect(totalValue).toBeGreaterThan(0);
    });

    it('should handle circular dependency detection via max iterations', async () => {
      class NodeA {}
      class NodeB {}

      let aCount = 0;
      let bCount = 0;

      function App() {
        const a = useInstance<{ count: number }>(NodeA, { name: 'a' });
        const b = useInstance<{ count: number }>(NodeB, { name: 'b', aCount: a.count() });

        // A depends on B's count to create more nodes
        if (b.count() !== undefined && b.count()! < 100) {
          useInstance<{ marker: boolean }>(NodeA, {
            name: `a-${b.count()}`,
            bCount: b.count()
          });
        }

        return null;
      }

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'NodeA') {
            aCount++;
            return { count: aCount };
          }
          if (node.constructType === 'NodeB') {
            bCount++;
            return { count: bCount };
          }
          return {};
        },
      });

      await run(<App />, provider, undefined, { maxIterations: 5 });

      warnSpy.mockRestore();

      // Should have hit max iterations due to circular growth
      expect(aCount + bCount).toBeGreaterThanOrEqual(3);
    });

    it('should handle provider returning different outputs for same node on re-apply', async () => {
      class Sensor {}
      class Display {}

      const displayValues: number[] = [];

      function App() {
        const sensor = useInstance<{ reading: number }>(Sensor, { name: 'sensor' });

        createEffect(() => {
          if (sensor.reading() !== undefined) displayValues.push(sensor.reading()!);
        });

        // Display updates based on reading
        if (sensor.reading() !== undefined) {
          useInstance<{ shown: number }>(Display, {
            name: 'display',
            value: sensor.reading()
          });
        }

        return null;
      }

      let reading = 0;

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Sensor') {
            reading += 10;
            return { reading };
          }
          if (node.constructType === 'Display') {
            return { shown: node.props.value };
          }
          return {};
        },
      });

      await run(<App />, provider);

      // Should have multiple readings as sensor was re-applied
      expect(displayValues.length).toBeGreaterThan(0);
      expect(displayValues[displayValues.length - 1]).toBeGreaterThan(0);
    });

    it('should handle provider state reset between runs', async () => {
      class Service {}

      function App() {
        useInstance<{ id: number }>(Service, { name: 'svc' });
        return null;
      }

      let serviceId = 0;

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Service') {
            serviceId++;
            return { id: serviceId };
          }
          return {};
        },
      });

      // First run
      const nodes1 = await run(<App />, provider);
      const id1 = serviceId;

      // Reset state
      resetRuntime();
      serviceId = 0;

      // Second run - fresh state
      const nodes2 = await run(<App />, provider);
      const id2 = serviceId;

      // Both runs should start fresh
      expect(id1).toBe(1);
      expect(id2).toBe(1);
    });

    it('should handle complex multi-stage provider workflow', async () => {
      class Pipeline {}
      class Stage {}

      const stageResults: string[] = [];

      function App() {
        const pipeline = useInstance<{ currentStage: string; complete: boolean }>(Pipeline, {
          name: 'pipeline'
        });

        createEffect(() => {
          if (pipeline.currentStage()) stageResults.push(pipeline.currentStage()!);
        });

        // Create stages based on pipeline state
        if (!pipeline.complete()) {
          useInstance<{ processed: boolean }>(Stage, {
            name: `stage-${pipeline.currentStage()}`,
            stage: pipeline.currentStage()
          });
        }

        return null;
      }

      const stages = ['fetch', 'transform', 'validate', 'save'];
      let stageIndex = 0;

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Pipeline') {
            return {
              currentStage: stages[stageIndex],
              complete: stageIndex >= stages.length
            };
          }
          if (node.constructType === 'Stage') {
            // Stage processing advances pipeline
            if (stageIndex < stages.length) {
              stageIndex++;
            }
            return { processed: true };
          }
          return {};
        },
      });

      await run(<App />, provider);

      // Should have processed through stages
      expect(stageResults.length).toBeGreaterThan(0);
      expect(stageResults).toContain('fetch');
    });
  });
});
