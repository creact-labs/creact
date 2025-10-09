/**
 * Example CReact Application
 * 
 * This demonstrates:
 * - JSX-based infrastructure definition
 * - useState for persistent state
 * - useEffect for post-deployment actions
 * - useInstance for resource creation
 * - Automatic output binding
 * - Resource dependencies
 */

import { CReact } from '../../src/core/CReact';
import { useState } from '../../src/hooks/useState';
import { useEffect } from '../../src/hooks/useEffect';
import { useInstance } from '../../src/hooks/useInstance';
import { MockCloudProvider } from './MockCloudProvider';
import { SQLiteBackendProvider } from '../../tests/helpers/SQLiteBackendProvider';
import { useContext } from "../../src/hooks/useContext";
import { createContext } from "../../src/context/createContext";
import { ICloudProvider } from "../../src/providers/ICloudProvider";
import { CloudDOMNode } from "../../src/core/types";
// Configure providers statically (required for CLI)

/**
 * Multi-region Reactive Infrastructure Example (CReact)
 *
 * Demonstrates:
 * - Nested reactivity (providers within providers)
 * - Conditional rendering
 * - Context propagation and dependency re-binding
 * - Automatic re-sync when outputs change
 */

/* -------------------------------------------------------------------------- */
/*                              Mock Constructs                               */
/* -------------------------------------------------------------------------- */

class Database {
  constructor(public props: { name: string; region: string }) {}
}

class API {
  constructor(public props: { name: string; dbUrl?: string; region: string }) {}
}

class Frontend {
  constructor(public props: { name: string; apiUrl?: string; region: string }) {}
}

class CDN {
  constructor(public props: { name: string; origins: string[] }) {}
}

class Monitoring {
  constructor(public props: { name: string; targets: string[] }) {}
}

/* -------------------------------------------------------------------------- */
/*                              Mock Provider                                 */
/* -------------------------------------------------------------------------- */

class ReactiveMockProvider implements ICloudProvider {
  private initialized = false;

  async initialize() {
    console.log("[Provider] initialized");
    this.initialized = true;
  }

  isInitialized() {
    return this.initialized;
  }

  materialize(cloudDOM: CloudDOMNode[]): void {
    for (const node of cloudDOM) {
      if (node.construct?.name === "Database") {
        node.outputs = { url: `postgres://${node.props.name}.${node.props.region}.db.local` };
      } else if (node.construct?.name === "API") {
        node.outputs = { endpoint: `https://${node.props.name}.${node.props.region}.api.local` };
      } else if (node.construct?.name === "Frontend") {
        node.outputs = { url: `https://${node.props.name}.${node.props.region}.web.local` };
      } else if (node.construct?.name === "CDN") {
        node.outputs = { domain: `cdn-${node.props.name}.global.local` };
      } else if (node.construct?.name === "Monitoring") {
        node.outputs = { dashboardUrl: `https://monitor.${node.props.name}.local` };
      }
    }
  }

  async preDeploy() {
    console.log("[Provider] Pre-deploy");
  }

  async postDeploy() {
    console.log("[Provider] Post-deploy complete");
  }

  async onError(err: Error) {
    console.error("[Provider] Error:", err.message);
  }
}

/* -------------------------------------------------------------------------- */
/*                               Context Setup                                */
/* -------------------------------------------------------------------------- */

const RegionContext = createContext<{ region: string }>({ region: "us-east-1" });
const APIContext = createContext<{ apiUrls: string[] }>({ apiUrls: [] });

/* -------------------------------------------------------------------------- */
/*                         Nested Conditional Components                      */
/* -------------------------------------------------------------------------- */

function RegionStack({ region }: { region: string }) {
  const db = useInstance(Database, { name: `db-${region}`, region });
  const api = useInstance(API, { name: `api-${region}`, region, dbUrl: db.outputs?.url });
  const frontend = useInstance(Frontend, { name: `web-${region}`, region, apiUrl: api.outputs?.endpoint });
  const [urls, setUrls] = useState<{ apiUrl?: string; webUrl?: string }>({});

  useEffect(() => {
    if (api.outputs?.endpoint && frontend.outputs?.url) {
      setUrls({ apiUrl: api.outputs.endpoint, webUrl: frontend.outputs.url });
      console.log(`[RegionStack:${region}] ready`);
    }
  }, [api.outputs?.endpoint, frontend.outputs?.url]);

  return (
    <RegionContext.Provider value={{ region }}>
      <APIContext.Provider value={{ apiUrls: urls.apiUrl ? [urls.apiUrl] : [] }}>
        {frontend.outputs?.url ? <MonitoringLayer region={region} /> : null}
      </APIContext.Provider>
    </RegionContext.Provider>
  );
}

function MonitoringLayer({ region }: { region: string }) {
  const { apiUrls } = useContext(APIContext);
  const monitoring = useInstance(Monitoring, { name: `monitor-${region}`, targets: apiUrls });
  useEffect(() => {
    if (monitoring.outputs?.dashboardUrl) {
      console.log(`[Monitoring] Dashboard ready at ${monitoring.outputs.dashboardUrl}`);
    }
  }, [monitoring.outputs?.dashboardUrl]);
  return <></>;
}

/* -------------------------------------------------------------------------- */
/*                        Root with Conditional Multi-Region                  */
/* -------------------------------------------------------------------------- */

function MessagingApp() {
  const [multiRegion, setMultiRegion] = useState(true);
  const regions = multiRegion ? ["us-east-1", "eu-west-1", "us-south"] : ["us-east-1"];

  const regionUrls: string[] = [];

  regions.forEach((region) => {
    regionUrls.push(`https://${region}.web.local`);
  });

  // Global CDN only if multi-region is true
  return (
    <>
      {regions.map((region) => (
        <RegionStack region={region} />
      ))}

      {multiRegion ? <GlobalCDN origins={regionUrls} /> : null}
    </>
  );
}

function GlobalCDN({ origins }: { origins: string[] }) {
  const cdn = useInstance(CDN, { name: "global-cdn", origins });
  const cdn2 = useInstance(CDN, { name: "global-cdn", origins });

  useEffect(() => {
    if (cdn.outputs?.domain) {
      console.log(`[GlobalCDN] Live at ${cdn.outputs.domain}`);
    }
  }, [cdn.outputs?.domain]);
  return <></>;
}
CReact.cloudProvider = new ReactiveMockProvider();
CReact.backendProvider = new SQLiteBackendProvider('./examples/basic-app/state.db');

// Export default promise for CLI 
export default CReact.renderCloudDOM(<MessagingApp />, 'web-app-stack');
