/**
 * Reactive Context & State Test Example
 *
 * Demonstrates fine-grained reactivity in CReact.
 * Includes:
 *  - Dummy Cloud provider simulating resource output changes
 *  - Context propagation and dependency re-rendering
 *  - Stateful outputs reacting to provider updates
 *
 * Usage:
 *   creact build --entry examples/reactivity/reactivity-test.tsx
 *   creact deploy --entry examples/reactivity/reactivity-test.tsx
 */

import { CReact } from '../../src/jsx';
import { CReact as CReactCore } from '../../src/core/CReact';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';
import { useEffect } from '../../src/hooks/useEffect';
import { createContext, useContext } from '../../src/hooks/useContext';
import { CloudDOMNode } from '../../src/core/types';
import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { DummyBackendProvider } from '../providers/DummyBackendProvider';

/* -------------------------------------------------------------------------- */
/* 🧩 Dummy Constructs                                                         */
/* -------------------------------------------------------------------------- */

class Database {
  constructor(public props: { name: string }) {}
}

class WebApp {
  constructor(public props: { name: string; dbUrl?: string }) {}
}

/* -------------------------------------------------------------------------- */
/* 🧠 Reactive Context                                                        */
/* -------------------------------------------------------------------------- */

const DatabaseContext = createContext<{ url: string | null }>({ url: null });

/* -------------------------------------------------------------------------- */
/* ☁️ Mock Cloud Provider - Reactive Simulation                               */
/* -------------------------------------------------------------------------- */

class ReactiveMockProvider implements ICloudProvider {
  private initialized = false;
  private listeners: ((id: string, outputs: any) => void)[] = [];

  async initialize(): Promise<void> {
    console.log('[ReactiveMockProvider] Initializing...');
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async preDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
    console.log('[ReactiveMockProvider] Pre-deploy hook');
  }

  async postDeploy(cloudDOM: CloudDOMNode[], outputs: Record<string, any>): Promise<void> {
    console.log('[ReactiveMockProvider] Post-deploy complete');
  }

  async onError(error: Error, cloudDOM: CloudDOMNode[]): Promise<void> {
    console.error('[ReactiveMockProvider] Error during deploy:', error.message);
  }

  materialize(cloudDOM: CloudDOMNode[]): void {
    console.debug('\n=== ReactiveMockProvider: Materializing CloudDOM ===\n');

    for (const node of cloudDOM) {
      console.log(`→ Deploying ${node.id} (${node.construct?.name})`);

      if (node.construct?.name === 'Database') {
        node.outputs = { url: `postgres://${node.props.name}.local:5432` };
      }

      if (node.construct?.name === 'WebApp') {
        node.outputs = {
          endpoint: `https://${node.props.name}.example.com`,
        };
      }
    }

    console.debug('\n=== Materialization Complete ===\n');

    // Simulate async output mutation for reactivity test
    setTimeout(() => {
      const changedUrl = `postgres://${Math.random().toString(36).substring(2, 6)}.reactive.local:5432`;
      console.log(`⚡ [ReactiveMockProvider] Simulating database URL update: ${changedUrl}`);

      for (const listener of this.listeners) {
        listener('Database', { url: changedUrl });
      }
    }, 3000);
  }

  onOutputChange(listener: (id: string, outputs: any) => void) {
    this.listeners.push(listener);
  }
}

/* -------------------------------------------------------------------------- */
/* 🗄️ Database Stack - Produces Context Value                                 */
/* -------------------------------------------------------------------------- */

function DatabaseStack() {
  const db = useInstance(Database, { name: 'users-db' });
  const [url, setUrl] = useState<string>('postgres://init.local:5432');

  // Reactive effect that updates when provider pushes new output
  useEffect(() => {
    console.log(`[DatabaseStack] Current DB URL: ${url}`);
  }, [url]);

  // Subscribe to provider's simulated updates
  useEffect(() => {
    CReactCore.cloudProvider.onOutputChange((id: string, outputs: any) => {
      if (id === 'Database' && outputs.url) {
        setUrl(outputs.url);
      }
    });
  }, []);

  return (
    <DatabaseContext.Provider value={{ url }}>
      <WebAppStack />
    </DatabaseContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* 🌐 WebApp Stack - Consumes Context Reactively                              */
/* -------------------------------------------------------------------------- */

function WebAppStack() {
  const ctx = useContext(DatabaseContext);
  const app = useInstance(WebApp, {
    name: 'frontend',
    dbUrl: ctx.url || 'pending...',
  });

  useEffect(() => {
    console.log(`[WebAppStack] Reactively updated DB URL: ${ctx.url}`);
  }, [ctx.url]);

  return <></>;
}

/* -------------------------------------------------------------------------- */
/* 🏗️ Root App                                                               */
/* -------------------------------------------------------------------------- */

function ReactiveApp() {
  return (
    <>
      <DatabaseStack />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* ⚙️ Configure Providers & Deploy                                            */
/* -------------------------------------------------------------------------- */

CReactCore.cloudProvider = new ReactiveMockProvider();
CReactCore.backendProvider = new DummyBackendProvider();

const stackName = process.env.STACK_NAME || 'reactivity-demo-stack';
export default CReactCore.renderCloudDOM(<ReactiveApp />, stackName);
