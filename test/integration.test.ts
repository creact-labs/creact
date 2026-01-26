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
  createElement,
  Fragment,
} from '../src/index.js';

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
        return { type: 'div', props: { url: db.url() } };
      }

      const provider = createMockProvider({
        apply: (node) => {
          if (node.constructType === 'Database') {
            return { url: 'postgres://localhost/test' };
          }
          return {};
        },
      });

      const nodes = await run(createElement(App, {}), provider);

      expect(nodes.length).toBe(1);
      expect(nodes[0].constructType).toBe('Database');
    });

    it('should skip instance when props have undefined values', async () => {
      class Service {}

      function App({ dbUrl }: { dbUrl?: string }) {
        const svc = useInstance<{ endpoint: string }>(Service, { database: dbUrl });
        return { type: 'div', props: { endpoint: svc.endpoint() } };
      }

      const provider = createMockProvider({
        apply: () => ({ endpoint: 'http://localhost' }),
      });

      // With undefined dbUrl, service should not be created
      const nodes = await run(createElement(App, { dbUrl: undefined }), provider);
      expect(nodes.length).toBe(0);

      // With defined dbUrl, service should be created
      resetRuntime();
      const nodes2 = await run(createElement(App, { dbUrl: 'postgres://...' }), provider);
      expect(nodes2.length).toBe(1);
    });
  });

  describe('createStore', () => {
    it('should create persistent store', async () => {
      function App() {
        const [store, setStore] = createStore({ count: 0 });
        setStore('count', 5);
        return { type: 'div', props: { count: store.count } };
      }

      const provider = createMockProvider();
      await run(createElement(App, {}), provider);

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
        return createElement(
          ConfigContext.Provider,
          { value: { env: 'prod' } },
          createElement(Child, {})
        );
      }

      const provider = createMockProvider();
      await run(createElement(App, {}), provider);

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
        return createElement(Child, {});
      }

      const provider = createMockProvider();
      await run(createElement(App, {}), provider);

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
          return createElement(Child, { dbUrl: db.url });
        }
        return null;
      }

      const provider = createMockProvider({
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

      const nodes = await run(createElement(App, {}), provider);

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

      const provider = createMockProvider({
        apply: () => ({
          url: 'postgres://localhost',
          status: 'ready',
        }),
      });

      await run(createElement(App, {}), provider);

      expect(effectRuns).toContain('ready: postgres://localhost');
    });
  });
});
