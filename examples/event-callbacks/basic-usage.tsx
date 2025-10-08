/**
 * CReact Reactive Infrastructure Example
 *
 * Demonstrates declarative reactivity using useEffect and dependency arrays.
 * - No imperative provider listeners
 * - Hooks manage post-deployment side effects
 * - Providers remain stateless and deterministic
 *
 * Usage:
 *   creact build --entry examples/reactivity/basic-reactivity.tsx
 *   creact deploy --entry examples/reactivity/basic-reactivity.tsx
 */

import { CReact as CReactCore } from '../../src/core/CReact';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';
import { useEffect } from '../../src/hooks/useEffect';
import {  useContext } from '../../src/hooks/useContext';
import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { CloudDOMNode } from '../../src/core/types';
import { createContext } from '../../src/context/createContext';

/* -------------------------------------------------------------------------- */
/*                                Mock Constructs                             */
/* -------------------------------------------------------------------------- */

class Database {
  constructor(public props: { name: string }) {}
}

class API {
  constructor(public props: { name: string; dbUrl?: string }) {}
}

class Frontend {
  constructor(public props: { name: string; apiUrl?: string }) {}
}

/* -------------------------------------------------------------------------- */
/*                           Mock Cloud Provider                              */
/* -------------------------------------------------------------------------- */

class ReactiveMockProvider implements ICloudProvider {
  private initialized = false;

  async initialize(): Promise<void> {
    console.log('[MockProvider] initialized');
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async preDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
    console.log(`[MockProvider] preDeploy (${cloudDOM.length} resources)`);
  }

  async postDeploy(cloudDOM: CloudDOMNode[], outputs: Record<string, any>): Promise<void> {
    console.log(`[MockProvider] postDeploy complete`);
  }

  async onError(error: Error, cloudDOM: CloudDOMNode[]): Promise<void> {
    console.error(`[MockProvider] Deployment error: ${error.message}`);
  }

  materialize(cloudDOM: CloudDOMNode[]): void {
    console.log('[MockProvider] Materializing resources...');
    for (const node of cloudDOM) {
      if (node.construct?.name === 'Database') {
        node.outputs = {
          connectionUrl: `postgres://${node.props.name}.db.local`,
          status: 'ready'
        };
      } else if (node.construct?.name === 'API') {
        node.outputs = {
          endpoint: `https://${node.props.name}.api.local`,
          dbConnected: !!node.props.dbUrl
        };
      } else if (node.construct?.name === 'Frontend') {
        node.outputs = {
          url: `https://${node.props.name}.frontend.local`,
          apiConnected: !!node.props.apiUrl
        };
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                              Contexts                                      */
/* -------------------------------------------------------------------------- */

const DatabaseContext = createContext<{ dbUrl?: string }>({ dbUrl: undefined });
const APIContext = createContext<{ apiUrl?: string }>({ apiUrl: undefined });

/* -------------------------------------------------------------------------- */
/*                        Infrastructure Components                           */
/* -------------------------------------------------------------------------- */

function DatabaseStack() {
  const db = useInstance(Database, { name: 'users-db' });
  const [dbUrl, setDbUrl] = useState<string>();

  // Update local state after deployment when output is available
  useEffect(() => {
    if (db.outputs?.connectionUrl) {
      setDbUrl(db.outputs.connectionUrl);
      console.log(`[DatabaseStack] Ready at ${db.outputs.connectionUrl}`);
    }
  }, [db.outputs?.connectionUrl]);

  return (
    <DatabaseContext.Provider value={{ dbUrl }}>
      <APIStack />
    </DatabaseContext.Provider>
  );
}

function APIStack() {
  const { dbUrl } = useContext(DatabaseContext);
  const api = useInstance(API, { name: 'user-api', dbUrl });
  const [apiUrl, setApiUrl] = useState<string>();

  useEffect(() => {
    if (api.outputs?.endpoint) {
      setApiUrl(api.outputs.endpoint);
      console.log(`[APIStack] API deployed at ${api.outputs.endpoint}`);
    }
  }, [api.outputs?.endpoint]);

  return (
    <APIContext.Provider value={{ apiUrl }}>
      <FrontendStack />
    </APIContext.Provider>
  );
}

function FrontendStack() {
  const { apiUrl } = useContext(APIContext);
  const frontend = useInstance(Frontend, { name: 'user-frontend', apiUrl });

  useEffect(() => {
    if (frontend.outputs?.url) {
      console.log(`[FrontendStack] Frontend deployed at ${frontend.outputs.url}`);
      console.log(`[FrontendStack] Connected to API: ${frontend.props.apiUrl}`);
    }
  }, [frontend.outputs?.url, frontend.props.apiUrl]);

  return <></>;
}

/* -------------------------------------------------------------------------- */
/*                              Application Root                              */
/* -------------------------------------------------------------------------- */

function ReactiveApp() {
  return (
    <>
      <DatabaseStack />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Runtime Configuration                         */
/* -------------------------------------------------------------------------- */

CReactCore.cloudProvider = new ReactiveMockProvider();
CReactCore.retryPolicy = {
  maxRetries: 2,
  initialDelay: 1000,
  backoffMultiplier: 2,
  timeout: 60000,
};
CReactCore.asyncTimeout = 60000;

/* -------------------------------------------------------------------------- */
/*                              Render Invocation                             */
/* -------------------------------------------------------------------------- */

const stackName = process.env.STACK_NAME || 'reactive-stack';
export default CReactCore.renderCloudDOM(<ReactiveApp />, stackName);
